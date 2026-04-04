import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeft, Printer } from 'lucide-react';
import IpcrPaperForm from '@/components/ipcr-paper-form';
import PageIntro from '@/components/page-intro';
import SubmitCard from '@/components/submit-card';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import AppHeaderLayout from '@/layouts/app/app-header-layout';
import { submitEvaluation } from '@/routes';
import type { IpcrSubmission } from '@/types';

type PageProps = {
    selectedSubmission?: IpcrSubmission | null;
    latestSubmission?: IpcrSubmission | null;
};

export default function IpcrFormPage() {
    const { selectedSubmission, latestSubmission } = usePage<PageProps>().props;
    const printableUrl = selectedSubmission
        ? `/ipcr/print?submission_id=${selectedSubmission.id}`
        : latestSubmission
          ? `/ipcr/print?submission_id=${latestSubmission.id}`
          : '/ipcr/print';

    return (
        <AppHeaderLayout>
            <Head title="IPCR Form" />
            <div className="app-page-shell app-page-stack">
                <PageIntro
                    eyebrow="Administrative Office"
                    title="IPCR Form Workspace"
                    description="Complete your IPCR in guided sections. The form is divided into smaller steps so you can focus on one Administrative Services area at a time."
                    actions={
                        <>
                            <Link
                                href={submitEvaluation().url}
                                className="app-info-pill transition-colors duration-150 hover:border-[#7CAF73] hover:bg-[#E8F4E4] dark:hover:bg-[#274827]/80"
                            >
                                <ArrowLeft className="size-4" />
                                Back to Performance Evaluation
                            </Link>
                            <Button
                                asChild
                                variant="outline"
                                className="rounded-full"
                            >
                                <a
                                    href={printableUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    <Printer className="size-4" />
                                    Open Printable PDF View
                                </a>
                            </Button>
                        </>
                    }
                />

                {selectedSubmission ? (
                    <Card className="glass-card overflow-hidden border border-border bg-card shadow-sm">
                        <CardHeader className="border-b border-border bg-card">
                            <CardTitle className="text-xl">
                                Selected Evaluation Snapshot
                            </CardTitle>
                            <CardDescription>
                                {selectedSubmission.notification ??
                                    'Review the saved IPCR form and its workflow details.'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 px-4 py-5 sm:px-6">
                            <IpcrPaperForm
                                value={selectedSubmission.form_payload}
                                mode="review"
                            />
                        </CardContent>
                    </Card>
                ) : (
                    <SubmitCard />
                )}
            </div>
        </AppHeaderLayout>
    );
}
