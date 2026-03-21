import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LineChart } from '@/components/ui/line-chart';

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
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="w-full sm:max-w-5xl [&>button]:hidden bg-secondary text-foreground">
                <DialogHeader>
                    <DialogTitle>Predictive Performance Analysis Module</DialogTitle>
                    <DialogDescription></DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <Card className="h-full w-full min-w-0 bg-card/80 transition-shadow duration-300 duration-600 hover:scale-105 hover:shadow-lg">
                        <CardHeader>
                            <CardTitle>Historical Evaluation</CardTitle>
                        </CardHeader>
                        <CardContent className="min-w-0">
                            <div className="mx-auto my-auto w-full min-w-0">
                                <LineChart />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="h-full w-full min-w-0 bg-card/80 transition-shadow duration-300 duration-600 hover:scale-105 hover:shadow-lg">
                        <CardHeader>
                            <CardTitle>Predicted Evaluation</CardTitle>
                        </CardHeader>
                        <CardContent className="min-w-0">
                            <div className="mx-auto my-auto w-full min-w-0">
                                <LineChart />
                            </div>
                        </CardContent>
                    </Card>
                </div>
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
