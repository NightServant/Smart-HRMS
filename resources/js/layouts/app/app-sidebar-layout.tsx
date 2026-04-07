import { AppContent } from '@/components/app-content';
import { AppHeader } from '@/components/app-header';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import type { AppLayoutProps } from '@/types';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    return (
        <div className="bg-static-image min-h-svh w-full">
            <img
                src="/images/static-main-background.jpg"
                className="bg-static-image__media"
                alt=""
            />
            <div className="bg-video__overlay" />
            <div className="bg-video__content min-h-svh">
                <AppShell variant="sidebar">
                    <div
                        className="flex min-h-svh w-full flex-col"
                        style={{
                            ['--app-header-height' as string]: '4.5rem',
                            ['--sidebar-offset-top' as string]: '4.5rem',
                        }}
                    >
                        <AppHeader breadcrumbs={breadcrumbs} />
                        <div
                            className="flex min-h-0 flex-1"
                            style={{
                                paddingTop: 'var(--app-header-height)',
                            }}
                        >
                            <AppSidebar />
                            <AppContent
                                variant="sidebar"
                                className="h-auto w-full overflow-x-hidden bg-transparent"
                            >
                                {children}
                            </AppContent>
                        </div>
                    </div>
                </AppShell>
            </div>
        </div>
    );
}
