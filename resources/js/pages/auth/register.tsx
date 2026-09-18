import { Form, Head } from '@inertiajs/react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { login } from '@/routes';
import { store } from '@/routes/register';

type Props = {
    passwordRules: string;
};

export default function Register({ passwordRules }: Props) {
    return (
        <>
            <Head title="Register" />

            <div
                className="dark relative flex min-h-screen w-full bg-black text-white"
                style={{ fontFamily: 'Geist, sans-serif' }}
            >
                {/* LOGO DI POJOK KANAN ATAS */}
                <div className="absolute top-8 right-8 z-50">
                    <img
                        src="/Respir logo.png"
                        alt="Respir Logo"
                        className="h-10 w-auto"
                    />
                </div>

                {/* SISI KIRI: Form 35% */}
                <div className="flex w-full flex-col justify-center px-8 sm:px-12 lg:w-[35%]">
                    <div className="mx-auto w-full max-w-sm">
                        <div className="mb-10 flex flex-col items-start">
                            <h1 className="text-3xl font-semibold tracking-tight">
                                Create an account
                            </h1>
                            <p className="mt-2 text-sm text-[#A1A1AA]">
                                Enter your details below to create your account
                            </p>
                        </div>

                        <Form
                            {...store.form()}
                            resetOnSuccess={[
                                'password',
                                'password_confirmation',
                            ]}
                            disableWhileProcessing
                            className="flex flex-col gap-6"
                        >
                            {({ processing, errors }) => (
                                <>
                                    <div className="grid gap-5">
                                        <div className="grid gap-2">
                                            <Label
                                                htmlFor="name"
                                                className="text-gray-300"
                                            >
                                                Name
                                            </Label>
                                            <Input
                                                id="name"
                                                type="text"
                                                required
                                                autoFocus
                                                tabIndex={1}
                                                autoComplete="name"
                                                name="name"
                                                placeholder="Full name"
                                                className="rounded-[6px] border border-white/20 bg-white/5 text-white placeholder:text-gray-600 focus-visible:border-white focus-visible:ring-1 focus-visible:ring-white focus-visible:ring-offset-0"
                                            />
                                            <InputError message={errors.name} />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label
                                                htmlFor="email"
                                                className="text-gray-300"
                                            >
                                                Email address
                                            </Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                required
                                                tabIndex={2}
                                                autoComplete="email"
                                                name="email"
                                                placeholder="email@example.com"
                                                className="rounded-[6px] border border-white/20 bg-white/5 text-white placeholder:text-gray-600 focus-visible:border-white focus-visible:ring-1 focus-visible:ring-white focus-visible:ring-offset-0"
                                            />
                                            <InputError
                                                message={errors.email}
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label
                                                htmlFor="password"
                                                className="text-gray-300"
                                            >
                                                Password
                                            </Label>
                                            <PasswordInput
                                                id="password"
                                                required
                                                tabIndex={3}
                                                autoComplete="new-password"
                                                name="password"
                                                placeholder="••••••••"
                                                passwordrules={passwordRules}
                                                className="rounded-[6px] border border-white/20 bg-white/5 text-white placeholder:text-gray-600 focus-visible:border-white focus-visible:ring-1 focus-visible:ring-white focus-visible:ring-offset-0"
                                            />
                                            <InputError
                                                message={errors.password}
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label
                                                htmlFor="password_confirmation"
                                                className="text-gray-300"
                                            >
                                                Confirm password
                                            </Label>
                                            <PasswordInput
                                                id="password_confirmation"
                                                required
                                                tabIndex={4}
                                                autoComplete="new-password"
                                                name="password_confirmation"
                                                placeholder="••••••••"
                                                passwordrules={passwordRules}
                                                className="rounded-[6px] border border-white/20 bg-white/5 text-white placeholder:text-gray-600 focus-visible:border-white focus-visible:ring-1 focus-visible:ring-white focus-visible:ring-offset-0"
                                            />
                                            <InputError
                                                message={
                                                    errors.password_confirmation
                                                }
                                            />
                                        </div>

                                        <Button
                                            type="submit"
                                            className="mt-4 h-11 w-full rounded-[6px] bg-white font-semibold text-black transition-colors hover:bg-gray-200"
                                            tabIndex={5}
                                            data-test="register-user-button"
                                            disabled={processing}
                                        >
                                            {processing && (
                                                <Spinner className="mr-2" />
                                            )}
                                            Create account
                                        </Button>
                                    </div>

                                    <div className="mt-2 text-center text-sm text-[#A1A1AA]">
                                        Already have an account?{' '}
                                        <TextLink
                                            href={login()}
                                            tabIndex={6}
                                            className="font-medium text-white hover:underline"
                                        >
                                            Log in
                                        </TextLink>
                                    </div>
                                </>
                            )}
                        </Form>
                    </div>
                </div>

                {/* SISI KANAN: Gambar 65% */}
                <div className="relative hidden w-full lg:block lg:w-[65%]">
                    <img
                        src="/images/auth-bg1.png"
                        alt="Background Bacteria"
                        className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-l from-transparent via-black/50 to-black" />
                </div>
            </div>
        </>
    );
}

Register.layout = (page: any) => page;
