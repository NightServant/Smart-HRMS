<?php

namespace App\Services;

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
                'route_back_to_evaluator' => "Your IPCR received a rating below 2.5. It has been sent back to {$evaluatorName} for remarks.",
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
