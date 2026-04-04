import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeft, Printer } from 'lucide-react';
import IpcrPaperForm from '@/components/ipcr-paper-form';
import { Button } from '@/components/ui/button';
import type { IpcrFormPayload, IpcrSubmission } from '@/types/ipcr';

type PageProps = {
    submission?: IpcrSubmission | null;
    printableFormPayload: IpcrFormPayload;
    workspaceUrl: string;
    sourceLabel: string;
};

export default function IpcrPrintPage() {
    const { printableFormPayload, workspaceUrl, sourceLabel, submission } = usePage<PageProps>().props;

    return (
        <div className="min-h-screen bg-slate-100 print:bg-white">
            <Head title="Printable IPCR Form" />

            <div className="mx-auto flex w-full max-w-[1700px] flex-col gap-6 p-4 md:p-6 xl:p-8">
                <div className="flex flex-col gap-3 print:hidden md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                        <p className="text-sm font-semibold tracking-[0.22em] text-[#2F5E2B] uppercase">
                            Printable PDF View
                        </p>
                        <h1 className="text-3xl font-semibold text-foreground">Employee IPCR Print Preview</h1>
                        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                            Open this page in a new tab, then use your browser&apos;s print dialog to save the IPCR as a PDF.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Button asChild variant="outline">
                            <Link href={workspaceUrl}>
                                <ArrowLeft className="size-4" />
                                Back to IPCR Workspace
                            </Link>
                        </Button>
                        <Button type="button" onClick={() => window.print()}>
                            <Printer className="size-4" />
                            Print / Save as PDF
                        </Button>
                    </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm print:border-none print:p-0 print:shadow-none md:p-6">
                    <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 print:hidden">
                        {sourceLabel}
                        {submission?.finalized_at ? ' This view includes the finalized IPCR details.' : ''}
                    </div>

                    <IpcrPaperForm
                        value={printableFormPayload}
                        mode="review"
                        presentation="print"
                    />
                </div>
            </div>
        </div>
    );
}
