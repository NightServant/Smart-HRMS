import { useEffect, useState } from 'react';
import PredictionDisplay, {
    type PredictionResult,
} from '@/components/prediction-display';
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
            <DialogContent className="w-full bg-background text-foreground sm:max-w-5xl [&>button]:hidden">
                <DialogHeader>
                    <DialogTitle>
                        Predictive Performance Analysis Module
                    </DialogTitle>
                    <DialogDescription></DialogDescription>
                </DialogHeader>
                <PredictionDisplay prediction={prediction} loading={loading} />
                <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
                    <div className="space-y-1">
                        <p className="text-sm font-semibold">
                            Employee ID: {employee?.employee_id ?? 'N/A'}
                        </p>
                        <p className="text-sm font-semibold">
                            Name: {employee?.name ?? 'N/A'}
                        </p>
                    </div>
                    <div className="space-y-1 sm:text-right">
                        <p className="text-sm font-semibold">
                            Position: {employee?.position ?? 'N/A'}
                        </p>
                        <p className="text-sm font-semibold">
                            Remarks: {employee?.remarks ?? 'No remarks yet.'}
                        </p>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="destructive">
                            Close
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
