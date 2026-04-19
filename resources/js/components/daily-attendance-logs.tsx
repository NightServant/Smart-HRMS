import { format } from 'date-fns';
import { CalendarOff, CheckCircle2, Clock3, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
    DashboardChartSurface,
    DashboardPanelCard,
} from '@/components/admin-system-dashboard-cards';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

type AttendanceMetrics = {
    attendance_pct: number;
    total_days: number;
    present_days: number;
    late_count: number;
    absent_count: number;
    on_leave_count: number;
    present_count: number;
    total_employees: number;
    employees_with_record_today: number;
    quarter?: string;
};

export default function DailyAttendanceLogs() {
    const [metrics, setMetrics] = useState<AttendanceMetrics | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const today = useMemo(() => new Date(), []);

    useEffect(() => {
        const fetchAttendanceMetrics = async (): Promise<void> => {
            try {
                setIsLoading(true);
                setError(null);

                const params = new URLSearchParams();
                params.set('month', format(today, 'yyyy-MM'));

                const response = await fetch(
                    `/api/flatfat/attendance-metrics?${params.toString()}`,
                    {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            Accept: 'application/json',
                        },
                    },
                );

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();

                if (result.status === 'success' && result.data) {
                    setMetrics(result.data);
                } else {
                    throw new Error(
                        result.message || 'Failed to fetch attendance metrics',
                    );
                }
            } catch (err) {
                console.error('Error fetching attendance metrics:', err);
                setError(err instanceof Error ? err.message : 'Unknown error');
                setMetrics({
                    attendance_pct: 0,
                    total_days: 0,
                    present_days: 0,
                    late_count: 0,
                    absent_count: 0,
                    on_leave_count: 0,
                    present_count: 0,
                    total_employees: 0,
                    employees_with_record_today: 0,
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchAttendanceMetrics();

        const interval = setInterval(fetchAttendanceMetrics, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [today]);

    return (
        <DashboardPanelCard
            title="Daily Attendance Logs"
            description="Daily attendance summary for monitoring presence and time-in/time-out consistency."
            accentClassName="-left-10 top-10 size-28 rounded-full bg-brand-300/20 blur-3xl dark:bg-brand-500/10"
            contentClassName="gap-4"
            headerExtras={
                <div className="flex flex-wrap items-center gap-2">
                    {!isLoading && metrics ? (
                        <Badge
                            variant="outline"
                            className="border-brand-300/60 bg-brand-100/70 text-brand-900 dark:border-brand-700/60 dark:bg-brand-900/30 dark:text-brand-100"
                        >
                            {metrics.attendance_pct}% attendance rate
                        </Badge>
                    ) : undefined}
                </div>
            }
        >
            {isLoading ? (
                <DashboardChartSurface>
                    <div className="flex h-40 items-center justify-center">
                        <div className="h-32 w-full animate-pulse rounded bg-muted"></div>
                    </div>
                </DashboardChartSurface>
            ) : error ? (
                <DashboardChartSurface>
                    <div className="flex items-center justify-center rounded bg-muted/50 p-4 text-sm text-muted-foreground">
                        Error loading attendance data: {error}
                    </div>
                </DashboardChartSurface>
            ) : (
                <>
                    <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                        {format(today, 'MMMM d, yyyy')}
                    </p>

                    <Separator className="bg-border/70" />

                    <div className="rounded-2xl border border-brand-300 bg-white/75 p-4 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                                    Attendance
                                </p>
                                <p className="mt-2 text-2xl font-bold text-foreground">
                                    {metrics?.attendance_pct || 0}%
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {metrics?.present_days || 0} of{' '}
                                    {metrics?.total_days || 0} working days
                                    logged as present.
                                </p>
                            </div>

                            <div className="min-w-0 rounded-2xl border border-brand-300/70 bg-background/70 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/[0.04]">
                                <p className="font-medium text-foreground">
                                    {metrics?.employees_with_record_today ?? 0}{' '}
                                    / {metrics?.total_employees ?? 0}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    employees with attendance records today
                                </p>
                            </div>
                        </div>
                    </div>

                    <Separator className="bg-border/70" />

                    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                        <div className="flex h-full flex-col rounded-2xl border border-brand-300 bg-white/75 p-4 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="mt-0.5 size-5 text-emerald-600 dark:text-emerald-400" />
                                <div className="min-w-0">
                                    <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                                        {metrics?.present_count ?? 0}
                                    </span>
                                    <p className="text-xs font-medium text-foreground">
                                        Present
                                    </p>
                                </div>
                            </div>
                            <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
                                Employees logged with an on-time attendance
                                record today.
                            </p>
                        </div>

                        <div className="flex h-full flex-col rounded-2xl border border-brand-300 bg-white/75 p-4 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
                            <div className="flex items-start gap-3">
                                <Clock3 className="mt-0.5 size-5 text-amber-600 dark:text-amber-400" />
                                <div className="min-w-0">
                                    <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
                                        {metrics?.late_count ?? 0}
                                    </span>
                                    <p className="text-xs font-medium text-foreground">
                                        Late
                                    </p>
                                </div>
                            </div>
                            <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
                                Delayed clock-ins that may need schedule
                                follow-up.
                            </p>
                        </div>

                        <div className="flex h-full flex-col rounded-2xl border border-brand-300 bg-white/75 p-4 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
                            <div className="flex items-start gap-3">
                                <XCircle
                                    className={`mt-0.5 size-5 ${(metrics?.absent_count ?? 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}
                                />
                                <div className="min-w-0">
                                    <span
                                        className={`text-xl font-bold ${(metrics?.absent_count ?? 0) > 0 ? 'text-red-600 dark:text-red-400' : ''}`}
                                    >
                                        {metrics?.absent_count ?? 0}
                                    </span>
                                    <p className="text-xs font-medium text-foreground">
                                        Absent
                                    </p>
                                </div>
                            </div>
                            <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
                                Employees without a recorded attendance entry
                                for today.
                            </p>
                        </div>

                        <div className="flex h-full flex-col rounded-2xl border border-brand-300 bg-white/75 p-4 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
                            <div className="flex items-start gap-3">
                                <CalendarOff className="mt-0.5 size-5 text-blue-600 dark:text-blue-400" />
                                <div className="min-w-0">
                                    <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                                        {metrics?.on_leave_count ?? 0}
                                    </span>
                                    <p className="text-xs font-medium text-foreground">
                                        On Leave
                                    </p>
                                </div>
                            </div>
                            <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
                                Approved leave requests currently active today.
                            </p>
                        </div>
                    </div>

                    <Separator className="bg-border/70" />

                    <div className="flex flex-col gap-3 rounded-2xl border border-brand-300/70 bg-background/55 px-4 py-3 text-xs text-muted-foreground shadow-sm backdrop-blur-md sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none">
                        <p>
                            Viewing attendance summary for{' '}
                            <span className="font-semibold text-foreground">
                                {format(today, 'MMMM d, yyyy')}
                            </span>
                            .
                        </p>
                        <p>Metrics refresh every 5 minutes for the current month.</p>
                    </div>
                </>
            )}
        </DashboardPanelCard>
    );
}
