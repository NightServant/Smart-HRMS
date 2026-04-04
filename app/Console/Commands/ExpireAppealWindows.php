<?php

namespace App\Console\Commands;

use App\Models\IpcrSubmission;
use App\Services\NotificationService;
use Illuminate\Console\Command;

class ExpireAppealWindows extends Command
{
    protected $signature = 'ipcr:expire-appeals';

    protected $description = 'Expire IPCR appeal windows that have passed their deadline';

    public function handle(NotificationService $notificationService): int
    {
        $expired = IpcrSubmission::query()
            ->where('appeal_status', 'appeal_window_open')
            ->where('appeal_window_closes_at', '<', now())
            ->get();

        foreach ($expired as $submission) {
            $submission->update([
                'appeal_status' => 'no_appeal',
                'stage' => 'sent_to_pmt',
                'status' => 'routed',
                'routing_action' => 'route_to_pmt',
                'notification' => 'Appeal window expired. Routed to PMT for review.',
            ]);

            $notificationService->notifyV51($submission, 'appeal_expired');
            $notificationService->notifyV51($submission, 'route_to_pmt');
        }

        $this->info("Expired {$expired->count()} appeal window(s).");

        return self::SUCCESS;
    }
}
