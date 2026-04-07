<?php

namespace App\Services;

use App\Models\IpcrSubmission;
use App\Models\IpcrTarget;
use App\Models\Notification;
use App\Models\User;

class NotificationService
{
    public function createFromIwrResult(
        array $iwrResult,
        string $documentType,
        int $documentId,
        string $employeeId,
    ): void {
        $status = $iwrResult['status'] ?? 'unknown';
        $isImportant = in_array($status, ['returned', 'action_required']);
        $docLabel = $documentType === 'ipcr' ? 'IPCR' : 'Leave Application';
        $employeeName = $iwrResult['employee_name'] ?? $employeeId;
        $routingAction = $iwrResult['routing_action'] ?? '';

        // Notify the employee who submitted
        $employeeUser = User::query()->where('employee_id', $employeeId)->first();
        if ($employeeUser) {
            $this->create(
                $employeeUser->id,
                $this->typeFromStatus($status, $documentType),
                $this->employeeTitle($status, $docLabel),
                $this->employeeMessage($iwrResult, $documentType, $employeeName),
                $documentType,
                $documentId,
                $isImportant,
            );
        }

        // Notify the evaluator/approver if routed to someone
        $approverId = $iwrResult['evaluator_id'] ?? $iwrResult['approver_id'] ?? null;
        if ($approverId && $status === 'routed') {
            $approverUser = $approverId === 'HR'
                ? User::query()->where('role', User::ROLE_HR_PERSONNEL)->first()
                : User::query()->where('employee_id', $approverId)->first();

            if ($approverUser) {
                $this->create(
                    $approverUser->id,
                    $documentType.'_pending_evaluation',
                    $this->approverTitle($documentType, $routingAction),
                    $this->approverMessage($iwrResult, $documentType, $employeeName, $routingAction),
                    $documentType,
                    $documentId,
                    false,
                );
            }
        }
    }

    private function create(
        int $userId,
        string $type,
        string $title,
        string $message,
        string $documentType,
        int $documentId,
        bool $isImportant,
    ): void {
        Notification::query()->create([
            'user_id' => $userId,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'document_type' => $documentType,
            'document_id' => $documentId,
            'is_important' => $isImportant,
        ]);
    }

    private function typeFromStatus(string $status, string $documentType): string
    {
        return match ($status) {
            'routed' => $documentType.'_routed',
            'completed' => $documentType.'_completed',
            'returned' => $documentType.'_returned',
            'action_required' => $documentType.'_action_required',
            default => $documentType.'_update',
        };
    }

    private function employeeTitle(string $status, string $docLabel): string
    {
        return match ($status) {
            'routed' => "Your {$docLabel} has been routed",
            'completed' => "Your {$docLabel} is complete",
            'returned' => "Your {$docLabel} was returned",
            'action_required' => "Your {$docLabel} requires action",
            default => "Your {$docLabel} status update",
        };
    }

    private function employeeMessage(array $result, string $documentType, string $employeeName): string
    {
        $status = $result['status'] ?? '';
        $action = $result['routing_action'] ?? '';

        if ($documentType === 'ipcr') {
            $evaluatorName = $result['evaluator_name'] ?? 'your evaluator';
            $rating = $result['rating'] ?? null;

            return match ($action) {
                'route_to_evaluator' => "Your IPCR form has been submitted and sent to {$evaluatorName} for evaluation.",
                'save_data' => $rating !== null
                    ? 'Your IPCR evaluation is complete with a rating of '.number_format((float) $rating, 2).'. Data has been saved.'
                    : 'Your IPCR evaluation is complete. Data has been saved.',
                'route_back_to_evaluator' => "Your IPCR needs evaluator remarks before it can proceed. It has been sent back to {$evaluatorName}.",
                default => $result['notification'] ?? 'Your IPCR has been updated.',
            };
        }

        // Leave application
        $leaveType = $result['leave_type'] ?? '';
        $leaveLabel = str_replace('_', ' ', $leaveType);
        $leaveLabel = $leaveLabel ? ucwords($leaveLabel) : 'leave';
        $days = $result['days_requested'] ?? '';
        $daysText = $days ? " ({$days} day(s))" : '';
        $approverName = $result['approver_name'] ?? '';

        if ($action === 'route_to_department_head') {
            return "Your {$leaveLabel}{$daysText} request has been submitted and sent to {$approverName} for review.";
        }

        if ($action === 'route_to_hr') {
            return "Your {$leaveLabel} request was approved by the Department Head and forwarded to the HR Officer for final processing.";
        }

        if ($action === 'completed') {
            $iwrMsg = $result['notification'] ?? '';
            if (str_contains($iwrMsg, 'has been approved')) {
                return "Your {$leaveLabel}{$daysText} request has been fully approved. Enjoy your leave!";
            }
            if (str_contains($iwrMsg, 'rejected by the Department Head')) {
                return "Your {$leaveLabel} request was rejected by the Department Head. The rejection reason has been recorded.";
            }
            if (str_contains($iwrMsg, 'rejected by the HR Officer') || str_contains($iwrMsg, 'rejected by HR')) {
                return "Your {$leaveLabel} request was rejected by the HR Officer. The rejection reason has been recorded.";
            }

            return "Your {$leaveLabel} request has been processed.";
        }

        if ($status === 'returned') {
            $iwrMsg = $result['notification'] ?? '';
            $reason = '';
            if (str_contains($iwrMsg, 'Reason: ')) {
                $reason = ' '.substr($iwrMsg, strpos($iwrMsg, 'Reason: '));
            }

            return "Your {$leaveLabel} request was returned.{$reason}";
        }

        return $result['notification'] ?? 'Your leave application has been updated.';
    }

