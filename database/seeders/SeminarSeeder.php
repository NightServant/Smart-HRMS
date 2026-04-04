<?php

namespace Database\Seeders;

use App\Models\Seminars;
use Illuminate\Database\Seeder;

class SeminarSeeder extends Seeder
{
    /**
     * Seed Administrative Office-focused training suggestions aligned
     * to the four IPCR v5.1 sections and their twelve criteria rows.
     */
    public function run(): void
    {
        $seminars = [
            // ── Section 1: Personnel Management ─────────────────────────

            [
                'description' => 'Look for training or seminars on employee records coordination, plantilla movement tracking, and staffing request processing to improve workforce support documentation.',
                'target_performance_area' => 'Personnel Management',
            ],
            [
                'description' => 'Look for training or seminars on office policy enforcement, attendance standards compliance, and internal memo dissemination to strengthen policy compliance practices.',
                'target_performance_area' => 'Personnel Management',
            ],
            [
                'description' => 'Look for training or seminars on coaching plans, mentoring frameworks, and performance follow-through to build capability-building skills for administrative teams.',
                'target_performance_area' => 'Personnel Management',
            ],

            // ── Section 2: Records and Communication ────────────────────

            [
                'description' => 'Look for training or seminars on document routing, records archiving, and registry maintenance to improve how incoming and outgoing administrative documents are handled.',
                'target_performance_area' => 'Records and Communication',
            ],
            [
                'description' => 'Look for training or seminars on administrative reporting, meeting minutes preparation, and business writing to produce clearer and more timely office communications.',
                'target_performance_area' => 'Records and Communication',
            ],
            [
                'description' => 'Look for training or seminars on stakeholder coordination, official correspondence handling, and inter-office liaison work to improve response turnaround times.',
                'target_performance_area' => 'Records and Communication',
            ],

            // ── Section 3: Logistics and Procurement ────────────────────

            [
                'description' => 'Look for training or seminars on inventory monitoring, supply tracking, and equipment request processing to keep office operations running without disruptions.',
                'target_performance_area' => 'Logistics and Procurement',
            ],
            [
                'description' => 'Look for training or seminars on purchase request preparation, canvass documentation, and delivery tracking to ensure procurement records are complete and traceable.',
                'target_performance_area' => 'Logistics and Procurement',
            ],
            [
                'description' => 'Look for training or seminars on workspace readiness, facility upkeep, and event logistics coordination to prepare meeting venues and materials without service interruptions.',
                'target_performance_area' => 'Logistics and Procurement',
            ],

            // ── Section 4: Service Delivery ─────────────────────────────

            [
                'description' => 'Look for training or seminars on frontline service delivery, walk-in assistance, and transaction turnaround to improve how employee-facing requests are handled.',
                'target_performance_area' => 'Service Delivery',
            ],
            [
                'description' => 'Look for training or seminars on process improvement methods, bottleneck analysis, and workflow optimization to reduce recurring administrative delays.',
                'target_performance_area' => 'Service Delivery',
            ],
            [
                'description' => 'Look for training or seminars on cross-functional coordination, special assignment handling, and turnover documentation to support semester-end deliverables.',
                'target_performance_area' => 'Service Delivery',
            ],
        ];

        foreach ($seminars as $seminar) {
            Seminars::query()->updateOrCreate(
                [
                    'target_performance_area' => $seminar['target_performance_area'],
                    'description' => $seminar['description'],
                ],
                $seminar,
            );
        }
    }
}
