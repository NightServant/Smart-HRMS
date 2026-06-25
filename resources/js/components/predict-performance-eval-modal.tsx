import { useEffect, useState } from 'react';
import PredictionDisplay, {
    type PredictionResult,
} from '@/components/prediction-display';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

type EmployeeSummary = {
    id: number;
    name: string;
    employee_id: string;
    position: string;
    performance_rating?: string | null;
    remarks?: string | null;
    notification?: string | null;
};

type PredictivePerformanceModuleProps = {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    employee: EmployeeSummary | null;
};

function buildErrorPrediction(
    employeeName: string,
    notification: string,
): PredictionResult {
    return {
        status: 'error',
        employee_name: employeeName,
        historical: {
            labels: [],
            scores: [],
            yearly_labels: [],
            yearly_scores: [],
        },
        forecast: { labels: [], scores: [] },
        trend: 'STABLE',
        recent_avg: 0,
        forecast_avg: 0,
        coefficients: {},
        notification,
    };
}

export default function PredictivePerformanceModule({
    isOpen,
    onOpenChange,
    employee,
}: PredictivePerformanceModuleProps) {
    const [prediction, setPrediction] = useState<PredictionResult | null>(null);

    useEffect(() => {
        if (!isOpen || !employee) {
            return;
        }

        let isCancelled = false;
        const employeeName = employee.name;

        fetch(
            `/api/predict?employee_name=${encodeURIComponent(employeeName)}`,
            {
                headers: { Accept: 'application/json' },
            },
        )
            .then(async (res) => {
                const data = await res.json();

                if (!res.ok) {
                    return buildErrorPrediction(
                        employeeName,
                        data?.message ??
                            data?.notification ??
                            'Unable to load prediction data.',
                    );
                }

                return data as PredictionResult;
            })
            .then((data) => {
                if (!isCancelled) {
                    setPrediction(data);
                }
            })
            .catch(() => {
                if (!isCancelled) {
                    setPrediction(
                        buildErrorPrediction(
                            employeeName,
                            'Unable to load prediction data.',
                        ),
                    );
                }
            });

        return () => {
            isCancelled = true;
        };
    }, [isOpen, employee]);

    const loading = Boolean(
        isOpen && employee && prediction?.employee_name !== employee.name,
    );

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="grid h-[min(94svh,980px)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden border-border/70 bg-background p-0 text-foreground sm:h-[min(94svh,980px)] sm:w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-2rem)] xl:w-[1440px] xl:max-w-[1440px] 2xl:w-[1520px] 2xl:max-w-[1520px]">
                <DialogHeader className="gap-4 border-b border-border/70 px-5 py-4 sm:px-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2 text-left">
                                <DialogTitle>
                                    Predictive Performance Evaluation
                                </DialogTitle>
                                <Badge variant="outline">Employee Review</Badge>
                            </div>
                            <DialogDescription className="max-w-3xl text-left">
                                Review projected vs actual performance, IPCR
                                targets, finalized evaluations, and attendance
                                signals in one focused workspace.
                            </DialogDescription>
                        </div>

                        <div className="grid min-w-0 gap-3 rounded-xl border border-border/70 bg-muted/20 p-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                            <div className="space-y-1">
                                <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                                    Employee ID
                                </p>
                                <p className="font-semibold text-foreground">
                                    {employee?.employee_id ?? 'N/A'}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                                    Position
                                </p>
                                <p className="font-semibold text-foreground">
                                    {employee?.position ?? 'N/A'}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                                    Employee Name
                                </p>
                                <p className="font-semibold text-foreground">
                                    {employee?.name ?? 'N/A'}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                                    Remarks
                                </p>
                                <p className="line-clamp-2 min-h-10 font-semibold text-foreground">
                                    {employee?.remarks ?? 'No remarks yet.'}
                                </p>
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                <div className="min-h-0 overflow-y-auto px-5 py-4 sm:px-6">
                    <PredictionDisplay
                        prediction={prediction}
                        loading={loading}
                    />
                </div>

                <DialogFooter className="border-t border-border/70 px-5 py-4 sm:px-6">
                    <DialogClose asChild>
                        <Button type="button" variant="outline">
                            Close
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
