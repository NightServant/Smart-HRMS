<?php

namespace App\Http\Controllers;

use App\Http\Requests\FinalizeIpcrRequest;
use App\Http\Requests\SaveEvaluationRequest;
use App\Http\Requests\SaveHrReviewRequest;
use App\Http\Requests\SaveIpcrTargetRequest;
use App\Http\Requests\SavePmtReviewRequest;
use App\Http\Requests\SubmitAppealRequest;
use App\Http\Requests\SubmitIpcrRequest;
use App\Http\Requests\UpdateIpcrPeriodRequest;
use App\Models\Employee;
use App\Models\IpcrAppeal;
use App\Models\IpcrSubmission;
use App\Models\IpcrTarget;
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
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

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
        $latestSubmission = $this->repairLegacySubmission($latestSubmission);

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
        $latestSubmission = $this->repairLegacySubmission($latestSubmission);
        $selectedSubmission = null;

        if ($employee && $request->filled('submission_id')) {
            $selectedSubmission = IpcrSubmission::query()
                ->where('employee_id', $employee->employee_id)
                ->whereKey((int) $request->integer('submission_id'))
                ->with(['employee', 'evaluator', 'hrReviewer', 'pmtReviewer', 'appeal'])
                ->first();
            $selectedSubmission = $this->repairLegacySubmission($selectedSubmission);
        }

        $canStartNewSubmission = $employee !== null
            && ($latestSubmission === null || $latestSubmission->stage === 'finalized');

        $currentTarget = $employee
            ? $this->findEmployeeTargetForPeriod($employee, $currentPeriod['label'], $currentPeriod['year'])
            : null;

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
            'currentTarget' => $currentTarget ? $this->targetResource($currentTarget) : null,
        ]);
    }

    public function printableIpcrPage(Request $request): HttpResponse
    {
        $employee = $request->user()->employee;
        abort_unless($employee, 404);

        $latestSubmission = $employee->latestSubmission()
            ->with(['employee', 'evaluator', 'hrReviewer', 'pmtReviewer', 'appeal'])
            ->first();
        $latestSubmission = $this->repairLegacySubmission($latestSubmission);

        $selectedSubmission = null;

        if ($request->filled('submission_id')) {
            $selectedSubmission = IpcrSubmission::query()
                ->where('employee_id', $employee->employee_id)
                ->whereKey((int) $request->integer('submission_id'))
                ->with(['employee', 'evaluator', 'hrReviewer', 'pmtReviewer', 'appeal'])
                ->firstOrFail();
            $selectedSubmission = $this->repairLegacySubmission($selectedSubmission);
        }

        $sourceSubmission = $selectedSubmission ?? $latestSubmission;

        if (! $sourceSubmission || $sourceSubmission->stage !== 'finalized') {
            abort(403, 'Print view is only available after the IPCR has been finalized.');
        }

        $printableSubmission = $sourceSubmission
            ? $this->submissionResource($sourceSubmission)
            : null;
        $printablePeriodLabel = $printableSubmission
            ? (string) data_get($printableSubmission, 'form_payload.metadata.period', $this->currentPeriod()['label'])
            : $this->currentPeriod()['label'];
        $printableTarget = $this->findEmployeeTargetForPeriod(
            $employee,
            $printablePeriodLabel,
            $this->currentPeriod()['year'],
        );

        $pdf = Pdf::loadView('pdf.ipcr-print', [
            'submission' => $printableSubmission,
            'printableFormPayload' => $printableSubmission['form_payload']
                ?? $this->ipcrFormTemplateService->draft($employee, $this->currentPeriod()['label']),
            'printableTargetFormPayload' => $printableTarget?->form_payload,
        ]);

        return $pdf
            ->setPaper('a4', 'landscape')
            ->setWarnings(false)
            ->stream('ipcr-print.pdf');
    }

    public function ipcrTargetPage(Request $request): Response
    {
        $employee = $request->user()->employee;
        abort_unless($employee, 404);

        $targetPeriod = $this->currentTargetSubmissionPeriod();
        $selectedTarget = null;

        $existingTarget = IpcrTarget::query()
            ->where('employee_id', $employee->employee_id)
            ->where('semester', $targetPeriod['semester'])
            ->where('target_year', $targetPeriod['year'])
            ->first();

        if ($request->filled('target_id')) {
            $selectedTarget = IpcrTarget::query()
                ->where('employee_id', $employee->employee_id)
                ->whereKey((int) $request->integer('target_id'))
                ->first();
        }

        $targetHistory = IpcrTarget::query()
            ->where('employee_id', $employee->employee_id)
            ->where(function ($query) use ($targetPeriod): void {
                $query
                    ->where('semester', '!=', $targetPeriod['semester'])
                    ->orWhere('target_year', '!=', $targetPeriod['year']);
            })
            ->orderByDesc('target_year')
            ->orderByDesc('semester')
            ->latest('id')
            ->get()
            ->map(fn (IpcrTarget $target): array => $this->targetResource($target))
            ->all();

        return Inertia::render('ipcr-target', [
            'employee' => $this->employeeResource($employee),
            'targetPeriod' => $targetPeriod,
            'existingTarget' => $existingTarget ? $this->targetResource($existingTarget) : null,
            'selectedTarget' => $selectedTarget ? $this->targetResource($selectedTarget) : null,
            'targetHistory' => $targetHistory,
        ]);
    }

    public function ipcrTargetFormPage(Request $request): Response|RedirectResponse
    {
        $employee = $request->user()->employee;
        abort_unless($employee, 404);

        $targetPeriod = $this->currentTargetSubmissionPeriod();

        $existingTarget = IpcrTarget::query()
            ->where('employee_id', $employee->employee_id)
            ->where('semester', $targetPeriod['semester'])
            ->where('target_year', $targetPeriod['year'])
            ->first();

        // Prevent reopening an already-submitted target (unless returned for revision).
        // Submitted targets are one-shot; employees may only view them as a read-only snapshot.
        if (
            $existingTarget
            && $existingTarget->status === 'submitted'
            && $existingTarget->evaluator_decision !== 'rejected'
        ) {
            return to_route('ipcr.target')->with(
                'info',
                'Your IPCR targets for this cycle have already been submitted and are locked.',
            );
        }

        return Inertia::render('ipcr-target-form', [
            'employee' => $this->employeeResource($employee),
            'targetPeriod' => $targetPeriod,
            'existingTarget' => $existingTarget ? $this->targetResource($existingTarget) : null,
            'draftFormPayload' => $this->ipcrFormTemplateService->targetDraft($employee, $targetPeriod['label']),
        ]);
    }

    public function saveIpcrTarget(SaveIpcrTargetRequest $request): RedirectResponse
    {
        $employee = $request->user()->employee;
        abort_unless($employee, 403);

        $semester = (int) $request->validated('semester');
        $targetYear = (int) $request->validated('target_year');
        $action = $request->validated('action');
        $targetPeriod = $this->currentTargetSubmissionPeriod();
        $existingTarget = IpcrTarget::query()
            ->where('employee_id', $employee->employee_id)
            ->where('semester', $semester)
            ->where('target_year', $targetYear)
            ->first();
        $isReturnedTarget = $existingTarget?->evaluator_decision === 'rejected';

        if ($semester !== $targetPeriod['semester']
            || $targetYear !== $targetPeriod['year']) {
            throw ValidationException::withMessages([
                'target_period' => 'IPCR target submissions are only available during the '.$targetPeriod['submissionWindowLabel'].' window for '.$targetPeriod['label'].'.',
            ]);
        }

        if ($existingTarget?->status === 'submitted' && ! $isReturnedTarget) {
            throw ValidationException::withMessages([
                'target_period' => 'Submitted IPCR targets are locked and cannot be edited.',
            ]);
        }

        if ($action === 'submit' && ! $targetPeriod['submissionOpen'] && ! $isReturnedTarget) {
            throw ValidationException::withMessages([
                'target_period' => 'IPCR target submissions are only available during the '.$targetPeriod['submissionWindowLabel'].' window for '.$targetPeriod['label'].'.',
            ]);
        }

        if ($action === 'save'
            && ! $targetPeriod['submissionOpen']
            && ! $existingTarget) {
            throw ValidationException::withMessages([
                'target_period' => 'Create your IPCR target draft during the active '.$targetPeriod['submissionWindowLabel'].' window for '.$targetPeriod['label'].'.',
            ]);
        }

        if ($action === 'submit') {
            $payload = $request->validated('form_payload');
            $emptyRows = collect($payload['sections'] ?? [])
                ->flatMap(fn ($s) => $s['rows'] ?? [])
                ->filter(fn ($r) => trim($r['accountable'] ?? '') === '')
                ->count();
            if ($emptyRows > 0) {
                throw ValidationException::withMessages([
                    'form_payload' => "All target rows must be filled before submitting. {$emptyRows} row(s) are still empty.",
                ]);
            }
        }

        $status = $action === 'submit' ? 'submitted' : 'draft';

        $target = IpcrTarget::query()->updateOrCreate(
            [
                'employee_id' => $employee->employee_id,
                'semester' => $semester,
                'target_year' => $targetYear,
            ],
            [
                'form_payload' => $request->validated('form_payload'),
                'status' => $status,
                'submitted_at' => $action === 'submit' ? now() : null,
                'evaluator_decision' => null,
                'evaluator_remarks' => null,
                'evaluator_reviewed_at' => null,
                'hr_finalized' => false,
            ],
        );

        if ($action === 'submit') {
            // Route the target submission through IWR — same pipeline as IPCR.
            // This resolves the assigned evaluator (supervisor) and logs the decision.
            $iwrResult = $this->iwrService->routeIpcrTarget([
                'employee_id' => $employee->employee_id,
                'semester' => $semester,
                'target_year' => $targetYear,
            ]);

            $evaluatorId = $iwrResult['evaluator_id'] ?? $employee->supervisor_id;

            $target->update([
                'evaluator_id' => $evaluatorId,
            ]);

            $this->logAudit($employee->employee_id, 'ipcr_target', $target->id, $iwrResult);

            if ($this->iwrFailed($iwrResult)) {
                return back()->withErrors([
                    'workflow' => $iwrResult['notification'] ?? 'The workflow service is currently unavailable.',
                ]);
            }

            $this->notificationService->notifyTargetSubmitted($target->fresh(['employee']));

            $message = $iwrResult['notification']
                ?? 'IPCR targets submitted successfully. Your supervisor has been notified to review your targets.';

            return back()->with('success', $message);
        }

        return back()->with('success', 'IPCR targets saved as draft.');
    }

    public function evaluationPage(Request $request): Response
    {
        $employeeId = $request->query('employee_id');
        $employee = null;
        $submission = null;

        if ($employeeId) {
            $evaluatorEmployeeId = $request->user()->employee_id;

            $employee = Employee::query()
                ->where('employee_id', $employeeId)
                ->where(function ($q) use ($evaluatorEmployeeId): void {
                    $q->where('supervisor_id', $evaluatorEmployeeId)
                        ->orWhereHas('ipcrSubmissions', fn ($q2) => $q2->where('evaluator_id', $evaluatorEmployeeId));
                })
                ->first();

            abort_unless($employee !== null, 403);

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

    public function reviewerTargetPage(Request $request): Response
    {
        $submissionId = $request->integer('submission_id');
        $submission = $submissionId
            ? IpcrSubmission::query()
                ->with(['employee', 'evaluator', 'hrReviewer', 'pmtReviewer', 'appeal'])
                ->find($submissionId)
            : null;
        $employeeId = $submission?->employee_id ?: (string) $request->string('employee_id');
        $employee = $employeeId !== '' ? Employee::query()->find($employeeId) : null;
        $currentPeriod = $this->currentPeriod();
        $targetPeriodLabel = $submission
            ? (string) data_get($submission->form_payload, 'metadata.period', $currentPeriod['label'])
            : $currentPeriod['label'];
        $currentTarget = $employee
            ? $this->findEmployeeTargetForPeriod($employee, $targetPeriodLabel, $currentPeriod['year'])
            : null;
        ['backUrl' => $backUrl, 'backLabel' => $backLabel] = $this->reviewerTargetBackLink(
            $request->user()->role,
            (string) $request->string('source'),
        );

        return Inertia::render('ipcr-target-review', [
            'viewerRole' => $this->normalizeReviewerRole($request->user()->role),
            'employee' => $employee ? $this->employeeResource($employee) : null,
            'submission' => $submission ? $this->submissionResource($submission) : null,
            'currentTarget' => $currentTarget ? $this->targetResource($currentTarget) : null,
            'targetPeriodLabel' => $targetPeriodLabel,
            'backUrl' => $backUrl,
            'backLabel' => $backLabel,
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

        if ($this->iwrFailed($iwrResult)) {
            return to_route('submit-evaluation')->withErrors([
                'workflow' => $iwrResult['notification'] ?? 'The workflow service is currently unavailable.',
            ]);
        }

        $this->notificationService->createFromIwrResult($iwrResult, 'ipcr', $submission->id, $employeeId);

        return to_route('submit-evaluation')->with(
            'success',
            $iwrResult['notification'] ?? 'IPCR form submitted successfully.',
        );
    }

    public function saveEvaluation(SaveEvaluationRequest $request): RedirectResponse
    {
        $employeeId = $request->validated('employee_id');
        $remarks = $request->validated('remarks');
        $user = $request->user();

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
                    'reviewed_by_name' => $user->name,
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

        $passFail = $rating >= 3.0 ? 'passed' : 'failed';
        $formPayload['workflow_notes']['evaluator_pass_fail'] = $passFail;

        $submission->update([
            'performance_rating' => $rating,
            'criteria_ratings' => null,
            'form_payload' => $formPayload,
            'is_first_submission' => false,
            'evaluator_gave_remarks' => true,
            'rejection_reason' => $remarks,
            'evaluator_pass_fail' => $passFail,
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

        if ($this->iwrFailed($iwrResult)) {
            return to_route('document-management')->withErrors([
                'workflow' => $iwrResult['notification'] ?? 'The workflow service is currently unavailable.',
            ]);
        }

        $this->notificationService->createFromIwrResult($iwrResult, 'ipcr', $submission->id, $employeeId);

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

        if ($this->iwrFailed($iwrResult)) {
            return to_route($user->hasRole('hr-personnel') ? 'admin.hr-leave-management' : 'admin.leave-management')->withErrors([
                'workflow' => $iwrResult['notification'] ?? 'The workflow service is currently unavailable.',
            ]);
        }

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

        if ($this->iwrFailed($iwrResult)) {
            return to_route($route)->withErrors([
                'workflow' => $iwrResult['notification'] ?? 'The workflow service is currently unavailable.',
            ]);
        }

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

        if (! $this->iwrFailed($iwrResult)) {
            $this->notificationService->createFromIwrResult(
                $iwrResult,
                'leave',
                $leaveRequest->id,
                $leaveRequest->employee_id,
            );
        }

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
            'currentTargetPeriod' => $this->currentTargetSubmissionPeriod(),
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
        $formPayload = $this->ipcrFormTemplateService->hydrate(
            $submission->form_payload,
            $submission->employee,
            [
                'workflow_notes' => [
                    'hr_remarks' => $request->validated('hr_remarks'),
                ],
            ],
        );

        $submission->update([
            'form_payload' => $formPayload,
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

        if (in_array($iwrResult['routing_action'] ?? '', ['open_appeal_window', 're_evaluate', 'route_to_pmt'], true)) {
            $updateData['hr_cycle_count'] = $currentHrCycles + 1;
        }

        if (($iwrResult['routing_action'] ?? '') === 'escalate') {
            $updateData['is_escalated'] = true;
            $updateData['escalation_reason'] = $iwrResult['escalation_reason'] ?? 'HR review cycle limit reached';
        }

        $submission->update($updateData);

        $this->logAudit($submission->employee_id, 'ipcr', $submission->id, $iwrResult);

        if ($this->iwrFailed($iwrResult)) {
            return to_route('admin.hr-review')->withErrors([
                'workflow' => $iwrResult['notification'] ?? 'The workflow service is currently unavailable.',
            ]);
        }

        $routingAction = $iwrResult['routing_action'] ?? '';
        if ($routingAction === 'route_to_pmt') {
            $this->notificationService->notifyV51($submission->fresh(['employee']), 'route_to_pmt');
        } elseif ($routingAction === 'open_appeal_window') {
            $this->notificationService->notifyV51($submission->fresh(['employee']), 'open_appeal_window');
        } else {
            $this->notificationService->notifyV51($submission->fresh(['employee']), $routingAction, $request->validated('hr_remarks') ?? '');
        }

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

        if ($this->iwrFailed($iwrResult)) {
            $iwrResult = $this->fallbackAppealRouting($submission, $submission->appeal_count ?? 0, false);
            $submission->update([
                'stage' => $iwrResult['stage'],
                'status' => $iwrResult['status'],
                'routing_action' => $iwrResult['routing_action'],
                'notification' => $iwrResult['notification'],
            ]);
        }

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

        $newAppealCount = ($submission->appeal_count ?? 0) + 1;
        $submission->update(['appeal_count' => $newAppealCount]);

        $iwrResult = $this->iwrService->routeAppeal([
            'stage' => 'appeal',
            'employee_id' => $submission->employee_id,
            'employee_name' => $submission->employee?->name ?? $submission->employee_id,
            'appeal_status' => 'submitted',
            'appeal_count' => $newAppealCount,
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
            'appeal_status' => 'submitted',
            'stage' => $iwrResult['stage'] ?? ($newAppealCount >= 2 ? 'sent_to_pmt' : 'sent_to_evaluator'),
            'status' => $iwrResult['status'] ?? 'routed',
            'routing_action' => $iwrResult['routing_action'] ?? ($newAppealCount >= 2 ? 'route_to_pmt' : 're_evaluate'),
            'notification' => $iwrResult['notification'] ?? 'Appeal submitted.',
        ]);

        if ($this->iwrFailed($iwrResult)) {
            $iwrResult = $this->fallbackAppealRouting($submission, $newAppealCount, true);
            $submission->update([
                'stage' => $iwrResult['stage'],
                'status' => $iwrResult['status'],
                'routing_action' => $iwrResult['routing_action'],
                'notification' => $iwrResult['notification'],
            ]);
        }

        $this->logAudit($submission->employee_id, 'ipcr', $submission->id, $iwrResult);

        if ($newAppealCount === 1) {
            // First appeal — route back to evaluator and notify them
            $this->notificationService->notifyV51($submission->fresh(['employee']), 're_evaluate');
        } else {
            // Second or subsequent appeal — route to PMT
            $this->notificationService->notifyV51($submission->fresh(['employee']), 'route_to_pmt');
        }

        return to_route('submit-evaluation')->with('success', $iwrResult['notification'] ?? 'Appeal submitted.');
    }

    public function downloadAppealEvidence(Request $request, IpcrAppeal $appeal, int $index): BinaryFileResponse|StreamedResponse
    {
        abort_unless($this->canViewAppealEvidence($request->user(), $appeal), 403);

        $path = $appeal->evidence_files[$index] ?? null;

        abort_unless(is_string($path) && $path !== '' && Storage::disk('local')->exists($path), 404);

        if ($request->boolean('inline')) {
            $fullPath = Storage::disk('local')->path($path);
            $mimeType = mime_content_type($fullPath) ?: 'application/octet-stream';

            return response()->stream(
                function () use ($fullPath): void {
                    readfile($fullPath);
                },
                200,
                [
                    'Content-Type' => $mimeType,
                    'Content-Disposition' => 'inline; filename="'.basename($path).'"',
                ],
            );
        }

        return Storage::disk('local')->download($path, basename($path));
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
        $formPayload = $this->ipcrFormTemplateService->hydrate(
            $submission->form_payload,
            $submission->employee,
            [
                'workflow_notes' => [
                    'pmt_remarks' => $request->validated('pmt_remarks'),
                ],
                'sign_off' => [
                    'pmt_chair_name' => $user->name,
                    'pmt_date' => now()->toIso8601String(),
                ],
            ],
        );

        $submission->update([
            'form_payload' => $formPayload,
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

        if ($this->iwrFailed($iwrResult)) {
            return to_route('admin.pmt-review')->withErrors([
                'workflow' => $iwrResult['notification'] ?? 'The workflow service is currently unavailable.',
            ]);
        }

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
            'currentTargetPeriod' => $this->currentTargetSubmissionPeriod(),
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
        $isOpen = $validated['is_open'];
        $userId = $request->user()->id;

        SystemSetting::set('ipcr_period_open', $isOpen ? 'true' : 'false', $userId);
        SystemSetting::set('ipcr_period_label', $validated['label'], $userId);
        SystemSetting::set('ipcr_period_year', (string) $validated['year'], $userId);

        if ($isOpen) {
            $this->notifyEvaluationPeriodOpened($validated['label']);
        }

        return back()->with('success', $isOpen
            ? 'The IPCR submission and evaluation period is now open and employees have been notified.'
            : 'The IPCR evaluation period is now closed.');
    }

    public function notifyIpcrTargetWindow(Request $request): RedirectResponse
    {
        $request->validate([
            'semester' => 'nullable|integer|in:1,2',
            'year' => 'nullable|integer|min:2020|max:2099',
        ]);

        // Derive from calendar when HR does not supply explicit values.
        $month = (int) now()->month;
        $currentYear = (int) now()->year;
        $defaultSemester = $month === 5 ? 2 : 1;
        $defaultYear = $month === 5 ? $currentYear : $currentYear + 1;

        $semester = $request->filled('semester')
            ? (int) $request->input('semester')
            : $defaultSemester;
        $year = $request->filled('year')
            ? (int) $request->input('year')
            : $defaultYear;

        $semesterLabel = $semester === 1 ? 'First Semester' : 'Second Semester';
        $periodLabel = "{$semesterLabel} {$year}";

        SystemSetting::setIpcrTargetMode('open', $request->user()->id);
        SystemSetting::set('ipcr_target_open', 'true', $request->user()->id);
        SystemSetting::set('ipcr_target_semester', (string) $semester, $request->user()->id);
        SystemSetting::set('ipcr_target_year', (string) $year, $request->user()->id);
        SystemSetting::set('ipcr_target_opened_at', now()->toIso8601String(), $request->user()->id);

        $this->notifyTargetWindowOpened($periodLabel);

        return back()->with('success', "Target submission window opened and employees were notified to set their {$periodLabel} IPCR targets.");
    }

    public function closeIpcrTargetWindow(Request $request): RedirectResponse
    {
        $currentTargetPeriod = $this->currentTargetSubmissionPeriod();

        SystemSetting::set('ipcr_target_semester', (string) $currentTargetPeriod['semester'], $request->user()->id);
        SystemSetting::set('ipcr_target_year', (string) $currentTargetPeriod['year'], $request->user()->id);
        SystemSetting::setIpcrTargetMode('closed', $request->user()->id);
        SystemSetting::set('ipcr_target_open', 'false', $request->user()->id);

        return back()->with('success', 'IPCR target submission window closed.');
    }

    public function hrIpcrTargetPage(): Response
    {
        $currentTargetPeriod = $this->currentTargetSubmissionPeriod();

        $submittedTargets = IpcrTarget::query()
            ->where('status', 'submitted')
            ->with(['employee', 'evaluator'])
            ->latest()
            ->get()
            ->map(fn (IpcrTarget $target): array => $this->targetResource($target))
            ->all();

        $finalizedTargets = IpcrTarget::query()
            ->where('hr_finalized', true)
            ->with(['employee', 'evaluator'])
            ->latest()
            ->get()
            ->map(fn (IpcrTarget $target): array => $this->targetResource($target))
            ->all();

        return Inertia::render('admin/ipcr-target-management', [
            'currentTargetPeriod' => $currentTargetPeriod,
            'submittedTargets' => $submittedTargets,
            'finalizedTargets' => $finalizedTargets,
            'stats' => [
                'pending' => IpcrTarget::query()->where('status', 'submitted')->where('evaluator_decision', null)->count(),
                'approvedByEvaluator' => IpcrTarget::query()->where('evaluator_decision', 'approved')->where('hr_finalized', false)->count(),
                'rejected' => IpcrTarget::query()->where('evaluator_decision', 'rejected')->count(),
                'finalized' => IpcrTarget::query()->where('hr_finalized', true)->count(),
            ],
        ]);
    }

    public function evaluatorIpcrTargetPage(Request $request): Response
    {
        $evaluatorEmployee = $request->user()->employee;
        $targetPeriod = $this->currentTargetSubmissionPeriod();

        // All employees supervised by this evaluator (current period targets for the table)
        $subordinates = $evaluatorEmployee
            ? Employee::query()
                ->where('supervisor_id', $evaluatorEmployee->employee_id)
                ->with([
                    'ipcrTargets' => fn ($q) => $q
                        ->forPeriod($targetPeriod['semester'], $targetPeriod['year'])
                        ->latest('id'),
                ])
                ->orderBy('name')
                ->get()
            : collect();

        $employees = $subordinates->map(function (Employee $employee): array {
            /** @var IpcrTarget|null $target */
            $target = $employee->ipcrTargets->first();

            return [
                'employee_id' => $employee->employee_id,
                'name' => $employee->name,
                'job_title' => $employee->job_title,
                'target' => $target ? $this->targetResource($target) : null,
            ];
        })->all();

        // Aggregate stats across ALL periods for subordinates
        $subordinateIds = $subordinates->pluck('employee_id');
        $allTargets = IpcrTarget::query()
            ->whereIn('employee_id', $subordinateIds)
            ->get();

        return Inertia::render('evaluator-ipcr-target', [
            'targetPeriod' => $targetPeriod,
            'employees' => $employees,
            'stats' => [
                'total' => $subordinates->count(),
                'notSet' => $subordinates->filter(
                    fn ($e) => $allTargets->where('employee_id', $e->employee_id)->isEmpty()
                )->count(),
                'pending' => $allTargets->filter(
                    fn ($t) => $t->status === 'submitted' && $t->evaluator_decision === null
                )->count(),
                'approved' => $allTargets->where('evaluator_decision', 'approved')->count(),
                'rejected' => $allTargets->where('evaluator_decision', 'rejected')->count(),
            ],
        ]);
    }

    public function evaluatorReviewTarget(Request $request, IpcrTarget $target): RedirectResponse
    {
        $request->validate([
            'decision' => 'required|in:approved,rejected',
            'remarks' => 'nullable|string|max:2000',
        ]);

        $evaluatorEmployee = $request->user()->employee;
        abort_unless(
            $evaluatorEmployee && $target->evaluator_id === $evaluatorEmployee->employee_id,
            403,
        );

        $target->update([
            'evaluator_decision' => $request->input('decision'),
            'evaluator_remarks' => $request->input('remarks'),
            'evaluator_reviewed_at' => now(),
        ]);

        if ($request->input('decision') === 'approved') {
            // Notify the employee and HR that the target is approved
            $this->notificationService->notifyTargetApproved($target);
        } else {
            // Notify the employee that the target was returned
            $this->notificationService->notifyTargetRejected($target, $request->input('remarks') ?? '');
        }

        return back()->with('success', $request->input('decision') === 'approved'
            ? 'IPCR target approved and employee notified.'
            : 'IPCR target returned to employee.');
    }

    public function hrFinalizeTarget(Request $request, IpcrTarget $target): RedirectResponse
    {
        abort_unless($target->evaluator_decision === 'approved', 403);

        $target->update(['hr_finalized' => true]);

        $this->notificationService->notifyTargetFinalized($target);

        return back()->with('success', 'IPCR target recorded as finalized.');
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

        if ($this->iwrFailed($iwrResult)) {
            return to_route('admin.hr-finalize')->withErrors([
                'workflow' => $iwrResult['notification'] ?? 'The workflow service is currently unavailable.',
            ]);
        }

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

        $recommendationsEnabled = $latestSubmission
            ? Notification::query()
                ->where('user_id', $request->user()->id)
                ->where('type', 'training_suggestion')
                ->where('document_type', 'ipcr')
                ->where('document_id', $latestSubmission->id)
                ->exists()
            : false;

        $recommendations = [];
        $riskLevel = 'NONE';
        $weakAreas = [];

        if ($latestSubmission?->form_payload && $recommendationsEnabled) {
            $seminars = \App\Models\Seminars::query()
                ->orderBy('date')
                ->get()
                ->map(fn (\App\Models\Seminars $seminar): array => [
                    'id' => $seminar->id,
                    'title' => $seminar->title,
                    'description' => $seminar->description,
                    'target_performance_area' => $seminar->target_performance_area,
                    'rating_tier' => $seminar->rating_tier,
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
            'canOpenForm' => true,
            'periodMessage' => $currentPeriod['isOpen']
                ? 'HR has enabled the current evaluation period. Start a new IPCR form when you are ready.'
                : 'HR has not enabled the evaluation period yet. You can still preview the IPCR form below, but editing and submission stay disabled until the period opens.',
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
     * @param  array{label: string, year: int}  $currentPeriod
     * @return array{semester: 1|2, year: int}
     */
    private function resolveSubmissionTargetPeriod(array $currentPeriod): array
    {
        [$semester, $targetYear] = $this->resolveSemesterAndYearFromLabel(
            $currentPeriod['label'],
            $currentPeriod['year'],
        );

        return [
            'semester' => $semester,
            'year' => $targetYear,
        ];
    }

    private function findEmployeeTargetForPeriod(Employee $employee, string $periodLabel, int $fallbackYear): ?IpcrTarget
    {
        [$semester, $targetYear] = $this->resolveSemesterAndYearFromLabel($periodLabel, $fallbackYear);

        return IpcrTarget::query()
            ->where('employee_id', $employee->employee_id)
            ->forPeriod($semester, $targetYear)
            ->first();
    }

    /**
     * @return array{backUrl: string, backLabel: string}
     */
    private function reviewerTargetBackLink(string $role, string $source): array
    {
        if ($role === User::ROLE_HR_PERSONNEL) {
            return $source === 'hr-finalize'
                ? ['backUrl' => route('admin.hr-finalize'), 'backLabel' => 'Back to HR Finalization']
                : ['backUrl' => route('admin.hr-review'), 'backLabel' => 'Back to HR Review'];
        }

        if ($role === User::ROLE_PMT) {
            return ['backUrl' => route('admin.pmt-review'), 'backLabel' => 'Back to PMT Review'];
        }

        return ['backUrl' => route('document-management'), 'backLabel' => 'Back to Evaluator Queue'];
    }

    private function normalizeReviewerRole(string $role): string
    {
        return $role === User::ROLE_HR_PERSONNEL ? 'hr' : $role;
    }

    /**
     * Determine the current IPCR target submission period.
     *
     * Resolution order:
     *
     *   1. If HR has explicitly overridden the window state, that mode wins.
     *      `open` uses the stored semester/year and keeps the window open.
     *      `closed` uses the stored semester/year and keeps the window closed.
     *
     *   2. Otherwise, a legacy explicit open toggle still force-opens the
     *      stored semester/year.
     *
     *   3. Otherwise the calendar heuristic applies:
     *        November → Semester 1 for next year  (window open)
     *        May      → Semester 2 for current year (window open)
     *        All other months                       (window closed)
     *
     * @return array{semester: 1|2, year: int, label: string, submissionOpen: bool, submissionWindowLabel: string, deadlineAt: string|null}
     */
    private function currentTargetSubmissionPeriod(): array
    {
        $month = (int) now()->month;
        $year = (int) now()->year;
        $configuredSemester = (int) SystemSetting::get('ipcr_target_semester', 1);
        $configuredYear = (int) SystemSetting::get('ipcr_target_year', $year);

        $targetMode = (string) SystemSetting::get('ipcr_target_mode', 'auto');
        $isExplicitlyOpen = (bool) SystemSetting::get('ipcr_target_open', false);

        if ($targetMode === 'open' || ($targetMode === 'auto' && $isExplicitlyOpen)) {
            $semester = in_array($configuredSemester, [1, 2], true) ? $configuredSemester : 1;
            $targetYear = $configuredYear;

            /** @var 1|2 $semester */
            $windowLabel = $semester === 1 ? 'November '.($targetYear - 1) : 'May '.$targetYear;

            $openedAt = SystemSetting::get('ipcr_target_opened_at', null);
            if ($openedAt) {
                $deadline = \Carbon\Carbon::parse((string) $openedAt)->addDays(15);
                if (now()->isAfter($deadline)) {
                    return $this->targetPeriodPayload($semester, $targetYear, false, $windowLabel, (string) $openedAt);
                }
            }

            return $this->targetPeriodPayload($semester, $targetYear, true, $windowLabel, $openedAt ? (string) $openedAt : null);
        }

        if ($targetMode === 'closed') {
            $semester = in_array($configuredSemester, [1, 2], true) ? $configuredSemester : 1;
            $targetYear = $configuredYear;
            $windowLabel = $semester === 1 ? 'November '.($targetYear - 1) : 'May '.$targetYear;
            $openedAt = SystemSetting::get('ipcr_target_opened_at', null);

            return $this->targetPeriodPayload($semester, $targetYear, false, $windowLabel, $openedAt ? (string) $openedAt : null);
        }

        $openedAt = SystemSetting::get('ipcr_target_opened_at', null);

        // Calendar heuristic — November and May auto-open as per the yearly cycle.
        if ($month === 11) {
            return $this->targetPeriodPayload(1, $year + 1, true, 'November '.$year, $openedAt ? (string) $openedAt : null);
        }

        if ($month === 5) {
            return $this->targetPeriodPayload(2, $year, true, 'May '.$year, $openedAt ? (string) $openedAt : null);
        }

        $semester = in_array($configuredSemester, [1, 2], true) ? $configuredSemester : 1;
        $targetYear = $configuredYear;
        $windowLabel = $semester === 1 ? 'November '.($targetYear - 1) : 'May '.$targetYear;

        return $this->targetPeriodPayload($semester, $targetYear, false, $windowLabel, $openedAt ? (string) $openedAt : null);
    }

    /**
     * @return array{semester: 1|2, year: int, label: string, submissionOpen: bool, submissionWindowLabel: string, deadlineAt: string|null}
     */
    private function targetPeriodPayload(int $semester, int $year, bool $submissionOpen, string $submissionWindowLabel, ?string $openedAt = null): array
    {
        $semesterLabel = $semester === 1 ? 'First Semester' : 'Second Semester';
        $deadlineAt = $openedAt ? \Carbon\Carbon::parse($openedAt)->addDays(15)->toIso8601String() : null;

        return [
            'semester' => $semester,
            'year' => $year,
            'label' => "{$semesterLabel} {$year}",
            'submissionOpen' => $submissionOpen,
            'submissionWindowLabel' => $submissionWindowLabel,
            'deadlineAt' => $deadlineAt,
        ];
    }

    /**
     * @return array{0: 1|2, 1: int}
     */
    private function resolveSemesterAndYearFromLabel(string $periodLabel, int $fallbackYear): array
    {
        preg_match('/(20\d{2})/', $periodLabel, $yearMatches);

        $normalizedLabel = strtolower(str_replace(['–', '—'], '-', $periodLabel));
        $resolvedYear = isset($yearMatches[1]) ? (int) $yearMatches[1] : $fallbackYear;
        $isSecondSemester = str_contains($normalizedLabel, 'second')
            || (str_contains($normalizedLabel, 'july') && str_contains($normalizedLabel, 'december'));

        return [$isSecondSemester ? 2 : 1, $resolvedYear];
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
    private function targetResource(IpcrTarget $target): array
    {
        return [
            'id' => $target->id,
            'employee_id' => $target->employee_id,
            'semester' => $target->semester,
            'target_year' => $target->target_year,
            'form_payload' => $target->form_payload,
            'status' => $target->status,
            'submitted_at' => $target->submitted_at?->toIso8601String(),
            'evaluator_id' => $target->evaluator_id,
            'evaluator_decision' => $target->evaluator_decision,
            'evaluator_remarks' => $target->evaluator_remarks,
            'evaluator_reviewed_at' => $target->evaluator_reviewed_at?->toIso8601String(),
            'hr_finalized' => $target->hr_finalized,
            'employee' => $target->relationLoaded('employee') && $target->employee
                ? $this->employeeResource($target->employee)
                : null,
            'evaluator' => $target->relationLoaded('evaluator') && $target->evaluator
                ? $this->employeeResource($target->evaluator)
                : null,
        ];
    }

    private function repairLegacySubmission(?IpcrSubmission $submission): ?IpcrSubmission
    {
        return $this->repairLegacyAppealSubmission(
            $this->repairLegacyHrReviewSubmission($submission),
        );
    }

    private function repairLegacyHrReviewSubmission(?IpcrSubmission $submission): ?IpcrSubmission
    {
        if (! $submission) {
            return null;
        }

        if (
            $submission->status !== 'error'
            || $submission->stage !== 'hr_review'
            || $submission->routing_action !== 'validation_failed'
            || ! in_array($submission->hr_decision, ['correct', 'incorrect'], true)
        ) {
            return $submission;
        }

        $submission->loadMissing(['employee', 'evaluator', 'hrReviewer', 'pmtReviewer', 'appeal']);

        $iwrResult = $this->iwrService->routeHrReview([
            'stage' => 'hr_review',
            'employee_id' => $submission->employee_id,
            'employee_name' => $submission->employee?->name ?? $submission->employee_id,
            'hr_decision' => $submission->hr_decision,
            'hr_remarks' => $submission->hr_remarks,
            'hr_cycle_count' => $submission->hr_cycle_count,
        ]);

        if ($this->iwrFailed($iwrResult)) {
            return $submission;
        }

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

        if (in_array($iwrResult['routing_action'] ?? '', ['open_appeal_window', 're_evaluate', 'route_to_pmt'], true)) {
            $updateData['hr_cycle_count'] = $submission->hr_cycle_count + 1;
        }

        if (($iwrResult['routing_action'] ?? '') === 'escalate') {
            $updateData['is_escalated'] = true;
            $updateData['escalation_reason'] = $iwrResult['escalation_reason'] ?? 'HR review cycle limit reached';
        }

        $submission->update($updateData);

        $this->logAudit($submission->employee_id, 'ipcr', $submission->id, $iwrResult);

        $routingAction = $iwrResult['routing_action'] ?? '';
        if ($routingAction === 'route_to_pmt') {
            $this->notificationService->notifyV51($submission->fresh(['employee']), 'route_to_pmt');
        } elseif ($routingAction === 'open_appeal_window') {
            $this->notificationService->notifyV51($submission->fresh(['employee']), 'open_appeal_window');
        } elseif ($routingAction !== '') {
            $this->notificationService->notifyV51($submission->fresh(['employee']), $routingAction, $submission->hr_remarks ?? '');
        }

        return $submission->fresh(['employee', 'evaluator', 'hrReviewer', 'pmtReviewer', 'appeal']);
    }

    private function repairLegacyAppealSubmission(?IpcrSubmission $submission): ?IpcrSubmission
    {
        if (! $submission) {
            return null;
        }

        if (
            $submission->status !== 'error'
            || $submission->stage !== 'appeal'
            || $submission->routing_action !== 'validation_failed'
            || ! in_array($submission->appeal_status, ['submitted', 'no_appeal'], true)
        ) {
            return $submission;
        }

        $submission->loadMissing(['employee', 'evaluator', 'hrReviewer', 'pmtReviewer', 'appeal']);

        $appealCount = $submission->appeal_count ?? 0;
        $hasAppeal = $submission->appeal_status === 'submitted';
        $appealReason = $hasAppeal
            ? ($submission->appeal?->appeal_reason ?? data_get($submission->form_payload, 'workflow_notes.appeal_reason'))
            : null;
        $evidenceFiles = $hasAppeal
            ? ($submission->appeal?->evidence_files ?? [])
            : [];

        if ($hasAppeal && (
            ! is_string($appealReason)
            || trim($appealReason) === ''
            || ! is_array($evidenceFiles)
            || count($evidenceFiles) === 0
        )) {
            return $submission;
        }

        $iwrResult = $this->iwrService->routeAppeal([
            'stage' => 'appeal',
            'employee_id' => $submission->employee_id,
            'employee_name' => $submission->employee?->name ?? $submission->employee_id,
            'appeal_status' => $hasAppeal ? 'submitted' : 'no_appeal',
            'appeal_count' => $appealCount,
            'appeal_reason' => $appealReason,
            'evidence_files' => $evidenceFiles,
        ]);

        if ($this->iwrFailed($iwrResult)) {
            $iwrResult = $this->fallbackAppealRouting($submission, $appealCount, $hasAppeal);
        }

        $submission->update([
            'stage' => $iwrResult['stage'] ?? $submission->stage,
            'status' => $iwrResult['status'] ?? $submission->status,
            'routing_action' => $iwrResult['routing_action'] ?? $submission->routing_action,
            'notification' => $iwrResult['notification'] ?? $submission->notification,
            'appeal_status' => $hasAppeal ? 'submitted' : 'no_appeal',
        ]);

        $this->logAudit($submission->employee_id, 'ipcr', $submission->id, $iwrResult);

        $routingAction = $iwrResult['routing_action'] ?? '';
        if ($routingAction === 'route_to_pmt') {
            $this->notificationService->notifyV51($submission->fresh(['employee']), 'route_to_pmt');
        } elseif ($routingAction === 're_evaluate') {
            $this->notificationService->notifyV51($submission->fresh(['employee']), 're_evaluate');
        }

        return $submission->fresh(['employee', 'evaluator', 'hrReviewer', 'pmtReviewer', 'appeal']);
    }

    /**
     * @return array<string, mixed>
     */
    private function fallbackAppealRouting(IpcrSubmission $submission, int $appealCount, bool $hasAppeal): array
    {
        $employeeName = $submission->employee?->name ?? $submission->employee_id;

        if (! $hasAppeal) {
            return [
                'status' => 'routed',
                'stage' => 'sent_to_pmt',
                'routing_action' => 'route_to_pmt',
                'notification' => 'No appeal submitted. Routed to PMT review.',
            ];
        }

        if ($appealCount <= 1) {
            return [
                'status' => 'routed',
                'stage' => 'sent_to_evaluator',
                'routing_action' => 're_evaluate',
                'notification' => "First appeal submitted by {$employeeName}. Routed back to evaluator for re-evaluation.",
            ];
        }

        return [
            'status' => 'routed',
            'stage' => 'sent_to_pmt',
            'routing_action' => 'route_to_pmt',
            'notification' => "Second appeal submitted by {$employeeName}. Routed to PMT for policy-level validation.",
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function submissionResource(IpcrSubmission $submission): array
    {
        $submission->loadMissing(['employee', 'evaluator', 'hrReviewer', 'pmtReviewer', 'appeal']);
        $payloadWorkflowNotes = $submission->form_payload['workflow_notes'] ?? [];
        $payloadSignOff = $submission->form_payload['sign_off'] ?? [];

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
                    'reviewed_by_name' => $this->resolveSignOffName(
                        $payloadSignOff['reviewed_by_name'] ?? null,
                        $submission->evaluator?->name,
                        $submission->evaluator_id,
                    ),
                    'pmt_chair_name' => $this->resolveSignOffName(
                        $payloadSignOff['pmt_chair_name'] ?? null,
                        $submission->pmtReviewer?->name,
                        $submission->pmt_reviewer_id,
                    ),
                    'final_rater_name' => $this->resolveSignOffName(
                        $payloadSignOff['final_rater_name'] ?? null,
                        $submission->hrReviewer?->name,
                        $submission->hr_reviewer_id,
                    ),
                    'head_of_agency_name' => $this->resolveSignOffName(
                        $payloadSignOff['head_of_agency_name'] ?? null,
                        $submission->hrReviewer?->name,
                        $submission->hr_reviewer_id,
                    ),
                    'ratee_date' => $submission->created_at?->toIso8601String(),
                    'reviewed_by_date' => $payloadSignOff['reviewed_by_date']
                        ?? ($submission->performance_rating !== null ? $submission->updated_at?->toIso8601String() : null),
                    'pmt_date' => $payloadSignOff['pmt_date']
                        ?? ($submission->pmt_decision ? $submission->updated_at?->toIso8601String() : null),
                    'finalized_date' => $payloadSignOff['finalized_date'] ?? $submission->finalized_at?->toIso8601String(),
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
            'appeal_count' => $submission->appeal_count ?? 0,
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

    private function resolveSignOffName(?string $savedName, ?string $employeeName, ?string $employeeId): ?string
    {
        if ($savedName) {
            return $savedName;
        }

        return $this->resolveReviewerName($employeeName, $employeeId);
    }

    private function resolveReviewerName(?string $employeeName, ?string $employeeId): ?string
    {
        if ($employeeId) {
            $userName = User::query()
                ->where('employee_id', $employeeId)
                ->value('name');

            if ($userName) {
                return $userName;
            }
        }

        if ($employeeName) {
            return $employeeName;
        }

        if (! $employeeId) {
            return null;
        }

        return null;
    }

    private function iwrFailed(array $result): bool
    {
        return ($result['status'] ?? null) === 'error';
    }

    private function canViewAppealEvidence(User $user, IpcrAppeal $appeal): bool
    {
        if ($user->employee_id === $appeal->employee_id) {
            return true;
        }

        if ($user->hasRole(User::ROLE_HR_PERSONNEL) || $user->hasRole(User::ROLE_PMT)) {
            return true;
        }

        if ($user->hasRole(User::ROLE_EVALUATOR)) {
            $submission = $appeal->submission;

            return $submission !== null && $user->employee_id === $submission->evaluator_id;
        }

        return false;
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

    private function notifyTargetWindowOpened(string $periodLabel): void
    {
        $users = User::query()
            ->where('role', User::ROLE_EMPLOYEE)
            ->get(['id']);

        foreach ($users as $user) {
            Notification::query()->create([
                'user_id' => $user->id,
                'type' => 'ipcr_target_window_opened',
                'title' => 'IPCR Target Setting Window Open',
                'message' => "The {$periodLabel} IPCR target-setting window is now open. Please complete your IPCR target form.",
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
