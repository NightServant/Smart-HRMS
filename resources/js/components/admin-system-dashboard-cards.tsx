import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type DashboardStatChipItem = {
    color: string;
    label: string;
    value: string | number;
};

export const dashboardGlassCardClassName =
    'glass-card border border-brand-300 bg-gradient-to-br from-white/95 via-white/90 to-brand-100/55 shadow-[0_24px_55px_-28px_rgba(148,163,184,0.45)] backdrop-blur-xl dark:border-border/60 dark:bg-card/85 dark:shadow-sm';

export const dashboardChartSurfaceClassName =
    'relative min-w-0 overflow-hidden rounded-[26px] border border-brand-300 bg-gradient-to-br from-white/95 via-white/90 to-brand-100/50 p-3 shadow-[0_18px_40px_-28px_rgba(31,41,55,0.4)] backdrop-blur-md sm:p-4 dark:border-white/10 dark:from-white/[0.06] dark:via-white/5 dark:to-brand-500/10';

export function DashboardChartSurfaceGlow() {
    return (
        <>
            <div className="pointer-events-none absolute inset-x-10 top-0 h-24 rounded-full bg-brand-200/35 blur-3xl dark:bg-brand-500/10" />
            <div className="pointer-events-none absolute right-0 bottom-0 size-28 rounded-full bg-complement-sky-300/30 blur-3xl dark:bg-complement-sky-500/10" />
        </>
    );
}

export function DashboardStatChipGrid({
    items,
    className,
    itemClassName,
}: {
    items: DashboardStatChipItem[];
    className?: string;
    itemClassName?: string;
}) {
    return (
        <div className={cn('grid gap-2 sm:flex sm:flex-wrap', className)}>
            {items.map((item) => (
                <div
                    key={item.label}
                    className={cn(
                        'inline-flex min-w-0 w-full items-center justify-between gap-3 rounded-full border border-brand-300 bg-white/88 px-4 py-2 text-sm shadow-sm backdrop-blur-md sm:w-auto sm:justify-start dark:border-white/10 dark:bg-white/[0.06]',
                        itemClassName,
                    )}
                >
                    <span
                        className="size-2.5 rounded-full shadow-[0_0_0_4px_rgba(255,255,255,0.45)] dark:shadow-[0_0_0_4px_rgba(255,255,255,0.06)]"
                        style={{ backgroundColor: item.color }}
                    />
                    <span className="min-w-0 truncate font-medium text-foreground">{item.label}</span>
                    <span className="shrink-0 text-muted-foreground">{item.value}</span>
                </div>
            ))}
        </div>
    );
}

export function DashboardChartSurface({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                dashboardChartSurfaceClassName,
                className,
            )}
        >
            <DashboardChartSurfaceGlow />
            <div className="relative">{children}</div>
        </div>
    );
}

export function DashboardMetricCard({
    title,
    description,
    value,
    meta,
    icon: Icon,
    className,
}: {
    title: string;
    description: string;
    value: string | number;
    meta: string;
    icon: LucideIcon;
    className?: string;
}) {
    return (
        <Card className={cn(dashboardGlassCardClassName, 'h-full', className)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </div>
                <Icon className="size-5 text-primary" />
            </CardHeader>
            <CardContent>
                <p className="text-3xl font-bold">{value}</p>
                <p className="mt-2 text-sm text-muted-foreground">{meta}</p>
            </CardContent>
        </Card>
    );
}

export function DashboardPanelCard({
    title,
    description,
    children,
    headerExtras,
    className,
    contentClassName,
    accentClassName,
}: {
    title: string;
    description: string;
    children: ReactNode;
    headerExtras?: ReactNode;
    className?: string;
    contentClassName?: string;
    accentClassName?: string;
}) {
    return (
        <Card className={cn(dashboardGlassCardClassName, 'relative flex h-full min-w-0 flex-col overflow-hidden', className)}>
            {accentClassName && <div className={cn('pointer-events-none absolute', accentClassName)} />}
            <CardHeader className="relative space-y-3 pb-3">
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
                {headerExtras}
            </CardHeader>
            <CardContent className={cn('flex flex-1 flex-col gap-3', contentClassName)}>{children}</CardContent>
        </Card>
    );
}
