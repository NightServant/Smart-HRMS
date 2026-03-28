import { BookOpen, Clock3, MapPin, Mic, Sparkles, Target } from 'lucide-react';
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

type Recommendation = {
    seminar_id: number;
    title: string;
    description: string;
    location: string;
    time: string;
    speaker: string;
    target_performance_area: string;
    date: string;
    score: number;
    priority: 'HIGH' | 'MEDIUM';
    matched_area: string;
};

type Props = {
    recommendations: Recommendation[];
    riskLevel?: string;
};

const dashboardInsetTileClassName =
    'rounded-2xl border border-brand-300 bg-white/75 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none';

export default function TrainingRecommendations({ recommendations }: Props) {
    const uniqueFocusAreas = new Set(
        recommendations.map((recommendation) => recommendation.matched_area),
    ).size;
    const strongestMatchScore = recommendations.reduce(
        (highestScore, recommendation) =>
            Math.max(highestScore, recommendation.score),
        0,
    );

    return (
        <DashboardPanelCard
            title="Training Recommendations"
            description="Suggested learning programs based on current performance trends and priority skill gaps."
            accentClassName="right-0 top-0 size-36 rounded-full bg-chart-3/10 blur-3xl"
            className="gap-3"
            contentClassName="min-h-0 gap-2"
        >
            {recommendations.length > 0 && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div
                        className={cn(
                            dashboardInsetTileClassName,
                            'px-3 py-2.5',
                        )}
                    >
                        <div className="flex items-center gap-2">
                            <BookOpen className="size-4 text-primary" />
                            <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
                                Sessions
                            </p>
                        </div>
                        <p className="mt-1 text-lg font-semibold text-foreground">
                            {recommendations.length}
                        </p>
                    </div>
                    <div
                        className={cn(
                            dashboardInsetTileClassName,
                            'px-3 py-2.5',
                        )}
                    >
                        <div className="flex items-center gap-2">
                            <Target className="size-4 text-primary" />
                            <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
                                Focus Areas
                            </p>
                        </div>
                        <p className="mt-1 text-lg font-semibold text-foreground">
                            {uniqueFocusAreas}
                        </p>
                    </div>
                    <div
                        className={cn(
                            dashboardInsetTileClassName,
                            'px-3 py-2.5',
                        )}
                    >
                        <div className="flex items-center gap-2">
                            <Sparkles className="size-4 text-primary" />
                            <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
                                Top Match
                            </p>
                        </div>
                        <p className="mt-1 text-lg font-semibold text-foreground">
                            {strongestMatchScore.toFixed(2)}
                        </p>
                    </div>
                </div>
            )}

            <Carousel
                opts={{ align: 'start', loop: recommendations.length > 1 }}
                className="relative flex min-h-0 w-full flex-1 flex-col [&_[data-slot=carousel-content]]:min-h-0 [&_[data-slot=carousel-content]]:flex-1 [&_[data-slot=carousel-content]>div]:h-full"
            >
                <CarouselContent className="-ml-2 h-full md:-ml-4">
                    {recommendations.length === 0 && (
                        <CarouselItem className="h-full basis-full">
                            <div className="flex min-h-[14rem] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/70 bg-muted/10 px-6 text-center text-sm text-muted-foreground">
                                <BookOpen className="size-8 opacity-45" />
                                <div className="space-y-1">
                                    <p className="font-medium text-foreground">
                                        No recommendations yet
                                    </p>
                                    <p>
                                        Complete an IPCR evaluation to receive
                                        personalized training suggestions based
                                        on your performance areas.
                                    </p>
                                </div>
                            </div>
                        </CarouselItem>
                    )}

                    {recommendations.map((reco) => (
                        <CarouselItem
                            key={reco.seminar_id}
                            className="h-full basis-full"
                        >
                            <div className="flex h-full min-h-0 flex-col rounded-[24px] border border-brand-300 bg-gradient-to-br from-white via-brand-50/65 to-brand-100/45 p-4 shadow-sm backdrop-blur-md transition-shadow hover:shadow-md sm:p-5 dark:border-brand-800/60 dark:from-white/[0.06] dark:via-brand-900/20 dark:to-brand-800/10">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="min-w-0 space-y-3">
                                        <div className="flex flex-wrap items-center gap-2">
                                            {reco.priority === 'HIGH' ? (
                                                <Badge
                                                    variant="outline"
                                                    className="border-red-300/60 bg-red-100/70 text-red-900 dark:border-red-700/60 dark:bg-red-900/30 dark:text-red-100"
                                                >
                                                    High Priority
                                                </Badge>
                                            ) : (
                                                <Badge
                                                    variant="outline"
                                                    className="border-amber-300/60 bg-amber-100/70 text-amber-900 dark:border-amber-700/60 dark:bg-amber-900/30 dark:text-amber-100"
                                                >
                                                    Medium Priority
                                                </Badge>
                                            )}
                                            <Badge
                                                variant="outline"
                                                className="border-brand-300/60 bg-white/80 text-brand-900 dark:border-brand-700/60 dark:bg-brand-900/20 dark:text-brand-100"
                                            >
                                                Focus: {reco.matched_area}
                                            </Badge>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-base leading-snug font-semibold break-words">
                                                {reco.title}
                                            </p>
                                            <p className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <Clock3 className="size-3.5" />
                                                {reco.date} | {reco.time}
                                            </p>
                                        </div>
                                    </div>

                                    <div
                                        className={cn(
                                            dashboardInsetTileClassName,
                                            'w-full px-3 py-2 text-left sm:w-auto sm:min-w-[7rem] sm:text-right',
                                        )}
                                    >
                                        <p className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
                                            Match score
                                        </p>
                                        <p className="text-lg font-semibold text-brand-900 dark:text-brand-100">
                                            {reco.score.toFixed(2)}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-y-auto pr-1">
                                    <p className="text-sm leading-6 text-muted-foreground">
                                        {reco.description}
                                    </p>

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
                                                    {reco.location}
                                                </span>
                                            </p>
                                            <p className="flex items-start gap-2">
                                                <Mic className="mt-0.5 size-4 shrink-0 text-primary" />
                                                <span>
                                                    <span className="font-semibold">
                                                        Speaker:
                                                    </span>{' '}
                                                    {reco.speaker}
                                                </span>
                                            </p>
                                            <p className="flex items-start gap-2">
                                                <Target className="mt-0.5 size-4 shrink-0 text-primary" />
                                                <span>
                                                    <span className="font-semibold">
                                                        Target Area:
                                                    </span>{' '}
                                                    {
                                                        reco.target_performance_area
                                                    }
                                                </span>
                                            </p>
                                            <p className="flex items-start gap-2">
                                                <BookOpen className="mt-0.5 size-4 shrink-0 text-primary" />
                                                <span>
                                                    <span className="font-semibold">
                                                        Recommended For:
                                                    </span>{' '}
                                                    {reco.matched_area}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
                {recommendations.length > 1 && (
                    <>
                        <CarouselPrevious className="top-auto right-12 bottom-3 left-auto hidden translate-y-0 border-border/70 bg-background/85 backdrop-blur-sm sm:flex" />
                        <CarouselNext className="top-auto right-0 bottom-3 hidden translate-y-0 border-border/70 bg-background/85 backdrop-blur-sm sm:flex" />
                    </>
                )}
            </Carousel>
        </DashboardPanelCard>
    );
}
