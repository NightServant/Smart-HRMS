<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\User;
use App\Services\EmployeePredictionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PredictionController extends Controller
{
    public function predict(
        Request $request,
        EmployeePredictionService $predictionService,
    ): JsonResponse {
        $request->validate([
            'employee_name' => 'required|string|max:255',
        ]);

        $employeeName = $request->string('employee_name')->toString();
        $user = $request->user();
        $employee = null;

        if ($user->hasRole(User::ROLE_EMPLOYEE)) {
            $employee = Employee::query()->find($user->employee_id);
            abort_unless($employee && $employee->name === $employeeName, 403);
        }

        return response()->json($predictionService->build($employee ?? $employeeName));
    }
}
