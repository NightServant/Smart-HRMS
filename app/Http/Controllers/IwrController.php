<?php

namespace App\Http\Controllers;

use App\Http\Requests\FinalizeIpcrRequest;
use App\Http\Requests\SaveEvaluationRequest;
use App\Http\Requests\SaveHrReviewRequest;
use App\Http\Requests\SavePmtReviewRequest;
use App\Http\Requests\SubmitAppealRequest;
use App\Http\Requests\SubmitIpcrRequest;
use App\Http\Requests\UpdateIpcrPeriodRequest;
use App\Models\Employee;
use App\Models\IpcrAppeal;
use App\Models\IpcrSubmission;
use App\Models\IwrAuditLog;
use App\Models\LeaveRequest;
use App\Models\Notification;
use App\Models\SystemSetting;
use App\Models\User;
use App\Services\ActivityLogger;
use App\Services\AtreService;
use App\Services\IpcrFormTemplateService;
use App\Services\IwrService;
use App\Services\NotificationService;
use App\Services\PpeService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class IwrController extends Controller
{
    public function __construct(
        private IwrService $iwrService,
        private NotificationService $notificationService,
        private IpcrFormTemplateService $ipcrFormTemplateService,
    ) {}

    public function submitEvaluationPage(Request $request, AtreService $atre, PpeService $ppe): Response
    {
        $employee = $request->user()->employee;
        $currentPeriod = $this->currentPeriod();
        $latestSubmission = $employee?->latestSubmission()
            ->with(['employee', 'evaluator', 'hrReviewer', 'pmtReviewer', 'appeal'])
            ->first();

        return Inertia::render('performance-evaluation', [
            'roleView' => 'employee',
            'employee' => $employee ? $this->employeeResource($employee) : null,
            'currentPeriod' => $currentPeriod,
            'periodOpen' => $currentPeriod['isOpen'],
            'latestSubmission' => $latestSubmission
                ? $this->submissionResource($latestSubmission)
                : null,
            'employeePanel' => $employee
                ? $this->employeePanelResource($request, $employee, $latestSubmission, $currentPeriod, $atre, $ppe)
                : null,
        ]);
    }

    public function ipcrFormPage(Request $request): Response
    {
        $employee = $request->user()->employee;
        $currentPeriod = $this->currentPeriod();
        $latestSubmission = $employee?->latestSubmission()
            ->with(['employee', 'evaluator', 'hrReviewer', 'pmtReviewer', 'appeal'])
            ->first();
        $selectedSubmission = null;

        if ($employee && $request->filled('submission_id')) {
            $selectedSubmission = IpcrSubmission::query()
                ->where('employee_id', $employee->employee_id)
                ->whereKey((int) $request->integer('submission_id'))
                ->with(['employee', 'evaluator', 'hrReviewer', 'pmtReviewer', 'appeal'])
                ->first();
        }

        $canStartNewSubmission = $employee !== null
            && ($latestSubmission === null || $latestSubmission->stage === 'finalized');

        return Inertia::render('ipcr-form', [
            'employee' => $employee ? $this->employeeResource($employee) : null,
            'currentPeriod' => $currentPeriod,
            'periodOpen' => $currentPeriod['isOpen'],
            'canStartNewSubmission' => $canStartNewSubmission,
            'draftFormPayload' => $employee
                ? $this->ipcrFormTemplateService->draft($employee, $currentPeriod['label'])
                : null,
            'latestSubmission' => $latestSubmission
                ? $this->submissionResource($latestSubmission)
                : null,
            'selectedSubmission' => $selectedSubmission
                ? $this->submissionResource($selectedSubmission)
                : null,
        ]);
    }

    public function printableIpcrPage(Request $request): Response
    {
        $employee = $request->user()->employee;
        abort_unless($employee, 404);

        $latestSubmission = $employee->latestSubmission()
            ->with(['employee', 'evaluator', 'hrReviewer', 'pmtReviewer', 'appeal'])
            ->first();

        $selectedSubmission = null;

        if ($request->filled('submission_id')) {
            $selectedSubmission = IpcrSubmission::query()
                ->where('employee_id', $employee->employee_id)
                ->whereKey((int) $request->integer('submission_id'))
                ->with(['employee', 'evaluator', 'hrReviewer', 'pmtReviewer', 'appeal'])
                ->firstOrFail();
        }

        $sourceSubmission = $selectedSubmission ?? $latestSubmission;
        $workspaceUrl = $selectedSubmission
            ? route('ipcr.form', ['submission_id' => $selectedSubmission->id])
            : route('ipcr.form');

        return Inertia::render('ipcr-print', [
            'submission' => $sourceSubmission ? $this->submissionResource($sourceSubmission) : null,
            'printableFormPayload' => $sourceSubmission
                ? $this->submissionResource($sourceSubmission)['form_payload']
                : $this->ipcrFormTemplateService->draft($employee, $this->currentPeriod()['label']),
            'workspaceUrl' => $workspaceUrl,
            'sourceLabel' => $sourceSubmission
                ? ($sourceSubmission->notification ?? 'Printable IPCR snapshot')
                : 'Printable IPCR draft preview',
        ]);
    }

    public function evaluationPage(Request $request): Response
    {
        $employeeId = $request->query('employee_id');
        $employee = $employeeId ? Employee::query()->find($employeeId) : null;
        $submission = null;

        if ($employeeId) {
            $submission = IpcrSubmission::query()
                ->where('employee_id', $employeeId)
                ->with(['employee', 'evaluator', 'hrReviewer', 'pmtReviewer', 'appeal'])
                ->latest()
                ->first();
        }

        return Inertia::render('evaluation-page', [
            'employee' => $employee ? $this->employeeResource($employee) : null,
            'draftFormPayload' => $employee
                ? $this->ipcrFormTemplateService->draft($employee, $this->currentPeriod()['label'])
                : null,
            'submission' => $submission ? $this->submissionResource($submission) : null,
        ]);
    }

    public function submitIpcr(SubmitIpcrRequest $request): RedirectResponse
    {
        $employeeId = $request->validated('employee_id');
        $period = $request->validated('period');

        abort_unless($request->user()->employee_id === $employeeId, 403);

        $currentPeriod = $this->currentPeriod();
        if (! $currentPeriod['isOpen']) {
            return back()->withErrors([
                'period' => 'The IPCR submission period is currently closed.',
            ]);
        }

        $employee = Employee::query()->findOrFail($employeeId);
        $activeSubmission = IpcrSubmission::query()
            ->where('employee_id', $employeeId)
            ->latest()
            ->first();

        if ($activeSubmission && $activeSubmission->stage !== 'finalized') {
            return back()->withErrors([
                'submission' => 'You already have an active IPCR submission for the current cycle.',
            ]);
        }

        $formPayload = $this->ipcrFormTemplateService->hydrate(
            $request->validated('form_payload'),
            $employee,
            [
                'metadata' => [
                    'period' => $period,
                    'employee_name' => $employee->name,
                    'employee_position' => $employee->job_title,
                ],
                'sign_off' => [
                    'ratee_name' => $employee->name,
                    'ratee_date' => now()->toIso8601String(),
                ],
            ],
        );

        $submission = IpcrSubmission::query()->create([
            'employee_id' => $employeeId,
            'form_payload' => $formPayload,
            'is_first_submission' => true,
        ]);

        $iwrResult = $this->iwrService->routeIpcr([
            'employee_id' => $employeeId,
            'is_first_submission' => true,
            'performance_rating' => null,
            'evaluator_gave_remarks' => false,
        ]);

        $submission->update([
            'status' => $iwrResult['status'] ?? null,
            'stage' => $iwrResult['stage'] ?? null,
            'routing_action' => $iwrResult['routing_action'] ?? null,
            'evaluator_id' => $iwrResult['evaluator_id'] ?? null,
            'confidence_pct' => $iwrResult['confidence_pct'] ?? null,
            'notification' => $iwrResult['notification'] ?? null,
        ]);

        $this->logAudit($employeeId, 'ipcr', $submission->id, $iwrResult);

        ActivityLogger::logIpcrSubmission($submission, $request);

        $this->notificationService->createFromIwrResult(
            $iwrResult,
            'ipcr',
            $submission->id,
            $employeeId,
        );

        return to_route('submit-evaluation')->with(
            'success',
            $iwrResult['notification'] ?? 'IPCR form submitted successfully.',
        );
    }

    public function saveEvaluation(SaveEvaluationRequest $request): RedirectResponse
    {
        $employeeId = $request->validated('employee_id');
        $remarks = $request->validated('remarks');

        $submission = IpcrSubmission::query()
            ->where('employee_id', $employeeId)
            ->with(['employee', 'evaluator'])
            ->latest()
            ->firstOrFail();

        $employee = $submission->employee;
        $formPayload = $this->ipcrFormTemplateService->hydrate(
            $request->validated('form_payload'),
            $employee,
            [
                'workflow_notes' => [
                    'evaluator_remarks' => $remarks,
                ],
                'sign_off' => [
                    'ratee_name' => $employee?->name ?? $employeeId,
                    'reviewed_by_name' => $submission->evaluator?->name,
                    'reviewed_by_date' => now()->toIso8601String(),
                ],
            ],
        );

        $rating = $formPayload['summary']['computed_rating'] ?? null;

        if ($rating === null) {
            return back()->withErrors([
                'form_payload' => 'Please complete the evaluator ratings for every row before submitting.',
            ]);
        }

        $submission->update([
            'performance_rating' => $rating,
            'criteria_ratings' => null,
            'form_payload' => $formPayload,
            'is_first_submission' => false,
            'evaluator_gave_remarks' => true,
            'rejection_reason' => $remarks,
        ]);

        $iwrResult = $this->iwrService->routeIpcr([
            'employee_id' => $employeeId,
            'is_first_submission' => false,
            'performance_rating' => $rating,
            'evaluator_gave_remarks' => true,
        ]);

        $submission->update([
            'status' => $iwrResult['status'] ?? null,
            'stage' => $iwrResult['stage'] ?? null,
            'routing_action' => $iwrResult['routing_action'] ?? null,
            'evaluator_id' => $iwrResult['evaluator_id'] ?? $submission->evaluator_id,
            'confidence_pct' => $iwrResult['confidence_pct'] ?? null,
            'notification' => $iwrResult['notification'] ?? null,
        ]);

        $this->logAudit($employeeId, 'ipcr', $submission->id, $iwrResult);

        ActivityLogger::logIpcrEvaluation($submission, $request);

        $this->notificationService->createFromIwrResult(
            $iwrResult,
            'ipcr',
            $submission->id,
            $employeeId,
        );

        if (in_array($iwrResult['stage'] ?? '', ['data_saved', 'remarks_saved'], true)) {
            $submission->update([
                'stage' => 'sent_to_hr',
                'status' => 'routed',
                'routing_action' => 'route_to_hr',
                'notification' => 'Evaluation saved and routed to HR for checking.',
            ]);

            $this->notificationService->notifyV51($submission->fresh(['employee']), 'route_to_hr');
        }

        return to_route('document-management')->with(
            'success',
            'Evaluation saved and routed to HR review.',
        );
    }

    public function approveLeave(Request $request, LeaveRequest $leaveRequest): RedirectResponse
    {
        $user = $request->user();

        if ($user->hasRole('evaluator')) {
            $leaveRequest->update(['dh_decision' => 1]);
        } elseif ($user->hasRole('hr-personnel')) {
            $leaveRequest->update(['hr_decision' => 1]);
        }

        $iwrResult = $this->routeLeaveRequest($leaveRequest);

        ActivityLogger::logLeaveApproval($leaveRequest, $request);

        $message = $iwrResult['notification'] ?? 'Leave application approved.';

        $route = $user->hasRole('hr-personnel') ? 'admin.hr-leave-management' : 'admin.leave-management';

        return to_route($route)->with('success', $message);
    }

    public function rejectLeave(Request $request, LeaveRequest $leaveRequest): RedirectResponse
    {
        $request->validate([
            'rejection_reason' => 'required|string|max:2000',
        ]);

        $user = $request->user();

        if ($user->hasRole('evaluator')) {
            $leaveRequest->update([
                'dh_decision' => 2,
                'has_rejection_reason' => 1,
                'rejection_reason_text' => $request->string('rejection_reason')->toString(),
            ]);
        } elseif ($user->hasRole('hr-personnel')) {
            $leaveRequest->update([
                'hr_decision' => 2,
                'has_rejection_reason' => 1,
                'rejection_reason_text' => $request->string('rejection_reason')->toString(),
            ]);
        }

        $rejectionReason = $request->string('rejection_reason')->toString();
        $iwrResult = $this->routeLeaveRequest($leaveRequest);

        ActivityLogger::logLeaveRejection($leaveRequest, $request);

        $iwrNotification = $iwrResult['notification'] ?? 'Leave application rejected.';
        $message = $iwrNotification.' Reason: "'.$rejectionReason.'"';

        $latestNotifications = \App\Models\Notification::query()
            ->where('document_type', 'leave')
            ->where('document_id', $leaveRequest->id)
            ->latest()
            ->take(2)
            ->get();

        foreach ($latestNotifications as $notification) {
            $notification->update([
                'message' => $notification->message.' Reason: "'.$rejectionReason.'"',
            ]);
        }

        $route = $user->hasRole('hr-personnel') ? 'admin.hr-leave-management' : 'admin.leave-management';

        return to_route($route)->with('success', $message);
    }

    public function routeLeaveRequest(LeaveRequest $leaveRequest): array
    {
        $payload = [
            'employee_id' => $leaveRequest->employee_id,
            'leave_type' => $leaveRequest->leave_type,
            'days_requested' => $leaveRequest->days_requested,
            'start_date' => $leaveRequest->start_date->toDateString(),
            'has_medical_certificate' => (bool) $leaveRequest->has_medical_certificate,
            'has_solo_parent_id' => (bool) $leaveRequest->has_solo_parent_id,
            'has_marriage_certificate' => (bool) $leaveRequest->has_marriage_certificate,
            'dh_decision' => $leaveRequest->dh_decision,
            'hr_decision' => $leaveRequest->hr_decision,
            'has_rejection_reason' => $leaveRequest->has_rejection_reason,
        ];

        $iwrResult = $this->iwrService->routeLeave($payload);

        $leaveRequest->update([
            'status' => $iwrResult['status'] ?? null,
            'stage' => $iwrResult['stage'] ?? null,
            'routing_action' => $iwrResult['routing_action'] ?? null,
            'approver_id' => $iwrResult['approver_id'] ?? null,
            'confidence_pct' => $iwrResult['confidence_pct'] ?? null,
            'notification' => $iwrResult['notification'] ?? null,
        ]);

        $this->logAudit(
            $leaveRequest->employee_id,
            'leave',
            $leaveRequest->id,
            $iwrResult,
        );

        $this->notificationService->createFromIwrResult(
            $iwrResult,
            'leave',
            $leaveRequest->id,
            $leaveRequest->employee_id,
        );

        return $iwrResult;
    }

    public function hrReviewPage(): Response
    {
        $reviewQueue = IpcrSubmission::query()
            ->where(function ($query): void {
                $query
                    ->where('stage', 'sent_to_hr')
                    ->orWhereNotNull('hr_reviewer_id');
            })
            ->with(['employee', 'evaluator', 'hrReviewer', 'pmtReviewer', 'appeal'])
            ->latest()
            ->get()
            ->map(fn (IpcrSubmission $submission): array => $this->submissionResource($submission))
            ->all();

        $finalizationQueue = IpcrSubmission::query()
            ->where(function ($query): void {
                $query
                    ->where('stage', 'sent_to_hr_finalize')
                    ->orWhereNotNull('finalized_at');
            })
            ->with(['employee', 'evaluator', 'hrReviewer', 'pmtReviewer', 'appeal'])
            ->latest()
            ->get()
            ->map(fn (IpcrSubmission $submission): array => $this->submissionResource($submission))
            ->all();

        $pendingReviewCount = IpcrSubmission::query()->where('stage', 'sent_to_hr')->count();
        $pendingFinalizationCount = IpcrSubmission::query()->where('stage', 'sent_to_hr_finalize')->count();

        return Inertia::render('performance-evaluation', [
            'roleView' => 'hr',
            'currentPeriod' => $this->currentPeriod(),
            'hrPanel' => [
                'defaultView' => 'review',
                'reviewQueue' => $reviewQueue,
                'finalizationQueue' => $finalizationQueue,
                'stats' => [
                    'pendingReview' => $pendingReviewCount,
                    'pendingFinalization' => $pendingFinalizationCount,
                    'appealWindowOpen' => IpcrSubmission::query()->where('appeal_status', 'appeal_window_open')->count(),
                    'escalated' => IpcrSubmission::query()->where('is_escalated', true)->count(),
                ],
            ],
        ]);
    }

    public function saveHrReview(SaveHrReviewRequest $request, IpcrSubmission $submission): RedirectResponse
    {
        $user = $request->user();
        $currentHrCycles = $submission->hr_cycle_count;

        $submission->update([
            'hr_reviewer_id' => $user->employee_id,
            'hr_decision' => $request->validated('hr_decision'),
            'hr_remarks' => $request->validated('hr_remarks'),
        ]);

        $iwrResult = $this->iwrService->routeHrReview([
            'stage' => 'hr_review',
            'employee_id' => $submission->employee_id,
            'employee_name' => $submission->employee?->name ?? $submission->employee_id,
            'hr_decision' => $request->validated('hr_decision'),
            'hr_remarks' => $request->validated('hr_remarks'),
            'hr_cycle_count' => $currentHrCycles,
        ]);

        $updateData = [
            'stage' => $iwrResult['stage'] ?? $submission->stage,
            'status' => $iwrResult['status'] ?? $submission->status,
            'routing_action' => $iwrResult['routing_action'] ?? $submission->routing_action,
            'notification' => $iwrResult['notification'] ?? $submission->notification,
        ];

        if (($iwrResult['routing_action'] ?? '') === 'open_appeal_window') {
            $updateData['appeal_status'] = 'appeal_window_open';
            $updateData['appeal_window_opens_at'] = now();
            $updateData['appeal_window_closes_at'] = now()->addHours(72);
        }

        if (($iwrResult['routing_action'] ?? '') === 're_evaluate') {
            $updateData['hr_cycle_count'] = $currentHrCycles + 1;
            $updateData['is_first_submission'] = false;
            $updateData['appeal_status'] = null;
            $updateData['appeal_window_opens_at'] = null;
            $updateData['appeal_window_closes_at'] = null;
        }

        if (($iwrResult['routing_action'] ?? '') === 'escalate') {
            $updateData['is_escalated'] = true;
            $updateData['escalation_reason'] = $iwrResult['escalation_reason'] ?? 'HR cycle limit reached';
        }

        $submission->update($updateData);

        $this->logAudit($submission->employee_id, 'ipcr', $submission->id, $iwrResult);
        $this->notificationService->notifyV51($submission->fresh(['employee']), $iwrResult['routing_action'] ?? '', $request->validated('hr_remarks') ?? '');

        return to_route('admin.hr-review')->with('success', $iwrResult['notification'] ?? 'HR review saved.');
    }

    public function appealPage(IpcrSubmission $submission): Response
    {
        abort_unless(
            $submission->employee_id === auth()->user()->employee_id && $submission->isAppealWindowOpen(),
            403,
        );

        $submission->loadMissing(['employee', 'evaluator', 'hrReviewer', 'pmtReviewer', 'appeal']);

        return Inertia::render('ipcr-appeal', [
            'submission' => $this->submissionResource($submission),
        ]);
    }

    public function submitNoAppeal(Request $request, IpcrSubmission $submission): RedirectResponse
    {
        abort_unless(
            $submission->employee_id === $request->user()->employee_id && $submission->isAppealWindowOpen(),
            403,
        );

        $iwrResult = $this->iwrService->routeAppeal([
            'stage' => 'appeal',
            'employee_id' => $submission->employee_id,
            'employee_name' => $submission->employee?->name ?? $submission->employee_id,
            'appeal_status' => 'no_appeal',
        ]);

        $submission->update([
            'appeal_status' => 'no_appeal',
            'stage' => $iwrResult['stage'] ?? 'sent_to_pmt',
            'status' => $iwrResult['status'] ?? 'routed',
            'routing_action' => $iwrResult['routing_action'] ?? 'route_to_pmt',
            'notification' => $iwrResult['notification'] ?? 'No appeal submitted. Routed to PMT review.',
        ]);

        $this->logAudit($submission->employee_id, 'ipcr', $submission->id, $iwrResult);
        $this->notificationService->notifyV51($submission->fresh(['employee']), 'route_to_pmt');

        return to_route('submit-evaluation')->with('success', 'Results accepted. Your IPCR was sent to PMT review.');
    }

    public function submitAppeal(SubmitAppealRequest $request, IpcrSubmission $submission): RedirectResponse
    {
        abort_unless(
            $submission->employee_id === auth()->user()->employee_id && $submission->isAppealWindowOpen(),
            403,
        );

        $evidencePaths = [];
        foreach ($request->file('evidence_files', []) as $file) {
            $evidencePaths[] = $file->store('ipcr-appeals', 'local');
        }

        IpcrAppeal::query()->updateOrCreate(
            ['ipcr_submission_id' => $submission->id],
            [
                'employee_id' => $submission->employee_id,
                'appeal_reason' => $request->validated('appeal_reason'),
                'appeal_evidence_description' => $request->validated('appeal_evidence_description'),
                'evidence_files' => $evidencePaths,
                'status' => 'submitted',
            ],
        );

        $iwrResult = $this->iwrService->routeAppeal([
            'stage' => 'appeal',
            'employee_id' => $submission->employee_id,
            'employee_name' => $submission->employee?->name ?? $submission->employee_id,
            'appeal_status' => 'appeal_window_open',
            'appeal_reason' => $request->validated('appeal_reason'),
            'evidence_files' => $evidencePaths,
        ]);

        $formPayload = $this->ipcrFormTemplateService->hydrate(
            $submission->form_payload,
            $submission->employee,
            [
                'workflow_notes' => [
                    'appeal_reason' => $request->validated('appeal_reason'),
                ],
            ],
        );

        $submission->update([
            'form_payload' => $formPayload,
            'appeal_status' => 'appealed',
            'stage' => $iwrResult['stage'] ?? 'sent_to_pmt',
            'status' => $iwrResult['status'] ?? 'routed',
            'routing_action' => $iwrResult['routing_action'] ?? 'route_to_pmt',
            'notification' => $iwrResult['notification'] ?? 'Appeal submitted.',
        ]);

        $this->logAudit($submission->employee_id, 'ipcr', $submission->id, $iwrResult);
        $this->notificationService->notifyV51($submission->fresh(['employee']), 'route_to_pmt');

        return to_route('submit-evaluation')->with('success', $iwrResult['notification'] ?? 'Appeal submitted.');
    }

    public function pmtReviewPage(): Response
    {
        $submissions = IpcrSubmission::query()
            ->where('stage', 'sent_to_pmt')
            ->with(['employee', 'evaluator', 'hrReviewer', 'pmtReviewer', 'appeal'])
            ->latest()
            ->get()
            ->map(fn (IpcrSubmission $submission): array => $this->submissionResource($submission))
            ->all();

        return Inertia::render('performance-evaluation', [
            'roleView' => 'pmt',
            'currentPeriod' => $this->currentPeriod(),
            'pmtPanel' => [
                'submissions' => $submissions,
                'stats' => [
                    'pendingReview' => count($submissions),
                    'appealed' => IpcrSubmission::query()->where('stage', 'sent_to_pmt')->where('appeal_status', 'appealed')->count(),
                    'returnedForReevaluation' => IpcrSubmission::query()->where('stage', 'sent_to_evaluator')->where('pmt_cycle_count', '>', 0)->count(),
                    'escalated' => IpcrSubmission::query()->where('is_escalated', true)->count(),
                ],
            ],
        ]);
    }

    public function savePmtReview(SavePmtReviewRequest $request, IpcrSubmission $submission): RedirectResponse
    {
        $user = $request->user();
        $currentPmtCycles = $submission->pmt_cycle_count;

        $submission->update([
            'pmt_reviewer_id' => $user->employee_id,
            'pmt_decision' => $request->validated('pmt_decision'),
            'pmt_remarks' => $request->validated('pmt_remarks'),
        ]);

        $iwrResult = $this->iwrService->routePmtReview([
            'stage' => 'pmt_review',
            'employee_id' => $submission->employee_id,
            'employee_name' => $submission->employee?->name ?? $submission->employee_id,
            'pmt_decision' => $request->validated('pmt_decision'),
            'pmt_remarks' => $request->validated('pmt_remarks'),
            'pmt_cycle_count' => $currentPmtCycles,
        ]);

        $updateData = [
            'stage' => $iwrResult['stage'] ?? $submission->stage,
            'status' => $iwrResult['status'] ?? $submission->status,
            'routing_action' => $iwrResult['routing_action'] ?? $submission->routing_action,
            'notification' => $iwrResult['notification'] ?? $submission->notification,
        ];

        if (($iwrResult['routing_action'] ?? '') === 're_evaluate') {
            $updateData['pmt_cycle_count'] = $currentPmtCycles + 1;
            $updateData['is_first_submission'] = false;
        }

        if (($iwrResult['routing_action'] ?? '') === 'escalate') {
            $updateData['is_escalated'] = true;
            $updateData['escalation_reason'] = $iwrResult['escalation_reason'] ?? 'PMT cycle limit reached';
        }

        $submission->update($updateData);

        $this->logAudit($submission->employee_id, 'ipcr', $submission->id, $iwrResult);
        $this->notificationService->notifyV51($submission->fresh(['employee']), $iwrResult['routing_action'] ?? '', $request->validated('pmt_remarks') ?? '');

        return to_route('admin.pmt-review')->with('success', $iwrResult['notification'] ?? 'PMT review saved.');
    }

    public function hrFinalizePage(): Response
    {
        $reviewQueue = IpcrSubmission::query()
            ->where(function ($query): void {
                $query
                    ->where('stage', 'sent_to_hr')
                    ->orWhereNotNull('hr_reviewer_id');
            })
            ->with(['employee', 'evaluator', 'hrReviewer', 'pmtReviewer', 'appeal'])
            ->latest()
            ->get()
            ->map(fn (IpcrSubmission $submission): array => $this->submissionResource($submission))
            ->all();

        $finalizationQueue = IpcrSubmission::query()
            ->where(function ($query): void {
                $query
                    ->where('stage', 'sent_to_hr_finalize')
                    ->orWhereNotNull('finalized_at');
            })
            ->with(['employee', 'evaluator', 'hrReviewer', 'pmtReviewer', 'appeal'])
            ->latest()
            ->get()
            ->map(fn (IpcrSubmission $submission): array => $this->submissionResource($submission))
            ->all();

        $pendingReviewCount = IpcrSubmission::query()->where('stage', 'sent_to_hr')->count();
        $pendingFinalizationCount = IpcrSubmission::query()->where('stage', 'sent_to_hr_finalize')->count();

        return Inertia::render('performance-evaluation', [
            'roleView' => 'hr',
            'currentPeriod' => $this->currentPeriod(),
            'hrPanel' => [
                'defaultView' => 'finalization',
                'reviewQueue' => $reviewQueue,
                'finalizationQueue' => $finalizationQueue,
                'stats' => [
                    'pendingReview' => $pendingReviewCount,
                    'pendingFinalization' => $pendingFinalizationCount,
                    'appealWindowOpen' => IpcrSubmission::query()->where('appeal_status', 'appeal_window_open')->count(),
                    'escalated' => IpcrSubmission::query()->where('is_escalated', true)->count(),
                ],
            ],
        ]);
    }

    public function updateIpcrPeriod(UpdateIpcrPeriodRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $userId = $request->user()->id;
        $wasOpen = SystemSetting::get('ipcr_period_open', false);

        SystemSetting::set('ipcr_period_open', $validated['is_open'] ? 'true' : 'false', $userId);
        SystemSetting::set('ipcr_period_label', $validated['label'], $userId);
        SystemSetting::set('ipcr_period_year', (string) $validated['year'], $userId);

        if ($validated['is_open'] && ! $wasOpen) {
            $this->notifyEvaluationPeriodOpened($validated['label']);
        }

        return back()->with('success', $validated['is_open']
            ? 'The IPCR submission and evaluation period is now open.'
            : 'The IPCR submission and evaluation period is now closed.');
    }

    public function finalizeIpcr(FinalizeIpcrRequest $request, IpcrSubmission $submission): RedirectResponse
    {
        $finalRating = (float) $request->validated('final_rating');

        $iwrResult = $this->iwrService->finalizeIpcr([
            'stage' => 'finalize',
            'employee_id' => $submission->employee_id,
            'employee_name' => $submission->employee?->name ?? $submission->employee_id,
            'final_rating' => $finalRating,
        ]);

        $formPayload = $this->ipcrFormTemplateService->finalize(
            $submission->form_payload,
            $finalRating,
            $submission->employee,
            [
                'final_rater_name' => $request->user()->name,
                'head_of_agency_name' => $request->user()->name,
                'finalized_date' => now()->toIso8601String(),
            ],
        );

        $submission->update([
            'form_payload' => $formPayload,
            'final_rating' => $iwrResult['final_rating'] ?? $finalRating,
            'adjectival_rating' => $iwrResult['adjectival_rating'] ?? $this->ipcrFormTemplateService->adjectivalRating($finalRating),
            'finalized_at' => now(),
            'stage' => 'finalized',
            'status' => 'completed',
            'routing_action' => 'finalized',
            'notification' => $iwrResult['notification'] ?? 'IPCR finalized.',
        ]);

        $this->logAudit($submission->employee_id, 'ipcr', $submission->id, $iwrResult);
        $this->notificationService->notifyV51($submission->fresh(['employee']), 'finalized');

        return to_route('admin.hr-finalize')->with('success', $iwrResult['notification'] ?? 'IPCR finalized.');
    }

    /**
     * @return array<string, mixed>
     */
    private function employeePanelResource(
        Request $request,
        Employee $employee,
        ?IpcrSubmission $latestSubmission,
        array $currentPeriod,
        AtreService $atre,
        PpeService $ppe,
    ): array {
        $history = IpcrSubmission::query()
            ->where('employee_id', $employee->employee_id)
            ->with(['employee', 'evaluator', 'hrReviewer', 'pmtReviewer', 'appeal'])
            ->latest()
            ->get()
            ->map(fn (IpcrSubmission $submission): array => $this->submissionResource($submission))
            ->all();

        $canStartNewSubmission = $latestSubmission === null || $latestSubmission->stage === 'finalized';

        $recommendationsEnabled = Notification::query()
            ->where('user_id', $request->user()->id)
            ->where('type', 'training_suggestion')
            ->exists();

        $recommendations = [];
        $riskLevel = 'NONE';
        $weakAreas = [];

        if ($recommendationsEnabled && $latestSubmission?->form_payload) {
            $seminars = \App\Models\Seminars::query()
                ->orderBy('date')
                ->get()
                ->map(fn (\App\Models\Seminars $seminar): array => [
                    'id' => $seminar->id,
                    'description' => $seminar->description,
                    'target_performance_area' => $seminar->target_performance_area,
                ])
                ->all();

            $atreResult = $atre->recommend($seminars, $latestSubmission->form_payload);
            $recommendations = $atreResult['recommendations'] ?? [];
            $riskLevel = $atreResult['risk_level'] ?? 'NONE';
            $weakAreas = $atreResult['weak_areas'] ?? [];
        }

        $prediction = null;
        $historicalRecords = \App\Models\HistoricalDataRecord::query()
            ->where('employee_name', $employee->name)
            ->orderBy('year')
            ->get()
            ->map(function (\App\Models\HistoricalDataRecord $record): ?array {
                $period = $record->resolvedPeriod();
                $score = $record->normalizedEvaluatedPerformanceScore();

                if ($period === null || $score === null) {
                    return null;
                }

                return [
                    'year' => $record->year,
                    'period' => $period,
                    'attendance_punctuality_rate' => (float) $record->attendance_punctuality_rate,
                    'absenteeism_days' => $record->absenteeism_days,
                    'tardiness_incidents' => $record->tardiness_incidents,
                    'training_completion_status' => $record->training_completion_status,
                    'evaluated_performance_score' => $score,
                ];
            })
            ->filter()
            ->sortBy([
                ['year', 'asc'],
                ['period', 'asc'],
            ])
            ->values()
            ->all();

        if (count($historicalRecords) >= 4) {
            $prediction = $ppe->predict($employee->name, $historicalRecords);
        }

        return [
            'launchFormUrl' => route('ipcr.form'),
            'canOpenForm' => $currentPeriod['isOpen'] && $canStartNewSubmission,
            'periodMessage' => $currentPeriod['isOpen']
                ? 'HR has enabled the current evaluation period. Start a new IPCR form when you are ready.'
                : 'HR has not enabled the evaluation period yet. You can still review past forms below.',
            'history' => $history,
            'recommendationsEnabled' => $recommendationsEnabled,
            'recommendations' => $recommendations,
            'riskLevel' => $riskLevel,
            'weakAreas' => $weakAreas,
            'prediction' => $prediction,
        ];
    }

    private function currentPeriod(): array
    {
        return [
            'label' => (string) SystemSetting::get('ipcr_period_label', 'January to June '.now()->year),
            'year' => (int) SystemSetting::get('ipcr_period_year', (int) now()->year),
            'isOpen' => SystemSetting::get('ipcr_period_open', false),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function employeeResource(Employee $employee): array
    {
        return [
            'employee_id' => $employee->employee_id,
            'name' => $employee->name,
            'job_title' => $employee->job_title,
            'supervisor_id' => $employee->supervisor_id,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function submissionResource(IpcrSubmission $submission): array
    {
        $submission->loadMissing(['employee', 'evaluator', 'hrReviewer', 'pmtReviewer', 'appeal']);
        $payloadWorkflowNotes = $submission->form_payload['workflow_notes'] ?? [];

        $formPayload = $this->ipcrFormTemplateService->hydrate(
            $submission->form_payload,
            $submission->employee,
            [
                'workflow_notes' => [
                    'evaluator_remarks' => $submission->rejection_reason ?? ($payloadWorkflowNotes['evaluator_remarks'] ?? null),
                    'hr_remarks' => $submission->hr_remarks ?? ($payloadWorkflowNotes['hr_remarks'] ?? null),
                    'pmt_remarks' => $submission->pmt_remarks ?? ($payloadWorkflowNotes['pmt_remarks'] ?? null),
                    'appeal_reason' => $submission->appeal?->appeal_reason,
                ],
                'sign_off' => [
                    'ratee_name' => $submission->employee?->name ?? $submission->employee_id,
                    'reviewed_by_name' => $this->resolveReviewerName($submission->evaluator?->name, $submission->evaluator_id),
                    'pmt_chair_name' => $this->resolveReviewerName($submission->pmtReviewer?->name, $submission->pmt_reviewer_id),
                    'final_rater_name' => $this->resolveReviewerName($submission->hrReviewer?->name, $submission->hr_reviewer_id),
                    'head_of_agency_name' => $this->resolveReviewerName($submission->hrReviewer?->name, $submission->hr_reviewer_id),
                    'ratee_date' => $submission->created_at?->toIso8601String(),
                    'reviewed_by_date' => $submission->performance_rating !== null ? $submission->updated_at?->toIso8601String() : null,
                    'pmt_date' => $submission->pmt_decision ? $submission->updated_at?->toIso8601String() : null,
                    'finalized_date' => $submission->finalized_at?->toIso8601String(),
                ],
                'finalization' => [
                    'final_rating' => $submission->final_rating,
                    'adjectival_rating' => $submission->adjectival_rating,
                    'finalized_at' => $submission->finalized_at?->toIso8601String(),
                ],
            ],
        );

        return [
            'id' => $submission->id,
            'employee_id' => $submission->employee_id,
            'performance_rating' => $submission->performance_rating !== null ? (float) $submission->performance_rating : null,
            'criteria_ratings' => $submission->criteria_ratings,
            'form_payload' => $formPayload,
            'status' => $submission->status,
            'stage' => $submission->stage,
            'routing_action' => $submission->routing_action,
            'evaluator_gave_remarks' => $submission->evaluator_gave_remarks,
            'remarks' => $submission->rejection_reason ?? data_get($formPayload, 'workflow_notes.evaluator_remarks'),
            'notification' => $submission->notification,
            'hr_decision' => $submission->hr_decision,
            'hr_remarks' => $submission->hr_remarks ?? data_get($formPayload, 'workflow_notes.hr_remarks'),
            'pmt_decision' => $submission->pmt_decision,
            'pmt_remarks' => $submission->pmt_remarks ?? data_get($formPayload, 'workflow_notes.pmt_remarks'),
            'hr_cycle_count' => $submission->hr_cycle_count,
            'pmt_cycle_count' => $submission->pmt_cycle_count,
            'appeal_status' => $submission->appeal_status,
            'appeal_window_opens_at' => $submission->appeal_window_opens_at?->toIso8601String(),
            'appeal_window_closes_at' => $submission->appeal_window_closes_at?->toIso8601String(),
            'final_rating' => $submission->final_rating !== null ? (float) $submission->final_rating : null,
            'adjectival_rating' => $submission->adjectival_rating,
            'finalized_at' => $submission->finalized_at?->toIso8601String(),
            'is_escalated' => $submission->is_escalated,
            'escalation_reason' => $submission->escalation_reason,
            'created_at' => $submission->created_at?->toIso8601String(),
            'updated_at' => $submission->updated_at?->toIso8601String(),
            'appeal_url' => $submission->isAppealWindowOpen() ? route('ipcr.appeal', $submission) : null,
            'employee' => $submission->employee ? $this->employeeResource($submission->employee) : null,
            'evaluator' => $submission->evaluator ? $this->employeeResource($submission->evaluator) : null,
            'hr_reviewer' => $submission->hrReviewer ? $this->employeeResource($submission->hrReviewer) : null,
            'pmt_reviewer' => $submission->pmtReviewer ? $this->employeeResource($submission->pmtReviewer) : null,
            'appeal' => $submission->appeal ? [
                'id' => $submission->appeal->id,
                'appeal_reason' => $submission->appeal->appeal_reason,
                'appeal_evidence_description' => $submission->appeal->appeal_evidence_description,
                'evidence_files' => $submission->appeal->evidence_files ?? [],
                'status' => $submission->appeal->status,
            ] : null,
        ];
    }

    private function resolveReviewerName(?string $employeeName, ?string $employeeId): ?string
    {
        if ($employeeName) {
            return $employeeName;
        }

        if (! $employeeId) {
            return null;
        }

        return User::query()
            ->where('employee_id', $employeeId)
            ->value('name');
    }

    private function notifyEvaluationPeriodOpened(string $periodLabel): void
    {
        $users = User::query()
            ->whereIn('role', [User::ROLE_EMPLOYEE, User::ROLE_EVALUATOR])
            ->get(['id', 'role']);

        foreach ($users as $user) {
            Notification::query()->create([
                'user_id' => $user->id,
                'type' => 'ipcr_period_opened',
                'title' => 'Performance Evaluation Period Open',
                'message' => $user->role === User::ROLE_EMPLOYEE
                    ? "The {$periodLabel} IPCR submission period is now open. You may start your Performance Evaluation form."
                    : "The {$periodLabel} IPCR evaluation period is now open. Employee submissions can now move through Performance Evaluation.",
                'is_important' => true,
            ]);
        }
    }

    private function logAudit(string $employeeId, string $docType, int $docId, array $iwrResult): void
    {
        IwrAuditLog::query()->create([
            'logged_at' => now(),
            'employee_id' => $employeeId,
            'document_type' => $docType,
            'document_id' => $docId,
            'routing_action' => $iwrResult['routing_action'] ?? null,
            'confidence_pct' => $iwrResult['confidence_pct'] ?? null,
            'compliance_passed' => ($iwrResult['status'] ?? '') !== 'returned',
        ]);
    }
}
