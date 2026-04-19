import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeft, FileSpreadsheet, Printer } from 'lucide-react';
import IpcrPaperForm from '@/components/ipcr-paper-form';
import PageIntro from '@/components/page-intro';
import SubmitCard from '@/components/submit-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AppHeaderLayout from '@/layouts/app/app-header-layout';
import { submitEvaluation } from '@/routes';
import type {
    IpcrEmployee,
    IpcrFormPayload,
    IpcrSubmission,
    IpcrTarget,
} from '@/types/ipcr';

type PastSubmission = {
    id: number;
    semester: string;
    year: number | string;
    status: string;
    stage: string;
    finalized_at: string | null;
};

type PageProps = {
    employee?: IpcrEmployee | null;
    currentPeriod?: { label: string; year: number; isOpen: boolean };
    periodOpen?: boolean;
    canStartNewSubmission?: boolean;
    draftFormPayload?: IpcrFormPayload | null;
    selectedSubmission?: IpcrSubmission | null;
    latestSubmission?: IpcrSubmission | null;
    currentTarget?: IpcrTarget | null;
    pastSubmissions?: PastSubmission[];
};

export default function IpcrFormPage() {
    const { selectedSubmission, latestSubmission, currentTarget, pastSubmissions } =
        usePage<PageProps>().props;

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
                            <div className="inline-flex items-center gap-2 rounded-full border border-[#2F5E2B]/20 bg-[#DDEFD7] px-3 py-1 text-xs font-semibold tracking-[0.22em] text-[#2F5E2B] uppercase shadow-sm dark:border-[#4A7C3C]/40 dark:bg-[#274827]/80 dark:text-[#EAF7E6]">
                                <FileSpreadsheet className="size-3.5" />
                                Performance Evaluation
                            </div>
                            <Link
                                href={submitEvaluation().url}
                                className="app-info-pill transition-colors duration-150 hover:border-[#7CAF73] hover:bg-[#E8F4E4] dark:hover:bg-[#274827]/80"
                            >
                                <ArrowLeft className="size-4" />
                                Back to Performance Evaluation
                            </Link>
                        </>
                    }
                />

                {selectedSubmission ? (
                    <Card className="glass-card min-w-0 overflow-hidden border border-border bg-card shadow-sm">
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
                    <SubmitCard currentTarget={currentTarget ?? null} />
                )}

                {pastSubmissions && pastSubmissions.length > 0 && (
                    <Card className="glass-card min-w-0 overflow-hidden border border-border bg-card shadow-sm">
                        <CardHeader className="border-b border-border bg-card">
                            <CardTitle className="text-xl">IPCR History</CardTitle>
                            <CardDescription>
                                Your past IPCR submissions and their current workflow status.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="px-0 py-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Semester</TableHead>
                                        <TableHead>Year</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pastSubmissions.map((sub) => (
                                        <TableRow key={sub.id}>
                                            <TableCell>
                                                {sub.semester === 'S1'
                                                    ? '1st Semester'
                                                    : sub.semester === 'S2'
                                                      ? '2nd Semester'
                                                      : sub.semester}
                                            </TableCell>
                                            <TableCell>{sub.year}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {sub.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {sub.stage === 'finalized' && (
                                                    <Button
                                                        asChild
                                                        variant="outline"
                                                        size="sm"
                                                        className="gap-1 rounded-full"
                                                    >
                                                        <a
                                                            href={`/ipcr/print?submission_id=${sub.id}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                        >
                                                            <Printer className="size-3.5" />
                                                            Open Printable PDF View
                                                        </a>
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppHeaderLayout>
    );
}
