import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PredictionDisplay, { type PredictionResult } from '@/components/prediction-display';

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

export default function PredictivePerformanceModule({ isOpen, onOpenChange, employee }: PredictivePerformanceModuleProps) {
    const [prediction, setPrediction] = useState<PredictionResult | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen || !employee) {
            setPrediction(null);
            return;
        }

        setLoading(true);
        fetch(`/api/predict?employee_name=${encodeURIComponent(employee.name)}`, {
            headers: { 'Accept': 'application/json' },
        })
            .then((res) => res.json())
            .then((data) => setPrediction(data))
            .catch(() => setPrediction(null))
            .finally(() => setLoading(false));
    }, [isOpen, employee]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="w-full sm:max-w-5xl [&>button]:hidden bg-background text-foreground">
                <DialogHeader>
                    <DialogTitle>Predictive Performance Analysis Module</DialogTitle>
                    <DialogDescription></DialogDescription>
                </DialogHeader>
                <PredictionDisplay prediction={prediction} loading={loading} />
                <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
                    <div className="space-y-1">
                        <p className="text-sm font-semibold">Employee ID: {employee?.employee_id ?? 'N/A'}</p>
                        <p className="text-sm font-semibold">Name: {employee?.name ?? 'N/A'}</p>
                    </div>
                    <div className="space-y-1 sm:text-right">
                        <p className="text-sm font-semibold">Position: {employee?.position ?? 'N/A'}</p>
                        <p className="text-sm font-semibold">Remarks: {employee?.remarks ?? 'No remarks yet.'}</p>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="destructive">Close</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
