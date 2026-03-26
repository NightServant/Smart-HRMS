import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import EvaluationCard from '@/components/evaluation-card';
import EvaluationResults from '@/components/evaluation-results';
import AppHeaderLayout from '@/layouts/app/app-header-layout';
import { documentManagement } from '@/routes';

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
                <Link
                    href={documentManagement().url}
                    className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                    <ArrowLeft className="size-4" />
                    Back to Documents
                </Link>
                {employee && submission && (submission.criteria_ratings || submission.stage === 'evaluation_saved' || submission.status === 'completed') ? (
                    <EvaluationResults employee={employee} submission={submission} />
                ) : (
                    <EvaluationCard employee={employee} submission={submission} />
                )}
            </div>
        </AppHeaderLayout>
    );
}
