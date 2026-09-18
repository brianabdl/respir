import { Form, Head } from '@inertiajs/react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { register } from '@/routes';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

type Props = {
    status?: string;
    canResetPassword: boolean;
};

export default function Login({ status, canResetPassword }: Props) {
    return (
        <>
            <Head title="Log in" />

            <div 
                className="dark relative flex min-h-screen w-full bg-black text-white" 
                style={{ fontFamily: 'Geist, sans-serif' }}
            >
                {/* LOGO DI POJOK KIRI ATAS */}
                <div className="absolute left-8 top-8 z-50">
                    <img src="/Respir logo.png" alt="Respir Logo" className="h-10 w-auto" />
                </div>

                {/* SISI KIRI: Gambar 65% */}
                <div className="relative hidden w-full lg:block lg:w-[65%]">
                    <img 
                        src="/images/auth-bg.png" 
                        alt="Background Lungs" 
                        className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/50 to-black" />
                </div>

                {/* SISI KANAN: Form 35% */}
                <div className="flex w-full flex-col justify-center px-8 sm:px-12 lg:w-[35%]">
                    <div className="mx-auto w-full max-w-sm">
                        <div className="mb-10 flex flex-col items-start">
                            <h1 className="text-3xl font-semibold tracking-tight">Log in to your account</h1>
                            <p className="mt-2 text-sm text-[#A1A1AA]">
                                Enter your email and password below to log in
                            </p>
                        </div>

                        {status && (
                            <div className="mb-6 text-sm font-medium text-green-500">
                                {status}
                            </div>
                        )}

                        <Form
                            {...store.form()}
                            resetOnSuccess={['password']}
                            className="flex flex-col gap-6"
                        >
                            {({ processing, errors }) => (
                                <>
                                    <div className="grid gap-6">
                                        <div className="grid gap-2">
                                            <Label htmlFor="email" className="text-gray-300">Email address</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                name="email"
                                                required
                                                autoFocus
                                                tabIndex={1}
                                                autoComplete="email"
                                                placeholder="email@example.com"
                                                className="rounded-[6px] border border-white/20 bg-white/5 text-white placeholder:text-gray-600 focus-visible:border-white focus-visible:ring-1 focus-visible:ring-white focus-visible:ring-offset-0"
                                            />
                                            <InputError message={errors.email} />
                                        </div>

                                        <div className="grid gap-2">
                                            <div className="flex items-center">
                                                <Label htmlFor="password" className="text-gray-300">Password</Label>
                                                {canResetPassword && (
                                                    <TextLink
                                                        href={request()}
                                                        className="ml-auto text-sm text-gray-400 hover:text-white"
                                                        tabIndex={5}
                                                    >
                                                        Forgot password?
                                                    </TextLink>
                                                )}
                                            </div>
                                            <PasswordInput
                                                id="password"
                                                name="password"
                                                required
                                                tabIndex={2}
                                                autoComplete="current-password"
                                                placeholder="••••••••"
                                                className="rounded-[6px] border border-white/20 bg-white/5 text-white placeholder:text-gray-600 focus-visible:border-white focus-visible:ring-1 focus-visible:ring-white focus-visible:ring-offset-0"
                                            />
                                            <InputError message={errors.password} />
                                        </div>

                                        <div className="flex items-center space-x-3">
                                            <Checkbox
                                                id="remember"
                                                name="remember"
                                                tabIndex={3}
                                                className="rounded-[6px] border-white/20 bg-white/5 data-[state=checked]:bg-white data-[state=checked]:text-black focus-visible:ring-1 focus-visible:ring-white focus-visible:ring-offset-0"
                                            />
                                            <Label htmlFor="remember" className="text-gray-300">Remember me</Label>
                                        </div>

                                        <Button
                                            type="submit"
                                            className="mt-4 w-full h-11 rounded-[6px] bg-white font-semibold text-black transition-colors hover:bg-gray-200"
                                            tabIndex={4}
                                            disabled={processing}
                                            data-test="login-button"
                                        >
                                            {processing && <Spinner className="mr-2" />}
                                            Log in
                                        </Button>
                                    </div>

                                    <div className="mt-2 text-center text-sm text-[#A1A1AA]">
                                        Don't have an account?{' '}
                                        <TextLink href={register()} tabIndex={5} className="font-medium text-white hover:underline">
                                            Sign up
                                        </TextLink>
                                    </div>
                                </>
                            )}
                        </Form>
                    </div>
                </div>
            </div>
        </>
    );
}
Login.layout = (page: any) => page;