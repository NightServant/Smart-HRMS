import {
    CalendarDays,
    FileText,
    MessageSquareText,
    Quote,
    UserRound,
} from 'lucide-react';
import { dashboardGlassCardClassName } from '@/components/admin-system-dashboard-cards';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from './ui/card';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from './ui/carousel';

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
        <div className={`${dashboardGlassCardClassName} flex h-full w-full min-w-0 flex-1 animate-fade-in-right flex-col gap-3 rounded-xl p-4 transition-shadow hover:shadow-md`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="flex items-center gap-2 text-base font-bold sm:text-lg">
                    <MessageSquareText className="size-5 text-primary" />
                    Employee Remarks
                </h1>
                <Badge
                    variant="outline"
                    className="border-primary/40 text-primary tabular-nums"
                >
                    {remarks.length}{' '}
                    {remarks.length === 1 ? 'remark' : 'remarks'}
                </Badge>
            </div>
            <Separator />
            <div className="relative flex-1">
                {remarks.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
                        <Quote className="size-8 opacity-30" />
                        <p className="text-xs">No evaluator remarks yet.</p>
                    </div>
                ) : (
                    <Carousel className="w-full max-w-none px-0 sm:px-4 lg:px-6">
                        <CarouselContent className="-ml-2 md:-ml-4">
                            {remarks.map((remark) => (
                                <CarouselItem
                                    key={remark.employeeId}
                                    className="basis-full 2xl:basis-full"
                                >
                                    <Card className="h-full w-full min-w-0 border-border bg-muted/30 transition-shadow hover:shadow-sm">
                                        <CardHeader className="p-3 pb-1.5">
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="flex items-center gap-2 text-sm">
                                                    <div className="flex size-6 items-center justify-center rounded-full bg-primary/10">
                                                        <UserRound className="size-3.5 text-primary" />
                                                    </div>
                                                    {remark.employeeName ||
                                                        remark.employeeId}
                                                </CardTitle>
                                            </div>
                                            <CardDescription className="ml-8 flex items-center gap-1.5 text-xs">
                                                <CalendarDays className="size-3 text-muted-foreground" />
                                                {remark.date}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="p-3">
                                            <div className="ml-8 rounded-md border-l-2 border-primary/30 bg-primary/5 px-3 py-2">
                                                <p className="flex items-start text-xs leading-relaxed">
                                                    <FileText className="mt-0.5 size-3.5 shrink-0 text-primary/60" />
                                                    {remark.remark}
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                        <CarouselPrevious className="hidden sm:-left-4 sm:flex" />
                        <CarouselNext className="hidden sm:-right-4 sm:flex" />
                    </Carousel>
                )}
            </div>
        </div>
    );
}
