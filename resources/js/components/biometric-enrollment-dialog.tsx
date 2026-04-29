import {
    CheckCircle2,
    Fingerprint,
    Loader2,
    ShieldCheck,
} from 'lucide-react';
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
    enrolled: boolean;
    enrolled_at: string | null;
    rp_id: string | null;
};

type RegistrationOptions = {
    challenge: string;
    rp: { name: string; id: string };
    user: { id: string; name: string; displayName: string };
    pubKeyCredParams: Array<{ type: 'public-key'; alg: number }>;
    authenticatorSelection: {
        authenticatorAttachment?: 'platform' | 'cross-platform';
        userVerification: 'required' | 'preferred' | 'discouraged';
        residentKey?: 'required' | 'preferred' | 'discouraged';
    };
    timeout: number;
    attestation: 'none' | 'indirect' | 'direct';
    excludeCredentials: Array<{ type: 'public-key'; id: string }>;
};

const PLATFORM_SUPPORTED =
    typeof window !== 'undefined' &&
    typeof window.PublicKeyCredential !== 'undefined';

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

function bytesToBase64Url(buffer: ArrayBuffer): string {
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
    const [status, setStatus] = useState<EnrollmentStatus>(initialStatus);

    useEffect(() => {
        if (open) {
            setStatus(initialStatus);
        }
    }, [open, initialStatus]);

    const step: 1 | 2 = useMemo(
        () => (status.enrolled ? 2 : 1),
        [status.enrolled],
    );

    const handleEnroll = async (): Promise<void> => {
        if (!PLATFORM_SUPPORTED) {
            toast.error(
                'This browser does not support WebAuthn. Use Chrome, Edge, or Safari with a fingerprint reader.',
            );
            return;
        }

        setSubmitting(true);

        try {
            const optionsResponse = await fetch(
                '/api/biometrics/webauthn/register-options',
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
                toast.error('Could not start enrollment. Try again.');
                return;
            }

            const options =
                (await optionsResponse.json()) as RegistrationOptions;

            const credential = (await navigator.credentials.create({
                publicKey: {
                    challenge: base64UrlToBytes(options.challenge),
                    rp: options.rp,
                    user: {
                        id: base64UrlToBytes(options.user.id),
                        name: options.user.name,
                        displayName: options.user.displayName,
                    },
                    pubKeyCredParams: options.pubKeyCredParams,
                    authenticatorSelection: options.authenticatorSelection,
                    timeout: options.timeout,
                    attestation: options.attestation,
                    excludeCredentials: options.excludeCredentials.map(
                        (entry) => ({
                            type: 'public-key',
                            id: base64UrlToBytes(entry.id),
                        }),
                    ),
                },
            })) as PublicKeyCredential | null;

            if (!credential) {
                toast.error('Fingerprint enrollment was cancelled.');
                return;
            }

            const attestationResponse =
                credential.response as AuthenticatorAttestationResponse;

            const publicKey = attestationResponse.getPublicKey?.();
            const publicKeyAlgorithm =
                attestationResponse.getPublicKeyAlgorithm?.();

            if (!publicKey || typeof publicKeyAlgorithm !== 'number') {
                toast.error(
                    'Your browser is too old to expose the credential public key. Update Chrome, Edge, or Safari.',
                );
                return;
            }

            const verifyResponse = await fetch(
                '/api/biometrics/webauthn/register',
                {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        ...csrfHeader(),
                    },
                    body: JSON.stringify({
                        id: credential.id,
                        response: {
                            clientDataJSON: bytesToBase64Url(
                                attestationResponse.clientDataJSON,
                            ),
                            publicKey: btoa(
                                String.fromCharCode(
                                    ...new Uint8Array(publicKey),
                                ),
                            ),
                            publicKeyAlgorithm,
                        },
                    }),
                },
            );

            if (!verifyResponse.ok) {
                const errorPayload = (await verifyResponse
                    .json()
                    .catch(() => ({}))) as { error?: string };
                toast.error(
                    errorPayload.error ??
                        'We could not verify your fingerprint enrollment.',
                );
                return;
            }

            const payload = (await verifyResponse.json()) as {
                enrolled_at: string | null;
            };

            setStatus({
                enrolled: true,
                enrolled_at: payload.enrolled_at,
                rp_id: status.rp_id,
            });
            toast.success('Fingerprint enrolled. You can now clock in/out.');
            onEnrolled?.();
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'Fingerprint enrollment failed.';
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleReset = async (): Promise<void> => {
        setSubmitting(true);
        try {
            const response = await fetch('/api/biometrics/webauthn/reset', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    ...csrfHeader(),
                },
                body: JSON.stringify({}),
            });

            if (!response.ok) {
                toast.error('Could not reset enrollment.');
                return;
            }

            setStatus({
                enrolled: false,
                enrolled_at: null,
                rp_id: status.rp_id,
            });
            toast.success(
                'Fingerprint cleared. Enroll again on your current device.',
            );
            onEnrolled?.();
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Fingerprint className="size-5 text-primary" />
                        Enroll Fingerprint (Built-in Biometric)
                    </DialogTitle>
                    <DialogDescription>
                        Smart HRMS captures your fingerprint directly through
                        your device&apos;s built-in biometric reader (Touch ID,
                        Windows Hello, or Android fingerprint). Your
                        fingerprint never leaves your device — only a verified
                        cryptographic signature is sent to confirm the punch.
                        No external app or terminal is required.
                    </DialogDescription>
                </DialogHeader>

                <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                    <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                        Supported authenticators
                    </p>
                    <p className="mt-1.5 text-xs text-foreground/80">
                        macOS Touch ID · Windows Hello · Android fingerprint ·
                        FIDO2 USB security keys with biometric sensor
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-3">
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
                                Step 1 — Enroll on this device
                            </CardTitle>
                            <CardDescription className="text-xs">
                                You&apos;ll be prompted by your device to scan
                                your fingerprint. The captured credential is
                                bound to this device and your account.
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
                                    ? 'Capturing fingerprint...'
                                    : 'Scan fingerprint to enroll'}
                            </Button>
                        </CardContent>
                    </Card>

                    <Card
                        className={
                            step === 2
                                ? 'border-emerald-300 shadow-sm dark:border-emerald-700'
                                : 'opacity-70'
                        }
                    >
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-sm">
                                <CheckCircle2
                                    className={
                                        step === 2
                                            ? 'size-4 text-emerald-600 dark:text-emerald-400'
                                            : 'size-4 text-muted-foreground'
                                    }
                                />
                                Step 2 — All Set
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Future clock-ins will prompt for the same
                                fingerprint. No portal visit required.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3 text-sm">
                            {step !== 2 && (
                                <p className="text-xs text-muted-foreground">
                                    Complete step 1 to finish enrollment.
                                </p>
                            )}

                            {step === 2 && (
                                <>
                                    <p className="text-emerald-700 dark:text-emerald-300">
                                        Fingerprint registered. Use the
                                        Clock-In or Clock-Out button on the
                                        attendance page to record a punch.
                                    </p>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="self-start gap-2"
                                        disabled={submitting}
                                        onClick={handleReset}
                                    >
                                        <ShieldCheck className="size-4" />
                                        Re-enroll on a different device
                                    </Button>
                                </>
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
