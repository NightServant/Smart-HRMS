import { Head, Link } from '@inertiajs/react';
import { ShieldCheck } from 'lucide-react';
import { home } from '@/routes';
import { ModeToggle } from '@/components/ui/mode-toggle';

export default function HomepageHeader() {
    return (
        <>
            <Head title="Smart HRMS" />
            <header className="overflow-x-hidden">
                <nav className="homepage-glass-card fixed inset-x-0 top-0 z-50 border-b border-border/40 px-4 py-4 backdrop-blur-md sm:px-6 dark:bg-background/80">
                    <div className="flex w-full items-center justify-between gap-4">
                        <Link
                            href={home()}
                            className="relative z-10 inline-flex items-center gap-2.5 text-lg font-bold tracking-tight text-foreground sm:text-xl"
                        >
                            <ShieldCheck className="size-5 shrink-0 text-primary" />
                            <span className="whitespace-nowrap leading-tight">
                                Smart HRMS
                            </span>
                        </Link>
                        <div className="relative z-10 flex items-center gap-3">
                            <ModeToggle />
                        </div>
                    </div>
                </nav>
            </header>
        </>
    );
}
