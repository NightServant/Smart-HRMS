import { Clock } from 'lucide-react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useCurrentTime } from '@/hooks/use-current-time';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';
import { ModeToggle } from './ui/mode-toggle';

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const currentTime = useCurrentTime();

    return (
        <header className="homepage-glass-card sticky top-0 z-20 flex min-h-16 w-full shrink-0 items-center justify-between gap-3 border-b border-sidebar-border/60 px-4 py-3 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:min-h-14 md:px-6">
            <div className="flex min-w-0 items-center gap-2">
                <SidebarTrigger className="-ml-1 rounded-full border border-border/50 bg-white/20 p-1.5 hover:bg-white/30 dark:bg-white/5 dark:hover:bg-white/10" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
                <Badge
                    variant="outline"
                    className="hidden rounded-full border-border/60 bg-primary/95 px-3 py-2 text-primary-foreground shadow-sm sm:inline-flex"
                >
                    <Clock className="mr-1 size-4" />
                    {currentTime}
                </Badge>
                <ModeToggle />
            </div>
        </header>
    );
}
