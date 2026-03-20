import { Head, Link} from '@inertiajs/react';
import { ShieldCheck, Sparkles} from 'lucide-react';
import { home } from '@/routes';
import { ModeToggle } from '@/components/ui/mode-toggle';

export default function HomepageHeader() {
    return (
        <>
            <Head title='Smart HRMS'>
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link
                    href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600"
                    rel="stylesheet"
                />
            </Head>
            <header className="overflow-x-hidden">
                <nav className="fixed inset-x-0 top-0 z-50 bg-secondary/80 p-6 backdrop-blur-md dark:bg-background/80">
                    <Link
                        href={home()}
                        className="relative z-10 inline-flex items-center gap-2 text-2xl font-bold text-foreground animate-fade-in-left"
                    >
                        <ShieldCheck className="size-6 text-primary" />
                        SHRMS
                        <span className="inline-flex items-center gap-1 rounded-full border border-primary/35 bg-primary/70 dark:bg-background/70 px-2 py-0.5 text-xs font-semibold text-white dark:text-primary">
                            <Sparkles className="size-3.5" />
                            Smart
                        </span>
                    </Link>
                    <div className="absolute right-6 top-6 z-10 flex items-center justify-end gap-3">
                       <ModeToggle/>
                    </div>
                </nav>
            </header>
        </>
    );
}
