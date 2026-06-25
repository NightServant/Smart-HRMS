import { Link } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { home } from '@/routes';

export default function AuthCardLayout({
    children,
    title,
    description,
}: PropsWithChildren<{
    name?: string;
    title?: string;
    description?: string;
}>) {
    return (
        <div className="bg-video flex h-screen min-h-svh w-screen">
            <video className="bg-video__media" autoPlay muted loop playsInline>
                <source src="/videos/background-video.mp4" type="video/mp4" />
            </video>
            <div className="bg-video__overlay" />
            <div className="bg-video__content flex h-full w-full flex-col items-center justify-center gap-6 p-6 md:p-10">
                <div className="flex w-full max-w-md flex-col gap-5">
                    <Link
                        href={home()}
                        className="flex items-center gap-2 self-center font-medium"
                    >
                        <div className="flex h-32 w-32 items-center justify-center sm:h-40 sm:w-40">
                            <AppLogoIcon className="size-28 fill-current text-black sm:size-36 dark:text-white" />
                        </div>
                    </Link>

                    <div className="flex flex-col gap-6">
                        <Card className="glass-card bg-card shadow-sm">
                            <CardHeader className="px-6 pt-7 pb-0 text-center sm:px-10 sm:pt-8">
                                <CardTitle className="text-xl sm:text-2xl">
                                    {title}
                                </CardTitle>
                                <CardDescription className="mx-auto max-w-sm text-sm leading-6">
                                    {description}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="px-6 py-7 sm:px-10 sm:py-8">
                                {children}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
