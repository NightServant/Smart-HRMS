import {
    CalendarDays,
    FileText,
    Quote,
    UserRound,
} from 'lucide-react';
import { DashboardPanelCard } from '@/components/admin-system-dashboard-cards';
import { Badge } from '@/components/ui/badge';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from '@/components/ui/carousel';

type Remark = {
    employeeId: string;
    employeeName: string;
    date: string;
    remark: string;
};

export default function EmployeeRemarks({
    remarks = [],
}: {
    remarks?: Remark[];
}) {
    return (
        <DashboardPanelCard
            title="Employee Remarks"
            description="Evaluator feedback and remarks from recent performance evaluations."
            headerExtras={
                <Badge
                    variant="outline"
                    className="border-primary/40 text-primary tabular-nums"
                >
                    {remarks.length}{' '}
                    {remarks.length === 1 ? 'remark' : 'remarks'}
                </Badge>
            }
            contentClassName="flex flex-1 flex-col"
        >
            {remarks.length === 0 ? (
                <div className="flex min-h-[10rem] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/70 bg-muted/10 text-muted-foreground">
                    <Quote className="size-8 opacity-30" />
                    <p className="text-xs">No evaluator remarks yet.</p>
                </div>
            ) : (
                <Carousel opts={{ align: 'start', loop: remarks.length > 1 }} className="w-full flex-1">
                    <CarouselContent className="-ml-2 md:-ml-4">
                        {remarks.map((remark) => (
                            <CarouselItem
                                key={remark.employeeId}
                                className="basis-full"
                            >
                                <div className="flex h-full flex-col rounded-[24px] border border-brand-300 bg-gradient-to-br from-white via-brand-50/65 to-brand-100/45 p-4 shadow-sm backdrop-blur-md dark:border-brand-800/60 dark:from-white/[0.06] dark:via-brand-900/20 dark:to-brand-800/10">
                                    <div className="flex items-center justify-between">
                                        <p className="flex items-center gap-2 text-sm font-semibold">
                                            <span className="flex size-6 items-center justify-center rounded-full bg-primary/10">
                                                <UserRound className="size-3.5 text-primary" />
                                            </span>
                                            {remark.employeeName || remark.employeeId}
                                        </p>
                                    </div>
                                    <p className="ml-8 mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <CalendarDays className="size-3" />
                                        {remark.date}
                                    </p>
                                    <div className="ml-8 mt-3 rounded-xl border border-brand-300 bg-white/65 px-3 py-2 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.08] dark:shadow-none">
                                        <p className="flex items-start gap-1.5 text-xs leading-relaxed">
                                            <FileText className="mt-0.5 size-3.5 shrink-0 text-primary/60" />
                                            {remark.remark}
                                        </p>
                                    </div>
                                </div>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    {remarks.length > 1 && (
                        <>
                            <CarouselPrevious className="top-auto bottom-0 left-auto right-12 translate-y-0 border-border/70 bg-background/80 backdrop-blur-sm" />
                            <CarouselNext className="top-auto right-0 bottom-0 translate-y-0 border-border/70 bg-background/80 backdrop-blur-sm" />
                        </>
                    )}
                </Carousel>
            )}
        </DashboardPanelCard>
    );
}
