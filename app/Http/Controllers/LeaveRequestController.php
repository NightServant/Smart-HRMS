<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreLeaveRequestRequest;
use App\Models\LeaveRequest;
use App\Models\Notification;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class LeaveRequestController extends Controller
{
    public function create(): Response
    {
        $user = request()->user();

        $leaveHistory = LeaveRequest::query()
            ->where('user_id', $user->id)
            ->with(['employee:employee_id,job_title'])
            ->latest()
            ->get()
            ->map(fn (LeaveRequest $lr): array => $this->leaveRequestResource($lr, $user->name, true))
            ->toArray();

        [$vlCredits, $slCredits] = $this->computeLeaveCredits($user);

        return Inertia::render('leave-application', [
            'leaveHistory' => $leaveHistory,
            'vlCredits' => round($vlCredits, 2),
            'slCredits' => round($slCredits, 2),
            'leaveCreditsByType' => $this->leaveCreditsByType($vlCredits, $slCredits),
            'holidays' => $this->philippineHolidays(now()->year),
        ]);
    }

    public function printablePage(LeaveRequest $leaveRequest): HttpResponse
    {
        $user = request()->user();

        abort_unless($leaveRequest->user_id === $user->id, 403);

        $leaveRequest->loadMissing(['employee:employee_id,job_title']);

        $pdf = Pdf::loadView('pdf.leave-request-print', [
            'leaveRequest' => $this->leaveRequestResource($leaveRequest, $user->name, true),
        ]);

        return $pdf
            ->setPaper('letter', 'portrait')
            ->setWarnings(false)
            ->stream('leave-request-print.pdf');
    }

    /**
     * Compute the employee's remaining VL and SL credits using CSC rules.
     * Earns 1.25 VL and 1.25 SL per completed month of service.
     *
     * @return array{float, float}
     */
    private function computeLeaveCredits(mixed $user): array
    {
        $employee = $user->employee;

        if (! $employee || ! $employee->date_hired) {
            return [0.0, 0.0];
        }

        $monthsWorked = (int) Carbon::parse($employee->date_hired)
            ->diffInMonths(Carbon::today());

        $totalEarned = $monthsWorked * 1.25;

        /** @var \Illuminate\Support\Collection<int, LeaveRequest> $approvedLeaves */
        $approvedLeaves = LeaveRequest::query()
            ->where('user_id', $user->id)
            ->where('status', 'completed')
            ->where('dh_decision', 1)
            ->where('hr_decision', 1)
            ->get(['leave_type', 'days_requested']);

        $vlTypes = ['vacation_leave', 'force_leave'];
        $slTypes = ['sick_leave'];

        $usedVl = $approvedLeaves
            ->whereIn('leave_type', $vlTypes)
            ->sum('days_requested');

        $usedSl = $approvedLeaves
            ->whereIn('leave_type', $slTypes)
            ->sum('days_requested');

        return [
            max(0.0, $totalEarned - (float) $usedVl),
            max(0.0, $totalEarned - (float) $usedSl),
        ];
    }

    /**
     * @return list<array{value: string, label: string, creditDisplay: string}>
     */
    private function leaveCreditsByType(float $vlCredits, float $slCredits): array
    {
        return [
            [
                'value' => 'vacation-leave',
                'label' => 'Vacation Leave',
                'creditDisplay' => number_format($vlCredits, 2).' days',
            ],
            [
                'value' => 'force-leave',
                'label' => 'Force Leave',
                'creditDisplay' => '5 days',
            ],
            [
                'value' => 'special-privilege-leave',
                'label' => 'Special Privilege Leave',
                'creditDisplay' => '3 days',
            ],
            [
                'value' => 'wellness-leave',
                'label' => 'Wellness Leave',
                'creditDisplay' => '5 days',
            ],
            [
                'value' => 'sick-leave',
                'label' => 'Sick Leave',
                'creditDisplay' => number_format($slCredits, 2).' days',
            ],
            [
                'value' => 'special-sick-leave-women',
                'label' => 'Special Sick Leave (Women)',
                'creditDisplay' => '3 months',
            ],
            [
                'value' => 'maternity-leave',
                'label' => 'Maternity Leave',
                'creditDisplay' => 'Not specified',
            ],
            [
                'value' => 'paternity-leave',
                'label' => 'Paternity Leave',
                'creditDisplay' => 'Not specified',
            ],
            [
                'value' => 'solo-parent-leave',
                'label' => 'Solo Parent Leave',
                'creditDisplay' => '7 days',
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function leaveRequestResource(
        LeaveRequest $leaveRequest,
        string $name,
        bool $includeWorkflowSignOff = false,
    ): array {
        $resource = [
            'id' => $leaveRequest->id,
            'name' => $name,
            'employeeId' => $leaveRequest->employee_id,
            'department' => 'Administrative Office',
            'jobTitle' => $leaveRequest->employee?->job_title,
            'leaveType' => $leaveRequest->leave_type,
            'startDate' => $leaveRequest->start_date?->format('Y-m-d') ?? '-',
            'endDate' => $leaveRequest->end_date?->format('Y-m-d') ?? '-',
            'daysRequested' => $leaveRequest->days_requested,
            'leaveAccrual' => $leaveRequest->leaveAccrual(),
            'reason' => $leaveRequest->reason,
            'status' => $leaveRequest->resolvedStatus(),
            'stage' => $leaveRequest->stage,
            'dhDecision' => (int) $leaveRequest->dh_decision,
            'hrDecision' => (int) $leaveRequest->hr_decision,
            'rejectionReasonText' => $leaveRequest->rejection_reason_text,
            'hasMedicalCertificate' => (bool) $leaveRequest->medical_certificate_path,
            'hasMarriageCertificate' => (bool) $leaveRequest->marriage_certificate_path,
            'hasSoloParentId' => (bool) $leaveRequest->solo_parent_id_path,
            'supportingDocuments' => $this->leaveSupportingDocumentsResource($leaveRequest),
            'createdAt' => $leaveRequest->created_at?->format('M d, Y g:i A'),
        ];

        if ($includeWorkflowSignOff) {
            $resource['workflowSignOff'] = $this->leaveWorkflowSignOffResource($leaveRequest);
        }

        return $resource;
    }

    /**
     * @return array{
     *     evaluatorName: string|null,
     *     evaluatorDate: string|null,
     *     hrPersonnelName: string|null,
     *     hrPersonnelDate: string|null
     * }
     */
    private function leaveWorkflowSignOffResource(LeaveRequest $leaveRequest): array
    {
        $notifications = Notification::query()
            ->with('user:id,name,role')
            ->where('document_type', 'leave')
            ->where('document_id', $leaveRequest->id)
            ->oldest()
            ->get();

        $evaluatorNotification = $notifications->first(
            fn (Notification $notification): bool => $notification->user?->role === User::ROLE_EVALUATOR,
        );
        $hrNotification = $notifications->first(
            fn (Notification $notification): bool => $notification->user?->role === User::ROLE_HR_PERSONNEL,
        );

        return [
            'evaluatorName' => $evaluatorNotification?->user?->name
                ?? $this->resolveRoleHolderName(User::ROLE_EVALUATOR),
            'evaluatorDate' => $evaluatorNotification?->created_at?->format('M d, Y g:i A'),
            'hrPersonnelName' => $hrNotification?->user?->name
                ?? $this->resolveRoleHolderName(User::ROLE_HR_PERSONNEL),
            'hrPersonnelDate' => $hrNotification?->created_at?->format('M d, Y g:i A'),
        ];
    }

    private function resolveRoleHolderName(string $role): ?string
    {
        return User::query()
            ->where('role', $role)
            ->orderBy('name')
            ->value('name');
    }

    /**
     * @return list<array{label: string, type: string, available: bool, filename: string|null}>
     */
    private function leaveSupportingDocumentsResource(LeaveRequest $leaveRequest): array
    {
        return [
            [
                'label' => 'Medical Certificate',
                'type' => 'medical_certificate',
                'available' => (bool) $leaveRequest->medical_certificate_path,
                'filename' => $leaveRequest->medical_certificate_path
                    ? basename($leaveRequest->medical_certificate_path)
                    : null,
            ],
            [
                'label' => 'Marriage Certificate',
                'type' => 'marriage_certificate',
                'available' => (bool) $leaveRequest->marriage_certificate_path,
                'filename' => $leaveRequest->marriage_certificate_path
                    ? basename($leaveRequest->marriage_certificate_path)
                    : null,
            ],
            [
                'label' => 'Solo Parent ID',
                'type' => 'solo_parent_id',
                'available' => (bool) $leaveRequest->solo_parent_id_path,
                'filename' => $leaveRequest->solo_parent_id_path
                    ? basename($leaveRequest->solo_parent_id_path)
                    : null,
            ],
        ];
    }

    /**
     * Returns Philippine public holidays for the given year as YYYY-MM-DD strings.
     *
     * @return list<string>
     */
    private function philippineHolidays(int $year): array
    {
        // Regular holidays (fixed dates)
        $fixed = [
            "{$year}-01-01", // New Year's Day
            "{$year}-02-25", // People Power Anniversary
            "{$year}-04-09", // Araw ng Kagitingan
            "{$year}-05-01", // Labor Day
            "{$year}-06-12", // Independence Day
            "{$year}-11-30", // Bonifacio Day
            "{$year}-12-25", // Christmas Day
            "{$year}-12-30", // Rizal Day
        ];

        // Moveable holy week holidays (these are hardcoded for 2025/2026;
        // a full implementation would use a computus algorithm or external table)
        $moveable = match ($year) {
            2025 => [
                '2025-04-17', // Maundy Thursday
                '2025-04-18', // Good Friday
                '2025-08-25', // National Heroes Day (last Monday of August)
                '2025-11-01', // All Saints' Day
                '2025-11-02', // All Souls' Day
            ],
            2026 => [
                '2026-04-02', // Maundy Thursday
                '2026-04-03', // Good Friday
                '2026-08-31', // National Heroes Day (last Monday of August)
                '2026-11-01', // All Saints' Day
                '2026-11-02', // All Souls' Day
            ],
            default => [],
        };

        return array_values(array_unique([...$fixed, ...$moveable]));
    }

    public function store(StoreLeaveRequestRequest $request): RedirectResponse
    {
        $medicalCertificatePath = $request->hasFile('medicalCertificate')
            ? $request->file('medicalCertificate')->store('leave-request-documents', 'public')
            : null;

        $marriageCertificatePath = $request->hasFile('marriageCertificate')
            ? $request->file('marriageCertificate')->store('leave-request-documents', 'public')
            : null;

        $soloParentIdPath = $request->hasFile('soloParentId')
            ? $request->file('soloParentId')->store('leave-request-documents', 'public')
            : null;

        $startDate = Carbon::parse($request->string('startDate')->toString());
        $endDate = Carbon::parse($request->string('endDate')->toString());
        $daysRequested = $startDate->diffInDays($endDate) + 1;

        // Convert kebab-case leave type to snake_case for Python IWR
        $leaveType = str_replace('-', '_', $request->string('leaveType')->toString());

        $user = $request->user();
        $employeeId = $user->employee_id;

        $leaveRequest = LeaveRequest::query()->create([
            'user_id' => $user->id,
            'employee_id' => $employeeId,
            'leave_type' => $leaveType,
            'start_date' => $startDate->toDateString(),
            'end_date' => $endDate->toDateString(),
            'reason' => $request->string('reason')->toString(),
            'days_requested' => $daysRequested,
            'medical_certificate_path' => $medicalCertificatePath,
            'marriage_certificate_path' => $marriageCertificatePath,
            'solo_parent_id_path' => $soloParentIdPath,
            'has_medical_certificate' => $medicalCertificatePath !== null,
            'has_solo_parent_id' => $soloParentIdPath !== null,
            'has_marriage_certificate' => $marriageCertificatePath !== null,
            'dh_decision' => 0,
            'hr_decision' => 0,
            'has_rejection_reason' => 0,
        ]);

        // Route through IWR if employee is linked to org chart
        if ($employeeId) {
            $iwrController = app(IwrController::class);
            $iwrResult = $iwrController->routeLeaveRequest($leaveRequest);

            if (($iwrResult['status'] ?? null) === 'error') {
                return to_route('leave-application')->withErrors([
                    'workflow' => $iwrResult['notification'] ?? 'The workflow service is currently unavailable.',
                ]);
            }

            $message = $iwrResult['notification'] ?? 'Leave request submitted and routed successfully.';
        } else {
            $message = 'Leave request submitted successfully.';
        }

        return to_route('leave-application')->with('success', $message);
    }

    public function downloadDocument(LeaveRequest $leaveRequest, string $type): StreamedResponse
    {
        abort_unless($this->canViewLeaveRequestDocument(request()->user(), $leaveRequest), 403);

        $pathMap = [
            'medical_certificate' => 'medical_certificate_path',
            'marriage_certificate' => 'marriage_certificate_path',
            'solo_parent_id' => 'solo_parent_id_path',
        ];

        if (! isset($pathMap[$type])) {
            abort(404, 'Invalid document type.');
        }

        $path = $leaveRequest->{$pathMap[$type]};

        if (! $path || ! Storage::disk('public')->exists($path)) {
            abort(404, 'Document not found.');
        }

        // Support inline preview via ?inline=1
        if (request()->boolean('inline')) {
            $fullPath = Storage::disk('public')->path($path);
            $mimeType = mime_content_type($fullPath) ?: 'application/octet-stream';

            return response()->stream(
                function () use ($fullPath): void {
                    readfile($fullPath);
                },
                200,
                [
                    'Content-Type' => $mimeType,
                    'Content-Disposition' => 'inline; filename="'.basename($path).'"',
                ]
            );
        }

        return Storage::disk('public')->download($path);
    }

    private function canViewLeaveRequestDocument(User $user, LeaveRequest $leaveRequest): bool
    {
        return $user->id === $leaveRequest->user_id
            || $user->hasRole('evaluator')
            || $user->hasRole('hr-personnel');
    }
}
