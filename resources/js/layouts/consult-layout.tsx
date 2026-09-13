import type { ReactNode } from 'react';

export default function ConsultLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-dvh w-full bg-black text-white">{children}</div>
    );
}
