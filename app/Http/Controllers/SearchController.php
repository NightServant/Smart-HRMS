<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SearchController extends Controller
{
    /**
     * @return array<int, array{id:int,name:string,date:string,clock_in:string,clock_out:string,status:string}>
     */
    private function attendanceRecords(): array
    {
        return [];
    }

    /**
     * @return array<int, array{id:int,name:string,leaveType:string,startDate:string,endDate:string,reason:string}>
     */
    private function leaveRequests(): array
    {
        return [];
    }

    /**
     * @param  array<int, array<string, int|string>>  $items
     * @param  array<int, string>  $keys
     * @return array<int, array<string, int|string>>
     */
    private function filterArrayItems(array $items, array $keys, string $searchTerm): array
    {
        $normalizedSearchTerm = mb_strtolower(trim($searchTerm));

        if ($normalizedSearchTerm === '') {
            return $items;
        }

        return array_values(array_filter($items, function (array $item) use ($keys, $normalizedSearchTerm): bool {
            foreach ($keys as $key) {
                if (str_contains(mb_strtolower((string) ($item[$key] ?? '')), $normalizedSearchTerm)) {
                    return true;
                }
            }

            return false;
        }));
    }

    /**
     * @return array<int, array{id:int,name:string,email:string,role:string,position:string,date_hired:string,age:string}>
     */
    private function employeePayload(string $searchTerm): array
    {
        $normalizedSearchTerm = trim($searchTerm);

        return User::query()
            ->where('role', User::ROLE_EMPLOYEE)
            ->when($normalizedSearchTerm !== '', function ($query) use ($normalizedSearchTerm): void {
                $query->where(function ($subQuery) use ($normalizedSearchTerm): void {
                    $subQuery
                        ->where('name', 'like', '%'.$normalizedSearchTerm.'%')
                        ->orWhere('email', 'like', '%'.$normalizedSearchTerm.'%');
                });
            })
            ->orderBy('name')
            ->get()
            ->map(fn (User $user): array => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'position' => 'Employee',
                'date_hired' => $user->created_at?->format('Y-m-d') ?? '-',
                'age' => 'N/A',
            ])
            ->all();
    }

    public function attendanceManagement(Request $request): Response
    {
        $search = (string) $request->string('search');

        return Inertia::render('admin/attendance-management', [
            'search' => $search,
            'attendances' => $this->filterArrayItems(
                $this->attendanceRecords(),
                ['id', 'name', 'date', 'clock_in', 'clock_out', 'status'],
                $search
            ),
        ]);
    }

    public function leaveManagement(Request $request): Response
    {
        $search = (string) $request->string('search');

        return Inertia::render('admin/leave-management', [
            'search' => $search,
            'leaveRequests' => $this->filterArrayItems(
                $this->leaveRequests(),
                ['id', 'name', 'leaveType', 'startDate', 'endDate', 'reason'],
                $search
            ),
        ]);
    }

    public function employeeDirectory(Request $request): Response
    {
        $search = (string) $request->string('search');

        return Inertia::render('admin/employee-directory', [
            'search' => $search,
            'employees' => $this->employeePayload($search),
        ]);
    }

    public function documentManagement(Request $request): Response
    {
        $search = (string) $request->string('search');

        return Inertia::render('document-management', [
            'search' => $search,
            'employees' => $this->employeePayload($search),
        ]);
    }
}
