<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreLeaveRequestRequest;
use App\Models\LeaveRequest;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class LeaveRequestController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('leave-application');
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
}
