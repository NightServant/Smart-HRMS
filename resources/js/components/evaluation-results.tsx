import { Award, BarChart3, CheckCircle2, MessageSquareText, TrendingDown, TrendingUp, User2 } from "lucide-react";
import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

const evaluationCriteria = [
    { name: "Understanding job responsibilities", category: "Core Competencies" },
    { name: "Technical or Professional Skills", category: "Core Competencies" },
    { name: "Quality of work", category: "Work Output" },
    { name: "Productivity", category: "Work Output" },
    { name: "Accuracy and attention to detail", category: "Work Output" },
    { name: "Meeting deadlines", category: "Work Output" },
    { name: "Problem-Solving Ability", category: "Critical Thinking" },
    { name: "Initiative", category: "Critical Thinking" },
    { name: "Adaptability", category: "Critical Thinking" },
    { name: "Decision-making skills", category: "Critical Thinking" },
    { name: "Verbal communication", category: "Communication" },
    { name: "Written communication", category: "Communication" },
    { name: "Teamwork", category: "Professionalism" },
    { name: "Professional behavior", category: "Professionalism" },
    { name: "Punctuality", category: "Professionalism" },
    { name: "Attendance record", category: "Professionalism" },
    { name: "Dependability", category: "Professionalism" },
];

type Employee = {
    employee_id: string;
    name: string;
    job_title: string;
};

type Submission = {
    id: number;
    performance_rating: number | null;
    criteria_ratings: Record<string, string> | null;
    status: string | null;
    stage: string | null;
    evaluator_gave_remarks: boolean;
    remarks: string | null;
    notification: string | null;
};

type Props = {
    employee: Employee;
    submission: Submission;
};

function ratingLabel(score: number): { text: string; color: string } {
    if (score >= 4.5) return { text: "Outstanding", color: "text-emerald-600 dark:text-emerald-400" };
    if (score >= 3.5) return { text: "Very Satisfactory", color: "text-blue-600 dark:text-blue-400" };
    if (score >= 2.5) return { text: "Satisfactory", color: "text-primary" };
    if (score >= 1.5) return { text: "Unsatisfactory", color: "text-amber-600 dark:text-amber-400" };
    return { text: "Poor", color: "text-red-600 dark:text-red-400" };
}

function ratingBarColor(score: number): string {
    if (score >= 4.5) return "[&>div]:bg-emerald-500";
    if (score >= 3.5) return "[&>div]:bg-blue-500";
    if (score >= 2.5) return "[&>div]:bg-primary";
    if (score >= 1.5) return "[&>div]:bg-amber-500";
    return "[&>div]:bg-red-500";
}

