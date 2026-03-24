import { router } from "@inertiajs/react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

const evaluationCriteria = [
    {
        name: "Understanding job responsibilities",
        description: "Clearly understands assigned duties, scope, and expected outcomes.",
    },
    {
        name: "Technical or Professional Skills",
        description: "Applies required technical knowledge and role-specific competencies.",
    },
    {
        name: "Quality of work",
        description: "Produces outputs that are complete, accurate, and aligned with standards.",
    },
    {
        name: "Productivity",
        description: "Delivers expected volume of work within available time and resources.",
    },
    {
        name: "Accuracy and attention to detail",
        description: "Minimizes errors and checks details before submitting outputs.",
    },
    {
        name: "Meeting deadlines",
        description: "Completes tasks on or before agreed timelines consistently.",
    },
    {
        name: "Problem-Solving Ability",
        description: "Analyzes issues and proposes practical, timely solutions.",
    },
    {
        name: "Initiative",
        description: "Acts proactively without waiting for frequent direction.",
    },
    {
        name: "Adaptability",
        description: "Adjusts effectively to new priorities, tools, and work conditions.",
    },
    {
        name: "Decision-making skills",
        description: "Makes sound decisions using available facts and policy guidance.",
    },
    {
        name: "Verbal communication",
        description: "Communicates ideas clearly and professionally in spoken interactions.",
    },
    {
        name: "Written communication",
        description: "Prepares clear, organized, and grammatically correct written outputs.",
    },
    {
        name: "Teamwork",
        description: "Collaborates respectfully and supports shared team goals.",
    },
    {
        name: "Professional behavior",
        description: "Demonstrates integrity, respect, and proper workplace conduct.",
    },
    {
        name: "Punctuality",
        description: "Reports to work and meetings on time consistently.",
    },
    {
        name: "Attendance record",
        description: "Maintains reliable attendance aligned with office requirements.",
    },
    {
        name: "Dependability",
        description: "Can be trusted to complete responsibilities with minimal follow-up.",
    },
];

const ratingScale = ["1", "2", "3", "4", "5"];

type RatingMap = Record<string, string>;

type Employee = {
    employee_id: string;
    name: string;
    job_title: string;
};

type Submission = {
    id: number;
    performance_rating: number | null;
    status: string | null;
    stage: string | null;
    evaluator_gave_remarks: boolean;
    remarks: string | null;
    notification: string | null;
};

type Props = {
    employee: Employee | null;
    submission: Submission | null;
};

