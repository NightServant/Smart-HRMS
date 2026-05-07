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
    Trash2,
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
import { cn } from '@/lib/utils';

// ZK SDK / pyzk finger slot convention: 0–4 left hand (pinky→thumb), 5–9
// right hand (thumb→pinky). Confirmed against the Zlink portal UI on
// 2026-05-03 — sending fid=9 lights up the Right Pinky slot in the
// "Manage Authentication Methods" dialog. Mirrors fingerLabelFor on the
// backend.
const FINGER_OPTIONS: { value: number; label: string }[] = [
    { value: 0, label: 'Left Pinky' },
    { value: 1, label: 'Left Ring' },
    { value: 2, label: 'Left Middle' },
    { value: 3, label: 'Left Index' },
    { value: 4, label: 'Left Thumb' },
    { value: 5, label: 'Right Thumb' },
    { value: 6, label: 'Right Index' },
    { value: 7, label: 'Right Middle' },
    { value: 8, label: 'Right Ring' },
    { value: 9, label: 'Right Pinky' },
];

// Palms facing viewer. Left hand: pinky (outer-left) → thumb (inner-right).
const LEFT_FINGERS = [
    { index: 0, label: 'Pinky', topOffset: 28 },
    { index: 1, label: 'Ring', topOffset: 12 },
    { index: 2, label: 'Middle', topOffset: 0 },
    { index: 3, label: 'Index', topOffset: 10 },
    { index: 4, label: 'Thumb', topOffset: 34 },
] as const;

// Right hand: thumb (inner-left) → pinky (outer-right).
const RIGHT_FINGERS = [
    { index: 5, label: 'Thumb', topOffset: 34 },
    { index: 6, label: 'Index', topOffset: 10 },
    { index: 7, label: 'Middle', topOffset: 0 },
    { index: 8, label: 'Ring', topOffset: 12 },
    { index: 9, label: 'Pinky', topOffset: 28 },
] as const;

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

type FingerState = 'default' | 'enrolled' | 'enrolling' | 'disabled';

function FingerButton({
    label,
    topOffset,
    state,
    onClick,
}: {
    label: string;
    topOffset: number;
    state: FingerState;
    onClick: () => void;
}) {
    return (
        <div
            className="flex flex-col items-center gap-1.5"
            style={{ marginTop: topOffset }}
        >
            <button
                type="button"
                disabled={state === 'disabled'}
                onClick={onClick}
                aria-label={
                    state === 'enrolled'
                        ? `${label} — enrolled, tap to delete`
                        : state === 'default'
                          ? `${label} — tap to enroll`
                          : label
                }
                title={label}
                className={cn(
                    'flex h-14 w-9 flex-col items-center justify-start rounded-t-full border-2 pt-2 transition-all duration-200',
                    state === 'default' &&
                        'cursor-pointer border-slate-300 bg-slate-100 hover:border-primary/60 hover:bg-primary/5 dark:border-slate-600 dark:bg-slate-800/80 dark:hover:border-primary/50 dark:hover:bg-primary/10',
                    state === 'enrolled' &&
                        'cursor-pointer border-emerald-500 bg-emerald-100 [box-shadow:0_0_0_3px_rgba(52,211,153,0.35),0_0_18px_rgba(52,211,153,0.25)] dark:border-emerald-400 dark:bg-emerald-700/70 dark:[box-shadow:0_0_0_3px_rgba(52,211,153,0.5),0_0_22px_rgba(52,211,153,0.4)]',
                    state === 'enrolling' &&
                        'animate-pulse cursor-default border-blue-400 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/40',
                    state === 'disabled' &&
                        'cursor-not-allowed border-slate-200 bg-slate-50 opacity-25 dark:border-slate-800 dark:bg-slate-900/50',
                )}
            >
                {state === 'enrolling' ? (
                    <Loader2 className="size-4 animate-spin text-blue-500 dark:text-blue-400" />
                ) : (
                    <Fingerprint
                        className={cn(
                            'size-4',
                            state === 'enrolled' &&
                                'text-emerald-600 dark:text-emerald-300',
                            state === 'default' &&
                                'text-slate-400 dark:text-slate-500',
                            state === 'disabled' &&
                                'text-slate-200 dark:text-slate-700',
                        )}
                    />
                )}
            </button>
            <span
                className={cn(
                    'text-[9px] font-medium leading-none',
                    state === 'enrolled' &&
                        'text-emerald-600 dark:text-emerald-300',
                    state === 'enrolling' &&
                        'text-blue-600 dark:text-blue-400',
                    (state === 'default' || state === 'disabled') &&
                        'text-muted-foreground',
                )}
            >
                {label}
            </span>
        </div>
    );
}

