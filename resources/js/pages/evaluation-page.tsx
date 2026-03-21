import { Head, usePage } from '@inertiajs/react';
import EvaluationCard from '@/components/evaluation-card';
import EvaluationResults from '@/components/evaluation-results';
import AppHeaderLayout from '@/layouts/app/app-header-layout';

type Employee = {
    employee_id: string;
    name: string;
    job_title: string;
};

type Submission = {
    id: number;
    performance_rating: number | null;
    criteria_ratings: Record<string, string> | null;
    status: string | null;
    stage: string | null;
    evaluator_gave_remarks: boolean;
    remarks: string | null;
    notification: string | null;
};

type PageProps = {
    employee: Employee | null;
    submission: Submission | null;
};

export default function EvaluationPage() {
    const { employee, submission } = usePage<PageProps>().props;

    return (
        <AppHeaderLayout>
            <Head title="Evaluation Page" />
            <div className="animate-fade-in p-4">
                {employee && submission && (submission.criteria_ratings || submission.stage === 'evaluation_saved' || submission.status === 'completed') ? (
                    <EvaluationResults employee={employee} submission={submission} />
                ) : (
                    <EvaluationCard employee={employee} submission={submission} />
                )}
            </div>
        </AppHeaderLayout>
    );
}
