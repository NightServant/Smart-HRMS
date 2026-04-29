<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePositionRequest;
use App\Models\ActivityLog;
use App\Models\Department;
use App\Models\EmployeePosition;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;

class PositionController extends Controller
{
    public function store(StorePositionRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $linkedRole = $validated['linked_role'] ?? User::ROLE_EMPLOYEE;

        $position = DB::transaction(function () use ($validated, $linkedRole): EmployeePosition {
            /** @var EmployeePosition $position */
            $position = EmployeePosition::query()->firstOrCreate(['name' => $validated['name']]);
            $department = Department::query()->findOrFail($validated['department_id']);

            $department->positions()->syncWithoutDetaching([
                $position->id => ['linked_role' => $linkedRole],
            ]);

            return $position;
        });

        ActivityLog::log(
            'position.create',
            "Created position \"{$position->name}\" within department.",
            $request,
            [
                'position_id' => $position->id,
                'department_id' => (int) $validated['department_id'],
                'linked_role' => $linkedRole,
            ]
        );

        return back()->with(
            'success',
            "Position \"{$position->name}\" added to the department."
        );
    }
}
