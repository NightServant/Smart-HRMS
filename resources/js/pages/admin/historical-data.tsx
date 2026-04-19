import { Head } from '@inertiajs/react';
import {
    AlertTriangle,
    BarChart3,
    Crown,
    Star,
    TrendingUp,
    Users,
} from 'lucide-react';
import { useMemo } from 'react';
import { HistoricalDataTable } from '@/components/historical-data-table';
import PageIntro from '@/components/page-intro';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import * as admin from '@/routes/admin';
import type { BreadcrumbItem } from '@/types';

type HistoricalDataRecord = {
    id: number;
    employeeName: string;
    departmentName: string;
    year: number;
    period?: string | null;
    quarter?: string | null;
    attendancePunctualityRate: string;
    absenteeismDays: number;
    tardinessIncidents: number;
    trainingCompletionStatus: number;
    evaluatedPerformanceScore: number;
};

type PaginationMeta = {
    currentPage: number;
    lastPage: number;
    perPage: number;
    total: number;
};

type HistoricalSortKey =
    | "employee_name"
    | "department_name"
    | "year"
    | "period"
    | "quarter"
    | "attendance_punctuality_rate"
    | "absenteeism_days"
    | "tardiness_incidents"
    | "training_completion_status"
    | "evaluated_performance_score";

type EmployeeSummaryEntry = { name: string; score: number };
type DepartmentSummaryItem = {
    top: EmployeeSummaryEntry[];
    at_risk: EmployeeSummaryEntry[];
    avg_score: number;
    total_employees: number;
};
type DepartmentSummary = Record<string, DepartmentSummaryItem>;

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Historical Data Management',
        href: admin.historicalData().url,
    },
];

function SummaryStatCard({
    icon: Icon,
    label,
    value,
    sub,
    tone,
}: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    sub?: string;
    tone: 'emerald' | 'blue' | 'amber' | 'default';
}) {
    const toneMap = {
        emerald: {
            icon: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300',
            value: 'text-emerald-700 dark:text-emerald-300',
        },
        blue: {
            icon: 'border-blue-500/20 bg-blue-500/10 text-blue-600 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-300',
            value: 'text-blue-700 dark:text-blue-300',
        },
        amber: {
            icon: 'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300',
            value: 'text-amber-700 dark:text-amber-300',
        },
        default: {
            icon: 'border-border bg-muted/50 text-foreground',
            value: 'text-foreground',
        },
    }[tone];

    return (
        <div className="glass-card flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl border', toneMap.icon)}>
                <Icon className="size-5" />
            </div>
            <div className="min-w-0">
                <p className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">{label}</p>
                <p className={cn('mt-0.5 text-2xl leading-none font-bold', toneMap.value)}>{value}</p>
                {sub && <p className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</p>}
            </div>
        </div>
    );
}

