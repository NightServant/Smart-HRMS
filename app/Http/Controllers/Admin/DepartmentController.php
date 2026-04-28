<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDepartmentRequest;
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

        return back()->with(
            'success',
            "Department \"{$department->name}\" created. Department Head position is available within it."
        );
    }
}