export default function EvaluationCard({ employee, submission }: Props) {
    const [remarks, setRemarks] = useState("");
    const [ratings, setRatings] = useState<RatingMap>({});
    const [processing, setProcessing] = useState(false);

    const ratedScores = useMemo<number[]>(() => {
        return Object.values(ratings)
            .map((value) => Number(value))
            .filter((value) => Number.isFinite(value) && value > 0);
    }, [ratings]);

    const averageScore = useMemo<number>(() => {
        if (ratedScores.length === 0) {
            return 0;
        }

        const totalScore = ratedScores.reduce((sum, score) => sum + score, 0);
        return totalScore / ratedScores.length;
    }, [ratedScores]);

    const allRated = ratedScores.length === evaluationCriteria.length;
    const showEvaluatorRemarks = averageScore > 0 && averageScore < 3;
    const canSubmit = allRated && employee && !processing;

    const handleSave = (): void => {
        if (!employee || !allRated) return;
        setProcessing(true);
        router.post(
            "/ipcr/evaluate",
            {
                employee_id: employee.employee_id,
                performance_rating: averageScore.toFixed(2),
                evaluator_gave_remarks: remarks.trim().length > 0,
                remarks: remarks.trim() || null,
                criteria_ratings: JSON.stringify(ratings),
            },
            {
                onFinish: () => setProcessing(false),
                onError: () => setProcessing(false),
            }
        );
    };

    const resetForm = (): void => {
        setRemarks("");
        setRatings({});
    };

    return (
        <Card className="animate-zoom-in-soft mx-auto w-full max-w-7xl rounded-xl border border-border bg-card shadow-sm">
            <CardHeader className="animate-slide-in-down">
                <CardTitle>Individual Performance Commitment and Review</CardTitle>
                <CardDescription>
                    {employee
                        ? <>Evaluating: <span className="font-semibold text-foreground">{employee.name}</span> — {employee.job_title}</>
                        : "No employee selected. Open this page from the Document Management table."
                    }
                </CardDescription>
                {submission?.notification && (
                    <p className="mt-2 text-sm text-primary">{submission.notification}</p>
                )}
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="animate-fade-in-up anim-stagger-1 w-full overflow-x-auto rounded-md border border-border">
                    <Table className="min-w-[1200px] [&_td]:border-r [&_td]:border-border [&_td:last-child]:border-r-0 [&_th]:border-r [&_th]:border-border [&_th:last-child]:border-r-0">
                        <TableHeader>
                            <TableRow className="bg-[#2F5E2B] hover:bg-[#2F5E2B] dark:bg-[#1F3F1D] dark:hover:bg-[#1F3F1D] [&_th]:text-white">
                                <TableHead className="w-[20rem] px-4 py-3 text-sm font-bold">Performance Area</TableHead>
                                <TableHead className="w-[28rem] px-4 py-3 text-sm font-bold">Description</TableHead>
                                {ratingScale.map((rate) => (
                                    <TableHead key={rate} className="px-4 py-3 text-center text-sm font-bold">
                                        {rate}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {evaluationCriteria.map((criterion, index) => (
                                <TableRow
                                    key={criterion.name}
                                    style={{ animationDelay: `${index * 30}ms` }}
                                    className={`${index % 2 === 0 ? "bg-[#DDEFD7] dark:bg-[#345A34]/80" : "bg-[#BFDDB5] dark:bg-[#274827]/80"} animate-fade-in-up`}
                                >
                                    <TableCell className="px-4 py-3 font-medium">{criterion.name}</TableCell>
                                    <TableCell className="px-4 py-3">{criterion.description}</TableCell>
                                    {ratingScale.map((rate) => (
                                        <TableCell key={`${criterion.name}-${rate}`} className="px-4 py-3 text-center">
                                            <RadioGroup
                                                value={ratings[criterion.name] ?? ""}
                                                onValueChange={(value) => {
                                                    setRatings((previous) => ({ ...previous, [criterion.name]: value }));
                                                }}
                                                className="flex justify-center"
                                            >
                                                <div className="flex items-center justify-center">
                                                    <RadioGroupItem
                                                        id={`${criterion.name}-${rate}`}
                                                        value={rate}
                                                        aria-label={`${criterion.name} rating ${rate}`}
                                                    />
                                                </div>
                                            </RadioGroup>
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                <div className={showEvaluatorRemarks ? "animate-fade-in-up anim-stagger-2 grid grid-cols-1 gap-4" : "hidden"}>
                    <div className="space-y-2">
                        <Label htmlFor="remarks">Evaluator Remarks</Label>
                        <Textarea
                            id="remarks"
                            value={remarks}
                            onChange={(event) => setRemarks(event.target.value)}
                            placeholder="Enter evaluator remarks"
                            className="min-h-24 resize-none"
                        />
                    </div>
                </div>
                <div className="flex flex-col gap-4 md:flex-row md:justify-between">
                    <div className="animate-fade-in-up rounded-md bg-muted/40 md:max-w-xl">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                            <Label htmlFor="average-score" className="text-sm font-medium">
                                Average Score:
                            </Label>
                            <Input
                                id="average-score"
                                value={averageScore.toFixed(2)}
                                readOnly
                                className="h-9 w-full bg-background font-semibold text-primary sm:w-48"
                            />
                        </div>
                    </div>

                    <div className="animate-fade-in-up anim-stagger-3 flex flex-wrap justify-end gap-3">
                        <Button type="button" variant="destructive" onClick={resetForm} className="w-32">
                            Reset
                        </Button>
                        <Button
                            type="button"
                            variant="default"
                            className="w-40"
                            disabled={!canSubmit}
                            onClick={handleSave}
                        >
                            {processing ? "Saving..." : "Save Evaluation"}
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
