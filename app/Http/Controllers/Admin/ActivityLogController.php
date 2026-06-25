<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ActivityLogController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim((string) $request->string('search'));
        $actionType = trim((string) $request->string('actionType'));
        $dateFrom = trim((string) $request->string('dateFrom'));
        $dateTo = trim((string) $request->string('dateTo'));
        $perPage = max(5, min(50, (int) $request->integer('perPage', 10)));

        $baseQuery = ActivityLog::query()
            ->leftJoin('users', 'activity_logs.user_id', '=', 'users.id')
            ->select('activity_logs.*', 'users.name as user_name')
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($subQuery) use ($search): void {
                    $subQuery
                        ->where('users.name', 'like', '%'.$search.'%')
                        ->orWhere('activity_logs.action_type', 'like', '%'.$search.'%')
                        ->orWhere('activity_logs.description', 'like', '%'.$search.'%');
                });
            })
            ->when($actionType !== '', fn ($query) => $query->where('activity_logs.action_type', $actionType))
            ->when($dateFrom !== '', fn ($query) => $query->whereDate('activity_logs.created_at', '>=', $dateFrom))
            ->when($dateTo !== '', fn ($query) => $query->whereDate('activity_logs.created_at', '<=', $dateTo));

        $summaryQuery = clone $baseQuery;

        $logs = (clone $baseQuery)
            ->latest('activity_logs.created_at')
            ->paginate($perPage)
            ->withQueryString();

        $entries = collect($logs->items())->map(fn (ActivityLog $log): array => [
            'id' => $log->id,
            'createdAt' => $log->created_at?->format('Y-m-d H:i:s'),
            'userName' => $log->user_name ?? 'System',
            'userId' => $log->user_id,
            'actionType' => $log->action_type,
            'description' => $log->description,
            'ipAddress' => $log->ip_address,
        ])->all();

        $summaryItems = $summaryQuery->get();

        return Inertia::render('admin/activity-logs', [
            'logs' => $entries,
            'filters' => [
                'search' => $search,
                'actionType' => $actionType,
                'dateFrom' => $dateFrom,
                'dateTo' => $dateTo,
            ],
            'actionTypes' => ActivityLog::query()
                ->select('action_type')
                ->distinct()
                ->whereNotNull('action_type')
                ->orderBy('action_type')
                ->pluck('action_type')
                ->all(),
            'summary' => [
                'total' => $summaryItems->count(),
                'loginEvents' => $summaryItems->whereIn('action_type', ['login', 'logout'])->count(),
                'userEvents' => $summaryItems->filter(fn ($log) => str_starts_with($log->action_type, 'user.'))->count(),
                'workflowEvents' => $summaryItems->filter(fn ($log) => str_starts_with($log->action_type, 'leave.') || str_starts_with($log->action_type, 'ipcr.'))->count(),
                'dataEvents' => $summaryItems->filter(fn ($log) => str_starts_with($log->action_type, 'data.') || str_starts_with($log->action_type, 'password.'))->count(),
            ],
            'pagination' => [
                'currentPage' => $logs->currentPage(),
                'lastPage' => $logs->lastPage(),
                'perPage' => $logs->perPage(),
                'total' => $logs->total(),
            ],
        ]);
    }
}
