<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreLeaveRequestRequest;
use App\Models\LeaveRequest;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
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
            ->map(fn (LeaveRequest $lr): array => [
                'id' => $lr->id,
                'name' => $user->name,
                'employeeId' => $lr->employee_id,
                'jobTitle' => $lr->employee?->job_title,
                'leaveType' => $lr->leave_type,
                'startDate' => $lr->start_date?->format('Y-m-d') ?? '-',
                'endDate' => $lr->end_date?->format('Y-m-d') ?? '-',
                'daysRequested' => $lr->days_requested,
                'leaveAccrual' => $lr->leaveAccrual(),
                'reason' => $lr->reason,
                'status' => $lr->status ?? 'pending',
                'stage' => $lr->stage,
                'dhDecision' => (int) $lr->dh_decision,
                'hrDecision' => (int) $lr->hr_decision,
                'rejectionReasonText' => $lr->rejection_reason_text,
                'hasMedicalCertificate' => (bool) $lr->medical_certificate_path,
                'hasMarriageCertificate' => (bool) $lr->marriage_certificate_path,
                'hasSoloParentId' => (bool) $lr->solo_parent_id_path,
                'createdAt' => $lr->created_at?->format('M d, Y g:i A'),
            ])
            ->toArray();

        return Inertia::render('leave-application', [
            'leaveHistory' => $leaveHistory,
        ]);
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
            $message = $iwrResult['notification'] ?? 'Leave request submitted and routed successfully.';
        } else {
            $message = 'Leave request submitted successfully.';
        }

        return to_route('leave-application')->with('success', $message);
    }

    public function downloadDocument(LeaveRequest $leaveRequest, string $type): StreamedResponse
    {
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
}
