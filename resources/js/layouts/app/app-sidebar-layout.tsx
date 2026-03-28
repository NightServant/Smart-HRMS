import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import type { AppLayoutProps } from '@/types';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    return (
        <div className="bg-static-image min-h-svh w-full">
            <img src="/images/static-main-background.jpg" className="bg-static-image__media" alt="" />
            <div className="bg-video__overlay" />
            <div className="bg-video__content min-h-svh">
                <AppShell variant="sidebar">
                    <AppSidebar />
                    <AppContent variant="sidebar" className="h-auto w-full overflow-x-hidden bg-transparent">
                        <AppSidebarHeader breadcrumbs={breadcrumbs}/>
                        {children}
                    </AppContent>
                </AppShell>
            </div>
        </div>
    );
}
