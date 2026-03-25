import { AppContent } from '@/components/app-content';
import { AppHeader } from '@/components/app-header';
import { AppShell } from '@/components/app-shell';
import type { AppLayoutProps } from '@/types';

export default function AppHeaderLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    return (
        <div className="bg-video min-h-svh w-full">
            <video
                className="bg-video__media"
                autoPlay
                muted
                loop
                playsInline
            >
                <source src="/videos/background_video.mp4" type="video/mp4" />
            </video>
            <div className="bg-video__overlay" />
            <div className="bg-video__content min-h-svh">

                <AppShell>
                    <AppHeader breadcrumbs={breadcrumbs} />
                    <AppContent className="min-h-screen w-full overflow-x-hidden">
                        {children}
                    </AppContent>
                </AppShell>
            </div>
        </div>
    );
}
