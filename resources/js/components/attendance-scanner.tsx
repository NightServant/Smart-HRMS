import { router, useForm } from '@inertiajs/react';
import { Clock, Fingerprint, IdCard, Monitor, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
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
import { Input } from '@/components/ui/input';
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

type AttendanceRecord = {
    id: number;
    date: string;
    punchTime: string;
    status: string;
};

export default function AttendanceScanner({
    records,
    employeeId,
    hasDevice,
    manualPunchEnabled = false,
}: {
    records: AttendanceRecord[];
    employeeId: string;
    hasDevice: boolean;
    manualPunchEnabled?: boolean;
}) {
    const { data, post, processing } = useForm({
        employee_id: employeeId,
    });

    const { post: biometricPost, processing: biometricProcessing } = useForm(
        {},
    );

    const handleBiometricPunch = (): void => {
        biometricPost('/attendance/biometric-punch', {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Biometric punch recorded successfully.');
            },
            onError: (errors) => {
                const message =
                    errors.employee_id || 'Failed to record biometric punch.';
                toast.error(message);
            },
        });
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
    const currentDate = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
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

                        {!hasDevice ? (
                            <div className="flex flex-col items-center gap-2 py-4 text-center">
                                <Fingerprint className="size-10 text-muted-foreground/40" />
                                <p className="text-sm font-medium text-muted-foreground">
                                    No devices available.
                                </p>
                                <p className="text-xs text-muted-foreground/70">
                                    A biometric device will appear here once
                                    connected to the system.
                                </p>
                            </div>
                        ) : (
                            <>
                                <Button
                                    type="button"
                                    className="w-full gap-2"
                                    disabled={
                                        biometricProcessing || !employeeId
                                    }
                                    onClick={handleBiometricPunch}
                                >
                                    <Fingerprint className="size-4" />
                                    {biometricProcessing
                                        ? 'Recording...'
                                        : 'Biometric Punch'}
                                </Button>

                                <p className="text-center text-xs text-muted-foreground">
                                    Simulates a fingerprint scan &mdash; records
                                    attendance with biometric verification.
                                </p>
                            </>
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
                            <Label htmlFor="employee_id">Employee ID</Label>
                            <Input
                                id="employee_id"
                                type="text"
                                value={data.employee_id}
                                readOnly
                                className="bg-muted font-mono tracking-wider"
                            />
                        </div>

                        <div className="rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-xs text-muted-foreground">
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
                        Recent Attendance Records
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Your most recent attendance punches.
                    </p>
                </div>
                <Separator className="mb-4" />
                <div className="overflow-x-auto">
                    <Table className="w-full min-w-[30rem] sm:min-w-[34rem]">
                        <TableHeader>
                            <TableRow className="app-table-head-row text-sm font-bold">
                                <TableHead>Date</TableHead>
                                <TableHead>Punch Time</TableHead>
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
                                        {record.punchTime}
                                    </TableCell>
                                    <TableCell>
                                        <span
                                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                                                record.status === 'Present'
                                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                                            }`}
                                        >
                                            {record.status}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {records.length === 0 && (
                                <TableRow>
                                    <TableCell
                                        colSpan={3}
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
        </>
    );
}
