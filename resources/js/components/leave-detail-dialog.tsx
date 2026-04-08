import { router } from '@inertiajs/react';
import {
    Briefcase,
    Calendar,
    CheckCircle2,
    Clock,
    Download,
    Hash,
    Paperclip,
    Send,
    User,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import WorkflowSignOff from '@/components/workflow-sign-off';

export type LeaveRequestDetail = {
    id: number;
    name: string;
    employeeId: string | null;
    department: string | null;
    jobTitle: string | null;
    leaveType: string;
    startDate: string;
    endDate: string;
    daysRequested: number | null;
    leaveAccrual: number | null;
    reason: string;
    status: string;
    stage: string | null;
    dhDecision: number;
    hrDecision: number;
    rejectionReasonText: string | null;
    hasMedicalCertificate: boolean;
    hasMarriageCertificate: boolean;
    hasSoloParentId: boolean;
    createdAt: string | null;
    workflowSignOff?: {
        evaluatorName: string | null;
        evaluatorDate: string | null;
        hrPersonnelName: string | null;
        hrPersonnelDate: string | null;
        pmtName: string | null;
        pmtDate: string | null;
        pmtNote: string | null;
    };
};

export type ViewerRole = 'evaluator' | 'hr' | 'employee';

type ActionState = 'idle' | 'confirming-approve' | 'confirming-reject' | 'processing';
type StepStatus = 'completed' | 'current' | 'pending' | 'rejected';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatLeaveType(type: string): string {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatLeaveAccrual(value: number | null): string {
    return value != null ? `${(value / 1.25).toFixed(2)} days` : '—';
}

function getStepStatus(leave: LeaveRequestDetail, step: number): StepStatus {
    const stage = leave.stage ?? '';
    const isReturned = leave.status === 'returned';

    if (step === 1) return 'completed';

    if (step === 2) {
        if (stage === 'sent_to_department_head') return 'current';
        if (leave.dhDecision === 2) return isReturned ? 'rejected' : 'completed';
        if (leave.dhDecision === 1 || stage === 'sent_to_hr' || stage === 'completed') return 'completed';
        return 'pending';
    }

    if (step === 3) {
        if (stage === 'sent_to_hr') return 'current';
        if (leave.hrDecision === 2) return isReturned ? 'rejected' : 'completed';
        if (leave.hrDecision === 1 || stage === 'completed') return 'completed';
        return 'pending';
    }

    if (step === 4) {
        if (leave.status === 'completed') return 'completed';
        if (leave.status === 'returned') return 'rejected';
        return 'pending';
    }

    return 'pending';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
    const variants: Record<string, { label: string; className: string }> = {
        completed: {
            label: 'Approved',
            className: 'bg-emerald-100 text-emerald-800 ring-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-400 dark:ring-emerald-800',
        },
        returned: {
            label: 'Rejected',
            className: 'bg-red-100 text-red-800 ring-red-300 dark:bg-red-950/50 dark:text-red-400 dark:ring-red-800',
        },
        routed: {
            label: 'In Review',
            className: 'bg-blue-100 text-blue-800 ring-blue-300 dark:bg-blue-950/50 dark:text-blue-400 dark:ring-blue-800',
        },
        pending: {
            label: 'Pending',
            className: 'bg-amber-100 text-amber-800 ring-amber-300 dark:bg-amber-950/50 dark:text-amber-400 dark:ring-amber-800',
        },
    };

    const { label, className } = variants[status] ?? variants.pending;

    return (
        <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${className}`}>
            {label}
        </span>
    );
}

function InfoRow({
    icon: Icon,
    label,
    value,
}: {
    icon: React.ElementType;
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-start gap-2.5">
            <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className="text-sm font-medium text-foreground">{value}</p>
            </div>
        </div>
    );
}

function DocumentPreview({ id, type, label }: { id: number; type: string; label: string }) {
    const inlineUrl = `/leave/${id}/document/${type}?inline=1`;
    const downloadUrl = `/leave/${id}/document/${type}`;

    return (
        <div className="rounded-lg border bg-muted/20 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {label}
            </p>
            <object
                data={inlineUrl}
                className="h-64 w-full rounded border bg-white"
            >
                <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                    Unable to preview document.{' '}
                    <a
                        href={downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1 text-primary underline"
                    >
                        Download instead
                    </a>
                </div>
            </object>
            <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
            >
                <Download className="size-3" />
                Download
            </a>
        </div>
    );
}

function RoutingStep({
    label,
    description,
    status,
    timestamp,
    isLast,
}: {
    label: string;
    description: string;
    status: StepStatus;
    timestamp: string | null;
    isLast: boolean;
}) {
    const styles: Record<
        StepStatus,
        { panel: string; line: string; title: string; icon: string }
    > = {
        completed: {
            panel: 'border-emerald-300 bg-emerald-50/90 dark:border-emerald-800 dark:bg-emerald-950/30',
            line: 'bg-emerald-400 dark:bg-emerald-700',
            title: 'text-emerald-800 dark:text-emerald-300',
            icon: 'text-emerald-600 dark:text-emerald-400',
        },
        current: {
            panel: 'border-blue-300 bg-blue-50/90 dark:border-blue-800 dark:bg-blue-950/30',
            line: 'bg-blue-300 dark:bg-blue-800',
            title: 'text-blue-800 dark:text-blue-300',
            icon: 'text-blue-600 dark:text-blue-400',
        },
        rejected: {
            panel: 'border-red-300 bg-red-50/90 dark:border-red-800 dark:bg-red-950/30',
            line: 'bg-red-300 dark:bg-red-800',
            title: 'text-red-800 dark:text-red-300',
            icon: 'text-red-600 dark:text-red-400',
        },
        pending: {
            panel: 'border-border bg-muted/20',
            line: 'bg-border',
            title: 'text-foreground',
            icon: 'text-muted-foreground',
        },
    };

    const IconComponent = status === 'completed'
        ? CheckCircle2
        : status === 'rejected'
            ? XCircle
            : Clock;

    return (
        <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center">
                <div className={`flex size-9 shrink-0 items-center justify-center rounded-full border ${styles[status].panel}`}>
                    <IconComponent className={`size-4 ${styles[status].icon} ${status === 'current' ? 'animate-pulse' : ''}`} />
                </div>
                {!isLast && (
                    <div className={`ml-3 hidden h-0.5 flex-1 rounded-full lg:block ${styles[status].line}`} />
                )}
            </div>
            <div className={`mt-3 h-full rounded-2xl border p-3 ${styles[status].panel}`}>
                <p className={`text-sm font-semibold ${styles[status].title}`}>{label}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
                {timestamp && (
                    <p className="mt-2 text-[11px] text-muted-foreground/70">{timestamp}</p>
                )}
            </div>
        </div>
    );
}

function LeaveRoutingProgress({ leave }: { leave: LeaveRequestDetail }) {
    const steps = [
        {
            step: 1,
            label: 'Submitted',
            description: 'Leave request submitted by employee',
            timestamp: leave.createdAt,
        },
        {
            step: 2,
            label: 'Evaluator Review',
            description:
                leave.dhDecision === 1 ? 'Approved by evaluator' :
                leave.dhDecision === 2 ? 'Returned by evaluator' :
                leave.stage === 'sent_to_department_head' ? 'Awaiting evaluator decision' :
                'Pending evaluator review',
            timestamp: null,
        },
        {
            step: 3,
            label: 'HR Approval',
            description:
                leave.hrDecision === 1 ? 'Approved by HR' :
                leave.hrDecision === 2 ? 'Rejected by HR' :
                leave.stage === 'sent_to_hr' ? 'Awaiting HR decision' :
                'Pending HR review',
            timestamp: null,
        },
        {
            step: 4,
            label: 'Completed',
            description:
                leave.status === 'completed' ? 'Leave request has been fully approved' :
                leave.status === 'returned' ? 'Leave request was not approved' :
                'Awaiting final completion',
            timestamp: null,
        },
    ];

    return (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, idx) => (
                <RoutingStep
                    key={step.step}
                    label={step.label}
                    description={step.description}
                    status={getStepStatus(leave, step.step)}
                    timestamp={step.timestamp}
                    isLast={idx === steps.length - 1}
                />
            ))}
        </div>
    );
}

// ─── Main Dialog ──────────────────────────────────────────────────────────────

export function LeaveDetailDialog({
    leave,
    role,
    onClose,
}: {
    leave: LeaveRequestDetail | null;
    role: ViewerRole;
    onClose: () => void;
}) {
    const [actionState, setActionState] = useState<ActionState>('idle');
    const [rejectionReason, setRejectionReason] = useState('');

    const isOpen = leave !== null;

    const isActionable =
        leave !== null &&
        role !== 'employee' &&
        (role === 'evaluator'
            ? leave.stage === 'sent_to_department_head'
            : leave.stage === 'sent_to_hr');

    const hasDocuments = leave !== null && (
        leave.hasMedicalCertificate ||
        leave.hasMarriageCertificate ||
        leave.hasSoloParentId
    );

    function handleClose() {
        setActionState('idle');
        setRejectionReason('');
        onClose();
    }

    function handleApprove() {
        if (!leave) return;
        setActionState('processing');
        router.post(
            `/leave/${leave.id}/approve`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Leave request approved successfully.');
                    handleClose();
                },
                onError: () => {
                    toast.error('Failed to approve leave request. Please try again.');
                    setActionState('confirming-approve');
                },
            },
        );
    }

    function handleReject() {
        if (!leave || !rejectionReason.trim()) return;
        setActionState('processing');
        router.post(
            `/leave/${leave.id}/reject`,
            { rejection_reason: rejectionReason.trim() },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Leave request rejected.');
                    setRejectionReason('');
                    handleClose();
                },
                onError: () => {
                    toast.error('Failed to reject leave request. Please try again.');
                    setActionState('confirming-reject');
                },
            },
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
            <DialogContent
                className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl"
                aria-describedby="leave-dialog-description"
            >
                {leave && (
                    <>
                        {/* ── Header ── */}
                        <div className="border-b px-6 pb-4 pt-6">
                            <div className="flex items-start justify-between gap-4 pr-8">
                                <div>
                                    <DialogTitle className="text-lg font-bold">
                                        Leave Request Details
                                    </DialogTitle>
                                    <DialogDescription id="leave-dialog-description" className="mt-0.5 text-sm text-muted-foreground">
                                        {leave.name} &middot; {formatLeaveType(leave.leaveType)}
                                    </DialogDescription>
                                </div>
                                <StatusBadge status={leave.status} />
                            </div>
                        </div>

                        <div className="border-b bg-muted/10 px-6 py-4">
                            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Leave Request Tracking / Routing Progress
                            </p>
                            <LeaveRoutingProgress leave={leave} />
                        </div>

                        {/* ── Scrollable Body ── */}
                        <div className="flex-1 overflow-y-auto px-6 py-5">
                            <div className="space-y-6">
                                {/* Employee Info + Leave Details */}
                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                    {/* Employee Information */}
                                    <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
                                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                            Employee Information
                                        </p>
                                        <InfoRow icon={User} label="Name" value={leave.name} />
                                        <InfoRow icon={Hash} label="Employee ID" value={leave.employeeId ?? '—'} />
                                        <InfoRow icon={Briefcase} label="Position" value={leave.jobTitle ?? '—'} />
                                    </div>

                                    {/* Leave Details */}
                                    <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
                                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                            Leave Details
                                        </p>
                                        <InfoRow icon={Send} label="Type" value={formatLeaveType(leave.leaveType)} />
                                        <InfoRow icon={Calendar} label="From" value={leave.startDate} />
                                        <InfoRow icon={Calendar} label="To" value={leave.endDate} />
                                        <InfoRow
                                            icon={Clock}
                                            label="Days of Leave"
                                            value={formatLeaveAccrual(leave.leaveAccrual)}
                                        />
                                    </div>
                                </div>

                                {/* Reason */}
                                <div className="rounded-lg border bg-muted/20 p-4">
                                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                        Reason
                                    </p>
                                    <p className="text-sm leading-relaxed text-foreground">{leave.reason}</p>
                                </div>

                                {leave.workflowSignOff && (
                                    <WorkflowSignOff
                                        title="Workflow Sign-Off"
                                        description="Names captured from the leave routing trail."
                                        tone="dark"
                                        slots={[
                                            {
                                                role: 'Evaluator',
                                                name: leave.workflowSignOff.evaluatorName,
                                                date: leave.workflowSignOff.evaluatorDate,
                                            },
                                            {
                                                role: 'HR Personnel',
                                                name: leave.workflowSignOff.hrPersonnelName,
                                                date: leave.workflowSignOff.hrPersonnelDate,
                                            },
                                            {
                                                role: 'PMT',
                                                name: leave.workflowSignOff.pmtName ?? 'Not applicable',
                                                date: leave.workflowSignOff.pmtDate,
                                                note: leave.workflowSignOff.pmtNote ?? 'Leave requests do not route through PMT.',
                                            },
                                        ]}
                                    />
                                )}

                                <Separator />

                                {/* Attached Documents */}
                                <div>
                                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                        Attached Documents
                                    </p>
                                    {hasDocuments ? (
                                        <div className="space-y-3">
                                            {leave.hasMedicalCertificate && (
                                                <DocumentPreview id={leave.id} type="medical_certificate" label="Medical Certificate" />
                                            )}
                                            {leave.hasMarriageCertificate && (
                                                <DocumentPreview id={leave.id} type="marriage_certificate" label="Marriage Certificate" />
                                            )}
                                            {leave.hasSoloParentId && (
                                                <DocumentPreview id={leave.id} type="solo_parent_id" label="Solo Parent ID" />
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center">
                                            <Paperclip className="mb-2 size-8 text-muted-foreground/30" />
                                            <p className="text-sm text-muted-foreground">No documents attached</p>
                                        </div>
                                    )}
                                </div>

                                {/* Rejection reason (read-only display) */}
                                {leave.rejectionReasonText && (
                                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-950/20">
                                        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-red-700 dark:text-red-400">
                                            Rejection Reason
                                        </p>
                                        <p className="text-sm text-red-800 dark:text-red-300">{leave.rejectionReasonText}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── Sticky Footer ── */}
                        {role === 'employee' && leave && (
                            <div className="border-t bg-background px-6 py-4">
                                <div className="flex items-center justify-end gap-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            window.open(
                                                `/leave-application/${leave.id}/print`,
                                                '_blank',
                                                'noopener,noreferrer',
                                            );
                                        }}
                                    >
                                        <Download className="mr-1.5 size-4" />
                                        Print Leave Form
                                    </Button>
                                </div>
                            </div>
                        )}
                        {isActionable && (
                            <div className="border-t bg-background px-6 py-4">
                                {actionState === 'idle' && (
                                    <div className="flex items-center justify-end gap-3">
                                        <Button
                                            variant="outline"
                                            className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
                                            onClick={() => setActionState('confirming-reject')}
                                        >
                                            <XCircle className="mr-1.5 size-4" />
                                            Reject
                                        </Button>
                                        <Button
                                            className="bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600"
                                            onClick={() => setActionState('confirming-approve')}
                                        >
                                            <CheckCircle2 className="mr-1.5 size-4" />
                                            Approve
                                        </Button>
                                    </div>
                                )}

                                {actionState === 'confirming-approve' && (
                                    <div className="space-y-3">
                                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                                            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                                                Approve this leave request?
                                            </p>
                                            <p className="mt-0.5 text-xs text-emerald-700/80 dark:text-emerald-400/70">
                                                This action will forward the request to the next stage.
                                            </p>
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setActionState('idle')}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="bg-emerald-600 text-white hover:bg-emerald-700"
                                                onClick={handleApprove}
                                            >
                                                <CheckCircle2 className="mr-1.5 size-3.5" />
                                                Confirm Approval
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {actionState === 'confirming-reject' && (
                                    <div className="space-y-3">
                                        <div>
                                            <label className="mb-1.5 block text-sm font-semibold text-foreground">
                                                Reason for Rejection <span className="text-destructive">*</span>
                                            </label>
                                            <Textarea
                                                value={rejectionReason}
                                                onChange={(e) => setRejectionReason(e.target.value)}
                                                placeholder="Provide a clear reason for rejecting this leave request…"
                                                className="min-h-20 resize-none text-sm"
                                                autoFocus
                                            />
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => { setActionState('idle'); setRejectionReason(''); }}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                disabled={!rejectionReason.trim()}
                                                onClick={handleReject}
                                            >
                                                <XCircle className="mr-1.5 size-3.5" />
                                                Confirm Rejection
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {actionState === 'processing' && (
                                    <div className="flex items-center justify-center gap-2 py-1 text-sm text-muted-foreground">
                                        <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                        Processing…
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
