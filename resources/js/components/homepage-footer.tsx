import { Copyright, ShieldCheck } from 'lucide-react';

export default function HomepageFooter() {
    return (
        <footer className="relative flex h-24 w-full items-center justify-center overflow-hidden bg-secondary/80 dark:bg-background/80 homepage-glass-card">
            <p className="relative z-10 inline-flex items-center gap-2 text-sm text-foreground">
                <ShieldCheck className="size-4 text-primary" />
                <Copyright className="size-4 text-primary" />
                {new Date().getFullYear()} Smart HRMS. All rights reserved.
            </p>
        </footer>
    );
}
