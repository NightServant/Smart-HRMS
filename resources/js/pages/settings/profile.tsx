import { Form, Head, usePage } from '@inertiajs/react';
import { BriefcaseBusiness, IdCard, LockKeyhole, Mail, PencilOff, ShieldCheck, UserRound, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { edit } from '@/routes/profile';
import type { Auth } from '@/types/auth';
import type { BreadcrumbItem } from '@/types';
import { Separator } from 'radix-ui';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Profile settings',
        href: edit().url,
    },
];

type AccountProfile = {
    name: string;
    email: string;
    role: 'administrator' | 'employee' | 'evaluator' | 'hr-personnel' | 'pmt';
    employeeId: string | null;
};

type EmployeeProfile = {
    employee_id: string;
    name: string;
    job_title: string;
    supervisor_id: string | null;
};

type PageProps = {
    auth: Auth;
    status?: string;
    canEditProfile: boolean;
    accountProfile: AccountProfile;
    employeeProfile: EmployeeProfile | null;
};

function formatRoleLabel(role: AccountProfile['role']): string {
    if (role === 'hr-personnel') {
        return 'HR Personnel';
    }

    if (role === 'pmt') {
        return 'PMT';
    }

    return role.charAt(0).toUpperCase() + role.slice(1);
}

function ReadOnlyField({
    label,
    value,
}: {
    label: string;
    value: string | null | undefined;
}) {
    return (
        <div className="space-y-2">
            <Label className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</Label>
            <div className="rounded-xl border border-border/70 bg-muted/10 px-4 py-3 text-sm font-medium text-foreground">
                {value && value !== '' ? value : 'Not available'}
            </div>
        </div>
    );
}

function SidebarNote({
    icon: Icon,
    children,
}: {
    icon: typeof UserRound;
    children: ReactNode;
}) {
    return (
        <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/10 px-4 py-3 text-sm text-muted-foreground">
            <div className="rounded-full border border-border/60 bg-background/70 p-2 text-foreground">
                <Icon className="size-4" />
            </div>
            <div className="min-w-0">{children}</div>
        </div>
    );
}

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

const handleClick = () => {
    toast.success('Profile updated successfully!');
};

