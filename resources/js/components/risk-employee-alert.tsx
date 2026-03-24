import { ShieldAlert, TriangleAlert } from 'lucide-react';
import { DoughnutChart } from '@/components/ui/doughnut-chart';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function RiskEmployeeAlert() {
    return (
        <div className="animate-fade-in-right flex h-full w-full min-w-0 flex-1 flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md sm:gap-5">
            <div className="flex flex-col gap-3">
                <h1 className="flex items-center gap-2 text-base font-bold sm:text-lg lg:whitespace-nowrap">
                    <ShieldAlert className="size-5 text-primary" />
                    Employee Risk Alert
                </h1>
                <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="border-primary/40 text-primary px-4 py-2">
                        High Risk: 6
                    </Badge>
                    <Badge variant="outline" className="border-muted-foreground/40 text-muted-foreground px-4 py-2">
                        Monitoring: 18
                    </Badge>
                </div>
            </div>

            <div className="mx-auto w-full max-w-[22rem] sm:max-w-none sm:px-4">
                <DoughnutChart />
            </div>
            <Separator className="mt-2" />
            <div className="ml-6 flex items-start gap-2 text-sm text-muted-foreground sm:text-left">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                Snapshot of employees who may need immediate support based on recent performance patterns.
            </div>
        </div>
    );
}
