import { HelpCircle, Printer, Wallet, Workflow } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

function PolicySection({
    icon: Icon,
    title,
    children,
}: {
    icon: React.ElementType;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-2xl border border-border/70 bg-background/60 p-4">
            <div className="flex items-center gap-2">
                <Icon className="size-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">
                    {title}
                </h3>
            </div>
            <div className="mt-2 space-y-2 text-sm leading-relaxed text-muted-foreground">
                {children}
            </div>
        </section>
    );
}

export function LeavePolicyHelpDialog() {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label="View leave application policies"
                    className="gap-1.5 rounded-full border-primary/30 bg-background/80 text-primary hover:bg-primary/10"
                >
                    <HelpCircle className="size-4" />
                    Leave Policy
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <HelpCircle className="size-5 text-primary" />
                        Leave Application Policy
                    </DialogTitle>
                    <DialogDescription>
                        How the leave application process works at every
                        stage — from filing to final HR action.
                    </DialogDescription>
                </DialogHeader>

                <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
                    <PolicySection icon={Printer} title="Leave Form Printing">
                        <p>
                            After your request is fully approved, you may print
                            the official Civil Service Form 6 directly from the
                            request detail dialog. Print the signed copy and
                            submit it together with any supporting documents
                            (medical certificate, marriage certificate, solo
                            parent ID) to the HR office for filing.
                        </p>
                    </PolicySection>

                    <PolicySection
                        icon={Wallet}
                        title="Leave Accrual Computation"
                    >
                        <p>
                            Vacation Leave (VL) and Sick Leave (SL) accrue at
                            <span className="font-semibold text-foreground">
                                {' '}
                                1.25 days per month
                            </span>{' '}
                            of service rendered, in line with CSC rules.
                            Accrued credits roll over each month and are
                            deducted automatically when the corresponding
                            leave is approved by HR.
                        </p>
                    </PolicySection>

                    <PolicySection icon={Wallet} title="Leave Credits">
                        <p>
                            Your current VL and SL balances are shown in the
                            Leave Credits tab. Special leave types (Maternity,
                            Paternity, Solo Parent, Force Leave, etc.) follow
                            their statutory entitlements and do not deduct
                            from your VL or SL balance unless the policy
                            requires it (e.g. Force Leave deducts from VL).
                        </p>
                    </PolicySection>

                    <PolicySection
                        icon={Workflow}
                        title="Approval & Rejection Stages"
                    >
                        <ol className="list-decimal space-y-1 pl-5">
                            <li>
                                <span className="font-semibold text-foreground">
                                    Submitted —
                                </span>{' '}
                                you file the request with dates, leave type,
                                and reason.
                            </li>
                            <li>
                                <span className="font-semibold text-foreground">
                                    Department Head review —
                                </span>{' '}
                                your evaluator either approves or returns the
                                request. Returned requests come back to you
                                for revision.
                            </li>
                            <li>
                                <span className="font-semibold text-foreground">
                                    HR review —
                                </span>{' '}
                                HR validates credits and supporting documents
                                and either approves or rejects.
                            </li>
                            <li>
                                <span className="font-semibold text-foreground">
                                    Completed —
                                </span>{' '}
                                once approved by both, the leave is recorded
                                and credits are deducted. Rejected requests
                                show the rejection reason in the detail
                                dialog.
                            </li>
                        </ol>
                    </PolicySection>
                </div>
            </DialogContent>
        </Dialog>
    );
}
