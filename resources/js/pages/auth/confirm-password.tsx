import { Form, Head } from '@inertiajs/react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { store } from '@/routes/password/confirm';

export default function ConfirmPassword() {
    return (
        <>
            <Head title="Confirm password" />

            <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-6">
                <div className="mb-8 flex flex-col items-start">
                    <img
                        src="/Respir logo.png"
                        alt="Respir logo"
                        className="mb-6 h-8 w-auto"
                    />
                    <h1 className="text-3xl font-semibold tracking-tight text-white">
                        Confirm password
                    </h1>
                    <p className="mt-2 text-sm text-[#A1A1AA]">
                        This is a secure area of the application. Please
                        confirm your password before continuing.
                    </p>
                </div>

                <Form {...store.form()} resetOnSuccess={['password']}>
                    {({ processing, errors }) => (
                        <div className="grid gap-6">
                            <div className="grid gap-2">
                                <Label
                                    htmlFor="password"
                                    className="text-gray-300"
                                >
                                    Password
                                </Label>
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    placeholder="Password"
                                    autoComplete="current-password"
                                    autoFocus
                                    className="rounded-[6px] border border-white/20 bg-white/5 text-white placeholder:text-gray-600 focus-visible:border-white focus-visible:ring-1 focus-visible:ring-white focus-visible:ring-offset-0"
                                />

                                <InputError message={errors.password} />
                            </div>

                            <div className="flex items-center">
                                <Button
                                    className="h-11 w-full rounded-[6px] bg-white font-semibold text-black transition-colors hover:bg-gray-200"
                                    disabled={processing}
                                    data-test="confirm-password-button"
                                >
                                    {processing && <Spinner />}
                                    Confirm password
                                </Button>
                            </div>
                        </div>
                    )}
                </Form>
            </div>
        </>
    );
}

ConfirmPassword.layout = {
    title: 'Confirm password',
    description:
        'This is a secure area of the application. Please confirm your password before continuing.',
};