export default function HistoricalData({
    historicalData,
    search,
    sort,
    direction,
    pagination,
    year,
    departmentSummary,
}: {
    historicalData: HistoricalDataRecord[];
    search: string;
    sort: HistoricalSortKey;
    direction: "asc" | "desc";
    pagination: PaginationMeta;
    year: number | null;
    departmentSummary: DepartmentSummary;
}) {
    const hasSummary = Object.keys(departmentSummary).length > 0;

    const aggregates = useMemo(() => {
        const depts = Object.entries(departmentSummary);
        if (depts.length === 0) return null;

        const totalEmployees = depts.reduce((sum, [, d]) => sum + d.total_employees, 0);
        const weightedAvg = depts.reduce((sum, [, d]) => sum + d.avg_score * d.total_employees, 0) / Math.max(totalEmployees, 1);

        const allTopScores = depts.flatMap(([, d]) => d.top.map((e) => e.score));
        const allAtRiskScores = depts.flatMap(([, d]) => d.at_risk.map((e) => e.score));
        const topScore = allTopScores.length > 0 ? Math.max(...allTopScores) : null;
        const atRiskScore = allAtRiskScores.length > 0 ? Math.min(...allAtRiskScores) : null;

        return {
            deptCount: depts.length,
            totalEmployees,
            overallAvg: weightedAvg.toFixed(2),
            topScore: topScore !== null ? topScore.toFixed(2) : '—',
            atRiskScore: atRiskScore !== null ? atRiskScore.toFixed(2) : '—',
        };
    }, [departmentSummary]);

    const rankedDepts = useMemo(
        () => Object.entries(departmentSummary).sort((a, b) => b[1].avg_score - a[1].avg_score),
        [departmentSummary],
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Historical Data" />
            <div className="app-page-shell app-page-stack">
                <PageIntro
                    eyebrow="HR Personnel · Historical Data"
                    title="Historical Data Records"
                    description="Historical employee performance and attendance metrics."
                />

                {hasSummary && aggregates && (
                    <div className="space-y-4">
                        <h2 className="ml-4 text-sm font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                            Performance Summary by Department
                        </h2>

                        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                            <div className={cn(
                                'grid gap-4 content-start',
                                rankedDepts.length === 1
                                    ? 'grid-cols-1'
                                    : rankedDepts.length === 2
                                      ? 'sm:grid-cols-2'
                                      : 'sm:grid-cols-2 xl:grid-cols-3',
                            )}>
                                {rankedDepts.map(([dept, data], rankIndex) => (
                                    <DeptCard
                                        key={dept}
                                        dept={dept}
                                        data={data}
                                        rank={rankIndex + 1}
                                        isTop={rankIndex === 0}
                                    />
                                ))}
                            </div>

                            <div className="grid w-full grid-cols-2 gap-3 lg:w-72 lg:grid-cols-1">
                                <SummaryStatCard
                                    icon={BarChart3}
                                    label="Departments"
                                    value={aggregates.deptCount}
                                    sub={year ? `Year ${year}` : 'All years'}
                                    tone="blue"
                                />
                                <SummaryStatCard
                                    icon={Users}
                                    label="Employees Analyzed"
                                    value={aggregates.totalEmployees}
                                    sub="With evaluated scores"
                                    tone="default"
                                />
                                <SummaryStatCard
                                    icon={Star}
                                    label="Top Score"
                                    value={aggregates.topScore}
                                    sub="Highest individual rating"
                                    tone="emerald"
                                />
                                <SummaryStatCard
                                    icon={TrendingUp}
                                    label="Overall Average"
                                    value={aggregates.overallAvg}
                                    sub="Weighted across all employees"
                                    tone="amber"
                                />
                            </div>
                        </div>
                    </div>
                )}

                <HistoricalDataTable
                    historicalData={historicalData}
                    search={search}
                    sort={sort}
                    direction={direction}
                    pagination={pagination}
                    year={year}
                />
            </div>
        </AppLayout>
    );
}

function adjectivalRating(score: number): string {
    if (score >= 4.5) return 'Outstanding';
    if (score >= 3.5) return 'Very Satisfactory';
    if (score >= 2.5) return 'Satisfactory';
    if (score >= 1.5) return 'Unsatisfactory';
    return 'Poor';
}

