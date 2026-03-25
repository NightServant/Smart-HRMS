import { BarChart3 } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { Separator } from '@/components/ui/separator';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type QuarterScores = {
    Q1: number;
    Q2: number;
    Q3: number;
    Q4: number;
};

type EmployeeQuarterData = {
    employee_name: string;
    quarter_scores: QuarterScores;
};

export default function EmployeeQuarterTrends() {
    const [data, setData] = useState<EmployeeQuarterData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async (): Promise<void> => {
            try {
                setIsLoading(true);
                setError(null);

                const response = await fetch('/api/flatfat/employee-quarter-scores', {
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
                    } else {
                        setError(result.message || 'No historical performance data available.');
                    }
                } else {
                    throw new Error(result.message || 'Failed to fetch quarter scores');
                }
            } catch (err) {
                console.error('Error fetching employee quarter scores:', err);
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    const chartData = {
        labels: ['Q1', 'Q2', 'Q3', 'Q4'],
        datasets: [
            {
                label: 'Performance Score',
                data: data
                    ? [data.quarter_scores.Q1, data.quarter_scores.Q2, data.quarter_scores.Q3, data.quarter_scores.Q4]
                    : [0, 0, 0, 0],
                backgroundColor: '#4A7C3C',
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            title: { display: false },
        },
        scales: {
            y: {
                min: 0,
                max: 5,
                ticks: { stepSize: 1 },
            },
        },
    };

    return (
        <div className="glass-card flex h-full w-full min-w-0 animate-fade-in-left flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md sm:gap-5">
            <div className="flex flex-col gap-3">
                <h1 className="flex min-w-0 items-center gap-2 text-base font-bold sm:text-lg lg:whitespace-nowrap">
                    <BarChart3 className="size-5 text-primary" />
                    My Quarterly Performance
                </h1>
            </div>

            <div className="mx-auto flex-1 w-full max-w-full px-1 sm:max-w-none sm:px-4">
                {isLoading ? (
                    <div className="flex h-40 items-center justify-center">
                        <div className="h-32 w-full animate-pulse rounded bg-muted"></div>
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center rounded bg-muted/50 p-4 text-sm text-muted-foreground">
                        Error loading quarter scores: {error}
                    </div>
                ) : (
                    <>
                        {data && (
                            <div className="mb-4 rounded bg-muted/30 p-3 text-sm">
                                <p>
                                    <strong>Average Score:</strong>{' '}
                                    {(
                                        (data.quarter_scores.Q1 + data.quarter_scores.Q2 + data.quarter_scores.Q3 + data.quarter_scores.Q4) / 4
                                    ).toFixed(2)}{' '}
                                    / 5.0
                                </p>
                            </div>
                        )}
                        <div className="mx-auto h-36 w-3/4 sm:h-44 md:h-52 lg:h-60">
                            <Bar options={options} data={chartData} />
                        </div>
                    </>
                )}
            </div>
            <Separator className="mt-2" />
            <p className="text-sm text-muted-foreground sm:ml-6">
                Your performance scores across all quarters based on historical evaluation data.
            </p>
        </div>
    );
}
