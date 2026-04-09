<?php

namespace Database\Seeders;

use App\Models\IwrAuditLog;
use App\Models\LeaveRequest;
use App\Models\Notification;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class LeaveWorkflowSeeder extends Seeder
{
    private const SAMPLE_YEAR = 2026;

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->resetWorkflowData();

        $employeeUsers = User::query()
            ->where('role', User::ROLE_EMPLOYEE)
            ->whereNotNull('employee_id')
            ->with('employee:id,employee_id,name,job_title')
            ->orderBy('employee_id')
            ->get()
            ->values();

        if ($employeeUsers->isEmpty()) {
            throw new RuntimeException('The leave workflow seeder expects at least one employee record to exist.');
        }

        $evaluator = User::query()
            ->where('role', User::ROLE_EVALUATOR)
            ->orderBy('name')
            ->first();

        $hrPersonnel = User::query()
            ->where('role', User::ROLE_HR_PERSONNEL)
            ->orderBy('name')
            ->first();

        if (! $evaluator || ! $hrPersonnel) {
            throw new RuntimeException('The leave workflow seeder expects evaluator and HR personnel users to exist.');
        }

        foreach ($employeeUsers as $index => $user) {
            $state = $this->workflowStateForIndex($index, $user);
            $leaveRequest = LeaveRequest::query()->forceCreate([
                'user_id' => $user->id,
                'employee_id' => $user->employee_id,
                'leave_type' => $state['leave_type'],
                'start_date' => $state['start_date']->toDateString(),
                'end_date' => $state['end_date']->toDateString(),
                'reason' => $state['reason'],
                'days_requested' => $state['days_requested'],
                'status' => $state['status'],
                'medical_certificate_path' => null,
                'marriage_certificate_path' => null,
                'solo_parent_id_path' => null,
                'has_medical_certificate' => false,
                'has_solo_parent_id' => false,
                'has_marriage_certificate' => false,
                'dh_decision' => $state['dh_decision'],
                'hr_decision' => $state['hr_decision'],
                'has_rejection_reason' => $state['has_rejection_reason'],
                'rejection_reason_text' => $state['rejection_reason_text'],
                'stage' => $state['stage'],
                'routing_action' => $state['routing_action'],
                'approver_id' => $state['approver_id'],
                'confidence_pct' => $state['confidence_pct'],
                'notification' => $state['notification'],
                'created_at' => $state['created_at'],
                'updated_at' => $state['updated_at'],
            ]);

            $this->seedWorkflowNotifications($leaveRequest, $user, $evaluator, $hrPersonnel, $state);
            $this->seedAuditTrail($leaveRequest, $user, $state);
        }
    }

    private function resetWorkflowData(): void
    {
        $notificationQuery = Notification::query()
            ->where('document_type', 'leave')
            ->orWhere(function ($query): void {
                $query->where('type', 'like', 'leave%');
            });

        $auditQuery = IwrAuditLog::query()
            ->where('document_type', 'leave');

        if (DB::getDriverName() === 'sqlite') {
            LeaveRequest::query()->delete();
            $auditQuery->delete();
            $notificationQuery->delete();

            return;
        }

        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        LeaveRequest::query()->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1');

        $auditQuery->delete();
        $notificationQuery->delete();
    }

    /**
     * @return array{
     *     leave_type: string,
     *     start_date: Carbon,
     *     end_date: Carbon,
     *     reason: string,
     *     days_requested: int,
     *     status: string,
     *     dh_decision: int,
     *     hr_decision: int,
     *     has_rejection_reason: int,
     *     rejection_reason_text: string|null,
     *     stage: string,
     *     routing_action: string,
     *     approver_id: string|null,
     *     confidence_pct: float,
     *     notification: string,
     *     created_at: Carbon,
     *     updated_at: Carbon
     * }
     */
    private function workflowStateForIndex(int $index, User $user): array
    {
        $leaveType = $this->leaveTypeForIndex($index);
        $daysRequested = match ($leaveType) {
            'force_leave' => 5,
            'special_privilege_leave' => 3,
            'wellness_leave' => 2,
            default => 2,
        };

        $startDate = Carbon::create(self::SAMPLE_YEAR, 2, 3)->addDays($index * 2);
        $endDate = (clone $startDate)->addDays($daysRequested - 1);
        $submittedAt = Carbon::create(self::SAMPLE_YEAR, 1, 8)->addDays($index * 3);

        return match ($index % 4) {
            0 => [
                'leave_type' => $leaveType,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'reason' => $this->reasonForLeaveType($leaveType, $user->name),
                'days_requested' => $daysRequested,
                'status' => 'routed',
                'dh_decision' => 0,
                'hr_decision' => 0,
                'has_rejection_reason' => 0,
                'rejection_reason_text' => null,
                'stage' => 'sent_to_department_head',
                'routing_action' => 'submitted',
                'approver_id' => null,
                'confidence_pct' => 95.50,
                'notification' => 'Leave request submitted and awaiting evaluator review.',
                'created_at' => $submittedAt,
                'updated_at' => (clone $submittedAt)->addDay(),
            ],
            1 => [
                'leave_type' => $leaveType,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'reason' => $this->reasonForLeaveType($leaveType, $user->name),
                'days_requested' => $daysRequested,
                'status' => 'routed',
                'dh_decision' => 1,
                'hr_decision' => 0,
                'has_rejection_reason' => 0,
                'rejection_reason_text' => null,
                'stage' => 'sent_to_hr',
                'routing_action' => 'approved',
                'approver_id' => 'EMP-001',
                'confidence_pct' => 97.25,
                'notification' => 'Evaluator approved the leave and forwarded it to HR for final review.',
                'created_at' => $submittedAt,
                'updated_at' => (clone $submittedAt)->addDays(2),
            ],
            2 => [
                'leave_type' => $leaveType,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'reason' => $this->reasonForLeaveType($leaveType, $user->name),
                'days_requested' => $daysRequested,
                'status' => 'completed',
                'dh_decision' => 1,
                'hr_decision' => 1,
                'has_rejection_reason' => 0,
                'rejection_reason_text' => null,
                'stage' => 'completed',
                'routing_action' => 'finalized',
                'approver_id' => null,
                'confidence_pct' => 99.10,
                'notification' => 'Leave request approved and completed.',
                'created_at' => $submittedAt,
                'updated_at' => (clone $submittedAt)->addDays(3),
            ],
            default => [
                'leave_type' => $leaveType,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'reason' => $this->reasonForLeaveType($leaveType, $user->name),
                'days_requested' => $daysRequested,
                'status' => 'returned',
                'dh_decision' => 1,
                'hr_decision' => 2,
                'has_rejection_reason' => 1,
                'rejection_reason_text' => 'Please revise the schedule so the office remains covered during the requested dates.',
                'stage' => 'sent_to_hr',
                'routing_action' => 'returned',
                'approver_id' => null,
                'confidence_pct' => 88.40,
                'notification' => 'HR returned the leave request for revision.',
                'created_at' => $submittedAt,
                'updated_at' => (clone $submittedAt)->addDays(4),
            ],
        };
    }

    private function leaveTypeForIndex(int $index): string
    {
        $leaveTypes = [
            'vacation_leave',
            'sick_leave',
            'force_leave',
            'special_privilege_leave',
            'wellness_leave',
            'solo_parent_leave',
        ];

        return $leaveTypes[$index % count($leaveTypes)];
    }

    private function reasonForLeaveType(string $leaveType, string $employeeName): string
    {
        return match ($leaveType) {
            'vacation_leave' => "{$employeeName} is taking a short family vacation.",
            'sick_leave' => "{$employeeName} is recovering from an illness and monitoring symptoms at home.",
            'force_leave' => "{$employeeName} is using forced leave during a light office period.",
            'special_privilege_leave' => "{$employeeName} needs time for an urgent personal administrative errand.",
            'wellness_leave' => "{$employeeName} is taking a wellness break to rest and recharge.",
            'solo_parent_leave' => "{$employeeName} needs time to handle school matters as a solo parent.",
            default => "{$employeeName} is requesting leave for a personal matter.",
        };
    }

    /**
     * @param  array{
     *     stage: string,
     *     status: string,
     *     dh_decision: int,
     *     hr_decision: int,
     *     notification: string,
     *     created_at: Carbon,
     *     updated_at: Carbon
     * }  $state
     */
    private function seedWorkflowNotifications(
        LeaveRequest $leaveRequest,
        User $employee,
        User $evaluator,
        User $hrPersonnel,
        array $state,
    ): void {
        Notification::query()->forceCreate([
            'user_id' => $evaluator->id,
            'type' => 'leave_pending_evaluation',
            'title' => 'Leave request awaiting your review',
            'message' => "{$employee->name} filed a leave request. Please review and take action.",
            'document_type' => 'leave',
            'document_id' => $leaveRequest->id,
            'is_read' => false,
            'is_important' => false,
            'created_at' => $state['created_at'],
            'updated_at' => $state['created_at'],
        ]);

        if ($state['stage'] === 'sent_to_hr' || $state['stage'] === 'completed') {
            Notification::query()->forceCreate([
                'user_id' => $hrPersonnel->id,
                'type' => 'leave_pending_evaluation',
                'title' => 'Leave request forwarded to HR',
                'message' => "{$employee->name}'s leave request has been approved by the Department Head and forwarded to HR.",
                'document_type' => 'leave',
                'document_id' => $leaveRequest->id,
                'is_read' => false,
                'is_important' => false,
                'created_at' => (clone $state['created_at'])->addDay(),
                'updated_at' => (clone $state['created_at'])->addDay(),
            ]);
        }

        if ($state['status'] === 'completed') {
            Notification::query()->forceCreate([
                'user_id' => $employee->id,
                'type' => 'leave_completed',
                'title' => 'Leave request completed',
                'message' => 'Your leave request has been fully processed and approved.',
                'document_type' => 'leave',
                'document_id' => $leaveRequest->id,
                'is_read' => false,
                'is_important' => false,
                'created_at' => (clone $state['updated_at']),
                'updated_at' => (clone $state['updated_at']),
            ]);
        }
    }

    /**
     * @param  array{
     *     routing_action: string,
     *     confidence_pct: float,
     *     created_at: Carbon,
     *     updated_at: Carbon,
     *     dh_decision: int,
     *     hr_decision: int,
     *     status: string
     * }  $state
     */
    private function seedAuditTrail(LeaveRequest $leaveRequest, User $employee, array $state): void
    {
        $submittedAt = $state['created_at'];

        IwrAuditLog::query()->forceCreate([
            'logged_at' => $submittedAt,
            'employee_id' => $employee->employee_id,
            'document_type' => 'leave',
            'document_id' => $leaveRequest->id,
            'routing_action' => 'submitted',
            'confidence_pct' => 95.50,
            'compliance_passed' => true,
            'created_at' => $submittedAt,
            'updated_at' => $submittedAt,
        ]);

        if ($state['status'] !== 'routed' || $state['dh_decision'] === 1) {
            IwrAuditLog::query()->forceCreate([
                'logged_at' => (clone $submittedAt)->addDay(),
                'employee_id' => $employee->employee_id,
                'document_type' => 'leave',
                'document_id' => $leaveRequest->id,
                'routing_action' => $state['hr_decision'] === 2 ? 'returned' : 'approved',
                'confidence_pct' => $state['hr_decision'] === 2 ? 88.40 : 98.60,
                'compliance_passed' => $state['hr_decision'] !== 2,
                'created_at' => (clone $submittedAt)->addDay(),
                'updated_at' => (clone $submittedAt)->addDay(),
            ]);
        }

        if ($state['status'] === 'completed') {
            IwrAuditLog::query()->forceCreate([
                'logged_at' => (clone $submittedAt)->addDays(2),
                'employee_id' => $employee->employee_id,
                'document_type' => 'leave',
                'document_id' => $leaveRequest->id,
                'routing_action' => 'finalized',
                'confidence_pct' => 99.10,
                'compliance_passed' => true,
                'created_at' => (clone $submittedAt)->addDays(2),
                'updated_at' => (clone $submittedAt)->addDays(2),
            ]);
        }
    }
}
