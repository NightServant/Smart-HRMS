import { Link, usePage } from '@inertiajs/react';
import { Clock } from 'lucide-react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { UserMenuContent } from '@/components/user-menu-content';
import { useCurrentTime } from '@/hooks/use-current-time';
import { useInitials } from '@/hooks/use-initials';
import { dashboard, performanceDashboard } from '@/routes';
import * as admin from '@/routes/admin';
import type { BreadcrumbItem } from '@/types';
import AppLogo from './app-logo';
import { ModeToggle } from './ui/mode-toggle';

type Props = {
    breadcrumbs?: BreadcrumbItem[];
};

export function AppHeader({ breadcrumbs = [] }: Props) {
    const page = usePage();
    const { auth } = page.props;
    const getInitials = useInitials();
    const currentTime = useCurrentTime();
    const homeLink =
        auth.user.role === 'administrator'
            ? admin.systemDashboard()
            : auth.user.role === 'hr-personnel'
              ? admin.performanceDashboard()
              : auth.user.role === 'pmt'
                ? admin.pmtReview()
                : auth.user.role === 'evaluator'
                  ? performanceDashboard()
                  : dashboard();

    return (
        <div className="fixed inset-x-0 top-0 z-50">
            <div className="app-chrome-card border-b border-sidebar-border/70">
                <div className="flex h-18 w-full items-center gap-3 px-4 sm:px-6 md:px-8">
                    <div className="flex flex-1 items-center gap-3">
                        <SidebarTrigger className="rounded-full border border-primary/35 bg-primary/15 p-1.5 text-primary-foreground/90 hover:bg-primary/25 md:hidden dark:bg-white/5 dark:hover:bg-white/10" />
                        <Link
                            href={homeLink}
                            prefetch
                            className="flex items-center gap-3"
                        >
                            <AppLogo />
                        </Link>
                    </div>

                    <div className="ml-auto flex items-center gap-2 sm:gap-3">
                        <Badge
                            variant="outline"
                            className="hidden rounded-full border-border/60 bg-primary/95 px-3 py-2 text-primary-foreground shadow-sm lg:inline-flex"
                        >
                            <Clock className="mr-1 size-4" />
                            {currentTime}
                        </Badge>
                        <ModeToggle className="border border-primary/35 bg-primary/15 hover:bg-primary/25 dark:bg-white/5 dark:hover:bg-white/10" />
                    </div>
                </div>
            </div>
            {breadcrumbs.length > 1 && (
                <div className="app-chrome-card border-b border-sidebar-border/60">
                    <div className="flex h-12 w-full items-center justify-start px-4 text-neutral-600 sm:px-6 md:px-8 dark:text-neutral-300">
                        <Breadcrumbs breadcrumbs={breadcrumbs} />
                    </div>
                </div>
            )}
        </div>
    );
}
