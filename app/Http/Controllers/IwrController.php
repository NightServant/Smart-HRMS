<?php

namespace App\Http\Controllers;

use App\Models\IpcrSubmission;
use App\Models\IwrAuditLog;
use App\Models\LeaveRequest;
use App\Services\IwrService;
use App\Services\NotificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class IwrController extends Controller
{
    public function __construct(
        private IwrService $iwrService,
        private NotificationService $notificationService,
    ) {}

    public function evaluationPage(Request $request): Response
    {
        $employeeId = $request->query('employee_id');
        $employee = null;
        $submission = null;

        if ($employeeId) {
            $employee = \App\Models\Employee::query()->find($employeeId);
            $submission = IpcrSubmission::query()
                ->where('employee_id', $employeeId)
                ->latest()
                ->first();
        }

        return Inertia::render('evaluation-page', [
            'employee' => $employee ? [
                'employee_id' => $employee->employee_id,
                'name' => $employee->name,
                'job_title' => $employee->job_title,
            ] : null,
            'submission' => $submission ? [
                'id' => $submission->id,
                'performance_rating' => $submission->performance_rating,
                'criteria_ratings' => $submission->criteria_ratings,
                'status' => $submission->status,
                'stage' => $submission->stage,
                'evaluator_gave_remarks' => $submission->evaluator_gave_remarks,
                'remarks' => $submission->rejection_reason,
                'notification' => $submission->notification,
            ] : null,
        ]);
    }

    public function submitIpcr(Request $request): RedirectResponse
    {
        $request->validate([
            'employee_id' => 'required|string|exists:employees,employee_id',
            'period' => 'required|string',
        ]);

        $employeeId = $request->string('employee_id')->toString();

        $submission = IpcrSubmission::query()->create([
            'employee_id' => $employeeId,
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

        $this->notificationService->createFromIwrResult(
            $iwrResult, 'ipcr', $submission->id, $employeeId,
        );

        $message = $iwrResult['notification'] ?? 'IPCR form submitted successfully.';

        return to_route('submit-evaluation')->with('success', $message);
    }

    public function saveEvaluation(Request $request): RedirectResponse
    {
        $request->validate([
            'employee_id' => 'required|string|exists:employees,employee_id',
            'performance_rating' => 'required|numeric|min:1|max:5',
            'evaluator_gave_remarks' => 'required|boolean',
            'remarks' => 'nullable|string|max:2000',
            'criteria_ratings' => 'nullable|json',
        ]);

        $employeeId = $request->string('employee_id')->toString();
        $rating = (float) $request->input('performance_rating');
        $gaveRemarks = (bool) $request->input('evaluator_gave_remarks');
        $criteriaRatings = $request->input('criteria_ratings')
            ? json_decode($request->input('criteria_ratings'), true)
            : null;

        $submission = IpcrSubmission::query()
            ->where('employee_id', $employeeId)
            ->latest()
            ->firstOrFail();

        $submission->update([
            'performance_rating' => $rating,
            'criteria_ratings' => $criteriaRatings,
            'is_first_submission' => false,
            'evaluator_gave_remarks' => $gaveRemarks,
            'rejection_reason' => $request->input('remarks'),
        ]);

        $iwrResult = $this->iwrService->routeIpcr([
            'employee_id' => $employeeId,
            'is_first_submission' => false,
            'performance_rating' => $rating,
            'evaluator_gave_remarks' => $gaveRemarks,
        ]);

        $updateData = [
            'status' => $iwrResult['status'] ?? null,
            'stage' => $iwrResult['stage'] ?? null,
            'routing_action' => $iwrResult['routing_action'] ?? null,
            'evaluator_id' => $iwrResult['evaluator_id'] ?? null,
            'confidence_pct' => $iwrResult['confidence_pct'] ?? null,
            'notification' => $iwrResult['notification'] ?? null,
        ];

        if (! empty($iwrResult['reason'])) {
            $updateData['rejection_reason'] = $iwrResult['reason'];
        }

        $submission->update($updateData);

        $this->logAudit($employeeId, 'ipcr', $submission->id, $iwrResult);

        $this->notificationService->createFromIwrResult(
            $iwrResult, 'ipcr', $submission->id, $employeeId,
        );

        $message = $iwrResult['notification'] ?? 'Evaluation saved.';

        return to_route('document-management')->with('success', $message);
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

        $iwrNotification = $iwrResult['notification'] ?? 'Leave application rejected.';
        $message = $iwrNotification.' Reason: "'.$rejectionReason.'"';

        // Update the notification records to include the rejection reason
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
            $iwrResult, 'leave', $leaveRequest->id, $leaveRequest->employee_id,
        );

        return $iwrResult;
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