function ScoreBar({ score, max = 5, tone }: { score: number; max?: number; tone: 'emerald' | 'red' | 'brand' }) {
    const pct = Math.min(100, (score / max) * 100);
    const barColor = {
        emerald: 'bg-emerald-500 dark:bg-emerald-400',
        red: 'bg-red-500 dark:bg-red-400',
        brand: 'bg-[#4A7C3C] dark:bg-[#9AC68E]',
    }[tone];

    return (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
            <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${pct}%` }} />
        </div>
    );
}

function DeptCard({
    dept,
    data,
    rank,
    isTop,
}: {
    dept: string;
    data: DepartmentSummaryItem;
    rank: number;
    isTop: boolean;
}) {
    const rankLabel = rank === 1 ? '1st' : rank === 2 ? '2nd' : rank === 3 ? '3rd' : `${rank}th`;
    const adjRating = adjectivalRating(data.avg_score);
    const avgPct = Math.min(100, (data.avg_score / 5) * 100);

    return (
        <Card className="glass-card overflow-hidden border border-border bg-card shadow-sm">
            {/* Header */}
            <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">Department</p>
                        <CardTitle className="mt-1 text-xl font-bold leading-tight">{dept}</CardTitle>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5 pt-1">
                        {isTop && <Crown className="size-4 text-amber-500" />}
                        <span className={cn(
                            'rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide',
                            rank === 1
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                                : rank === 2
                                  ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                  : rank === 3
                                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300'
                                    : 'bg-muted text-muted-foreground',
                        )}>
                            #{rankLabel}
                        </span>
                    </div>
                </div>

                {/* Avg score block */}
                <div className="mt-4 space-y-2">
                    <div className="flex items-end justify-between">
                        <div>
                            <p className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">Dept. Average</p>
                            <div className="mt-1 flex items-baseline gap-2">
                                <span className="text-4xl font-bold tracking-tight text-[#2F5E2B] dark:text-[#9AC68E]">
                                    {data.avg_score.toFixed(2)}
                                </span>
                                <span className="mb-0.5 text-sm text-muted-foreground">/ 5.00</span>
                            </div>
                            <p className="mt-0.5 text-sm font-semibold text-foreground">{adjRating}</p>
                        </div>
                        <div className="text-right">
                            <div className="flex items-center gap-1.5 justify-end">
                                <Users className="size-3.5 text-muted-foreground" />
                                <span className="text-2xl font-bold text-foreground">{data.total_employees}</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                                {data.total_employees === 1 ? 'employee' : 'employees'}
                            </p>
                        </div>
                    </div>
                    <ScoreBar score={data.avg_score} tone="brand" />
                    <p className="text-[10px] text-muted-foreground">{avgPct.toFixed(0)}% of maximum score</p>
                </div>
            </CardHeader>

            <CardContent className="pt-0">
                <div className="grid gap-5 sm:grid-cols-2">
                    {/* Top Performers */}
                    <div>
                        <div className="mb-3 flex items-center gap-1.5">
                            <Crown className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                            <p className="text-xs font-bold tracking-[0.12em] text-emerald-600 uppercase dark:text-emerald-400">
                                Top Performers
                            </p>
                        </div>
                        <div className="space-y-3">
                            {data.top.map((e, i) => (
                                <div key={e.name} className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className={cn(
                                            'flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                                            i === 0
                                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                                                : i === 1
                                                  ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                                                  : 'bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400',
                                        )}>
                                            {i + 1}
                                        </span>
                                        <span className="flex-1 truncate text-sm font-medium text-foreground">{e.name}</span>
                                        <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">{e.score}</span>
                                    </div>
                                    <ScoreBar score={e.score} tone="emerald" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Needs Improvement */}
                    <div>
                        <div className="mb-3 flex items-center gap-1.5">
                            <AlertTriangle className="size-3.5 text-red-600 dark:text-red-400" />
                            <p className="text-xs font-bold tracking-[0.12em] text-red-600 uppercase dark:text-red-400">
                                Needs Improvement
                            </p>
                        </div>
                        <div className="space-y-3">
                            {data.at_risk.map((e) => (
                                <div key={e.name} className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="flex-1 truncate text-sm font-medium text-foreground">{e.name}</span>
                                        <span className="font-mono text-sm font-bold text-red-600 dark:text-red-400">{e.score}</span>
                                    </div>
                                    <ScoreBar score={e.score} tone="red" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer note */}
                <p className="mt-4 border-t border-border/50 pt-3 text-[11px] text-muted-foreground">
                    Showing top 3 and lowest 3 performers · {data.total_employees} total employees evaluated
                </p>
            </CardContent>
        </Card>
    );
}
