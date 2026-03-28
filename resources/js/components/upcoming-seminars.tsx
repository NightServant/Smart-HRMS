import {
    BookOpen,
    CalendarDays,
    Clock3,
    MapPin,
    Mic,
    Target,
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
import { cn } from '@/lib/utils';

type Seminar = {
    id: number;
    title: string;
    description: string;
    location: string;
    time: string;
    speaker: string;
    target_performance_area: string;
    date: string;
};

const dashboardInsetTileClassName =
    'rounded-2xl border border-brand-300 bg-white/75 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none';

export default function UpcomingSeminars({
    seminars,
}: {
    seminars: Seminar[];
}) {
    const upcomingSeminars = seminars;

    return (
        <DashboardPanelCard
            title="Upcoming Seminars and Trainings"
            description="Scheduled learning events you can join in the coming weeks."
            accentClassName="right-8 top-8 size-32 rounded-full bg-brand-300/20 blur-3xl dark:bg-brand-500/10"
            className="gap-3"
            contentClassName="min-h-0 gap-2"
            headerExtras={
                upcomingSeminars.length > 0 ? (
                    <Badge
                        variant="outline"
                        className="border-brand-300/60 bg-brand-100/70 text-brand-900 dark:border-brand-700/60 dark:bg-brand-900/30 dark:text-brand-100"
                    >
                        {upcomingSeminars.length} upcoming
                    </Badge>
                ) : undefined
            }
        >
            <Carousel
                opts={{ align: 'start', loop: upcomingSeminars.length > 1 }}
                className="relative flex min-h-0 w-full flex-1 flex-col [&_[data-slot=carousel-content]]:min-h-0 [&_[data-slot=carousel-content]]:flex-1 [&_[data-slot=carousel-content]>div]:h-full"
            >
                <CarouselContent className="-ml-2 h-full md:-ml-4">
                    {upcomingSeminars.length === 0 && (
                        <CarouselItem className="h-full basis-full">
                            <div className="flex min-h-[12rem] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/70 bg-muted/10 px-6 text-center text-sm text-muted-foreground">
                                <CalendarDays className="size-8 opacity-45" />
                                <div className="space-y-1">
                                    <p className="font-medium text-foreground">
                                        No upcoming events yet
                                    </p>
                                    <p>
                                        Create seminar entries in Training
                                        Scheduling to populate this list.
                                    </p>
                                </div>
                            </div>
                        </CarouselItem>
                    )}

                    {upcomingSeminars.map((seminar) => (
                        <CarouselItem
                            key={seminar.id}
                            className="h-full basis-full xl:basis-1/3"
                        >
                            <div className="flex h-full min-h-[20rem] flex-col rounded-[24px] border border-brand-300 bg-gradient-to-br from-white via-brand-50/65 to-brand-100/45 p-4 shadow-sm backdrop-blur-md transition-shadow hover:shadow-md sm:min-h-[21rem] sm:p-5 dark:border-brand-800/60 dark:from-white/[0.06] dark:via-brand-900/20 dark:to-brand-800/10">
                                <div className="space-y-4">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="min-w-0 space-y-3">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge
                                                    variant="outline"
                                                    className="border-brand-300/60 bg-brand-100/70 text-brand-900 dark:border-brand-700/60 dark:bg-brand-900/30 dark:text-brand-100"
                                                >
                                                    Upcoming Event
                                                </Badge>
                                                <Badge
                                                    variant="outline"
                                                    className="border-brand-300/60 bg-white/80 text-brand-900 dark:border-brand-700/60 dark:bg-brand-900/20 dark:text-brand-100"
                                                >
                                                    Focus:{' '}
                                                    {
                                                        seminar.target_performance_area
                                                    }
                                                </Badge>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-base leading-snug font-semibold break-words">
                                                    {seminar.title}
                                                </p>
                                                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <Clock3 className="size-3.5" />
                                                    {seminar.date} |{' '}
                                                    {seminar.time}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <p className="text-sm leading-6 text-muted-foreground">
                                        {seminar.description}
                                    </p>
                                </div>

                                <div
                                    className={cn(
                                        dashboardInsetTileClassName,
                                        'mt-4 p-3',
                                    )}
                                >
                                    <div className="grid gap-3 text-sm sm:grid-cols-1">
                                        <p className="flex items-start gap-2">
                                            <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                                            <span>
                                                <span className="font-semibold">
                                                    Location:
                                                </span>{' '}
                                                {seminar.location}
                                            </span>
                                        </p>
                                        <p className="flex items-start gap-2">
                                            <Mic className="mt-0.5 size-4 shrink-0 text-primary" />
                                            <span>
                                                <span className="font-semibold">
                                                    Speaker:
                                                </span>{' '}
                                                {seminar.speaker}
                                            </span>
                                        </p>
                                        <p className="flex items-start gap-2">
                                            <Target className="mt-0.5 size-4 shrink-0 text-primary" />
                                            <span>
                                                <span className="font-semibold">
                                                    Target Area:
                                                </span>{' '}
                                                {
                                                    seminar.target_performance_area
                                                }
                                            </span>
                                        </p>
                                        <p className="flex items-start gap-2">
                                            <BookOpen className="mt-0.5 size-4 shrink-0 text-primary" />
                                            <span>
                                                <span className="font-semibold">
                                                    Session Type:
                                                </span>{' '}
                                                Seminar and Training
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
                {upcomingSeminars.length > 1 && (
                    <>
                        <CarouselPrevious className="top-auto right-12 bottom-3 left-auto hidden translate-y-0 border-border/70 bg-background/85 backdrop-blur-sm sm:flex" />
                        <CarouselNext className="top-auto right-0 bottom-3 hidden translate-y-0 border-border/70 bg-background/85 backdrop-blur-sm sm:flex" />
                    </>
                )}
            </Carousel>
        </DashboardPanelCard>
    );
}
