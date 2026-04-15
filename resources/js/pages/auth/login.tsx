import { router, useForm } from '@inertiajs/react';
import { Head } from '@inertiajs/react';
import type { FormEvent} from 'react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import AuthLayout from '@/layouts/auth-layout';
import { encryptRSA } from '@/lib/crypto';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

type Props = {
    status?: string;
    canResetPassword: boolean;
    publicKey: string;
};

export default function Login({ status, canResetPassword, publicKey }: Props) {
    const form = useForm({
        email: '',
        password: '',
        remember: false as boolean,
    });
    const [processing, setProcessing] = useState(false);

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (processing) return;
        setProcessing(true);

        let encryptedPassword: string;
        try {
            encryptedPassword = await encryptRSA(publicKey, form.data.password);
        } catch {
            encryptedPassword = form.data.password;
        }

        router.post(
            store().url,
            { email: form.data.email, password: encryptedPassword, remember: form.data.remember },
            {
                onError: (errors) => form.setError(errors as Record<string, string>),
                onFinish: () => {
                    setProcessing(false);
                    form.setData('password', '');
                },
            },
        );
    }

    const isProcessing = processing || form.processing;

    return (
        <AuthLayout
            title="Log in to your account"
            description="Enter your email and password below to access Smart HRMS"
        >
            <Head title="Log in" />

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="grid gap-6">
                    <div className="grid gap-2">
                        <Label htmlFor="email">Email address</Label>
                        <Input
                            id="email"
                            type="text"
                            name="email"
                            required
                            autoFocus
                            tabIndex={1}
                            autoComplete="off"
                            placeholder="email@example.com"
                            value={form.data.email}
                            onChange={(e) => form.setData('email', e.target.value)}
                        />
                        <InputError message={form.errors.email} />
                    </div>

                    <div className="grid gap-2">
                        <div className="flex items-center">
                            <Label htmlFor="password">Password</Label>
                            {canResetPassword && (
                                <TextLink
                                    href={request()}
                                    className="ml-auto text-sm"
                                    tabIndex={5}
                                >
                                    Forgot password?
                                </TextLink>
                            )}
                        </div>
                        <Input
                            id="password"
                            type="password"
                            name="password"
                            required
                            tabIndex={2}
                            autoComplete="current-password"
                            placeholder="Password"
                            value={form.data.password}
                            onChange={(e) => form.setData('password', e.target.value)}
                        />
                        <InputError message={form.errors.password} />
                    </div>

                    <div className="flex items-center space-x-3">
                        <Checkbox
                            id="remember"
                            name="remember"
                            tabIndex={3}
                            checked={form.data.remember}
                            onCheckedChange={(checked) => form.setData('remember', checked === true)}
                        />
                        <Label htmlFor="remember">Remember me</Label>
                    </div>

                    <Button
                        type="submit"
                        className="mt-4 w-full"
                        tabIndex={4}
                        disabled={isProcessing}
                        data-test="login-button"
                    >
                        {isProcessing && <Spinner />}
                        Log in
                    </Button>
                </div>

                <div className="text-center text-sm text-muted-foreground">
                    Need a new account? Contact an administrator.
                </div>
            </form>

            {status && (
                <div className="mb-4 text-center text-sm font-medium text-green-600">
                    {status}
                </div>
            )}
        </AuthLayout>
    );
}
