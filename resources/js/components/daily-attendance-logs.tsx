import { CalendarOff, CheckCircle2, Clock3, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DashboardChartSurface, DashboardPanelCard } from '@/components/admin-system-dashboard-cards';
import { Badge } from '@/components/ui/badge';
import { DailyAttendanceBarChart } from './ui/daily-attendance-barchart';

type AttendanceMetrics = {
    attendance_pct: number;
    total_days: number;
    present_days: number;
    late_count: number;
    absent_count: number;
    on_leave_count: number;
    present_count: number;
    quarter?: string;
};

export default function DailyAttendanceLogs() {
    const [metrics, setMetrics] = useState<AttendanceMetrics | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAttendanceMetrics = async (): Promise<void> => {
            try {
                setIsLoading(true);
                setError(null);

                const response = await fetch('/api/flatfat/attendance-metrics', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();

                if (result.status === 'success' && result.data) {
                    setMetrics(result.data);
                } else {
                    throw new Error(result.message || 'Failed to fetch attendance metrics');
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
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchAttendanceMetrics();

        const interval = setInterval(fetchAttendanceMetrics, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <DashboardPanelCard
            title="Daily Attendance Logs"
            description="Daily attendance summary for monitoring presence and time-in/time-out consistency."
            accentClassName="-left-10 top-10 size-28 rounded-full bg-brand-300/20 blur-3xl dark:bg-brand-500/10"
            headerExtras={
                !isLoading && metrics ? (
                    <Badge variant="outline" className="border-brand-300/60 bg-brand-100/70 text-brand-900 dark:border-brand-700/60 dark:bg-brand-900/30 dark:text-brand-100">
                        {metrics.attendance_pct}% attendance rate
                    </Badge>
                ) : undefined
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
                    <div className="rounded-2xl border border-brand-300 bg-white/75 p-4 text-sm shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
                        <p>
                            <strong>Current Month Attendance:</strong> {metrics?.attendance_pct || 0}%
                            ({metrics?.present_days || 0} / {metrics?.total_days || 0} days present)
                        </p>
                    </div>
                    <DashboardChartSurface>
                        <DailyAttendanceBarChart data={{
                            late: metrics?.late_count ?? 0,
                            absent: metrics?.absent_count ?? 0,
                            onLeave: metrics?.on_leave_count ?? 0,
                            present: metrics?.present_count ?? 0,
                        }} />
                    </DashboardChartSurface>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="flex flex-col items-center gap-1 rounded-2xl border border-brand-300 bg-white/75 p-3 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
                            <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                                {metrics?.present_count ?? 0}
                            </span>
                            <span className="text-xs text-muted-foreground">Present</span>
                        </div>
                        <div className="flex flex-col items-center gap-1 rounded-2xl border border-brand-300 bg-white/75 p-3 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
                            <Clock3 className="size-5 text-amber-600 dark:text-amber-400" />
                            <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
                                {metrics?.late_count ?? 0}
                            </span>
                            <span className="text-xs text-muted-foreground">Late</span>
                        </div>
                        <div className="flex flex-col items-center gap-1 rounded-2xl border border-brand-300 bg-white/75 p-3 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
                            <XCircle className={`size-5 ${(metrics?.absent_count ?? 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`} />
                            <span className={`text-xl font-bold ${(metrics?.absent_count ?? 0) > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                                {metrics?.absent_count ?? 0}
                            </span>
                            <span className="text-xs text-muted-foreground">Absent</span>
                        </div>
                        <div className="flex flex-col items-center gap-1 rounded-2xl border border-brand-300 bg-white/75 p-3 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
                            <CalendarOff className="size-5 text-blue-600 dark:text-blue-400" />
                            <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                                {metrics?.on_leave_count ?? 0}
                            </span>
                            <span className="text-xs text-muted-foreground">On Leave</span>
                        </div>
                    </div>
                </>
            )}
        </DashboardPanelCard>
    );
}
