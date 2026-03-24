import { Head, Link} from '@inertiajs/react';
import { ShieldCheck } from 'lucide-react';
import { home } from '@/routes';
import { ModeToggle } from '@/components/ui/mode-toggle';

export default function HomepageHeader() {
    return (
        <>
            <Head title='Smart HRMS' />
            <header className="overflow-x-hidden">
                <nav className="fixed inset-x-0 top-0 z-50 flex items-center justify-between bg-secondary/80 px-6 py-4 backdrop-blur-md dark:bg-background/80">
                    <Link
                        href={home()}
                        className="relative z-10 inline-flex items-center gap-2.5 text-xl font-bold tracking-tight text-foreground"
                    >
                        <ShieldCheck className="size-5 text-primary" />
                        Smart HRMS
                    </Link>
                    <div className="relative z-10 flex items-center gap-3">
                       <ModeToggle/>
                    </div>
                </nav>
            </header>
        </>
    );
}
