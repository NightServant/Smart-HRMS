import { useForm } from '@inertiajs/react';
import {
    Clock,
    Fingerprint,
    IdCard,
    Info,
    Loader2,
    Monitor,
    ShieldCheck,
    TimerOff,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
    AttendanceHistoryTable,
    type DailyAttendanceRecord,
} from '@/components/attendance-history-table';
import { AttendancePolicyHelpDialog } from '@/components/attendance-policy-help-dialog';
import PageIntro from '@/components/page-intro';
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const POLL_INTERVAL_MS = 3000;
// TEMP: shortened from 5 * 60 * 1000 to 11s for modal verification.
// Revert before committing.
const POLL_TIMEOUT_MS = 11 * 1000;

export default function AttendanceScanner({
    records,
    employeeId,
    enrolledAtTerminal = false,
    zktecoPinAssigned = false,
    manualPunchEnabled = false,
}: {
    records: DailyAttendanceRecord[];
    employeeId: string;
    employeeName: string;
    enrolledAtTerminal?: boolean;
    zktecoPinAssigned?: boolean;
    manualPunchEnabled?: boolean;
}) {
    const { data, post, processing } = useForm({
        employee_id: employeeId,
    });

    const [isEnrolling, setIsEnrolling] = useState(false);
    const [isFingerCaptured, setIsFingerCaptured] =
        useState(enrolledAtTerminal);
    const [isTimeoutModalOpen, setIsTimeoutModalOpen] = useState(false);
    const pollTimerRef = useRef<number | null>(null);
    const timeoutTimerRef = useRef<number | null>(null);

    useEffect(() => {
        setIsFingerCaptured(enrolledAtTerminal);
    }, [enrolledAtTerminal]);

    useEffect(() => {
        return () => {
            if (pollTimerRef.current !== null) {
                window.clearInterval(pollTimerRef.current);
            }
            if (timeoutTimerRef.current !== null) {
                window.clearTimeout(timeoutTimerRef.current);
            }
        };
    }, []);

    const stopPolling = (): void => {
        if (pollTimerRef.current !== null) {
            window.clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
        }
        if (timeoutTimerRef.current !== null) {
            window.clearTimeout(timeoutTimerRef.current);
            timeoutTimerRef.current = null;
        }
    };

    const pollEnrollmentStatus = async (): Promise<void> => {
        try {
            const response = await fetch('/api/biometrics/enrollment-status', {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            });

            if (!response.ok) {
                // Don't return early: a 403/500 here must NOT block the
                // 5-minute deadline. The deadline lives on its own setTimeout
                // (see handleEnroll) so this poll-tick failure is harmless —
                // we just wait for the next tick or the timeout, whichever
                // wins.
                return;
            }

            const body = (await response.json()) as {
                finger_captured?: boolean;
            };

            if (body.finger_captured === true) {
                stopPolling();
                setIsEnrolling(false);
                setIsFingerCaptured(true);
                toast.success('Fingerprint enrolled successfully.');
            }
        } catch {
            // Swallow transient network errors and let the next tick retry.
        }
    };

    const handleEnroll = async (): Promise<void> => {
        if (isEnrolling || isFingerCaptured) {
            return;
        }

        setIsEnrolling(true);

        try {
            const csrf =
                document
                    .querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
                    ?.getAttribute('content') ?? '';

            const response = await fetch('/api/biometrics/remote-enroll', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrf,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
                body: JSON.stringify({}),
            });

            if (!response.ok) {
                const body = (await response.json().catch(() => ({}))) as {
                    error?: string;
                    message?: string;
                };
                const message =
                    body.error ?? body.message ?? 'Failed to start enrollment.';
                toast.error(message);
                setIsEnrolling(false);
                return;
            }

            const body = (await response.json().catch(() => ({}))) as {
                remote_triggered?: boolean;
                instructions?: string;
                device_sn?: string;
                device_user_id?: string;
            };

            if (body.remote_triggered === false) {
                // Open API on this Zlink tenant cannot push the trigger. The user
                // has to enroll manually at the terminal — no point spinning a
                // polling loop here. Status will refresh on next page load once
                // a biometric punch arrives.
                toast.message('Manual enrollment required', {
                    description:
                        body.instructions ??
                        'Walk to the terminal and follow the on-device prompts.',
                    duration: 12000,
                });
                setIsEnrolling(false);
                return;
            }

            toast.message('Walk to the terminal', {
                description:
                    body.instructions ??
                    'Place your finger when the terminal prompts you. We will mark you enrolled automatically.',
            });

            // Stop any prior timers, then arm two parallel ones:
            //   1. interval poll for finger_captured (best-case path)
            //   2. one-shot deadline that fires the timeout modal regardless
            //      of poll outcomes — critical, because a 403/500 from the
            //      status endpoint would otherwise hang the button forever.
            stopPolling();
            pollTimerRef.current = window.setInterval(() => {
                void pollEnrollmentStatus();
            }, POLL_INTERVAL_MS);
            timeoutTimerRef.current = window.setTimeout(() => {
                stopPolling();
                setIsEnrolling(false);
                setIsTimeoutModalOpen(true);
            }, POLL_TIMEOUT_MS);
            void pollEnrollmentStatus();
        } catch {
            toast.error(
                'Could not reach the biometric service. Please try again.',
            );
            setIsEnrolling(false);
        }
    };

    const handlePunch = (): void => {
        post('/attendance/punch', {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Attendance recorded successfully.');
            },
            onError: (errors) => {
                const message =
                    errors.employee_id || 'Failed to record attendance.';
                toast.error(message);
            },
        });
    };

    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
    const currentDate =
        now.toLocaleDateString('en-US', { weekday: 'long' }) +
        ', ' +
        now.toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric',
        });

    return (
        <>
            <PageIntro
                eyebrow="Employee · Attendance"
                title="Attendance and Biometric Verification"
                description="Record your attendance using your device's built-in fingerprint reader or the secured manual entry fallback below."
                actions={
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="bg-background/70">
                            <Fingerprint className="size-3.5" />
                            {isFingerCaptured ? 'Enrolled' : 'Not enrolled'}
                        </Badge>
                        <Badge variant="outline" className="bg-background/70">
                            <Clock className="size-3.5" />
                            {currentTime}
                        </Badge>
                        <AttendancePolicyHelpDialog />
                    </div>
                }
                className="animate-slide-in-down"
            />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card className="glass-card animate-fade-in-left border-primary/20 shadow-sm transition-shadow hover:shadow-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Monitor className="size-5 text-primary" />
                            Biometric Scanner
                        </CardTitle>
                        <CardDescription>
                            Fingerprint enrollment and clock-in are handled at
                            the office biometric terminal. Punches sync back to
                            Smart HRMS automatically.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <div className="app-surface-subtle rounded-[1.25rem] border border-border/70 bg-background/65">
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 rounded-md bg-[#2F5E2B]/10 p-2 dark:bg-[#2F5E2B]/30">
                                    <Fingerprint className="size-5 text-[#2F5E2B] dark:text-[#8FBF88]" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold">
                                        Office Biometric Terminal
                                    </p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        Place your finger on the ZKTeco terminal
                                        in the office to clock in or clock out.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {isFingerCaptured ? (
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                                <div className="flex items-start gap-3">
                                    <Fingerprint className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                                            Enrolled
                                        </p>
                                        <p className="mt-0.5 text-xs text-emerald-700/80 dark:text-emerald-400/70">
                                            Your fingerprint is registered on
                                            the office terminal — punch in and
                                            out there. No re-enrollment needed.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 dark:border-sky-900/40 dark:bg-sky-950/20">
                                <div className="flex items-start gap-3">
                                    <Info className="mt-0.5 size-5 shrink-0 text-sky-600 dark:text-sky-400" />
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-sky-900 dark:text-sky-200">
                                            Enroll your fingerprint
                                        </p>
                                        <p className="mt-0.5 text-xs text-sky-700/80 dark:text-sky-400/70">
                                            Click below to start enrollment. The
                                            office terminal will prompt you to
                                            place your finger.
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    className="w-full gap-2"
                                    disabled={isEnrolling || !zktecoPinAssigned}
                                    onClick={() => void handleEnroll()}
                                    title={
                                        zktecoPinAssigned
                                            ? 'Trigger remote fingerprint enrollment at the office terminal'
                                            : 'A ZKTeco Person ID has not been assigned yet — contact HR.'
                                    }
                                >
                                    {isEnrolling ? (
                                        <>
                                            <Loader2 className="size-4 animate-spin" />
                                            Waiting for terminal...
                                        </>
                                    ) : (
                                        <>
                                            <Fingerprint className="size-4" />
                                            Enroll Fingerprint
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="glass-card animate-fade-in-right border-primary/20 shadow-sm transition-shadow hover:shadow-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <IdCard className="size-5 text-primary" />
                            Manual Attendance Entry
                        </CardTitle>
                        <CardDescription>
                            Use this form as a fallback when the biometric
                            device is unavailable.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <div className="app-surface-subtle rounded-[1.25rem] border border-border/70 bg-background/65">
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 rounded-md bg-amber-500/10 p-2 dark:bg-amber-500/20">
                                    <ShieldCheck className="size-5 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold">
                                        Verified Entry
                                    </p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        Your Employee ID is pre-filled and
                                        locked to your account. The system
                                        records the exact timestamp
                                        automatically.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="employee_id">
                                Employee ID: {data.employee_id}
                            </Label>
                        </div>

                        <div className="py-2 text-xs text-muted-foreground">
                            <b>{currentDate}</b>
                        </div>

                        {!manualPunchEnabled && (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/20">
                                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                                    Manual attendance is currently disabled.
                                </p>
                                <p className="mt-0.5 text-xs text-amber-700/80 dark:text-amber-400/70">
                                    Contact your supervisor if you are deployed
                                    outside the office.
                                </p>
                            </div>
                        )}

                        <Button
                            type="button"
                            className="w-full gap-2"
                            disabled={
                                processing || !employeeId || !manualPunchEnabled
                            }
                            onClick={handlePunch}
                        >
                            <Clock className="size-4" />
                            {processing ? 'Recording...' : 'Record Attendance'}
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <AttendanceHistoryTable records={records} />

            <Dialog
                open={isTimeoutModalOpen}
                onOpenChange={setIsTimeoutModalOpen}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <TimerOff className="size-5 text-amber-600 dark:text-amber-400" />
                            Enrollment timed out
                        </DialogTitle>
                        <DialogDescription>
                            The office terminal did not capture a fingerprint
                            within 11 seconds, so the session was closed.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                        <p className="font-semibold">What to check</p>
                        <ul className="mt-1 list-inside list-disc space-y-1 text-xs text-amber-800/90 dark:text-amber-300/80">
                            <li>
                                The terminal screen showed your user ID and
                                prompted for a finger placement.
                            </li>
                            <li>
                                You pressed the same finger 3 times when asked.
                            </li>
                            <li>
                                If the terminal never prompted you, please
                                contact HR.
                            </li>
                        </ul>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsTimeoutModalOpen(false)}
                        >
                            Close
                        </Button>
                        <Button
                            type="button"
                            className="gap-2"
                            onClick={() => {
                                setIsTimeoutModalOpen(false);
                                void handleEnroll();
                            }}
                        >
                            <Fingerprint className="size-4" />
                            Try Again
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
