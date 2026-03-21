<?php

namespace Database\Seeders;

use App\Models\Seminars;
use Illuminate\Database\Seeder;

class SeminarSeeder extends Seeder
{
    /**
     * Seed 18 training programs from the ATRE reference data.
     * target_performance_area values match the trainings-seminars-table.tsx dropdown.
     */
    public function run(): void
    {
        $seminars = [
            [
                'title' => 'Job Role Mastery Workshop',
                'description' => 'Comprehensive workshop on understanding assigned duties, scope, and expected outcomes for your role.',
                'location' => 'Tarlac Provincial Capitol, Tarlac City',
                'time' => '09:00',
                'speaker' => 'Dr. Elena Cruz',
                'target_performance_area' => 'Understanding job responsibilities',
                'date' => '2026-03-01',
            ],
            [
                'title' => 'Advanced Technical Skills Bootcamp',
                'description' => 'Intensive bootcamp to apply required technical knowledge and role-specific competencies.',
                'location' => 'Tarlac State University, Tarlac City',
                'time' => '08:30',
                'speaker' => 'Engr. Marco Villanueva',
                'target_performance_area' => 'Technical or Professional Skills',
                'date' => '2026-04-05',
            ],
            [
                'title' => 'Quality Assurance Best Practices',
                'description' => 'Learn to produce outputs that are complete, accurate, and aligned with standards.',
                'location' => 'Kart Zone, SM Tarlac City',
                'time' => '13:00',
                'speaker' => 'Atty. Sofia Reyes',
                'target_performance_area' => 'Quality of work',
                'date' => '2026-02-20',
            ],
            [
                'title' => 'Productivity & Efficiency Training',
                'description' => 'Master techniques to deliver expected volume of work within available time and resources.',
                'location' => 'Luisita Convention Center, San Miguel, Tarlac',
                'time' => '10:00',
                'speaker' => 'Prof. Carlos Mendoza',
                'target_performance_area' => 'Productivity',
                'date' => '2026-03-15',
            ],
            [
                'title' => 'Attention to Detail Seminar',
                'description' => 'Minimize errors and learn to check details before submitting outputs.',
                'location' => 'Microtel by Wyndham, Tarlac City',
                'time' => '14:00',
                'speaker' => 'Dr. Amara Singh',
                'target_performance_area' => 'Accuracy and attention to detail',
                'date' => '2026-03-22',
            ],
            [
                'title' => 'Time Management for Professionals',
                'description' => 'Complete tasks on or before agreed timelines consistently with proven strategies.',
                'location' => 'Central Azucarera de Tarlac Hall, San Miguel',
                'time' => '09:00',
                'speaker' => 'Engr. Patricia Lim',
                'target_performance_area' => 'Meeting deadlines',
                'date' => '2026-04-01',
            ],
            [
                'title' => 'Critical Thinking & Problem Solving',
                'description' => 'Analyze issues and propose practical, timely solutions in the workplace.',
                'location' => 'Tarlac Provincial Capitol, Tarlac City',
                'time' => '10:30',
                'speaker' => 'Dr. James Ong',
                'target_performance_area' => 'Problem-Solving Ability',
                'date' => '2026-04-10',
            ],
            [
                'title' => 'Developing Workplace Initiative',
                'description' => 'Act proactively without waiting for frequent direction from supervisors.',
                'location' => 'Metropoint Convention Center, Tarlac City',
                'time' => '09:00',
                'speaker' => 'Prof. Maria Gonzales',
                'target_performance_area' => 'Initiative',
                'date' => '2026-03-05',
            ],
            [
                'title' => 'Adaptability in Dynamic Work Environments',
                'description' => 'Adjust effectively to new priorities, tools, and work conditions.',
                'location' => 'Tarlac State University, Tarlac City',
                'time' => '13:30',
                'speaker' => 'Dr. Kenji Nakamura',
                'target_performance_area' => 'Adaptability',
                'date' => '2026-03-18',
            ],
            [
                'title' => 'Effective Decision-Making Strategies',
                'description' => 'Make sound decisions using available facts and policy guidance.',
                'location' => 'Museo ning Tarlac, Tarlac City',
                'time' => '10:00',
                'speaker' => 'Atty. Ricardo Bautista',
                'target_performance_area' => 'Decision-making skills',
                'date' => '2026-04-15',
            ],
            [
                'title' => 'Effective Workplace Communication',
                'description' => 'Communicate ideas clearly and professionally in spoken interactions.',
                'location' => 'Luisita Convention Center, San Miguel, Tarlac',
                'time' => '09:00',
                'speaker' => 'Prof. Angela Torres',
                'target_performance_area' => 'Verbal communication',
                'date' => '2026-02-25',
            ],
            [
                'title' => 'Business Writing Essentials',
                'description' => 'Prepare clear, organized, and grammatically correct written outputs.',
                'location' => 'Kart Zone, SM Tarlac City',
                'time' => '14:00',
                'speaker' => 'Dr. Michael Santos',
                'target_performance_area' => 'Written communication',
                'date' => '2026-03-08',
            ],
            [
                'title' => 'Team Collaboration & Synergy',
                'description' => 'Collaborate respectfully and support shared team goals effectively.',
                'location' => 'Fontana Leisure Parks, Clark, Tarlac',
                'time' => '09:30',
                'speaker' => 'Prof. Diana Reyes',
                'target_performance_area' => 'Teamwork',
                'date' => '2026-03-12',
            ],
            [
                'title' => 'Customer Service Excellence Program',
                'description' => 'Deliver outstanding service and build positive stakeholder relationships.',
                'location' => 'Microtel by Wyndham, Tarlac City',
                'time' => '10:00',
                'speaker' => 'Dr. Hannah Lee',
                'target_performance_area' => 'Professional behavior',
                'date' => '2026-04-08',
            ],
            [
                'title' => 'Workplace Ethics & Professional Conduct',
                'description' => 'Demonstrate integrity, respect, and proper workplace conduct at all times.',
                'location' => 'Metropoint Convention Center, Tarlac City',
                'time' => '13:00',
                'speaker' => 'Atty. Fernando Cruz',
                'target_performance_area' => 'Professional behavior',
                'date' => '2026-02-28',
            ],
            [
                'title' => 'Workplace Punctuality & Discipline Seminar',
                'description' => 'Report to work and meetings on time consistently with discipline strategies.',
                'location' => 'Tarlac Provincial Capitol, Tarlac City',
                'time' => '08:00',
                'speaker' => 'Prof. Roberto Aquino',
                'target_performance_area' => 'Punctuality',
                'date' => '2026-03-20',
            ],
            [
                'title' => 'Attendance Responsibility Awareness',
                'description' => 'Maintain reliable attendance aligned with office requirements and policies.',
                'location' => 'Central Azucarera de Tarlac Hall, San Miguel',
                'time' => '10:00',
                'speaker' => 'Dr. Lorna Pascual',
                'target_performance_area' => 'Attendance record',
                'date' => '2026-03-25',
            ],
            [
                'title' => 'Building Reliability & Accountability',
                'description' => 'Build trust through consistent follow-through and dependable work habits.',
                'location' => 'Fontana Leisure Parks, Clark, Tarlac',
                'time' => '09:00',
                'speaker' => 'Prof. Antonio Ramos',
                'target_performance_area' => 'Dependability',
                'date' => '2026-04-12',
            ],
        ];

        foreach ($seminars as $seminar) {
            Seminars::query()->updateOrCreate(
                ['title' => $seminar['title']],
                $seminar,
            );
        }
    }
}
