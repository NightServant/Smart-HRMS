<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SeminarsSeeder extends Seeder
{
    /**
     * Seed the seminars table with training recommendations aligned to the IPCR rating scale.
     *
     * Rating tiers:
     *   1-2  →  Remedial / foundational   (immediate requirement)
     *   3-4  →  Proficiency enhancement   (improvement)
     *   5    →  Mastery / leadership      (maintenance)
     *
     * Each seminar row carries a generic description directing the employee
     * to seek relevant training in the competency area. The title identifies
     * the specific programme; target_performance_area stores the exact IPCR
     * criterion text so the ATRE content-based filter can match it.
     */
    public function run(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        DB::table('seminars')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1');

        $now = now();

        $description = 'We suggest you find relevant trainings or seminars related to this competency area.';

        $criteria = [
            // ── Section 1: Personnel Management ──────────────────────────────
            [
                'area' => 'Coordinate employee records, plantilla movement, and office staffing requirements',
                'tiers' => [
                    '1-2' => [
                        'Basic Records Management',
                        'Filing Systems and Document Tracking',
                        'HRIS/HRMS Orientation for Administrative Staff',
                    ],
                    '3-4' => [
                        'Personnel Transaction Processing and Plantilla Administration',
                        'Leave Administration and CSC Compliance',
                        'Workforce Planning Fundamentals',
                    ],
                    '5' => [
                        'Strategic HR Administration and Succession Planning',
                        'Knowledge Transfer and Mentoring for Records Staff',
                        'Advanced HRIS Analytics',
                    ],
                ],
            ],
            [
                'area' => 'Facilitate compliance with office policies, attendance standards, and internal memos',
                'tiers' => [
                    '1-2' => [
                        'CSC Laws and Rules on Attendance and Leave',
                        'Writing and Routing Office Issuances',
                        'Workplace Discipline and Administrative Obligations',
                    ],
                    '3-4' => [
                        'Policy Communication and Compliance Monitoring',
                        'Business Writing for Administrative Memos and Advisories',
                        'Internal Control Awareness for Office Staff',
                    ],
                    '5' => [
                        'Policy Development and Review Practicum',
                        'Administrative Investigation and Due Process',
                        'Coaching Peers on Compliance Standards',
                    ],
                ],
            ],
            [
                'area' => 'Coordinate capability-building plans, mentoring, and performance follow-through',
                'tiers' => [
                    '1-2' => [
                        'SPMS Orientation and Individual Development Planning',
                        'Introduction to Learning and Development Coordination',
                        'Understanding IPCR and Performance Targets',
                    ],
                    '3-4' => [
                        'Training Needs Assessment (TNA) Methods',
                        'Monitoring and Evaluation of L&D Interventions',
                        'Coaching and Feedback Techniques for Supervisors',
                    ],
                    '5' => [
                        'Organizational Learning Strategy and Design',
                        'Facilitation and Adult Learning Principles',
                        'Mentoring Program Design and Implementation',
                    ],
                ],
            ],

            // ── Section 2: Records and Communication ─────────────────────────
            [
                'area' => 'Receive, log, route, and archive incoming and outgoing administrative documents',
                'tiers' => [
                    '1-2' => [
                        'Basic Records and Document Management',
                        'Mail and Document Routing Procedures',
                        'Introduction to Records Registry Operations',
                    ],
                    '3-4' => [
                        'Electronic Document Management Systems (EDMS)',
                        'Records Retention and Disposition Schedules',
                        'Metadata Standards and Document Referencing',
                    ],
                    '5' => [
                        'Records Management Program Coordination',
                        'Archives Administration and Preservation',
                        'ISO Records Management Standards Overview',
                    ],
                ],
            ],
            [
                'area' => 'Prepare routine administrative reports, minutes, and office communications',
                'tiers' => [
                    '1-2' => [
                        'Effective Business Writing for Government Offices',
                        'Minutes Writing and Meeting Documentation',
                        'Grammar and Structure for Official Reports',
                    ],
                    '3-4' => [
                        'Report Writing and Data Presentation for Administrators',
                        'Preparing Management and Accountability Reports',
                        'Communication Standards in Government (Memo, Letter, Indorsement)',
                    ],
                    '5' => [
                        'Technical Writing and Policy Documentation',
                        'Presentation and Reporting to Executives',
                        'Writing for Institutional Publications and Official Releases',
                    ],
                ],
            ],
            [
                'area' => 'Coordinate official correspondence with employees, supervisors, and partner offices',
                'tiers' => [
                    '1-2' => [
                        'Professional Communication Etiquette',
                        'Proper Use of Official Communication Channels',
                        'Turnaround Time Standards in Government Correspondence',
                    ],
                    '3-4' => [
                        'Inter-Agency Coordination and Liaison Work',
                        'Stakeholder Correspondence Tracking and Follow-Through',
                        'Drafting Formal Replies and Indorsements',
                    ],
                    '5' => [
                        'Public Relations and Protocol in Government',
                        'Communication Strategy for Multi-Stakeholder Environments',
                        'Conflict De-escalation in Official Correspondence',
                    ],
                ],
            ],

            // ── Section 3: Logistics and Procurement ─────────────────────────
            [
                'area' => 'Monitor office supplies, equipment requests, and inventory availability',
                'tiers' => [
                    '1-2' => [
                        'Basic Supply and Property Custodianship',
                        'Inventory Monitoring and Stock Recording',
                        'Introduction to Government Property Management',
                    ],
                    '3-4' => [
                        'Supply Chain Management for Government Offices',
                        'Equipment Request Processing and Tracking Systems',
                        'Physical Count and Inventory Reconciliation',
                    ],
                    '5' => [
                        'Property and Supply Management Program Administration',
                        'Asset Management Planning and Lifecycle Costing',
                        'COA Rules on Government Property Accountability',
                    ],
                ],
            ],
            [
                'area' => 'Prepare purchase requests, canvass summaries, and logistics endorsements',
                'tiers' => [
                    '1-2' => [
                        'RA 9184 and its IRR (Government Procurement Law) Overview',
                        'Preparing Purchase Requests and Abstract of Canvass',
                        'Procurement Documentation Basics',
                    ],
                    '3-4' => [
                        'Small Value Procurement and Shopping Procedures',
                        'Procurement Monitoring and Reporting (PMIS/PhilGEPS)',
                        'Logistics Endorsement and Delivery Verification',
                    ],
                    '5' => [
                        'Procurement Planning and Annual Procurement Plan Preparation',
                        'BAC Secretariat Functions and Compliance',
                        'Contract Management and Post-Award Monitoring',
                    ],
                ],
            ],
            [
                'area' => 'Coordinate workspace readiness, equipment upkeep, and logistics support for meetings',
                'tiers' => [
                    '1-2' => [
                        'Event and Meeting Logistics Coordination',
                        'Facilities Inspection and Readiness Checklist Practices',
                        'Equipment Basic Maintenance Awareness',
                    ],
                    '3-4' => [
                        'Facilities and Venue Management for Government Activities',
                        'Preventive Maintenance Program Coordination',
                        'Logistics Planning for Multi-Unit Activities',
                    ],
                    '5' => [
                        'General Services Administration and Facilities Planning',
                        'Project Management for Government Events',
                        'Disaster Preparedness and Business Continuity for Office Operations',
                    ],
                ],
            ],

            // ── Section 4: Service Delivery ───────────────────────────────────
            [
                'area' => 'Provide prompt frontline administrative assistance for employee and office transactions',
                'tiers' => [
                    '1-2' => [
                        'Frontline Services and Citizens Charter Compliance',
                        'Public Service Values and Work Ethics',
                        'Handling Walk-In Clients and Managing Queues',
                    ],
                    '3-4' => [
                        'Customer Service Excellence in Government',
                        'Service Delivery Standards and Anti-Red Tape (ARTA/RA 11032)',
                        'Complaint Handling and Escalation Procedures',
                    ],
                    '5' => [
                        'Service Quality Management and Continual Improvement',
                        'Designing Service Standards and SLAs',
                        'Supervisory Skills for Frontline Teams',
                    ],
                ],
            ],
            [
                'area' => 'Recommend and implement process improvements that reduce administrative delays',
                'tiers' => [
                    '1-2' => [
                        'Introduction to Business Process Improvement',
                        'Process Mapping and Flowcharting Basics',
                        'Identifying Bottlenecks in Administrative Workflows',
                    ],
                    '3-4' => [
                        'Lean Government and 5S Methodology',
                        'ARTA Compliance and Streamlining Government Processes',
                        'Root Cause Analysis and Corrective Action Planning',
                    ],
                    '5' => [
                        'Business Process Re-engineering and Change Management',
                        'ISO 9001 Quality Management for Government',
                        'Innovation in Public Administration',
                    ],
                ],
            ],
            [
                'area' => 'Support cross-functional activities, special assignments, and semester-end evaluation requirements',
                'tiers' => [
                    '1-2' => [
                        'Teamwork and Collaboration in the Workplace',
                        'Understanding IPCR and Accomplishment Reporting',
                        'Task Prioritization and Time Management',
                    ],
                    '3-4' => [
                        'Project Coordination and Cross-Unit Collaboration',
                        'Monitoring and Evaluation for Administrative Functions',
                        'Turnover Documentation and Handover Best Practices',
                    ],
                    '5' => [
                        'Strategic Planning Support and Results-Based Management',
                        'Leadership in Special Projects and High-Stakes Assignments',
                        'Institutional Knowledge Management and Documentation',
                    ],
                ],
            ],
        ];

        $rows = [];

        foreach ($criteria as $criterion) {
            foreach ($criterion['tiers'] as $tier => $titles) {
                foreach ($titles as $title) {
                    $rows[] = [
                        'title' => $title,
                        'description' => $description,
                        'location' => null,
                        'time' => null,
                        'speaker' => null,
                        'target_performance_area' => $criterion['area'],
                        'rating_tier' => $tier,
                        'date' => null,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }
            }
        }

        DB::table('seminars')->insert($rows);
    }
}
