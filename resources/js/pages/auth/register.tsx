import { Head } from '@inertiajs/react';
import TextLink from '@/components/text-link';
import { Spinner } from '@/components/ui/spinner';
import AuthLayout from '@/layouts/auth-layout';
import { login } from '@/routes';

export default function Register() {
    return (
        <AuthLayout
            title="Registration unavailable"
            description="Public account creation has been disabled for this system"
        >
            <Head title="Register" />
            <div className="flex flex-col gap-6 rounded-lg border border-border bg-card/60 p-6 text-sm text-muted-foreground">
                <p>All accounts are now created and managed by system administrators.</p>
                <p>If you need access, please contact the administrator handling Smart HRMS account provisioning.</p>
                <div className="text-center">
                    <TextLink href={login()} tabIndex={1}>
                        Return to login
                    </TextLink>
                </div>
                <div className="sr-only">
                    <Spinner />
                </div>
            </div>
        </AuthLayout>
    );
}