export default function Profile() {
    const { auth, canEditProfile, accountProfile, employeeProfile } = usePage<PageProps>().props;
    const roleLabel = formatRoleLabel(accountProfile.role);
    const shouldShowAccountManagementField = auth.user.role === 'employee' || auth.user.role === 'evaluator' || auth.user.role === 'hr-personnel' || auth.user.role === 'pmt';
    const shouldShowEmployeeProfile = auth.user.role === 'employee' || auth.user.role === 'evaluator';
    const shouldStackSections = canEditProfile || auth.user.role === 'hr-personnel' || auth.user.role === 'employee' || auth.user.role === 'pmt';
    const shouldShowSupervisorId = auth.user.role !== 'evaluator';
    const linkedRecordNameDiffers = employeeProfile?.name && employeeProfile.name !== accountProfile.name;
    const shouldShowLinkedEmployeeIdOutsideEmployeeProfile = canEditProfile;
    const heroSubtitle = shouldShowEmployeeProfile
        ? employeeProfile?.job_title ?? 'Linked employee account'
        : canEditProfile
            ? 'System Administrator'
            : roleLabel;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Profile settings" />

            <h1 className="sr-only">Profile Settings</h1>

            <SettingsLayout contentClassName="max-w-5xl space-y-8">
                <section className="glass-card overflow-hidden rounded-[28px] border border-border/70 bg-card/85 shadow-sm backdrop-blur-md">
                    <div className="relative h-32 bg-gradient-to-r from-brand-200/80 via-complement-sky-200/50 to-brand-100/70 dark:from-brand-900/40 dark:via-complement-sky-900/20 dark:to-brand-800/20">
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.4),transparent_42%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_42%)]" />
                    </div>

                    <div className="relative px-5 pb-6 sm:px-6">
                        <div className="-mt-14 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end">
                                <div className="flex size-24 items-center justify-center rounded-full border-4 border-background bg-gradient-to-br from-brand-200 to-brand-100 text-3xl font-bold text-brand-900 shadow-lg dark:border-card dark:from-brand-800 dark:to-brand-900 dark:text-brand-100">
                                    {accountProfile.name.charAt(0).toUpperCase()}
                                </div>

                                <div className="min-w-0 space-y-2">
                                    <div className="space-y-1">
                                        <h2 className="truncate text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                                            {accountProfile.name}
                                        </h2>
                                        <p className="text-sm font-medium text-muted-foreground md:text-base">
                                            {heroSubtitle}
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant="outline" className="bg-background/80 capitalize">
                                            {roleLabel}
                                        </Badge>
                                        <Badge variant="outline" className="bg-background/80">
                                            {canEditProfile ? 'Editable profile' : 'Read-only profile'}
                                        </Badge>
                                        {shouldShowLinkedEmployeeIdOutsideEmployeeProfile && accountProfile.employeeId && (
                                            <Badge variant="outline" className="bg-background/80">
                                                Employee ID: {accountProfile.employeeId}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid w-full gap-2 text-sm text-muted-foreground sm:grid-cols-2 xl:w-auto xl:min-w-[19rem]">
                                <div className="inline-flex min-w-0 items-center gap-2 rounded-full bg-background/80 px-3 py-2 shadow-sm backdrop-blur-sm">
                                    <Mail className="size-4 text-foreground" />
                                    <span className="truncate">{accountProfile.email}</span>
                                </div>
                                <div className="inline-flex min-w-0 items-center gap-2 rounded-full bg-background/80 px-3 py-2 shadow-sm backdrop-blur-sm">
                                    <ShieldCheck className="size-4 text-foreground" />
                                    <span>{canEditProfile ? 'Self-managed account' : 'Admin-managed account'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {canEditProfile ? (
                    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)]">
                        <SectionCard
                            title="Profile details"
                            description="Maintain the administrator identity shown across Smart HRMS."
                        >
                            <div className="grid gap-4 sm:grid-cols-3">
                                <div className="rounded-2xl border border-border/70 bg-muted/10 p-4">
                                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Role</p>
                                    <p className="mt-2 text-sm font-medium text-foreground">{roleLabel}</p>
                                </div>
                                <div className="rounded-2xl border border-border/70 bg-muted/10 p-4">
                                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Management</p>
                                    <p className="mt-2 text-sm font-medium text-foreground">Self-managed</p>
                                </div>
                                <div className="rounded-2xl border border-border/70 bg-muted/10 p-4">
                                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Employee link</p>
                                    <p className="mt-2 text-sm font-medium text-foreground">{accountProfile.employeeId ?? 'Not linked'}</p>
                                </div>
                            </div>

                            <Form
                                action={ProfileController.update().url}
                                method={ProfileController.update().method}
                                options={{
                                    preserveScroll: true,
                                }}
                                className="mt-6 space-y-6"
                            >
                                {({ processing, errors }) => (
                                    <>
                                        <div className="rounded-[24px] border border-border/70 bg-muted/5 p-5">
                                            <div className="mb-5 space-y-1">
                                                <h3 className="text-base font-semibold text-foreground">Edit public account information</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    Update the core details that identify this administrator account throughout the system.
                                                </p>
                                            </div>

                                            <div className="grid gap-5 md:grid-cols-2">
                                                <div className="space-y-2 md:col-span-2">
                                                    <Label htmlFor="name">Name</Label>
                                                    <Input
                                                        id="name"
                                                        defaultValue={accountProfile.name}
                                                        name="name"
                                                        required
                                                        autoComplete="name"
                                                        placeholder="Full name"
                                                    />
                                                    <InputError className="mt-2" message={errors.name} />
                                                </div>

                                                <div className="space-y-2 md:col-span-2">
                                                    <Label htmlFor="email">Email address</Label>
                                                    <Input
                                                        id="email"
                                                        type="email"
                                                        defaultValue={accountProfile.email}
                                                        name="email"
                                                        required
                                                        autoComplete="username"
                                                        placeholder="Email address"
                                                    />
                                                    <InputError className="mt-2" message={errors.email} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-3 border-t border-border/60 pt-5 sm:flex-row sm:items-center sm:justify-between">
                                            <p className="text-sm text-muted-foreground">
                                                Administrative role access is managed elsewhere and is not changed from this page.
                                            </p>

                                            <Button
                                                type="submit"
                                                disabled={processing}
                                                onClick={handleClick}
                                                data-test="update-profile-button"
                                            >
                                                Save changes
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </Form>
                        </SectionCard>

                        <div className="grid gap-6">
                            <SectionCard
                                title="Security & access"
                                description="Other security settings remain available from their dedicated pages."
                            >
                                <div className="border-t border-b border/60 py-5">
                                    <div className="space-y-3">
                                        <SidebarNote icon={LockKeyhole}>
                                            Use the Password section to change your credentials.
                                        </SidebarNote>
                                        <SidebarNote icon={ShieldCheck}>
                                            Use the Two-Factor Auth section to manage recovery and verification settings.
                                        </SidebarNote>
                                        <SidebarNote icon={PencilOff}>
                                            Role, activation status, and employee linkage remain managed from your account page.
                                        </SidebarNote>
                                        <SidebarNote icon={Users}>
                                            For users with linked employee records, account profile details are synced from the linked employee record for reference.
                                        </SidebarNote>
                                    </div>
                                </div>
                            </SectionCard>
                        </div>
                    </div>
                ) : (
                    <div className={shouldStackSections ? 'grid gap-6' : 'grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]'}>
                        <div className="grid gap-6">
                            <SectionCard
                                title="Account details"
                                description="Core user-account details available for reference."
                            >
                                <div className="grid gap-4 md:grid-cols-2">
                                    <ReadOnlyField label="Email address" value={accountProfile.email} />
                                    {shouldShowAccountManagementField && <ReadOnlyField label="Account management" value="Admin-managed" />}
                                    {shouldShowLinkedEmployeeIdOutsideEmployeeProfile && (
                                        <ReadOnlyField label="Linked employee ID" value={accountProfile.employeeId} />
                                    )}
                                </div>
                            </SectionCard>

                            {shouldShowEmployeeProfile && (
                                <SectionCard
                                    title="Employee profile"
                                    description="Linked employee-record information from the employee table."
                                >
                                    {employeeProfile ? (
                                        <div className="space-y-4">
                                            <div className="grid gap-4 md:grid-cols-2">
                                                <ReadOnlyField label="Employee ID" value={employeeProfile.employee_id} />
                                                <ReadOnlyField label="Job title" value={employeeProfile.job_title} />
                                                {linkedRecordNameDiffers && (
                                                    <ReadOnlyField label="Employee record name" value={employeeProfile.name} />
                                                )}
                                                {shouldShowSupervisorId && (
                                                    <ReadOnlyField label="Supervisor ID" value={employeeProfile.supervisor_id} />
                                                )}
                                            </div>

                                            <div className="rounded-xl border border-dashed border-border/70 bg-muted/5 px-4 py-3 text-sm text-muted-foreground">
                                                Additional personal information can appear here later as more employee fields are added to the system.
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="rounded-xl border border-dashed border-border/70 bg-muted/5 px-4 py-6 text-sm text-muted-foreground">
                                            No linked employee profile is available for this account yet.
                                        </div>
                                    )}
                                </SectionCard>
                            )}
                        </div>

                        <SectionCard
                            title="Access notes"
                            description="What this profile page can and cannot manage for your role."
                        >
                            <div className="space-y-3">
                                <SidebarNote icon={PencilOff}>
                                    Profile fields on this page are intentionally locked for your role.
                                </SidebarNote>
                                <SidebarNote icon={LockKeyhole}>
                                    Password changes remain available from the Password tab.
                                </SidebarNote>
                                <SidebarNote icon={BriefcaseBusiness}>
                                    Account profile changes can be coordinated through the system administrator.
                                </SidebarNote>
                                {shouldShowEmployeeProfile && (
                                    <SidebarNote icon={IdCard}>
                                        Employee profile details are synced from your linked employee record for reference.
                                    </SidebarNote>
                                )}
                            </div>
                        </SectionCard>
                    </div>
                )}
            </SettingsLayout>
        </AppLayout>
    );
}
