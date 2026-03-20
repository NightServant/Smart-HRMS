import { CalendarDays, FileText, MessageSquareText, UserRound } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from './ui/carousel';

type Remark = {
    employeeId: string;
    employeeName: string;
    date: string;
    remark: string;
};

const fallbackRemarks: Remark[] = [
    {
        employeeId: 'Employee-001',
        employeeName: 'Employee-001',
        date: 'January 16, 2026',
        remark: 'Bad performance in communication skills and teamwork. Needs to improve communication and teamwork skills.',
    },
    {
        employeeId: 'Employee-002',
        employeeName: 'Employee-002',
        date: 'January 19, 2026',
        remark: 'Always getting behind in tasks and projects. Needs to work harder to catch up.',
    },
    {
        employeeId: 'Employee-003',
        employeeName: 'Employee-003',
        date: 'January 22, 2026',
        remark: 'Displaying unprofessional behavior and lack of respect for colleagues.',
    },
    {
        employeeId: 'Employee-004',
        employeeName: 'Employee-004',
        date: 'January 25, 2026',
        remark: 'Always in sick leave. Missing work due to illness.',
    },
];

export default function EmployeeRemarks({ remarks: propRemarks }: { remarks?: Remark[] }) {
    const remarks = propRemarks && propRemarks.length > 0 ? propRemarks : fallbackRemarks;
    return (
        <div className="animate-fade-in-right flex w-full min-w-0 flex-1 flex-col gap-4 rounded-xl border border-border bg-card/80 p-4 shadow-xl transition-shadow duration-300 hover:shadow-2xl sm:gap-5">
            <h1 className="flex items-center gap-2 text-base font-bold sm:text-lg">
                <MessageSquareText className="size-5 text-primary" />
                Employee Remarks
            </h1>
            <p className="text-sm text-muted-foreground">
                Recent evaluator comments that highlight behavior, output quality, and follow-up coaching needs.
            </p>
            <div className="relative">
                <Carousel className="w-full max-w-none px-2 sm:px-4 lg:px-6">
                    <CarouselContent className="-ml-2 md:-ml-4">
                        {remarks.map((remark) => (
                            <CarouselItem key={remark.employeeId} className="basis-full">
                                <Card className="h-full w-full min-w-0 bg-card/80 transition-shadow duration-300 hover:shadow-lg">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <UserRound className="size-4 text-primary" />
                                            {remark.employeeName || remark.employeeId}
                                        </CardTitle>
                                        <CardDescription className="flex items-center gap-2">
                                            <CalendarDays className="size-4 text-muted-foreground" />
                                            {remark.date}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="flex items-start gap-2">
                                            <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                                            {remark.remark}
                                        </p>
                                    </CardContent>
                                </Card>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    <CarouselPrevious className="left-0 sm:-left-4" />
                    <CarouselNext className="right-0 sm:-right-4" />
                </Carousel>
            </div>
            <p className="text-sm text-muted-foreground">
                Use these notes to guide one-on-one coaching plans and next-cycle development targets.
            </p>
        </div>
    );
}
