<?php

namespace App\Http\Controllers;

use App\Models\IpcrSubmission;
use App\Models\Notification;
use App\Models\Seminars;
use App\Services\AtreService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RecommendationController extends Controller
{
    public function recommend(Request $request, AtreService $atre): JsonResponse
    {
        $user = $request->user();
        $employee = $user->employee;

        if (! $employee) {
            return response()->json(['status' => 'error', 'recommendations' => [], 'risk_level' => 'NONE', 'weak_areas' => []]);
        }

        $submission = IpcrSubmission::query()
            ->where('employee_id', $employee->employee_id)
            ->latest()
            ->first();

        if (! $submission?->form_payload) {
            return response()->json(['status' => 'error', 'recommendations' => [], 'risk_level' => 'NONE', 'weak_areas' => []]);
        }

        $enabled = Notification::query()
            ->where('user_id', $user->id)
            ->whereIn('type', ['training_suggestion', 'training_suggestion_global'])
            ->where(function ($q) use ($submission): void {
                $q->where(function ($q2) use ($submission): void {
                    $q2->where('type', 'training_suggestion')
                        ->where('document_type', 'ipcr')
                        ->where('document_id', $submission->id);
                })->orWhere('type', 'training_suggestion_global');
            })
            ->exists();

        if (! $enabled) {
            return response()->json(['status' => 'error', 'recommendations' => [], 'risk_level' => 'NONE', 'weak_areas' => []]);
        }

        $seminars = Seminars::query()
            ->take(150)
            ->get()
            ->map(fn (Seminars $s): array => [
                'id' => $s->id,
                'title' => $s->title,
                'description' => $s->description,
                'target_performance_area' => $s->target_performance_area,
                'rating_tier' => $s->rating_tier,
            ])
            ->all();

        return response()->json($atre->recommend($seminars, $submission->form_payload));
    }
}
