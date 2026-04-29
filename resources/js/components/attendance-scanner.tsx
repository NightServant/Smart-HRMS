import { router, useForm } from '@inertiajs/react';
import {
    Clock,
    Fingerprint,
    IdCard,
    LogIn,
    LogOut,
    Monitor,
    RefreshCw,
    ShieldAlert,
    ShieldCheck,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
    AttendanceHistoryTable,
    type DailyAttendanceRecord,
} from '@/components/attendance-history-table';
import { AttendancePolicyHelpDialog } from '@/components/attendance-policy-help-dialog';
import {
    BiometricEnrollmentDialog,
    type EnrollmentStatus,
} from '@/components/biometric-enrollment-dialog';
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
import { Label } from '@/components/ui/label';

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
    const padded = value.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (padded.length % 4)) % 4);
    const binary = atob(padded + padding);
    const buffer = new ArrayBuffer(binary.length);
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

function bufferToBase64Url(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

function csrfHeader(): Record<string, string> {
    return {
        'X-CSRF-TOKEN':
            document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute('content') ?? '',
    };
}

export default function AttendanceScanner({
    records,
    employeeId,
    employeeName,
    enrolledInBiometric,
    enrollmentStatus,
    manualPunchEnabled = false,
}: {
    records: DailyAttendanceRecord[];
    employeeId: string;
    employeeName: string;
    enrolledInBiometric: boolean;
    enrollmentStatus: EnrollmentStatus;
    manualPunchEnabled?: boolean;
}) {
    const { data, post, processing } = useForm({
        employee_id: employeeId,
    });

    const [scanning, setScanning] = useState<'in' | 'out' | null>(null);
    const [isEnrollOpen, setIsEnrollOpen] = useState(false);

    const refreshAttendance = (): void => {
        router.reload({
            only: ['records', 'enrolledInBiometric', 'enrollmentStatus'],
        });
    };

    const handlePunch = (): void => {
        post('/attendance/punch', {
            preserveScroll: true,
            onSuccess: () => {
                refreshAttendance();
                toast.success('Attendance recorded successfully.');
            },
            onError: (errors) => {
                const message =
                    errors.employee_id || 'Failed to record attendance.';
                toast.error(message);
            },
        });
    };

    const handleFingerprintScan = async (mode: 'in' | 'out'): Promise<void> => {
        if (!enrolledInBiometric) {
            toast.error('Please enroll your fingerprint first.');
            setIsEnrollOpen(true);
            return;
        }

        if (typeof window.PublicKeyCredential === 'undefined') {
            toast.error(
                'This browser does not support WebAuthn. Use Chrome, Edge, or Safari with a fingerprint reader.',
            );
            return;
        }

        setScanning(mode);

        try {
            const optionsResponse = await fetch(
                '/api/biometrics/webauthn/clock-options',
                {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        ...csrfHeader(),
                    },
                    body: JSON.stringify({}),
                },
            );

            if (!optionsResponse.ok) {
                const errPayload = (await optionsResponse
                    .json()
                    .catch(() => ({}))) as { error?: string };
                toast.error(
                    errPayload.error ??
                        'Could not start fingerprint verification.',
                );
                return;
            }

            const options = (await optionsResponse.json()) as {
                challenge: string;
                rpId: string;
                timeout: number;
                userVerification: 'required' | 'preferred' | 'discouraged';
                allowCredentials: Array<{
                    type: 'public-key';
                    id: string;
                }>;
            };

            const assertion = (await navigator.credentials.get({
                publicKey: {
                    challenge: base64UrlToBytes(options.challenge),
                    rpId: options.rpId,
                    timeout: options.timeout,
                    userVerification: options.userVerification,
                    allowCredentials: options.allowCredentials.map((entry) => ({
                        type: 'public-key',
                        id: base64UrlToBytes(entry.id),
                    })),
                },
            })) as PublicKeyCredential | null;

            if (!assertion) {
                toast.error('Fingerprint verification was cancelled.');
                return;
            }

            const assertionResponse =
                assertion.response as AuthenticatorAssertionResponse;

            const response = await fetch('/api/biometrics/webauthn/clock', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    ...csrfHeader(),
                },
                body: JSON.stringify({
                    mode,
                    assertion: {
                        id: assertion.id,
                        response: {
                            clientDataJSON: bufferToBase64Url(
                                assertionResponse.clientDataJSON,
                            ),
                            authenticatorData: bufferToBase64Url(
                                assertionResponse.authenticatorData,
                            ),
                            signature: bufferToBase64Url(
                                assertionResponse.signature,
                            ),
                        },
                    },
                }),
            });

            const payload = (await response.json().catch(() => ({}))) as {
                message?: string;
                error?: string;
            };

            if (!response.ok) {
                toast.error(
                    payload.error ??
                        payload.message ??
                        'Fingerprint scan could not be confirmed.',
                );
                return;
            }

            toast.success(
                payload.message ??
                    `Clock ${mode === 'in' ? 'in' : 'out'} recorded.`,
            );
            refreshAttendance();
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'Fingerprint verification failed.';
            toast.error(message);
        } finally {
            setScanning(null);
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
                            {enrolledInBiometric
                                ? 'Biometric ready'
                                : 'Fingerprint not enrolled'}
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
                            Verify with the fingerprint reader on this device.
                            Smart HRMS uses WebAuthn (FIDO2) so your fingerprint
                            never leaves your device — only a signed assertion
                            is sent back to record the punch.
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
                                        Built-in Fingerprint Reader
                                    </p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        Touch ID, Windows Hello, Android
                                        fingerprint, or any FIDO2 biometric
                                        authenticator on this device.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {!enrolledInBiometric ? (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/20">
                                <div className="flex items-start gap-3">
                                    <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                                            Fingerprint not registered yet
                                        </p>
                                        <p className="mt-0.5 text-xs text-amber-700/80 dark:text-amber-400/70">
                                            Enroll your fingerprint to enable
                                            biometric clock-in and clock-out
                                            from this scanner.
                                        </p>
                                        <Button
                                            type="button"
                                            size="sm"
                                            className="mt-3 gap-1.5"
                                            onClick={() =>
                                                setIsEnrollOpen(true)
                                            }
                                        >
                                            <Fingerprint className="size-4" />
                                            Enroll Fingerprint
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-2">
                                    <span className="relative flex size-2.5">
                                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                        <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
                                    </span>
                                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                                        Active — Verified via WebAuthn
                                    </span>
                                </div>

                                <p className="text-sm text-foreground/80">
                                    Press Clock In or Clock Out below — your
                                    device will prompt for a fingerprint scan
                                    to confirm the punch.
                                </p>

                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        type="button"
                                        className="w-full gap-2"
                                        disabled={scanning !== null}
                                        onClick={() =>
                                            handleFingerprintScan('in')
                                        }
                                    >
                                        <LogIn className="size-4" />
                                        {scanning === 'in'
                                            ? 'Scanning...'
                                            : 'Clock In'}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full gap-2"
                                        disabled={scanning !== null}
                                        onClick={() =>
                                            handleFingerprintScan('out')
                                        }
                                    >
                                        <LogOut className="size-4" />
                                        {scanning === 'out'
                                            ? 'Scanning...'
                                            : 'Clock Out'}
                                    </Button>
                                </div>

                                <div className="grid grid-cols-2 gap-2 rounded-md border border-border/60 bg-background/40 p-2 text-xs text-muted-foreground">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wide">
                                            Employee
                                        </p>
                                        <p className="font-mono text-foreground">
                                            {employeeId}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wide">
                                            Authenticator
                                        </p>
                                        <p className="font-mono text-foreground">
                                            {enrollmentStatus.rp_id ?? 'WebAuthn'}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setIsEnrollOpen(true)}
                                    className="flex items-center gap-2 self-start text-xs text-muted-foreground hover:text-foreground"
                                >
                                    <ShieldCheck className="size-3.5" />
                                    Manage biometric enrollment
                                </button>

                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={refreshAttendance}
                                    className="self-start gap-2 text-xs text-muted-foreground hover:text-foreground"
                                >
                                    <RefreshCw className="size-3.5" />
                                    Re-fetch enrollment & attendance data
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

            <BiometricEnrollmentDialog
                open={isEnrollOpen}
                onOpenChange={setIsEnrollOpen}
                employee={{ employee_id: employeeId, name: employeeName }}
                initialStatus={enrollmentStatus}
                onEnrolled={refreshAttendance}
            />
        </>
    );
}