    private function approverTitle(string $documentType, string $routingAction): string
    {
        $docLabel = $documentType === 'ipcr' ? 'IPCR' : 'Leave request';

        if ($routingAction === 'route_back_to_evaluator') {
            return "{$docLabel} needs your remarks";
        }

        return "New {$docLabel} awaiting your review";
    }

    /**
     * Create notifications for IPCR v5.1 workflow phases.
     */
    public function notifyV51(IpcrSubmission $submission, string $action, string $message = ''): void
    {
        $employeeUser = User::query()->where('employee_id', $submission->employee_id)->first();
        $employeeName = $employeeUser?->name ?? $submission->employee_id;

        match ($action) {
            'route_to_hr' => $this->notifyRoleUsers(
                User::ROLE_HR_PERSONNEL, 'ipcr_pending_hr_review', 'New IPCR awaiting HR review',
                "{$employeeName}'s IPCR has completed evaluator review and is ready for HR checking.",
                $submission->id,
            ),
            'open_appeal_window' => $employeeUser ? $this->create(
                $employeeUser->id, 'ipcr_appeal_window', 'IPCR Appeal Window Opened',
                "Your IPCR passed HR checking and is now open for appeal for 72 hours. You may accept the results or submit an appeal with supporting evidence. {$message}",
                'ipcr', $submission->id, true,
            ) : null,
            'appeal_expired' => $employeeUser ? $this->create(
                $employeeUser->id, 'ipcr_appeal_expired', 'Appeal Window Expired',
                'Your IPCR appeal window has expired. The submission will now proceed to PMT review.',
                'ipcr', $submission->id, false,
            ) : null,
            'route_to_pmt' => $this->notifyRoleUsers(
                User::ROLE_PMT, 'ipcr_pending_pmt_review', 'New IPCR awaiting PMT review',
                $submission->appeal_status === 'appealed'
                    ? "{$employeeName} submitted an appeal on their IPCR. Please review the evidence and take action."
                    : "{$employeeName}'s IPCR is ready for PMT review after the appeal window closed without an appeal.",
                $submission->id,
            ),
            'route_to_hr_finalize' => $this->notifyRoleUsers(
                User::ROLE_HR_PERSONNEL, 'ipcr_pending_finalization', 'IPCR ready for finalization',
                "{$employeeName}'s IPCR is ready for final recording. Please review and finalize.",
                $submission->id,
            ),
            're_evaluate' => $this->notifyEvaluator($submission, $employeeName),
            'escalate' => $this->notifyRoleUsers(
                User::ROLE_ADMINISTRATOR, 'ipcr_escalated', 'IPCR Escalated',
                "{$employeeName}'s IPCR has been escalated. {$message}",
                $submission->id,
            ),
            'finalized' => $employeeUser ? $this->create(
                $employeeUser->id, 'ipcr_finalized', 'Your IPCR has been finalized',
                "Your IPCR has been finalized with a rating of {$submission->final_rating} ({$submission->adjectival_rating}).",
                'ipcr', $submission->id, false,
            ) : null,
            default => null,
        };
    }

    private function notifyRoleUsers(string $role, string $type, string $title, string $message, int $submissionId): void
    {
        User::query()->where('role', $role)->each(function (User $user) use ($type, $title, $message, $submissionId): void {
            $this->create($user->id, $type, $title, $message, 'ipcr', $submissionId, false);
        });
    }

