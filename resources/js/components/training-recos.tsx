import { BookOpen, FileCheck2, Sparkles, Target } from 'lucide-react';
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

export type Recommendation = {
    seminar_id: number;
    title: string;
    description: string;
    target_performance_area: string;
    rating_tier: string;
    score: number;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    matched_area: string;
};

type Props = {
    recommendations: Recommendation[];
    riskLevel?: string;
};

const insetTile =
    'rounded-2xl border border-brand-300 bg-white/75 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none';

function RatingTierBadge({ tier }: { tier: string }) {
    if (tier === '1-2') {
        return (
            <Badge
                variant="outline"
                className="border-red-300/60 bg-red-100/70 text-red-900 dark:border-red-700/60 dark:bg-red-900/30 dark:text-red-100"
            >
                Rating 1–2 · Remedial
            </Badge>
        );
    }
    if (tier === '3-4') {
        return (
            <Badge
                variant="outline"
                className="border-amber-300/60 bg-amber-100/70 text-amber-900 dark:border-amber-700/60 dark:bg-amber-900/30 dark:text-amber-100"
            >
                Rating 3–4 · Proficiency
            </Badge>
        );
    }
    if (tier === '5') {
        return (
            <Badge
                variant="outline"
                className="border-emerald-300/60 bg-emerald-100/70 text-emerald-900 dark:border-emerald-700/60 dark:bg-emerald-900/30 dark:text-emerald-100"
            >
                Rating 5 · Mastery
            </Badge>
        );
    }
    return null;
}

function PriorityBadge({ priority }: { priority: 'HIGH' | 'MEDIUM' | 'LOW' }) {
    if (priority === 'HIGH') {
        return (
            <Badge
                variant="outline"
                className="border-red-300/60 bg-red-50/80 text-red-800 dark:border-red-700/60 dark:bg-red-950/40 dark:text-red-200"
            >
                Immediate
            </Badge>
        );
    }
    if (priority === 'MEDIUM') {
        return (
            <Badge
                variant="outline"
                className="border-amber-300/60 bg-amber-50/80 text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200"
            >
                For Improvement
            </Badge>
        );
    }
    return (
        <Badge
            variant="outline"
            className="border-emerald-300/60 bg-emerald-50/80 text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-950/40 dark:text-emerald-200"
        >
            Maintenance
        </Badge>
    );
}

export default function TrainingRecommendations({
    recommendations,
    riskLevel,
}: Props) {
    const uniqueFocusAreas = new Set(
        recommendations.map((r) => r.matched_area),
    ).size;

    const immediateCount = recommendations.filter(
        (r) => r.priority === 'HIGH',
    ).length;

    return (
        <DashboardPanelCard
            title="Training Recommendations"
            description="Suggested learning programs based on your IPCR Administrative Office performance ratings."
            accentClassName="right-0 top-0 size-36 rounded-full bg-chart-3/10 blur-3xl"
            className="gap-3"
            contentClassName="min-h-0 gap-2"
        >
            {recommendations.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                    <div className={cn(insetTile, 'px-3 py-2.5')}>
                        <div className="flex items-center gap-2">
                            <BookOpen className="size-4 text-primary" />
                            <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
                                Suggested
                            </p>
                        </div>
                        <p className="mt-1 text-lg font-semibold text-foreground">
                            {recommendations.length}
                        </p>
                    </div>
                    <div className={cn(insetTile, 'px-3 py-2.5')}>
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
                    <div className={cn(insetTile, 'px-3 py-2.5')}>
                        <div className="flex items-center gap-2">
                            <Sparkles className="size-4 text-red-500" />
                            <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
                                Immediate
                            </p>
                        </div>
                        <p className="mt-1 text-lg font-semibold text-foreground">
                            {immediateCount}
                        </p>
                    </div>
                </div>
            )}

            <Carousel
                opts={{ align: 'start', loop: recommendations.length > 1 }}
                className="relative flex min-h-0 w-full flex-1 flex-col [&_[data-slot=carousel-content]]:min-h-0 [&_[data-slot=carousel-content]]:flex-1 [&_[data-slot=carousel-content]>div]:h-full"
            >
                <CarouselContent className="-ml-2 h-full md:-ml-4">
                    {/* Empty state */}
                    {recommendations.length === 0 && (
                        <CarouselItem className="h-full basis-full">
                            <div className="flex min-h-[14rem] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/70 bg-muted/10 px-6 text-center text-sm text-muted-foreground">
                                <BookOpen className="size-8 opacity-45" />
                                <div className="space-y-1">
                                    <p className="font-medium text-foreground">
                                        No recommendations yet
                                    </p>
                                    <p>
                                        Complete your IPCR target and evaluation
                                        submission to receive personalized
                                        training suggestions matched to your
                                        performance ratings.
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
                            <div className="flex h-full min-h-0 flex-col gap-3 rounded-[24px] border border-brand-300 bg-gradient-to-br from-white via-brand-50/65 to-brand-100/45 p-4 shadow-sm backdrop-blur-md transition-shadow hover:shadow-md sm:p-5 dark:border-brand-800/60 dark:from-white/[0.06] dark:via-brand-900/20 dark:to-brand-800/10">

                                {/* Badges row */}
                                <div className="flex flex-wrap items-center gap-2">
                                    <PriorityBadge priority={reco.priority} />
                                    <RatingTierBadge tier={reco.rating_tier} />
                                    <Badge
                                        variant="outline"
                                        className="border-brand-300/60 bg-white/80 text-brand-900 dark:border-brand-700/60 dark:bg-brand-900/20 dark:text-brand-100"
                                    >
                                        {reco.matched_area}
                                    </Badge>
                                </div>

                                {/* Training title */}
                                <div className="space-y-1">
                                    <p className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                        Recommended Training
                                    </p>
                                    <p className="text-base font-bold leading-snug text-foreground">
                                        {reco.title || reco.target_performance_area}
                                    </p>
                                </div>

                                {/* Criterion */}
                                <div className="rounded-xl border border-brand-200/60 bg-brand-50/50 px-4 py-3 dark:border-brand-800/40 dark:bg-brand-900/20">
                                    <p className="mb-1 text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                                        IPCR Criterion
                                    </p>
                                    <p className="flex items-start gap-2 text-sm leading-snug text-brand-900 dark:text-brand-100">
                                        <FileCheck2 className="mt-0.5 size-4 shrink-0 text-primary" />
                                        {reco.target_performance_area}
                                    </p>
                                </div>

                                {/* Description */}
                                <p className="text-sm leading-6 text-muted-foreground">
                                    {reco.description}
                                </p>
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
