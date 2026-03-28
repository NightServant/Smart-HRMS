import { CalendarCheck2, ClipboardList } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DashboardChartSurface, dashboardGlassCardClassName } from '@/components/admin-system-dashboard-cards';
import { Separator } from '@/components/ui/separator';
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

        // Refresh every 5 minutes
        const interval = setInterval(fetchAttendanceMetrics, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className={`${dashboardGlassCardClassName} flex h-full w-full min-w-0 animate-fade-in-left flex-col gap-4 rounded-xl p-4 transition-shadow hover:shadow-md sm:gap-5`}>
            <div className="flex items-center gap-2 text-base font-bold sm:text-lg">
                <CalendarCheck2 className="size-5 text-primary" />
                Daily Attendance Logs
            </div>
            <div className="mx-auto w-full max-w-full px-1 sm:max-w-none sm:px-4">
                {isLoading ? (
                    <DashboardChartSurface className="mt-2">
                        <div className="flex h-40 items-center justify-center">
                            <div className="h-32 w-full animate-pulse rounded bg-muted"></div>
                        </div>
                    </DashboardChartSurface>
                ) : error ? (
                    <DashboardChartSurface className="mt-2">
                        <div className="flex items-center justify-center rounded bg-muted/50 p-4 text-sm text-muted-foreground">
                            Error loading attendance data: {error}
                        </div>
                    </DashboardChartSurface>
                ) : (
                    <>
                        <div className="mb-4 rounded bg-muted/30 p-3 text-sm">
                            <p>
                                <strong>Current Month Attendance:</strong> {metrics?.attendance_pct || 0}%
                                ({metrics?.present_days || 0} / {metrics?.total_days || 0} days present)
                            </p>
                        </div>
                        <DashboardChartSurface className="mt-2">
                            <DailyAttendanceBarChart data={{
                                late: metrics?.late_count ?? 0,
                                absent: metrics?.absent_count ?? 0,
                                onLeave: metrics?.on_leave_count ?? 0,
                                present: metrics?.present_count ?? 0,
                            }} />
                        </DashboardChartSurface>
                    </>
                )}
            </div>
            <Separator className="mt-2" />
            <div className="flex items-start gap-2 text-sm text-muted-foreground sm:ml-6">
                <ClipboardList className="mt-0.5 size-4 shrink-0" />
                Daily attendance summary for monitoring presence and time-in/time-out consistency.
            </div>
        </div>
    );
}
