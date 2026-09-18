import { Head } from '@inertiajs/react';

export default function AuthLayout({
    title = '',
    children,
}: {
    title?: string;
    description?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen w-full bg-black antialiased">
            {title && <Head title={title} />}
            {children}
        </div>
    );
}
