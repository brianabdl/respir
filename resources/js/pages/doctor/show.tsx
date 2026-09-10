import { Head } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { dashboard } from '@/routes';
import { index as doctorIndexRoute } from '@/routes/doctor/consultations';
import type { CoughAnalysis } from '@/pages/consult';

type Turn = { role: string; text: string };

type SessionLog = {
    id: number;
    started_at: string | null;
    ended_at: string | null;
    turns: Turn[];
};

export default function DoctorConsultationShow({
    consultation,
}: {
    consultation: {
        id: number;
        patient: { id: number; name: string; email: string };
        status: string;
        cough_risk?: string | null;
        report: Array<Record<string, unknown>> | null;
        cough_analysis: CoughAnalysis;
        created_at: string;
        sessions: SessionLog[];
        captures: Array<{
            id: number;
            type: string;
            mime_type: string;
            download: string;
        }>;
    };
}) {
    return (
        <>
            <Head title={`${consultation.patient.name} — consultation`} />
            <div className="flex flex-col gap-4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h1 className="text-lg font-semibold">
                        {consultation.patient.name}
                        <span className="ml-2 text-sm text-neutral-500">
                            {consultation.patient.email}
                        </span>
                    </h1>
                    {consultation.cough_risk && (
                        <Badge
                            variant={
                                consultation.cough_risk === 'high'
                                    ? 'destructive'
                                    : 'secondary'
                            }
                        >
                            cough risk: {consultation.cough_risk}
                        </Badge>
                    )}
                </div>
                <p className="text-sm text-neutral-500">
                    Started {consultation.created_at}
                </p>

                <section className="flex flex-col gap-2">
                    <h2 className="font-medium">Voice session transcripts</h2>
                    {consultation.sessions.length === 0 && (
                        <p className="text-sm text-neutral-500">
                            No saved voice sessions yet.
                        </p>
                    )}
                    {consultation.sessions.map((session) => (
                        <div
                            key={session.id}
                            className="rounded-xl border p-4"
                        >
                            <p className="text-xs text-neutral-500">
                                {session.started_at ?? 'in progress'} →{' '}
                                {session.ended_at ?? 'open'}
                            </p>
                            <div className="mt-2 flex flex-col gap-2">
                                {session.turns.map((turn, i) => (
                                    <div
                                        key={i}
                                        className={
                                            turn.role === 'user'
                                                ? 'max-w-[85%] self-end rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground'
                                                : 'max-w-[85%] self-start rounded-lg bg-muted px-3 py-2 text-sm'
                                        }
                                    >
                                        {turn.text}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </section>

                <section className="flex flex-col gap-2">
                    <h2 className="font-medium">Cough analysis</h2>
                    {consultation.cough_analysis ? (
                        <div className="rounded-xl border p-4 text-sm">
                            <p>
                                <span className="font-medium">Findings:</span>{' '}
                                {consultation.cough_analysis.findings}
                            </p>
                            <p>
                                <span className="font-medium">Recommendation:</span>{' '}
                                {consultation.cough_analysis.recommendation}
                            </p>
                        </div>
                    ) : (
                        <p className="text-sm text-neutral-500">
                            No cough sample recorded.
                        </p>
                    )}
                </section>

                <section className="flex flex-col gap-2">
                    <h2 className="font-medium">Captures</h2>
                    <div className="flex flex-wrap gap-2">
                        {consultation.captures.map((capture) => (
                            <a
                                key={capture.id}
                                href={capture.download}
                                className="rounded-lg border px-3 py-2 text-sm underline"
                            >
                                {capture.type} #{capture.id}
                            </a>
                        ))}
                        {consultation.captures.length === 0 && (
                            <p className="text-sm text-neutral-500">
                                No captures stored.
                            </p>
                        )}
                    </div>
                </section>
            </div>
        </>
    );
}

DoctorConsultationShow.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        {
            title: 'Doctor',
            href: doctorIndexRoute(),
        },
        { title: 'Consultation' },
    ],
};

export type { Turn, SessionLog };
