import { Form, Head } from '@inertiajs/react';
import { CheckCircle2, KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { useRef } from 'react';
import { toast } from 'sonner';
import PasswordController from '@/actions/App/Http/Controllers/Settings/PasswordController';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { edit } from '@/routes/user-password';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Password settings',
        href: edit().url,
    },
];

function SectionCard({
    title,
    description,
    children,
}: {
    title: string;
    description: string;
    children: ReactNode;
}) {
    return (
        <section className="glass-card rounded-[26px] border border-border/70 bg-card/80 p-5 shadow-sm backdrop-blur-md sm:p-6">
            <div className="space-y-1">
                <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <div className="mt-5">{children}</div>
        </section>
    );
}

function SecurityNote({
    icon: Icon,
    children,
}: {
    icon: typeof ShieldCheck;
    children: ReactNode;
}) {
    return (
        <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-muted/10 px-4 py-3 text-sm text-muted-foreground">
            <div className="rounded-full border border-border/60 bg-background/70 p-2 text-foreground">
                <Icon className="size-4" />
            </div>
            <div className="min-w-0">{children}</div>
        </div>
    );
}

const handleClick = () => {
    toast.success('Password updated successfully!');
};

export default function Password() {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Password settings" />

            <h1 className="sr-only">Password Settings</h1>

            <SettingsLayout contentClassName="max-w-5xl space-y-8">
                <section className="glass-card overflow-hidden rounded-[28px] border border-border/70 bg-card/85 shadow-sm backdrop-blur-md">
                    <div className="relative h-28 bg-gradient-to-r from-brand-200/80 via-brand-100/70 to-complement-sky-200/50 dark:from-brand-900/40 dark:via-brand-800/20 dark:to-complement-sky-900/20">
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.45),transparent_42%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_42%)]" />
                    </div>

                    <div className="relative px-5 pb-6 sm:px-6">
                        <div className="-mt-10 flex flex-col gap-4">
                            <div className="flex size-20 items-center justify-center rounded-3xl border-4 border-background bg-gradient-to-br from-brand-200 to-brand-100 text-brand-900 shadow-lg dark:border-card dark:from-brand-800 dark:to-brand-900 dark:text-brand-100">
                                <LockKeyhole className="size-9" />
                            </div>

                            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                                <div className="space-y-2">
                                    <div className="space-y-1">
                                        <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                                            Update password
                                        </h2>
                                        <p className="max-w-2xl text-sm font-medium text-muted-foreground md:text-base">
                                            Keep your account secure with a strong password that is unique to Smart HRMS.
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant="outline" className="bg-background/80">
                                            Credentials
                                        </Badge>
                                        <Badge variant="outline" className="bg-background/80">
                                            Security settings
                                        </Badge>
                                    </div>
                                </div>

                                <div className="inline-flex items-center gap-2 rounded-full bg-background/80 px-3 py-2 text-sm text-muted-foreground shadow-sm backdrop-blur-sm">
                                    <ShieldCheck className="size-4 text-foreground" />
                                    <span>Available to every signed-in role</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="grid gap-6">
                    <SectionCard
                        title="Change your password"
                        description="Enter your current password first, then choose a new one you do not use elsewhere."
                    >
                        <Form
                            action={PasswordController.update().url}
                            method={PasswordController.update().method}
                            options={{
                                preserveScroll: true,
                            }}
                            resetOnError={[
                                'password',
                                'password_confirmation',
                                'current_password',
                            ]}
                            resetOnSuccess
                            onError={(errors) => {
                                if (errors.password) {
                                    passwordInput.current?.focus();
                                }

                                if (errors.current_password) {
                                    currentPasswordInput.current?.focus();
                                }
                            }}
                            className="space-y-6"
                        >
                            {({ errors, processing }) => (
                                <>
                                    <div className="grid gap-5 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="current_password">Current password</Label>

                                            <Input
                                                id="current_password"
                                                ref={currentPasswordInput}
                                                name="current_password"
                                                type="password"
                                                autoComplete="current-password"
                                                placeholder="Enter your current password"
                                            />

                                            <InputError message={errors.current_password} />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="password">New password</Label>

                                            <Input
                                                id="password"
                                                ref={passwordInput}
                                                name="password"
                                                type="password"
                                                autoComplete="new-password"
                                                placeholder="Create a new password"
                                            />

                                            <InputError message={errors.password} />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="password_confirmation">Confirm password</Label>

                                            <Input
                                                id="password_confirmation"
                                                name="password_confirmation"
                                                type="password"
                                                autoComplete="new-password"
                                                placeholder="Re-enter the new password"
                                            />

                                            <InputError message={errors.password_confirmation} />
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3 border-t border-border/60 pt-5 sm:flex-row sm:items-center sm:justify-between">
                                        <p className="text-sm text-muted-foreground">
                                            Your new password will be used the next time you sign in.
                                        </p>

                                        <Button
                                            type="submit"
                                            onClick={handleClick}
                                            disabled={processing}
                                            data-test="update-password-button"
                                        >
                                            Save password
                                        </Button>
                                    </div>
                                </>
                            )}
                        </Form>
                    </SectionCard>

                    <div className="grid gap-6">
                        <SectionCard
                            title="Password checklist"
                            description="A few quick guidelines help keep your account safer."
                        >
                            <div className="space-y-3">
                                <SecurityNote icon={ShieldCheck}>
                                    Use a password that is long, unique, and not reused on another site or device.
                                </SecurityNote>
                                <SecurityNote icon={KeyRound}>
                                    Consider using a passphrase or password manager so your credentials are easier to remember and harder to guess.
                                </SecurityNote>
                                <SecurityNote icon={CheckCircle2}>
                                    After changing your password, review your Two-Factor Auth tab for stronger account protection.
                                </SecurityNote>
                            </div>
                        </SectionCard>

                        <SectionCard
                            title="What happens next"
                            description="This page only updates your sign-in credentials."
                        >
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="rounded-2xl border border-border/70 bg-muted/10 p-4">
                                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Affects</p>
                                    <p className="mt-2 text-sm font-medium text-foreground">Password for future logins</p>
                                </div>
                                <div className="rounded-2xl border border-border/70 bg-muted/10 p-4">
                                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Does not affect</p>
                                    <p className="mt-2 text-sm font-medium text-foreground">Profile details, role access, or employee data</p>
                                </div>
                            </div>
                        </SectionCard>
                    </div>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
