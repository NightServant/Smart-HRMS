import { BookOpen, Clock3, MapPin, Mic, Target } from 'lucide-react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from '@/components/ui/carousel';
import { Separator } from '@/components/ui/separator';

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

function priorityBadge(priority: string) {
    if (priority === 'HIGH') {
        return (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">
                High Priority
            </span>
        );
    }
    return (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            Medium Priority
        </span>
    );
}

export default function TrainingRecommendations({ recommendations }: Props) {
    return (
        <div className="flex w-full min-w-0 animate-fade-in-right flex-col gap-3 overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md sm:gap-4">
            <h1 className="flex min-w-0 items-center gap-2 text-base font-bold sm:text-lg">
                <BookOpen className="size-5 text-primary" />
                Training Recommendations
            </h1>
            <p className="text-sm text-muted-foreground">
                Suggested learning programs based on current performance trends
                and priority skill gaps. Prioritize programs that align with
                your role goals and the most frequent coaching feedback.
            </p>
            <Separator className="mt-2" />
            <div className="mt-2">
                <Carousel className="w-full max-w-none px-0 sm:px-4 lg:px-6">
                    <CarouselContent className="-ml-2 md:-ml-4">
                        {recommendations.length === 0 && (
                            <CarouselItem className="basis-full">
                                <Card className="h-full bg-card">
                                    <CardHeader>
                                        <CardTitle>
                                            No training recommendations yet
                                        </CardTitle>
                                        <CardDescription>
                                            Complete an IPCR evaluation to
                                            receive personalized training
                                            suggestions based on your
                                            performance areas.
                                        </CardDescription>
                                    </CardHeader>
                                </Card>
                            </CarouselItem>
                        )}

                        {recommendations.map((reco) => (
                            <CarouselItem
                                key={reco.seminar_id}
                                className="basis-full 2xl:basis-1/2"
                            >
                                <Card className="group bg-card py-4 shadow-sm transition-shadow hover:shadow-sm">
                                    <CardHeader className="px-4">
                                        <div className="flex flex-wrap items-center gap-2">
                                            {priorityBadge(reco.priority)}
                                        </div>
                                        <CardTitle className="mt-1">
                                            {reco.title}
                                        </CardTitle>
                                        <CardDescription className="flex items-center gap-2">
                                            <Clock3 className="size-4 text-muted-foreground" />
                                            {reco.date} | {reco.time}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-1 px-4 text-sm">
                                        <p>{reco.description}</p>
                                        <p className="flex items-start gap-2">
                                            <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                                            <span className="font-semibold">
                                                Location:
                                            </span>{' '}
                                            {reco.location}
                                        </p>
                                        <p className="flex items-start gap-2">
                                            <Mic className="mt-0.5 size-4 shrink-0 text-primary" />
                                            <span className="font-semibold">
                                                Speaker:
                                            </span>{' '}
                                            {reco.speaker}
                                        </p>
                                        <p className="flex items-start gap-2">
                                            <Target className="mt-0.5 size-4 shrink-0 text-primary" />
                                            <span className="font-semibold">
                                                Target Area:
                                            </span>{' '}
                                            {reco.target_performance_area}
                                        </p>
                                    </CardContent>
                                </Card>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    <CarouselPrevious className="hidden sm:-left-4 sm:flex" />
                    <CarouselNext className="hidden sm:-right-4 sm:flex" />
                </Carousel>
            </div>
        </div>
    );
}
