import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeft, Printer } from 'lucide-react';
import { useEffect } from 'react';
import type { LeaveRequestDetail } from '@/components/leave-detail-dialog';
import { Button } from '@/components/ui/button';
import WorkflowSignOff from '@/components/workflow-sign-off';
import { leaveApplication } from '@/routes';

type PageProps = {
    leaveRequest: LeaveRequestDetail;
};

type SupportingDocument = {
    label: string;
    type: 'medical_certificate' | 'marriage_certificate' | 'solo_parent_id';
    available: boolean;
};

function formatLeaveType(type: string): string {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatPrintableDate(value: string): string {
    const date = new Date(`${value}T00:00:00`);

    return new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    }).format(date);
}

function formatPrintedTimestamp(value: string | null | undefined): string {
    if (!value) {
        return '—';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '—';
    }

    return new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(date);
}

function UnderlineField({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="space-y-1">
            <p className="text-[10px] font-semibold tracking-[0.2em] text-slate-600 uppercase">
                {label}
            </p>
            <p className="min-h-7 border-b border-slate-400 pb-1 text-sm font-medium leading-6 text-slate-950">
                {value}
            </p>
        </div>
    );
}

function SectionHeading({
    title,
    description,
}: {
    title: string;
    description?: string;
}) {
    return (
        <div className="space-y-1">
            <h3 className="text-sm font-semibold tracking-[0.18em] text-slate-700 uppercase">
                {title}
            </h3>
            {description ? (
                <p className="text-sm leading-6 text-slate-600">{description}</p>
            ) : null}
        </div>
    );
}

