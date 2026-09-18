import { Form, Head } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { login } from '@/routes';
import { email } from '@/routes/password';

export default function ForgotPassword({ status }: { status?: string }) {
    return (
        <>
            <Head title="Forgot password" />

            {/* Latar Belakang Hitam Penuh dengan Flex Center */}
            <div
                className="dark flex min-h-screen w-full items-center justify-center bg-black p-4 text-white"
                style={{ fontFamily: 'Geist, sans-serif' }}
            >
                {/* Floating Card dengan warna Dark Gray */}
                <div className="w-full max-w-md rounded-[6px] border border-white/10 bg-[#0B0B0D] p-8 shadow-[0_20px_40px_-24px_rgba(0,0,0,0.9)]">
                    {/* Header Card: Logo Besar & Teks di Tengah */}
                    <div className="mb-8 flex flex-col items-center text-center">
                        <img
                            src="/Respir logo.png"
                            alt="Respir Logo"
                            className="mb-12 h-15 w-auto"
                        />
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Forgot password
                        </h1>
                        <p className="mt-2 text-sm text-[#A1A1AA]">
                            Enter your email to receive a password reset link
                        </p>
                    </div>

                    {status && (
                        <div className="mb-6 text-center text-sm font-medium text-green-500">
                            {status}
                        </div>
                    )}

                    <div className="space-y-6">
                        <Form {...email.form()}>
                            {({ processing, errors }) => (
                                <>
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
                                            name="email"
                                            autoComplete="off"
                                            autoFocus
                                            placeholder="email@example.com"
                                            className="rounded-[6px] border border-white/20 bg-white/5 text-white placeholder:text-gray-600 focus-visible:border-white focus-visible:ring-1 focus-visible:ring-white focus-visible:ring-offset-0"
                                        />
                                        <InputError message={errors.email} />
                                    </div>

                                    <div className="mt-6 flex items-center justify-start">
                                        <Button
                                            className="w-full rounded-[6px] bg-white font-semibold text-black transition-colors hover:bg-gray-200"
                                            disabled={processing}
                                            data-test="email-password-reset-link-button"
                                        >
                                            {processing && (
                                                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                            )}
                                            Email password reset link
                                        </Button>
                                    </div>
                                </>
                            )}
                        </Form>

                        <div className="text-center text-sm text-[#A1A1AA]">
                            <span>Or, return to </span>
                            <TextLink
                                href={login()}
                                className="font-medium text-white hover:underline"
                            >
                                log in
                            </TextLink>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

// Menimpa layout bawaan agar card dirender di tengah layar penuh
ForgotPassword.layout = (page: any) => page;
