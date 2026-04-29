import {
    AlarmClock,
    Fingerprint,
    HelpCircle,
    History,
    LogIn,
} from 'lucide-react';
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

export function AttendancePolicyHelpDialog() {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label="View attendance policies"
                    className="gap-1.5 rounded-full border-primary/30 bg-background/80 text-primary hover:bg-primary/10"
                >
                    <HelpCircle className="size-4" />
                    Attendance Policy
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <HelpCircle className="size-5 text-primary" />
                        Attendance Policy
                    </DialogTitle>
                    <DialogDescription>
                        How daily attendance is captured, classified, and
                        rolled into your historical performance record.
                    </DialogDescription>
                </DialogHeader>

                <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
                    <PolicySection icon={LogIn} title="Clock In and Clock Out">
                        <p>
                            The standard shift starts at{' '}
                            <span className="font-semibold text-foreground">
                                9:00 AM
                            </span>
                            . Clock in before the shift starts and clock out at
                            the end of your workday. The first punch of the day
                            is recorded as your time-in and the last punch is
                            recorded as your time-out, provided the two punches
                            are at least one hour apart. Same-minute repeated
                            scans are ignored to prevent duplicates.
                        </p>
                    </PolicySection>

                    <PolicySection
                        icon={Fingerprint}
                        title="Biometric Capture and Manual Punch"
                    >
                        <p>
                            <span className="font-semibold text-foreground">
                                Biometric capture
                            </span>{' '}
                            uses the fingerprint reader on your own device
                            (Touch ID, Windows Hello, or Android fingerprint)
                            through the secured browser flow. Your fingerprint
                            never leaves your device — only a verified signature
                            is sent to Smart HRMS to confirm the punch.
                        </p>
                        <p>
                            <span className="font-semibold text-foreground">
                                Manual punch
                            </span>{' '}
                            is a fallback for fieldwork or when the biometric
                            reader is unavailable. It must be enabled by HR for
                            a specific date range and cannot be used outside
                            that window. Manual punches are tagged{' '}
                            <span className="font-mono text-foreground">
                                manual
                            </span>{' '}
                            on your record so reviewers can distinguish them
                            from biometric scans.
                        </p>
                    </PolicySection>

                    <PolicySection
                        icon={AlarmClock}
                        title="Late Threshold"
                    >
                        <p>
                            A clock-in past{' '}
                            <span className="font-semibold text-foreground">
                                9:00 AM
                            </span>{' '}
                            is recorded as{' '}
                            <span className="font-semibold text-foreground">
                                Late
                            </span>{' '}
                            and the system stores the exact number of minutes
                            past the threshold. Days with both a time-in and
                            time-out within the threshold are marked{' '}
                            <span className="font-semibold text-foreground">
                                On Time
                            </span>
                            . If only a time-in is recorded (no matching
                            time-out at least one hour later), the day is
                            classified as{' '}
                            <span className="font-semibold text-foreground">
                                Incomplete
                            </span>
                            .
                        </p>
                    </PolicySection>

                    <PolicySection
                        icon={History}
                        title="Impact on Historical Data"
                    >
                        <p>
                            Each daily attendance record contributes to your
                            historical performance dataset. Attendance rate,
                            late-minute totals, and incomplete-day counts feed
                            the FlatFAT real-time dashboard and the Predictive
                            Performance Evaluation (PPE) module that forecasts
                            your performance trends.
                        </p>
                        <p>
                            Repeated lates or incomplete days lower your
                            attendance score for the period and may surface in
                            evaluator and HR reports. If you believe a record
                            is incorrect (missed scan, device issue), raise it
                            with HR — corrections are made through manual
                            punch updates so the audit trail stays intact.
                        </p>
                    </PolicySection>
                </div>
            </DialogContent>
        </Dialog>
    );
}
