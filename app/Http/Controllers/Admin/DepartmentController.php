<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDepartmentRequest;
use App\Http\Requests\UpdateDepartmentRequest;
use App\Jobs\SyncDepartmentToZlinkJob;
use App\Jobs\SyncEmployeeToZlinkJob;
use App\Models\ActivityLog;
use App\Models\Department;
use App\Models\EmployeePosition;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;

class DepartmentController extends Controller
{
    public function store(StoreDepartmentRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        $department = DB::transaction(function () use ($validated): Department {
            $department = Department::query()->create([
                'name' => $validated['name'],
                'zlink_sync_status' => 'pending',
            ]);

            // Department Head is a global position; ensure it exists so the
            // newly created department can immediately use it.
            EmployeePosition::query()->firstOrCreate([
                'name' => 'Department Head',
            ]);

            return $department;
        });

        ActivityLog::log(
            'department.create',
            "Created department \"{$department->name}\".",
            $request,
            ['department_id' => $department->id]
        );

        SyncDepartmentToZlinkJob::dispatch($department->id)->afterCommit();

        return back()->with(
            'success',
            "Department \"{$department->name}\" created. Department Head position is available within it."
        );
    }

    public function update(UpdateDepartmentRequest $request, Department $department): RedirectResponse
    {
        $validated = $request->validated();
        $oldName = $department->name;

        if ($oldName === $validated['name']) {
            return back()->with('success', 'Department name unchanged.');
        }

        $department->update([
            'name' => $validated['name'],
            'zlink_sync_status' => 'pending',
        ]);

        ActivityLog::log(
            'department.update',
            "Renamed department from \"{$oldName}\" to \"{$department->name}\".",
            $request,
            ['department_id' => $department->id, 'old_name' => $oldName]
        );

        SyncDepartmentToZlinkJob::dispatch($department->id)->afterCommit();

        // Re-sync each employee in this department so their Zlink record
        // reflects the renamed department.
        $department->employees()->pluck('employee_id')->each(
            fn (string $employeeId) => SyncEmployeeToZlinkJob::dispatch($employeeId)->afterCommit(),
        );

        return back()->with(
            'success',
            "Department renamed to \"{$department->name}\"."
        );
    }
}
