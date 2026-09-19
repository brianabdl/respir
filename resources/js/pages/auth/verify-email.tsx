// Components
import { Form, Head } from '@inertiajs/react';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { logout } from '@/routes';
import { send } from '@/routes/verification';

export default function VerifyEmail({ status }: { status?: string }) {
    return (
        <>
            <Head title="Email verification" />

            <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-6">
                <div className="mb-8 flex flex-col items-start">
                    <img
                        src="/Respir logo.png"
                        alt="Respir logo"
                        className="mb-6 h-8 w-auto"
                    />
                    <h1 className="text-3xl font-semibold tracking-tight text-white">
                        Email verification
                    </h1>
                    <p className="mt-2 text-sm text-[#A1A1AA]">
                        Please verify your email address by clicking on the
                        link we just emailed to you.
                    </p>
                </div>

                {status === 'verification-link-sent' && (
                    <div className="mb-6 text-sm font-medium text-green-500">
                        A new verification link has been sent to the email
                        address you provided during registration.
                    </div>
                )}

                <Form {...send.form()} className="flex flex-col gap-4">
                    {({ processing }) => (
                        <>
                            <Button
                                disabled={processing}
                                className="h-11 w-full rounded-[6px] bg-white font-semibold text-black transition-colors hover:bg-gray-200"
                            >
                                {processing && <Spinner />}
                                Resend verification email
                            </Button>

                            <TextLink
                                href={logout()}
                                className="mx-auto block text-sm text-[#A1A1AA] hover:text-white"
                            >
                                Log out
                            </TextLink>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}

VerifyEmail.layout = {
    title: 'Email verification',
    description:
        'Please verify your email address by clicking on the link we just emailed to you.',
};
