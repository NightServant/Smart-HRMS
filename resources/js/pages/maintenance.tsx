import { Head } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import { Construction, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
    message: string;
};

export default function Maintenance({ message }: Props) {
    const handleLogout = () => {
        router.post('/logout');
    };

    return (
        <>
            <Head title="System Maintenance" />
            <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-brand-50 via-white to-brand-100 dark:from-gray-950 dark:via-gray-900 dark:to-brand-950">
                {/* Decorative background elements */}
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute left-1/4 top-1/4 size-96 rounded-full bg-brand-200/30 blur-3xl dark:bg-brand-800/10" />
                    <div className="absolute bottom-1/4 right-1/4 size-80 rounded-full bg-brand-300/20 blur-3xl dark:bg-brand-700/10" />
                </div>

                <div className="relative z-10 mx-auto max-w-lg px-6 text-center">
                    <div className="glass-card mx-auto rounded-3xl border border-brand-300 bg-gradient-to-br from-white/95 via-white/90 to-brand-100/55 p-10 shadow-[0_24px_55px_-28px_rgba(148,163,184,0.45)] backdrop-blur-xl dark:border-border/60 dark:bg-card/85 dark:shadow-sm">
                        {/* Logo */}
                        <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-2xl border border-brand-200 bg-brand-50 shadow-sm dark:border-brand-800 dark:bg-brand-900/40">
                            <Construction className="size-10 text-brand-600 dark:text-brand-400" />
                        </div>

                        <h1 className="text-2xl font-bold tracking-tight text-foreground">
                            System Maintenance
                        </h1>

                        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                            {message}
                        </p>

                        <div className="mt-8 rounded-2xl border border-brand-300 bg-white/75 p-4 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
                            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                                Status
                            </p>
                            <div className="mt-2 flex items-center justify-center gap-2">
                                <span className="relative flex size-2.5">
                                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-75" />
                                    <span className="relative inline-flex size-2.5 rounded-full bg-amber-500" />
                                </span>
                                <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                                    Under Maintenance
                                </span>
                            </div>
                        </div>

                        <Button
                            variant="outline"
                            onClick={handleLogout}
                            className="mt-6 gap-2"
                        >
                            <LogOut className="size-4" />
                            Sign Out
                        </Button>
                    </div>

                    <p className="mt-6 text-xs text-muted-foreground">
                        Smart HRMS — We&apos;ll be back shortly.
                    </p>
                </div>
            </div>
        </>
    );
}
