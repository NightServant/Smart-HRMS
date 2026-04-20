<?php

namespace App\Jobs;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class NotifyAllEmployeesTrainingJob implements ShouldBeUnique, ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public const NOTIFICATION_TYPE = 'training_suggestion_global';

    public int $tries = 3;

    public int $backoff = 60;

    public int $uniqueFor = 3600;

    public function uniqueId(): string
    {
        return 'notify-all-training-'.now()->toDateString();
    }

    public function handle(): void
    {
        $employees = User::query()
            ->where('role', User::ROLE_EMPLOYEE)
            ->pluck('id');

        $alreadyNotified = Notification::query()
            ->where('type', self::NOTIFICATION_TYPE)
            ->whereDate('created_at', today())
            ->pluck('user_id')
            ->all();

        $rows = $employees
            ->reject(fn (int $userId): bool => in_array($userId, $alreadyNotified, true))
            ->map(fn (int $userId): array => [
                'user_id' => $userId,
                'type' => self::NOTIFICATION_TYPE,
                'title' => 'Training Recommendation',
                'message' => 'HR has opened training discovery for this evaluation cycle. Review the recommended seminars aligned with your role.',
                'document_type' => 'ipcr',
                'document_id' => null,
                'is_important' => true,
                'is_read' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ])
            ->values()
            ->all();

        if ($rows === []) {
            Log::info('NotifyAllEmployeesTrainingJob: no new recipients.');

            return;
        }

        foreach (array_chunk($rows, 500) as $chunk) {
            Notification::query()->insert($chunk);
        }

        Log::info('NotifyAllEmployeesTrainingJob: dispatched global training notifications.', [
            'count' => count($rows),
        ]);
    }
}
