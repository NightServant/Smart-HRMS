<?php

namespace App\Http\Controllers;

use App\Http\Requests\NotifyTrainingSuggestionRequest;
use App\Http\Requests\StoreSeminarsRequest;
use App\Http\Requests\UpdateSeminarsRequest;
use App\Models\IpcrSubmission;
use App\Models\LeaveRequest;
use App\Models\Notification;
use App\Models\Seminars;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SeminarsController extends Controller
{
    /**
     * @return array<int, array<string, mixed>>
     */
    private function seminarPayload(): array
    {
        return Seminars::query()
            ->orderBy('target_performance_area')
            ->orderBy('rating_tier')
            ->get()
            ->map(fn (Seminars $seminar): array => [
                'id' => $seminar->id,
                'title' => $seminar->title,
                'description' => $seminar->description,
                'location' => $seminar->location,
                'time' => $seminar->time,
                'speaker' => $seminar->speaker,
                'target_performance_area' => $seminar->target_performance_area,
                'rating_tier' => $seminar->rating_tier,
                'date' => $seminar->date?->format('Y-m-d'),
            ])
            ->all();
    }

    /**
     * @return list<string>
     */
    private function performanceAreasPayload(): array
    {
        return Seminars::query()
            ->select('target_performance_area')
            ->distinct()
            ->orderBy('target_performance_area')
            ->pluck('target_performance_area')
            ->filter()
            ->values()
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function remarksPayload(): array
    {
        return IpcrSubmission::query()
            ->where('evaluator_gave_remarks', true)
            ->whereNotNull('rejection_reason')
            ->where('rejection_reason', '!=', '')
            ->with('employee')
            ->latest()
            ->limit(20)
            ->get()
            ->map(fn (IpcrSubmission $submission): array => [
                'employeeId' => $submission->employee_id,
                'employeeName' => $submission->employee?->name ?? $submission->employee_id,
                'date' => $submission->created_at?->format('F j, Y'),
                'remark' => $submission->rejection_reason,
            ])
            ->all();
    }

    public function performanceDashboard(Request $request): Response
    {
        return Inertia::render('performanceDashboard', [
            'remarks' => $this->remarksPayload(),
            'leaveOverview' => $this->evaluatorLeaveOverviewPayload($request->query('leave_month')),
        ]);
    }

    public function adminPerformanceDashboard(Request $request): Response
    {
        return Inertia::render('admin/performance-dashboard', [
            'remarks' => $this->remarksPayload(),
            'leaveOverview' => $this->hrLeaveOverviewPayload($request->query('leave_month')),
        ]);
    }

    /**
     * Leave overview stats scoped to the evaluator (department head) stage.
     *
     * @return array<string, mixed>
     */
    private function evaluatorLeaveOverviewPayload(?string $leaveMonth = null): array
    {
        $requests = LeaveRequest::query();

        if ($leaveMonth && preg_match('/^\d{4}-\d{2}$/', $leaveMonth)) {
            $start = \Carbon\Carbon::createFromFormat('Y-m', $leaveMonth)->startOfMonth();
            $end = $start->copy()->endOfMonth();
            $requests->whereBetween('created_at', [$start, $end]);
        }

        return [
            'routed' => (clone $requests)->where('stage', 'sent_to_department_head')->count(),
            'approved' => (clone $requests)->where('dh_decision', 1)->count(),
            'rejected' => (clone $requests)->where('dh_decision', 2)->count(),
            'total' => (clone $requests)->count(),
        ];
    }

    /**
     * Leave overview stats scoped to the HR stage.
     *
     * @return array<string, mixed>
     */
    private function hrLeaveOverviewPayload(?string $leaveMonth = null): array
    {
        $requests = LeaveRequest::query();

        if ($leaveMonth && preg_match('/^\d{4}-\d{2}$/', $leaveMonth)) {
            $start = \Carbon\Carbon::createFromFormat('Y-m', $leaveMonth)->startOfMonth();
            $end = $start->copy()->endOfMonth();
            $requests->whereBetween('created_at', [$start, $end]);
        }

        return [
            'routed' => (clone $requests)->where('stage', 'sent_to_hr')->count(),
            'approved' => (clone $requests)->where('status', 'completed')->where('hr_decision', 1)->count(),
            'rejected' => (clone $requests)->where('hr_decision', 2)->count(),
            'total' => (clone $requests)->count(),
        ];
    }

    /**
     * Display a listing of the resource.
     */
    public function index(): Response
    {
        return Inertia::render('admin/training-scheduling', [
            'seminars' => $this->seminarPayload(),
            'performanceAreas' => $this->performanceAreasPayload(),
        ]);
    }

    public function adminTrainingScheduling(): Response
    {
        return Inertia::render('admin/training-scheduling', [
            'seminars' => $this->seminarPayload(),
            'performanceAreas' => $this->performanceAreasPayload(),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreSeminarsRequest $request): RedirectResponse
    {
        Seminars::query()->create($request->validated());

        return to_route('admin.training-scheduling');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateSeminarsRequest $request, Seminars $seminar): RedirectResponse
    {
        $seminar->update($request->validated());

        return to_route('admin.training-scheduling');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Seminars $seminar): RedirectResponse
    {
        $seminar->delete();

        return to_route('admin.training-scheduling');
    }

    public function triggerTrainingNotification(NotifyTrainingSuggestionRequest $request): RedirectResponse
    {
        $submission = IpcrSubmission::query()
            ->with(['employee.user'])
            ->findOrFail($request->validated('submission_id'));

        $employeeUser = $submission->employee?->user;

        if ($employeeUser === null) {
            return back()->withErrors([
                'submission_id' => 'The selected employee does not have a linked user account for notifications.',
            ]);
        }

        Notification::query()->create([
            'user_id' => $employeeUser->id,
            'type' => 'training_suggestion',
            'title' => 'Training Recommendation',
            'message' => 'HR opened training discovery for your latest Performance Evaluation. Review the recommended seminars tied to your Administrative Office service areas.',
            'document_type' => 'ipcr',
            'document_id' => $submission->id,
            'is_important' => true,
        ]);

        $employeeName = $submission->employee?->name ?? $submission->employee_id;

        return back()->with('success', "Training notification sent to {$employeeName}.");
    }
}
