import { BarChart3, CalendarRange, ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    QuarterBarChart,
    type Quarter,
} from '@/components/ui/quarter-bar-chart';
import { Separator } from '@/components/ui/separator';

export default function QuarterPerformanceTrends() {
    const [selectedQuarter, setSelectedQuarter] = useState<Quarter>('Q1');

    const selectedQuarterLabel = useMemo((): string => {
        const labels: Record<Quarter, string> = {
            Q1: '1st Quarter',
            Q2: '2nd Quarter',
            Q3: '3rd Quarter',
            Q4: '4th Quarter',
        };

        return labels[selectedQuarter];
    }, [selectedQuarter]);

    return (
        <div className="flex h-full w-full min-w-0 animate-fade-in-left flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md sm:gap-5">
            <div className="flex flex-col gap-3">
                <h1 className="flex min-w-0 items-center gap-2 text-base font-bold sm:text-lg lg:whitespace-nowrap">
                    <BarChart3 className="size-5 text-primary" />
                    Quarterly Performance Trends
                </h1>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-nowrap sm:items-center">
                    <label className="flex items-center gap-1 text-sm text-muted-foreground sm:whitespace-nowrap">
                        <CalendarRange className="size-4 text-primary" />
                        Select Quarter:
                    </label>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                className="w-full justify-between sm:w-40 sm:min-w-[10rem]"
                            >
                                {selectedQuarterLabel}
                                <ChevronDown className="size-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align="end"
                            className="max-h-56 overflow-y-auto"
                        >
                            <DropdownMenuItem
                                onClick={() => setSelectedQuarter('Q1')}
                            >
                                1st Quarter
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => setSelectedQuarter('Q2')}
                            >
                                2nd Quarter
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => setSelectedQuarter('Q3')}
                            >
                                3rd Quarter
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => setSelectedQuarter('Q4')}
                            >
                                4th Quarter
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="mx-auto w-full max-w-full px-1 sm:max-w-none sm:px-4">
                <QuarterBarChart quarter={selectedQuarter} />
            </div>
            <Separator className="mt-2" />
            <p className="text-sm text-muted-foreground sm:ml-6">
                Performance scores for the selected quarter, showing strengths
                and areas that may need coaching.
            </p>
        </div>
    );
}
