import { useEffect, useState } from 'react';
import { DashboardChartSurface, DashboardPanelCard } from '@/components/admin-system-dashboard-cards';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { SpeedometerGauge } from '@/components/ui/speedometer-gauge';

type SemesterScores = {
    S1: number;
    S2: number;
};

type EmployeeSemesterData = {
    employee_name: string;
    semester_scores: SemesterScores;
    available_years: number[];
};

function getSemesterTriggerLabel(semester: string): string {
    return semester === 'S1' ? 'S1 (Jan-Jun)' : 'S2 (Jul-Dec)';
}

function getSemesterOptionLabel(semester: string): string {
    return semester === 'S1'
        ? '1st Semester (Jan-Jun)'
        : '2nd Semester (Jul-Dec)';
}

export default function EmployeeSemesterTrends() {
    const [data, setData] = useState<EmployeeSemesterData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedYear, setSelectedYear] = useState<string>('');
    const [selectedSemester, setSelectedSemester] = useState<string>('S1');

    const fetchData = async (year?: string): Promise<void> => {
        try {
            setIsLoading(true);
            setError(null);

            const params = new URLSearchParams();
            if (year) params.set('year', year);

            const response = await fetch(`/api/flatfat/employee-semester-scores?${params.toString()}`, {
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

            if (result.status === 'success') {
                if (result.data) {
                    setData(result.data);
                    if (!year && result.data.available_years.length > 0) {
                        setSelectedYear(String(result.data.available_years[0]));
                    }
                } else {
                    setError(result.message || 'No historical performance data available.');
                }
            } else {
                throw new Error(result.message || 'Failed to fetch semester scores');
            }
        } catch (err) {
            console.error('Error fetching employee semester scores:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (selectedYear) {
            fetchData(selectedYear);
        }
    }, [selectedYear]);

    const currentScore = data
        ? selectedSemester === 'S1'
            ? data.semester_scores.S1
            : data.semester_scores.S2
        : 0;

    const average = data
        ? ((data.semester_scores.S1 + data.semester_scores.S2) / 2)
        : 0;

    return (
        <DashboardPanelCard
            title="My Semestral Performance"
            description="Your performance scores based on historical evaluation data."
            accentClassName="-left-10 top-10 size-28 rounded-full bg-brand-300/20 blur-3xl dark:bg-brand-500/10"
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
                        {error}
                    </div>
                </DashboardChartSurface>
            ) : (
                <>
                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:flex-nowrap">
                        {data && data.available_years.length > 0 && (
                            <Select value={selectedYear} onValueChange={setSelectedYear}>
                                <SelectTrigger className="w-full bg-card sm:w-28">
                                    <SelectValue placeholder="Year" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        {data.available_years.map((year) => (
                                            <SelectItem key={year} value={String(year)}>
                                                {year}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        )}
                        <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                            <SelectTrigger className="h-10 w-full bg-card text-left sm:w-[12.5rem] sm:shrink-0">
                                <span className="truncate">{getSemesterTriggerLabel(selectedSemester)}</span>
                            </SelectTrigger>
                            <SelectContent className="min-w-[12.5rem]">
                                <SelectGroup>
                                    <SelectItem value="S1">{getSemesterOptionLabel('S1')}</SelectItem>
                                    <SelectItem value="S2">{getSemesterOptionLabel('S2')}</SelectItem>
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>

                    {data && (
                        <div className="rounded-2xl border border-brand-300 bg-white/75 p-4 text-sm shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
                            <p>
                                <strong>Average Score:</strong>{' '}
                                {average.toFixed(2)} / 5.0
                            </p>
                        </div>
                    )}

                    <DashboardChartSurface>
                        <SpeedometerGauge
                            score={currentScore}
                            className="mx-auto h-48 max-w-xs"
                        />
                        <p className="mt-2 text-center text-sm text-muted-foreground">
                            {selectedSemester === 'S1' ? 'Semester 1 (Jan - Jun)' : 'Semester 2 (Jul - Dec)'}{' '}
                            {selectedYear}
                        </p>
                    </DashboardChartSurface>
                </>
            )}
        </DashboardPanelCard>
    );
}