export default function EvaluationResults({ employee, submission }: Props) {
    const criteriaRatings = submission.criteria_ratings ?? {};
    const averageScore = Number(submission.performance_rating ?? 0);
    const rating = ratingLabel(averageScore);

    const categoryAverages = useMemo(() => {
        const categories = [...new Set(evaluationCriteria.map((c) => c.category))];
        return categories.map((category) => {
            const items = evaluationCriteria.filter((c) => c.category === category);
            const scores = items
                .map((item) => Number(criteriaRatings[item.name] ?? 0))
                .filter((s) => s > 0);
            const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
            return { category, average: avg, items };
        });
    }, [criteriaRatings]);

    const strongest = useMemo(() => {
        let best = { name: "", score: 0 };
        for (const [name, val] of Object.entries(criteriaRatings)) {
            const score = Number(val);
            if (score > best.score) best = { name, score };
        }
        return best;
    }, [criteriaRatings]);

    const weakest = useMemo(() => {
        let worst = { name: "", score: 6 };
        for (const [name, val] of Object.entries(criteriaRatings)) {
            const score = Number(val);
            if (score > 0 && score < worst.score) worst = { name, score };
        }
        return worst.score < 6 ? worst : { name: "", score: 0 };
    }, [criteriaRatings]);

    return (
        <div className="mx-auto w-full max-w-7xl space-y-6">
            {/* Header Card */}
            <Card className="animate-fade-in-up border-primary/20 bg-card/80 shadow-xl">
                <CardHeader>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <BarChart3 className="size-6 text-primary" />
                                IPCR Evaluation Results
                            </CardTitle>
                            <CardDescription className="mt-1 flex items-center gap-2">
                                <User2 className="size-4" />
                                {employee.name} — {employee.job_title}
                            </CardDescription>
                        </div>
                        <div className="flex flex-col items-center rounded-xl border border-primary/20 bg-primary/5 px-6 py-3">
                            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Overall Rating</span>
                            <span className={`text-3xl font-bold ${rating.color}`}>{averageScore.toFixed(2)}</span>
                            <span className={`text-sm font-semibold ${rating.color}`}>{rating.text}</span>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Card className="animate-fade-in-up border-emerald-500/20 bg-card/80 shadow-lg" style={{ animationDelay: "50ms" }}>
                    <CardContent className="flex items-start gap-3 pt-6">
                        <div className="rounded-full bg-emerald-500/10 p-2.5">
                            <TrendingUp className="size-5 text-emerald-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-muted-foreground">Strongest Area</p>
                            <p className="truncate text-sm font-semibold">{strongest.name || "N/A"}</p>
                            {strongest.score > 0 && <p className="text-xs text-emerald-600 dark:text-emerald-400">{strongest.score}/5</p>}
                        </div>
                    </CardContent>
                </Card>
                <Card className="animate-fade-in-up border-amber-500/20 bg-card/80 shadow-lg" style={{ animationDelay: "100ms" }}>
                    <CardContent className="flex items-start gap-3 pt-6">
                        <div className="rounded-full bg-amber-500/10 p-2.5">
                            <TrendingDown className="size-5 text-amber-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-muted-foreground">Needs Improvement</p>
                            <p className="truncate text-sm font-semibold">{weakest.name || "N/A"}</p>
                            {weakest.score > 0 && <p className="text-xs text-amber-600 dark:text-amber-400">{weakest.score}/5</p>}
                        </div>
                    </CardContent>
                </Card>
                <Card className="animate-fade-in-up border-primary/20 bg-card/80 shadow-lg" style={{ animationDelay: "150ms" }}>
                    <CardContent className="flex items-start gap-3 pt-6">
                        <div className="rounded-full bg-primary/10 p-2.5">
                            <CheckCircle2 className="size-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">Status</p>
                            <p className="text-sm font-semibold capitalize">{submission.status ?? "pending"}</p>
                            <p className="text-xs text-muted-foreground">{submission.notification}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Category Breakdown */}
            {categoryAverages.map(({ category, average, items }, catIndex) => (
                <Card
                    key={category}
                    className="animate-fade-in-up border-border bg-card/80 shadow-lg"
                    style={{ animationDelay: `${200 + catIndex * 80}ms` }}
                >
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Award className="size-4 text-primary" />
                                {category}
                            </CardTitle>
                            <span className={`text-sm font-bold ${ratingLabel(average).color}`}>
                                {average.toFixed(2)} avg
                            </span>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {items.map((criterion) => {
                            const score = Number(criteriaRatings[criterion.name] ?? 0);
                            const rl = ratingLabel(score);
                            return (
                                <div key={criterion.name} className="space-y-1.5">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-medium">{criterion.name}</span>
                                        <span className={`font-bold ${rl.color}`}>{score > 0 ? `${score}/5` : "—"}</span>
                                    </div>
                                    <Progress
                                        value={score > 0 ? (score / 5) * 100 : 0}
                                        className={`h-2 ${ratingBarColor(score)}`}
                                    />
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            ))}

            {/* Remarks */}
            {submission.evaluator_gave_remarks && submission.remarks && (
                <Card className="animate-fade-in-up border-amber-500/20 bg-card/80 shadow-lg">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <MessageSquareText className="size-4 text-amber-500" />
                            Evaluator Remarks
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Separator className="mb-4" />
                        <p className="text-sm leading-relaxed text-muted-foreground">{submission.remarks}</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
