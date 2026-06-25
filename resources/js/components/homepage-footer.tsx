import { Copyright, ShieldCheck } from 'lucide-react';

export default function HomepageFooter() {
    return (
        <footer className="homepage-glass-card relative overflow-hidden border-t border-border/40 bg-secondary/80 px-4 py-6 sm:px-6 dark:bg-background/80">
            <div className="mx-auto flex w-full max-w-[1500px] items-center justify-center">
                <p className="relative z-10 inline-flex flex-wrap items-center justify-center gap-2 text-center text-sm text-foreground">
                    <ShieldCheck className="size-4 text-primary" />
                    <Copyright className="size-4 text-primary" />
                    {new Date().getFullYear()} Smart HRMS. All rights reserved.
                </p>
            </div>
        </footer>
    );
}
