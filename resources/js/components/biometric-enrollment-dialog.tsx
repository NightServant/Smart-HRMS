import { CheckCircle2, Fingerprint, Loader2, MapPin } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
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
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export type EnrollmentStatus = {
    enrolled_in_zlink: boolean;
    finger_captured: boolean;
    device_user_id: string | null;
};

type EnrollmentResultPayload = {
    employee_id: string;
    device_user_id: string;
    department_id: string;
    department_name: string | null;
    status: 'pushed' | 'already_enrolled';
    instructions: string;
};

export function BiometricEnrollmentDialog({
    open,
    onOpenChange,
    employee,
    initialStatus,
    onEnrolled,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employee: { employee_id: string; name: string };
    initialStatus: EnrollmentStatus;
    onEnrolled?: () => void;
}) {
    const [submitting, setSubmitting] = useState(false);
    const [checking, setChecking] = useState(false);
    const [pushedResult, setPushedResult] =
        useState<EnrollmentResultPayload | null>(null);
    const [status, setStatus] = useState<EnrollmentStatus>(initialStatus);

    useEffect(() => {
        if (open) {
            setStatus(initialStatus);
            setPushedResult(null);
        }
    }, [open, initialStatus]);

    const step: 1 | 2 | 3 = useMemo(() => {
        if (status.finger_captured) {
            return 3;
        }

        if (status.enrolled_in_zlink || pushedResult) {
            return 2;
        }

        return 1;
    }, [status, pushedResult]);

    const handleEnroll = async (): Promise<void> => {
        setSubmitting(true);

        try {
            const response = await fetch('/api/biometrics/self-enroll', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({}),
            });

            if (!response.ok) {
                toast.error(
                    'Could not register with Zlink. Try again, or ask HR to assist.',
                );
                return;
            }

            const payload = (await response.json()) as EnrollmentResultPayload;
            setPushedResult(payload);
            setStatus((prev) => ({
                ...prev,
                enrolled_in_zlink: true,
                device_user_id: payload.device_user_id,
            }));
            toast.success(
                payload.status === 'already_enrolled'
                    ? 'You are already registered. Continue to step 2.'
                    : 'Registered with Zlink. Visit the device next.',
            );
        } catch {
            toast.error('Network error. Try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCheckStatus = async (): Promise<void> => {
        setChecking(true);

        try {
            const response = await fetch('/api/biometrics/enrollment-status', {
                method: 'GET',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            if (!response.ok) {
                toast.error('Could not check status.');
                return;
            }

            const data = (await response.json()) as EnrollmentStatus;
            setStatus(data);

            if (data.finger_captured) {
                toast.success('Fingerprint detected. You are all set.');
                onEnrolled?.();
            } else {
                toast.info(
                    'No fingerprint scan recorded yet. Complete the on-device prompts and try again.',
                );
            }
        } catch {
            toast.error('Network error. Try again.');
        } finally {
            setChecking(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Fingerprint className="size-5 text-primary" />
                        Biometric Enrollment
                    </DialogTitle>
                    <DialogDescription>
                        Complete a one-time setup so your attendance can be
                        recorded by the biometric terminal.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-1">
                    <div className="grid grid-cols-2 gap-3">
                        <Card
                            className={
                                step === 1
                                    ? 'border-primary/40 shadow-sm'
                                    : 'opacity-70'
                            }
                        >
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-sm">
                                    <Fingerprint className="size-4 text-primary" />
                                    Step 1 — Register
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Push your profile to ZKBio Zlink so the
                                    terminals recognize you.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-row gap-3">
                                <Button
                                    type="button"
                                    className="w-full gap-2"
                                    disabled={submitting || step !== 1}
                                    onClick={handleEnroll}
                                >
                                    {submitting ? (
                                        <Loader2 className="size-4 animate-spin" />
                                    ) : (
                                        <Fingerprint className="size-4" />
                                    )}
                                    {submitting
                                        ? 'Registering...'
                                        : 'Register My Fingerprint'}
                                </Button>
                            </CardContent>
                        </Card>

                        <Card
                            className={
                                step === 2
                                    ? 'border-primary/40 shadow-sm'
                                    : 'opacity-70'
                            }
                        >
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-sm">
                                    <MapPin className="size-4 text-primary" />
                                    Step 2 — Visit the Device
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Scan your finger on any biometric terminal.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-3 text-sm">
                                {step === 1 && (
                                    <p className="text-xs text-muted-foreground">
                                        Complete step 1 first.
                                    </p>
                                )}

                                {step >= 2 && (
                                    <>
                                        <div className="rounded-md border border-border bg-background/60 p-3 text-xs">
                                            <p className="font-semibold">
                                                Your device user ID:
                                            </p>
                                            <p className="mt-1 font-mono text-sm">
                                                {status.device_user_id ??
                                                    pushedResult?.device_user_id ??
                                                    '—'}
                                            </p>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {pushedResult?.instructions ??
                                                'Visit any biometric terminal connected to your tenant and follow the on-screen prompts to enroll your fingerprint.'}
                                        </p>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="w-full"
                                            disabled={checking || step === 3}
                                            onClick={handleCheckStatus}
                                        >
                                            {checking
                                                ? 'Checking...'
                                                : 'Check Status'}
                                        </Button>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <Card
                        className={
                            step === 3
                                ? 'border-emerald-300 shadow-sm dark:border-emerald-700'
                                : 'opacity-70'
                        }
                    >
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-sm">
                                <CheckCircle2
                                    className={
                                        step === 3
                                            ? 'size-4 text-emerald-600 dark:text-emerald-400'
                                            : 'size-4 text-muted-foreground'
                                    }
                                />
                                Step 3 — All Set
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Your fingerprint scans will record attendance
                                automatically.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3 text-sm">
                            {step !== 3 && (
                                <p className="text-xs text-muted-foreground">
                                    We&apos;ll mark this complete once we
                                    detect a fingerprint scan.
                                </p>
                            )}

                            {step === 3 && (
                                <p className="text-emerald-700 dark:text-emerald-300">
                                    Fingerprint scan detected. You can now use
                                    the terminal for daily attendance.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 rounded-md border border-border/60 bg-muted/30 p-3 text-sm">
                    <div>
                        <p className="text-xs text-muted-foreground">Name</p>
                        <p className="font-medium">{employee.name}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">
                            Employee ID
                        </p>
                        <p className="font-mono">{employee.employee_id}</p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
