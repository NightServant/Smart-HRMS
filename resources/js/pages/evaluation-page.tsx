import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import EvaluationCard from '@/components/evaluation-card';
import EvaluationResults from '@/components/evaluation-results';
import PageIntro from '@/components/page-intro';
import AppHeaderLayout from '@/layouts/app/app-header-layout';
import { documentManagement } from '@/routes';
import type { IpcrEmployee, IpcrFormPayload, IpcrSubmission } from '@/types';

type PageProps = {
    employee: IpcrEmployee | null;
    draftFormPayload: IpcrFormPayload | null;
    submission: IpcrSubmission | null;
};

export default function EvaluationPage() {
    const { employee, draftFormPayload, submission } =
        usePage<PageProps>().props;

    return (
        <AppHeaderLayout>
            <Head title="Evaluation Page" />
            <div className="app-page-shell app-page-stack animate-fade-in">
                <PageIntro
                    eyebrow="Evaluator · Performance Evaluation"
                    title="Evaluator Workspace"
                    description="Review the employee's IPCR form, enter Q/E/T ratings, and route to HR when complete."
                    actions={
                        <Link
                            href={documentManagement().url}
                            className="app-info-pill transition-colors duration-150 hover:border-[#7CAF73] hover:bg-[#E8F4E4] dark:hover:bg-[#274827]/80"
                        >
                            <ArrowLeft className="size-4" />
                            Back to Documents
                        </Link>
                    }
                />
                {employee &&
                submission &&
                submission.performance_rating !== null &&
                submission.stage !== 'sent_to_evaluator' ? (
                    <EvaluationResults
                        employee={employee}
                        submission={submission}
                    />
                ) : (
                    <EvaluationCard
                        employee={employee}
                        submission={submission}
                        draftFormPayload={draftFormPayload}
                    />
                )}
            </div>
        </AppHeaderLayout>
    );
}