function Pill({
    label,
    tone = 'slate',
}: {
    label: string;
    tone?: 'slate' | 'emerald' | 'amber' | 'rose';
}) {
    const classes: Record<'slate' | 'emerald' | 'amber' | 'rose', string> = {
        slate: 'border-slate-300 bg-slate-50 text-slate-700',
        emerald: 'border-emerald-300 bg-emerald-50 text-emerald-800',
        amber: 'border-amber-300 bg-amber-50 text-amber-800',
        rose: 'border-rose-300 bg-rose-50 text-rose-800',
    };

    return (
        <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-wide ${classes[tone]}`}
        >
            {label}
        </span>
    );
}

function DocumentPreview({
    leaveId,
    document,
}: {
    leaveId: number;
    document: SupportingDocument;
}) {
    if (!document.available) {
        return null;
    }

    const documentUrl = `/leave/${leaveId}/document/${document.type}?inline=1`;
    const fittedDocumentUrl = `${documentUrl}#toolbar=0&navpanes=0&scrollbar=0&view=Fit`;

    return (
        <div className="mx-auto w-full max-w-4xl space-y-1 break-inside-avoid-page print:ml-0 print:pl-0">
            <p className="text-[10px] font-semibold tracking-[0.2em] text-slate-600 uppercase">
                {document.label}
            </p>
            <div className="w-full border-0 bg-white shadow-none md:h-[20rem] lg:h-[24rem] print:h-[4.4in]">
                <iframe
                    src={fittedDocumentUrl}
                    title={document.label}
                    scrolling="no"
                    className="block h-full w-full border-0 bg-white"
                />
            </div>
        </div>
    );
}

export default function LeaveRequestPrintPage() {
    const { leaveRequest } = usePage<PageProps>().props;

    useEffect(() => {
        const root = document.documentElement;
        const hadDarkClass = root.classList.contains('dark');

        root.classList.remove('dark');

        return () => {
            if (hadDarkClass) {
                root.classList.add('dark');
            }
        };
    }, []);

    const printableStatus =
        leaveRequest.hrDecision === 1 ||
        leaveRequest.status === 'completed'
            ? 'Approved'
            : 'Rejected';

    const supportingDocuments: SupportingDocument[] = [
        {
            label: 'Medical Certificate',
            type: 'medical_certificate',
            available: leaveRequest.hasMedicalCertificate,
        },
        {
            label: 'Marriage Certificate',
            type: 'marriage_certificate',
            available: leaveRequest.hasMarriageCertificate,
        },
        {
            label: 'Solo Parent ID',
            type: 'solo_parent_id',
            available: leaveRequest.hasSoloParentId,
        },
    ];

    return (
        <div className="min-h-screen bg-slate-200/70 text-slate-950 print:bg-white">
            <Head title="Print Leave Request" />
            <style>{`
                @page {
                    size: letter portrait;
                    margin: 10mm;
                }
            `}</style>

            <div className="mx-auto flex w-full max-w-[8.5in] flex-col gap-6 p-4 md:p-6 xl:p-8 print:mx-0 print:max-w-none print:p-0">
                <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
                    <div>
                        <p className="text-sm font-semibold tracking-[0.24em] text-[#2F5E2B] uppercase">
                            Printable Leave Request
                        </p>
                        <h1 className="text-3xl font-semibold text-slate-950">
                            Leave Request Form
                        </h1>
                        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-700">
                            Open this page in a new tab, then use your
                            browser&apos;s print dialog to save the leave request
                            as a PDF.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Button asChild variant="outline">
                            <Link href={leaveApplication().url}>
                                <ArrowLeft className="size-4" />
                                Back to Leave Application
                            </Link>
                        </Button>
                        <Button type="button" onClick={() => window.print()}>
                            <Printer className="size-4" />
                            Print / Save as PDF
                        </Button>
                    </div>
                </div>

                <div className="space-y-8 bg-white p-6 text-slate-950 shadow-xl print:m-0 print:p-6 print:shadow-none">
                    <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
                        <div className="space-y-1">
                            <p className="text-[11px] font-semibold tracking-[0.24em] text-[#2F5E2B] uppercase">
                                Printable Leave Request
                            </p>
                            <h2 className="text-3xl font-semibold text-slate-950">
                                Leave Request Form
                            </h2>
                            <p className="max-w-2xl text-sm leading-6 text-slate-600">
                                Employee leave application record and supporting documents.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Pill label={formatLeaveType(leaveRequest.leaveType)} />
                            <Pill
                                label={printableStatus}
                                tone={printableStatus === 'Approved' ? 'emerald' : 'rose'}
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <SectionHeading
                            title="Applicant Information"
                            description="The employee details attached to this request."
                        />
                        <div className="grid gap-5 md:grid-cols-2">
                            <UnderlineField
                                label="Department"
                                value={leaveRequest.department ?? 'Administrative Office'}
                            />
                            <UnderlineField
                                label="Name of Applicant"
                                value={leaveRequest.name}
                            />
                            <UnderlineField
                                label="Position"
                                value={leaveRequest.jobTitle ?? '—'}
                            />
                            <UnderlineField
                                label="Employee Number"
                                value={leaveRequest.employeeId ?? '—'}
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <SectionHeading
                            title="Leave Details"
                            description="The requested dates, type, and computed leave days."
                        />
                        <div className="grid gap-5 md:grid-cols-2">
                            <UnderlineField
                                label="Leave Type"
                                value={formatLeaveType(leaveRequest.leaveType)}
                            />
                            <UnderlineField
                                label="Days Requested"
                                value={
                                    leaveRequest.daysRequested != null
                                        ? `${leaveRequest.daysRequested.toFixed(0)} day(s)`
                                        : '—'
                                }
                            />
                            <UnderlineField
                                label="Date From"
                                value={formatPrintableDate(leaveRequest.startDate)}
                            />
                            <UnderlineField
                                label="Date To"
                                value={formatPrintableDate(leaveRequest.endDate)}
                            />
                            <UnderlineField
                                label="Leave Accrual Computation"
                                value={
                                    leaveRequest.leaveAccrual != null
                                        ? `${leaveRequest.daysRequested?.toFixed(0) ?? '0'} day(s) x 1.00 = ${leaveRequest.leaveAccrual.toFixed(2)} day(s)`
                                        : '—'
                                }
                            />
                            <UnderlineField
                                label="Request Status"
                                value={printableStatus}
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <SectionHeading
                            title="Reason for Leave"
                            description="This space expands naturally with the employee’s explanation."
                        />
                        <div className="rounded-none border border-slate-300 p-4">
                            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-950">
                                {leaveRequest.reason || '—'}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <SectionHeading
                            title="Review Outcome"
                            description="Final leave decision and any rejection remarks."
                        />
                        <div className="grid gap-5 md:grid-cols-2">
                            <UnderlineField
                                label="Status"
                                value={printableStatus}
                            />
                            <UnderlineField
                                label="Rejection Reason"
                                value={
                                    printableStatus === 'Rejected'
                                        ? leaveRequest.rejectionReasonText ?? '—'
                                        : '—'
                                }
                            />
                        </div>
                    </div>

                    <WorkflowSignOff
                        title="Workflow Sign-Off"
                        description="Evaluator and HR personnel names captured from the leave workflow."
                        slots={[
                            {
                                role: 'Evaluator',
                                name: leaveRequest.workflowSignOff?.evaluatorName,
                                date: formatPrintedTimestamp(
                                    leaveRequest.workflowSignOff?.evaluatorDate,
                                ),
                            },
                            {
                                role: 'HR Personnel',
                                name: leaveRequest.workflowSignOff?.hrPersonnelName,
                                date: formatPrintedTimestamp(
                                    leaveRequest.workflowSignOff?.hrPersonnelDate,
                                ),
                            },
                        ]}
                    />

                    <div className="space-y-4 print:-mx-6">
                        <div className="border-b border-slate-400 pb-1">
                            <p className="text-[10px] font-semibold tracking-[0.2em] text-slate-600 uppercase">
                                Supporting Document
                            </p>
                        </div>
                        <div className="space-y-4 print:space-y-3">
                            {supportingDocuments.some(
                                (document) => document.available,
                            ) ? (
                                supportingDocuments.map((document) => (
                                    <DocumentPreview
                                        key={document.type}
                                        leaveId={leaveRequest.id}
                                        document={document}
                                    />
                                ))
                            ) : (
                                <p className="text-sm text-slate-700">
                                    No supporting document is attached to this
                                    leave request.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