function HandDiagram({
    fingers,
    handLabel,
    getFingerState,
    onFingerClick,
}: {
    fingers: typeof LEFT_FINGERS | typeof RIGHT_FINGERS;
    handLabel: string;
    getFingerState: (index: number) => FingerState;
    onFingerClick: (index: number) => void;
}) {
    return (
        <div className="flex flex-col items-center">
            <div className="inline-flex flex-col">
                <div className="flex items-end gap-0.5">
                    {fingers.map((f) => (
                        <FingerButton
                            key={f.index}
                            label={f.label}
                            topOffset={f.topOffset}
                            state={getFingerState(f.index)}
                            onClick={() => onFingerClick(f.index)}
                        />
                    ))}
                </div>
                <div className="h-9 w-full rounded-b-2xl border-2 border-t-0 border-slate-200 bg-slate-100/80 dark:border-slate-700 dark:bg-slate-800/60" />
            </div>
            <p className="mt-2 text-xs font-medium text-muted-foreground">
                {handLabel}
            </p>
        </div>
    );
}

export default function AttendanceScanner({
    records,
    employeeId,
    enrolledAtTerminal = false,
    zktecoPinAssigned = false,
    manualPunchEnabled = false,
    initialFingerLabel = null,
    initialFingerIndex = null,
}: {
    records: DailyAttendanceRecord[];
    employeeId: string;
    employeeName: string;
    enrolledAtTerminal?: boolean;
    zktecoPinAssigned?: boolean;
    manualPunchEnabled?: boolean;
    initialFingerLabel?: string | null;
    initialFingerIndex?: number | null;
}) {
    const { data, post, processing } = useForm({
        employee_id: employeeId,
    });

    const [isEnrolling, setIsEnrolling] = useState(false);
    const [isFingerCaptured, setIsFingerCaptured] =
        useState(enrolledAtTerminal);
    const [fingerLabel, setFingerLabel] = useState<string | null>(
        initialFingerLabel,
    );
    const [enrolledFingerIndex, setEnrolledFingerIndex] = useState<
        number | null
    >(initialFingerIndex ?? null);
    const [enrollingFingerIndex, setEnrollingFingerIndex] = useState<
        number | null
    >(null);
    const [enrollmentInstructions, setEnrollmentInstructions] = useState<
        string | null
    >(null);
    const [isEnrollmentModalOpen, setIsEnrollmentModalOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isTimeoutModalOpen, setIsTimeoutModalOpen] = useState(false);

    useEffect(() => {
        setFingerLabel(initialFingerLabel);
    }, [initialFingerLabel]);

    useEffect(() => {
        setEnrolledFingerIndex(initialFingerIndex ?? null);
    }, [initialFingerIndex]);

    useEffect(() => {
        setIsFingerCaptured(enrolledAtTerminal);
    }, [enrolledAtTerminal]);

    // Backfill check on mount. The badge can show "Not enrolled" if the
    // user is enrolled in Zlink but the local DB column hasn't been
    // written yet (legacy enrollments from before the persistence
    // migration, or device->cloud sync that lagged the original detection).
    // One status call here lets the backend's verificationStatus persist
    // the row and flip the badge without forcing the user through
    // another terminal walk.
    useEffect(() => {
        if (enrolledAtTerminal || !zktecoPinAssigned) {
            return;
        }

        let cancelled = false;

        void (async () => {
            try {
                const response = await fetch(
                    '/api/biometrics/enrollment-status',
                    {
                        headers: { Accept: 'application/json' },
                        credentials: 'same-origin',
                    },
                );

                if (!response.ok || cancelled) {
                    return;
                }

                const body = (await response.json()) as {
                    finger_captured?: boolean;
                    finger_label?: string | null;
                    finger_index?: number | null;
                };

                if (body.finger_captured === true) {
                    setIsFingerCaptured(true);
                    if (typeof body.finger_label === 'string') {
                        setFingerLabel(body.finger_label);
                    }
                    if (typeof body.finger_index === 'number') {
                        setEnrolledFingerIndex(body.finger_index);
                    }
                }
            } catch {
                // Silent — page-mount backfill is best-effort.
            }
        })();

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const pollTimerRef = useRef<number | null>(null);
    const timeoutTimerRef = useRef<number | null>(null);

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
                finger_label?: string | null;
                finger_index?: number | null;
            };

            if (typeof body.finger_label === 'string') {
                setFingerLabel(body.finger_label);
            }
            if (typeof body.finger_index === 'number') {
                setEnrolledFingerIndex(body.finger_index);
            }

            if (body.finger_captured === true) {
                stopPolling();
                setIsEnrolling(false);
                setEnrollingFingerIndex(null);
                setEnrollmentInstructions(null);
                setIsFingerCaptured(true);
                setIsEnrollmentModalOpen(false);
                if (typeof body.finger_index === 'number') {
                    setEnrolledFingerIndex(body.finger_index);
                }
                toast.success(
                    body.finger_label
                        ? `Fingerprint enrolled successfully (${body.finger_label}).`
                        : 'Fingerprint enrolled successfully.',
                );
            }
        } catch {
            // Swallow transient network errors and let the next tick retry.
        }
    };

    const handleEnroll = async (fingerIndex: number): Promise<void> => {
        if (isEnrolling) {
            return;
        }

        setIsEnrolling(true);
        setEnrollingFingerIndex(fingerIndex);

        try {
            // Read the XSRF-TOKEN cookie rather than the meta tag. Laravel
            // sets this cookie on every response, so it stays fresh across
            // long-lived sessions. The meta tag is written once on page load
            // and goes stale when the session rotates while the page is open.
            const xsrfCookie =
                document.cookie
                    .split('; ')
                    .find((row) => row.startsWith('XSRF-TOKEN='))
                    ?.split('=')[1] ?? '';
            const csrf = xsrfCookie
                ? decodeURIComponent(xsrfCookie)
                : (document
                      .querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
                      ?.getAttribute('content') ?? '');

            const response = await fetch('/api/biometrics/remote-enroll', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-XSRF-TOKEN': csrf,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
                body: JSON.stringify({ finger_index: fingerIndex }),
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
                setEnrollingFingerIndex(null);
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
                setEnrollingFingerIndex(null);
                return;
            }

            // Surface the instructions inside the modal instead of a toast.
            setEnrollmentInstructions(
                body.instructions ??
                    'Place your finger on the terminal when prompted. We will mark you enrolled automatically.',
            );

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
                setEnrollingFingerIndex(null);
                setEnrollmentInstructions(null);
                setIsTimeoutModalOpen(true);
            }, POLL_TIMEOUT_MS);
            void pollEnrollmentStatus();
        } catch {
            toast.error(
                'Could not reach the biometric service. Please try again.',
            );
            setIsEnrolling(false);
            setEnrollingFingerIndex(null);
        }
    };

    const handleDeleteFingerprint = async (): Promise<void> => {
        if (isDeleting) {
            return;
        }

        setIsDeleting(true);

        try {
            const xsrfCookie =
                document.cookie
                    .split('; ')
                    .find((row) => row.startsWith('XSRF-TOKEN='))
                    ?.split('=')[1] ?? '';
            const csrf = xsrfCookie
                ? decodeURIComponent(xsrfCookie)
                : (document
                      .querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
                      ?.getAttribute('content') ?? '');

            const response = await fetch('/api/biometrics/fingerprint', {
                method: 'DELETE',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-XSRF-TOKEN': csrf,
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
                toast.error(
                    body.error ??
                        body.message ??
                        'Failed to delete fingerprint.',
                );
                return;
            }

            const body = (await response.json().catch(() => ({}))) as {
                deleted?: number;
                message?: string;
            };

            // Flip local UI state immediately. The next status poll will
            // confirm against Zlink within the 5-min reconciliation TTL.
            setIsFingerCaptured(false);
            setFingerLabel(null);
            setEnrolledFingerIndex(null);
            setIsDeleteDialogOpen(false);
            setIsEnrollmentModalOpen(false);

            toast.success(
                body.message ??
                    (body.deleted && body.deleted > 0
                        ? 'Fingerprint deleted from the office terminal.'
                        : 'Local enrollment cleared.'),
            );
        } catch {
            toast.error(
                'Could not reach the biometric service. Please try again.',
            );
        } finally {
            setIsDeleting(false);
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

    const getFingerState = (fingerIndex: number): FingerState => {
        if (isFingerCaptured) {
            if (enrolledFingerIndex !== null) {
                return fingerIndex === enrolledFingerIndex
                    ? 'enrolled'
                    : 'disabled';
            }
            // Slot unknown (legacy enrollment before finger_index was persisted).
            // Disable all fingers — the fallback delete button handles removal.
            return 'disabled';
        }
        if (enrollingFingerIndex === fingerIndex) return 'enrolling';
        if (isEnrolling) return 'disabled';
        return 'default';
    };

    const handleFingerClick = (fingerIndex: number): void => {
        if (isFingerCaptured) {
            // Only the glowing enrolled finger is clickable — disabled fingers
            // can't be tapped (the button is disabled). The fallback delete
            // button handles the unknown-slot case.
            if (fingerIndex === enrolledFingerIndex) {
                setIsDeleteDialogOpen(true);
            }
            return;
        }
        if (!isEnrolling) {
            void handleEnroll(fingerIndex);
        }
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
                            {isFingerCaptured
                                ? fingerLabel
                                    ? `Enrolled · ${fingerLabel}`
                                    : 'Enrolled'
                                : 'Not enrolled'}
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
                            <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                                <div className="flex items-start gap-3">
                                    <Fingerprint className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                                            Enrolled
                                        </p>
                                        <p className="mt-0.5 text-xs text-emerald-700/80 dark:text-emerald-400/70">
                                            {fingerLabel
                                                ? `Your ${fingerLabel.toLowerCase()} is registered on the office terminal.`
                                                : 'Your fingerprint is registered on the office terminal.'}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    className="w-full gap-2"
                                    onClick={() =>
                                        setIsEnrollmentModalOpen(true)
                                    }
                                >
                                    <Fingerprint className="size-4" />
                                    View Fingerprint
                                </Button>
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
                                            Click below to choose a finger and
                                            start enrollment at the office
                                            terminal.
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    className="w-full gap-2"
                                    disabled={
                                        isEnrolling || !zktecoPinAssigned
                                    }
                                    onClick={() =>
                                        setIsEnrollmentModalOpen(true)
                                    }
                                    title={
                                        zktecoPinAssigned
                                            ? 'Select a finger to enroll at the office terminal'
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

            {/* ── Fingerprint enrollment / view modal ─────────────────────── */}
            <Dialog
                open={isEnrollmentModalOpen}
                onOpenChange={(open) => {
                    // Allow closing even mid-enrollment — polling continues in
                    // the background and the button reflects active state.
                    setIsEnrollmentModalOpen(open);
                }}
            >
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Fingerprint className="size-5 text-primary" />
                            {isFingerCaptured
                                ? 'Manage Fingerprint'
                                : isEnrolling
                                  ? 'Enrolling…'
                                  : 'Enroll Fingerprint'}
                        </DialogTitle>
                        <DialogDescription>
                            {isFingerCaptured
                                ? 'Your enrolled finger is highlighted. Tap it to delete your enrollment.'
                                : isEnrolling
                                  ? 'Walk to the office terminal and place your finger when prompted.'
                                  : 'Tap a finger below to begin enrollment at the office terminal.'}
                        </DialogDescription>
                    </DialogHeader>

                    {/* Walk-to-terminal instructions — shown in modal instead of toast */}
                    {isEnrolling && enrollmentInstructions && (
                        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 dark:border-sky-900/40 dark:bg-sky-950/20">
                            <div className="flex items-start gap-2">
                                <Monitor className="mt-0.5 size-4 shrink-0 text-sky-600 dark:text-sky-400" />
                                <div>
                                    <p className="text-sm font-semibold text-sky-900 dark:text-sky-200">
                                        Walk to the terminal
                                    </p>
                                    <p className="mt-0.5 text-xs text-sky-700/80 dark:text-sky-400/70">
                                        {enrollmentInstructions}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Hand diagram */}
                    <div className="flex items-start justify-center gap-8 py-2">
                        <HandDiagram
                            fingers={LEFT_FINGERS}
                            handLabel="Left Hand"
                            getFingerState={getFingerState}
                            onFingerClick={handleFingerClick}
                        />
                        <HandDiagram
                            fingers={RIGHT_FINGERS}
                            handLabel="Right Hand"
                            getFingerState={getFingerState}
                            onFingerClick={handleFingerClick}
                        />
                    </div>

                    {!isEnrolling && !isFingerCaptured && (
                        <p className="text-center text-xs text-muted-foreground">
                            Tap any finger to trigger enrollment at the office
                            terminal.
                        </p>
                    )}

                    {/* Fallback: enrolled but specific slot not recorded */}
                    {isFingerCaptured && enrolledFingerIndex === null && (
                        <div className="flex flex-col items-center gap-2">
                            <p className="text-center text-xs text-muted-foreground">
                                Finger slot not recorded for this enrollment.
                            </p>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="gap-2 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/30"
                                onClick={() => setIsDeleteDialogOpen(true)}
                            >
                                <Trash2 className="size-4" />
                                Delete Fingerprint
                            </Button>
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsEnrollmentModalOpen(false)}
                        >
                            {isEnrolling
                                ? 'Close (continues in background)'
                                : 'Close'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Enrollment timeout modal ─────────────────────────────────── */}
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
                            within 5 minutes, so the session was closed.
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
                                setIsEnrollmentModalOpen(true);
                            }}
                        >
                            <Fingerprint className="size-4" />
                            Try Again
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Delete confirmation dialog ───────────────────────────────── */}
            <Dialog
                open={isDeleteDialogOpen}
                onOpenChange={(open) => {
                    if (!isDeleting) {
                        setIsDeleteDialogOpen(open);
                    }
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Trash2 className="size-5 text-red-600" />
                            Delete fingerprint?
                        </DialogTitle>
                        <DialogDescription>
                            This will remove your fingerprint from the office
                            biometric terminal and clear your enrollment in
                            Smart HRMS. You will need to re-enroll before you
                            can punch in or out at the terminal again.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            disabled={isDeleting}
                            onClick={() => setIsDeleteDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            className="gap-2"
                            disabled={isDeleting}
                            onClick={() => void handleDeleteFingerprint()}
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="size-4 animate-spin" />
                                    Deleting…
                                </>
                            ) : (
                                <>
                                    <Trash2 className="size-4" />
                                    Delete Fingerprint
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
