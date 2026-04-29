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
import { Separator } from '@/components/ui/separator';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

type DailyAttendanceRecord = {
    id: number;
    date: string;
    time_in: string | null;
    time_out: string | null;
    status: 'on_time' | 'late' | 'incomplete';
    late_minutes: number;
    source: string;
};

const STATUS_LABELS: Record<DailyAttendanceRecord['status'], string> = {
    on_time: 'On Time',
    late: 'Late',
    incomplete: 'Incomplete',
};

const STATUS_CLASSES: Record<DailyAttendanceRecord['status'], string> = {
    on_time:
        'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    late: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    incomplete:
        'bg-zinc-100 text-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300',
};

export default function AttendanceScanner({
    records,
    employeeId,
    employeeName,
    zktecoPin,
    hasDevice,
    enrolledInBiometric,
    enrollmentStatus,
    manualPunchEnabled = false,
}: {
    records: DailyAttendanceRecord[];
    employeeId: string;
    employeeName: string;
    zktecoPin: string | null;
    hasDevice: boolean;
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
        if (!enrolledInBiometric || !zktecoPin) {
            toast.error('Please enroll your fingerprint first.');
            setIsEnrollOpen(true);
            return;
        }

        setScanning(mode);

        try {
            const response = await fetch('/api/biometrics/clock', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN':
                        document
                            .querySelector('meta[name="csrf-token"]')
                            ?.getAttribute('content') ?? '',
                },
                body: JSON.stringify({
                    employee_id: employeeId,
                    zkteco_pin: zktecoPin,
                    mode,
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
                        'Fingerprint scan could not be confirmed by the device.',
                );
                return;
            }

            toast.success(
                payload.message ??
                    `Clock ${mode === 'in' ? 'in' : 'out'} recorded.`,
            );
            refreshAttendance();
        } catch {
            toast.error('Network error. Try again.');
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
                description="Record your attendance using the ZKTeco biometric terminal or the secured manual entry fallback below."
                actions={
                    <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="bg-background/70">
                            <Fingerprint className="size-3.5" />
                            {hasDevice
                                ? 'Biometric ready'
                                : 'Waiting for device'}
                        </Badge>
                        <Badge variant="outline" className="bg-background/70">
                            <Clock className="size-3.5" />
                            {currentTime}
                        </Badge>
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
                            Record your attendance using the ZKTeco biometric
                            fingerprint terminal.
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
                                        ZKTeco M1 Terminal
                                    </p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        Compatible with ZKTeco M1 Time &amp;
                                        Attendance Terminal (fingerprint +
                                        password).
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
                                        Active — Synced via ZKBio Time
                                    </span>
                                </div>

                                <p className="text-sm text-foreground/80">
                                    Scan your fingerprint on the terminal, then
                                    press Clock In or Clock Out below to record
                                    the punch.
                                </p>

                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        type="button"
                                        className="w-full gap-2"
                                        disabled={
                                            scanning !== null || !hasDevice
                                        }
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
                                        disabled={
                                            scanning !== null || !hasDevice
                                        }
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
                                            Device PIN
                                        </p>
                                        <p className="font-mono text-foreground">
                                            {zktecoPin ?? '—'}
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

                                <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/50 px-3 py-2">
                                    <RefreshCw className="size-3.5 shrink-0 text-muted-foreground" />
                                    <p className="text-xs text-muted-foreground">
                                        Reload this page to fetch the latest
                                        records.
                                    </p>
                                </div>
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

            <div className="glass-card app-data-shell mx-auto w-full animate-zoom-in-soft overflow-hidden bg-card shadow-sm">
                <div className="py-4">
                    <h2 className="flex items-center gap-2 text-lg font-bold">
                        <Clock className="size-5" />
                        Recent Attendance
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Daily attendance summary based on biometric and manual
                        punches.
                    </p>
                </div>
                <Separator className="mb-4" />
                <div className="overflow-x-auto">
                    <Table className="w-full min-w-[34rem]">
                        <TableHeader>
                            <TableRow className="app-table-head-row text-sm font-bold">
                                <TableHead>Date</TableHead>
                                <TableHead>Time In</TableHead>
                                <TableHead>Time Out</TableHead>
                                <TableHead>Late (min)</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {records.map((record, index) => (
                                <TableRow
                                    key={record.id}
                                    style={{
                                        animationDelay: `${index * 24}ms`,
                                    }}
                                    className={`animate-fade-in-up text-sm font-semibold text-foreground ${index % 2 === 0 ? 'app-table-row-even' : 'app-table-row-odd'}`}
                                >
                                    <TableCell>{record.date}</TableCell>
                                    <TableCell className="font-mono">
                                        {record.time_in ?? '—'}
                                    </TableCell>
                                    <TableCell className="font-mono">
                                        {record.time_out ?? '—'}
                                    </TableCell>
                                    <TableCell>
                                        {record.late_minutes > 0
                                            ? record.late_minutes
                                            : '—'}
                                    </TableCell>
                                    <TableCell>
                                        <span
                                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CLASSES[record.status]}`}
                                        >
                                            {STATUS_LABELS[record.status]}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {records.length === 0 && (
                                <TableRow>
                                    <TableCell
                                        colSpan={5}
                                        className="app-table-empty px-4 py-6"
                                    >
                                        No attendance records found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

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