    private function notifyEvaluator(IpcrSubmission $submission, string $employeeName): void
    {
        if (! $submission->evaluator_id) {
            return;
        }

        $evaluatorUser = User::query()->where('employee_id', $submission->evaluator_id)->first();
        if ($evaluatorUser) {
            $returnSource = $submission->pmt_decision === 'rejected' ? 'PMT' : 'HR';
            $this->create(
                $evaluatorUser->id, 'ipcr_re_evaluate', 'IPCR returned for re-evaluation',
                "{$employeeName}'s IPCR was returned by {$returnSource}. Please re-evaluate and resubmit it.",
                'ipcr', $submission->id, true,
            );
        }
    }

    public function notifyTargetSubmitted(IpcrTarget $target): void
    {
        $employeeName = $target->employee?->name ?? $target->employee_id;
        $semesterLabel = $target->semester === 1 ? 'First Semester' : 'Second Semester';
        $periodLabel = "{$semesterLabel} {$target->target_year}";

        if ($target->evaluator_id) {
            $evaluatorUser = User::query()->where('employee_id', $target->evaluator_id)->first();
            if ($evaluatorUser) {
                $this->create(
                    $evaluatorUser->id,
                    'ipcr_target_pending',
                    'IPCR Target Awaiting Review',
                    "{$employeeName} submitted their IPCR targets for {$periodLabel}. Please review and approve or return.",
                    'ipcr_target',
                    $target->id,
                    false,
                );
            }
        }
    }

    public function notifyTargetApproved(IpcrTarget $target): void
    {
        $employeeUser = User::query()->where('employee_id', $target->employee_id)->first();
        $semesterLabel = $target->semester === 1 ? 'First Semester' : 'Second Semester';
        $periodLabel = "{$semesterLabel} {$target->target_year}";

        if ($employeeUser) {
            $this->create(
                $employeeUser->id,
                'ipcr_target_approved',
                'IPCR Target Approved',
                "Your IPCR targets for {$periodLabel} have been approved by your supervisor and forwarded to HR for final recording.",
                'ipcr_target',
                $target->id,
                false,
            );
        }

        $hrMessage = ($target->employee?->name ?? $target->employee_id)."'s IPCR targets for {$periodLabel} were approved by the supervisor. Please record and finalize them.";
        User::query()->where('role', User::ROLE_HR_PERSONNEL)->each(function (User $user) use ($hrMessage, $target): void {
            $this->create($user->id, 'ipcr_target_approved', 'IPCR Target Approved — Awaiting HR Recording', $hrMessage, 'ipcr_target', $target->id, false);
        });
    }

    public function notifyTargetRejected(IpcrTarget $target, string $remarks): void
    {
        $employeeUser = User::query()->where('employee_id', $target->employee_id)->first();
        $semesterLabel = $target->semester === 1 ? 'First Semester' : 'Second Semester';
        $periodLabel = "{$semesterLabel} {$target->target_year}";

        if ($employeeUser) {
            $this->create(
                $employeeUser->id,
                'ipcr_target_returned',
                'IPCR Target Returned',
                "Your IPCR targets for {$periodLabel} were returned by your supervisor for revision. Remarks: {$remarks}",
                'ipcr_target',
                $target->id,
                true,
            );
        }
    }

    public function notifyTargetFinalized(IpcrTarget $target): void
    {
        $employeeUser = User::query()->where('employee_id', $target->employee_id)->first();
        $semesterLabel = $target->semester === 1 ? 'First Semester' : 'Second Semester';
        $periodLabel = "{$semesterLabel} {$target->target_year}";

        if ($employeeUser) {
            $this->create(
                $employeeUser->id,
                'ipcr_target_finalized',
                'IPCR Target Finalized',
                "Your IPCR targets for {$periodLabel} have been officially recorded by HR.",
                'ipcr_target',
                $target->id,
                false,
            );
        }
    }

    private function approverMessage(array $result, string $documentType, string $employeeName, string $routingAction): string
    {
        if ($documentType === 'ipcr') {
            if ($routingAction === 'route_back_to_evaluator') {
                $rating = $result['rating'] ?? null;
                $ratingText = $rating !== null ? ' (rating: '.number_format((float) $rating, 2).')' : '';

                return "{$employeeName}'s IPCR received a failing score{$ratingText}. Please provide your remarks.";
            }

            return "{$employeeName} submitted an IPCR form for your evaluation. Please review and rate their performance.";
        }

        // Leave application
        $leaveType = $result['leave_type'] ?? '';
        $leaveLabel = $leaveType ? ucwords(str_replace('_', ' ', $leaveType)) : 'leave';
        $days = $result['days_requested'] ?? '';
        $daysText = $days ? " for {$days} day(s)" : '';

        if ($routingAction === 'route_to_hr') {
            return "{$employeeName}'s {$leaveLabel} request{$daysText} has been approved by the Department Head and forwarded to you for final processing.";
        }

        return "{$employeeName} filed a {$leaveLabel} request{$daysText}. Please review and take action.";
    }
}
