import { Head, Link } from '@inertiajs/react';
import { KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AuthLayout from '@/layouts/auth-layout';
import { dashboard } from '@/routes';
import { edit } from '@/routes/user-password';

export default function FirstLoginPasswordPrompt() {
    return (
        <AuthLayout
            title="Change your password"
            description="Your employee account is still using a default password."
        >
            <Head title="Change your password" />

            <div className="space-y-6">
                <div className="rounded-2xl border border-border/70 bg-card/85 px-4 py-4 text-sm text-foreground shadow-sm backdrop-blur-sm dark:border-brand-900/35 dark:bg-white/8 dark:text-brand-50">
                    <div className="flex items-start gap-3">
                        <div className="rounded-full bg-brand-100/90 p-2 text-brand-800 shadow-sm dark:bg-brand-900/55 dark:text-brand-100">
                            <KeyRound className="size-4" />
                        </div>
                        <div className="space-y-1">
                            <p className="font-semibold text-foreground dark:text-brand-50">
                                Password change recommended
                            </p>
                            <p className="text-muted-foreground dark:text-brand-100/80">
                                For better security, change your default password
                                now. You can continue to the dashboard first,
                                but this reminder will appear again until the
                                password is updated.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <Button asChild variant="outline">
                        <Link href={dashboard()}>Not now</Link>
                    </Button>
                    <Button asChild>
                        <Link href={edit().url}>OK</Link>
                    </Button>
                </div>
            </div>
        </AuthLayout>
    );
}
