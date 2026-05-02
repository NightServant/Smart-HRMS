import { useForm } from '@inertiajs/react';
import {
    Clock,
    Fingerprint,
    IdCard,
    Info,
    Monitor,
    ShieldCheck,
} from 'lucide-react';
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
import { Label } from '@/components/ui/label';

export default function AttendanceScanner({
    records,
    employeeId,
    enrolledAtTerminal = false,
    manualPunchEnabled = false,
}: {
    records: DailyAttendanceRecord[];
    employeeId: string;
    employeeName: string;
    enrolledAtTerminal?: boolean;
    manualPunchEnabled?: boolean;
}) {
    const { data, post, processing } = useForm({
        employee_id: employeeId,
    });

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
                            {enrolledAtTerminal
                                ? 'Enrolled at terminal'
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
                                        Place your finger on the ZKTeco
                                        terminal in the office to clock in or
                                        clock out.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {enrolledAtTerminal ? (
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                                <div className="flex items-start gap-3">
                                    <Fingerprint className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                                            Enrolled at biometric terminal
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
                            <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 dark:border-sky-900/40 dark:bg-sky-950/20">
                                <div className="flex items-start gap-3">
                                    <Info className="mt-0.5 size-5 shrink-0 text-sky-600 dark:text-sky-400" />
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-sky-900 dark:text-sky-200">
                                            Contact HR to enroll
                                        </p>
                                        <p className="mt-0.5 text-xs text-sky-700/80 dark:text-sky-400/70">
                                            Contact HR to enroll your
                                            fingerprint at the office terminal.
                                            Until then, use the manual entry
                                            fallback if it has been enabled for
                                            you.
                                        </p>
                                    </div>
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

            <AttendanceHistoryTable records={records} />
        </>
    );
}
