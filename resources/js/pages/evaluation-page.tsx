import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeft, FileSpreadsheet } from 'lucide-react';
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

function reviewerTargetUrl(
    employeeId: string | null | undefined,
    submissionId?: number | null,
): string {
    const params = new URLSearchParams();

    if (employeeId) {
        params.set('employee_id', employeeId);
    }

    if (submissionId) {
        params.set('submission_id', String(submissionId));
    }

    params.set('source', 'evaluator');

    return `/ipcr/target-review?${params.toString()}`;
}

export default function EvaluationPage() {
    const { employee, draftFormPayload, submission } = usePage<PageProps>().props;

    return (
        <AppHeaderLayout>
            <Head title="Evaluation Page" />
            <div className="app-page-shell app-page-stack animate-fade-in">
                <PageIntro
                    eyebrow="Evaluator · Performance Evaluation"
                    title="Evaluator Workspace"
                    description="Review the employee's IPCR form, enter Q/E/T ratings, and route to HR when complete."
                    actions={
                        <div className="flex flex-wrap gap-2">
                            <div className="inline-flex items-center gap-2 rounded-full border border-[#2F5E2B]/20 bg-[#DDEFD7] px-3 py-1 text-xs font-semibold tracking-[0.22em] text-[#2F5E2B] uppercase shadow-sm dark:border-[#4A7C3C]/40 dark:bg-[#274827]/80 dark:text-[#EAF7E6]">
                                <FileSpreadsheet className="size-3.5" />
                                Performance Evaluation
                            </div>
                            {employee ? (
                                <Link
                                    href={reviewerTargetUrl(
                                        employee.employee_id,
                                        submission?.id ?? null,
                                    )}
                                    className="app-info-pill transition-colors duration-150 hover:border-[#7CAF73] hover:bg-[#E8F4E4] dark:hover:bg-[#274827]/80"
                                >
                                    Open Target Reference
                                </Link>
                            ) : null}
                            <Link
                                href={documentManagement().url}
                                className="app-info-pill transition-colors duration-150 hover:border-[#7CAF73] hover:bg-[#E8F4E4] dark:hover:bg-[#274827]/80"
                            >
                                <ArrowLeft className="size-4" />
                                Back to Documents
                            </Link>
                        </div>
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
                ) : submission ? (
                    <EvaluationCard
                        employee={employee}
                        submission={submission}
                        draftFormPayload={draftFormPayload}
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
