import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import { useEcho } from '@laravel/echo-react';
import { Badge } from '@/components/ui/badge';
import { dashboard } from '@/routes';
import { show } from '@/routes/doctor/consultations';

type ConsultationRow = {
    id: number;
    patient: { id: number; name: string; email: string };
    status: string;
    cough_risk?: string | null;
    created_at: string;
    sessions: Array<{
        id: number;
        started_at: string | null;
        ended_at: string | null;
        turn_count: number;
    }>;
};

type ConsultationEvent = {
    status?: string;
    cough_risk?: string | null;
    risk_level?: string;
};

function ConsultationRowItem({
    consultation,
}: {
    consultation: ConsultationRow;
}) {
    const [coughRisk, setCoughRisk] = useState<string | null>(
        consultation.cough_risk ?? null,
    );
    const [status, setStatus] = useState(consultation.status);

    useEcho<ConsultationEvent>(
        `consultation.${consultation.id}`,
        ['.cough.analysis', '.consultation.updated'],
        (payload) => {
            const risk = payload.cough_risk ?? payload.risk_level;

            if (risk) {
                setCoughRisk(risk);
            }

            if (payload.status) {
                setStatus(payload.status);
            }
        },
        [consultation.id],
    );

    return (
        <Link
            href={show.url({ consultation: consultation.id })}
            className="hover:bg-muted/50 block rounded-xl border p-4 transition"
        >
            <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{consultation.patient.name}</span>
                {coughRisk && (
                    <Badge
                        variant={
                            coughRisk === 'high' ? 'destructive' : 'secondary'
                        }
                    >
                        cough risk: {coughRisk}
                    </Badge>
                )}
            </div>
            <p className="text-sm text-neutral-500">
                {consultation.created_at} · {status} ·{' '}
                {consultation.sessions.length} session
                {consultation.sessions.length === 1 ? '' : 's'}
            </p>
        </Link>
    );
}

export default function DoctorConsultations({
    consultations,
}: {
    consultations: {
        data: ConsultationRow[];
        current_page: number;
        last_page: number;
    };
}) {
    return (
        <>
            <Head title="Consultation reviews" />
            <div className="flex flex-col gap-3 p-4">
                <h1 className="text-lg font-semibold">Patient consultations</h1>
                {consultations.data.map((consultation) => (
                    <ConsultationRowItem
                        key={consultation.id}
                        consultation={consultation}
                    />
                ))}

                <p className="text-xs text-neutral-500">
                    Page {consultations.current_page} of{' '}
                    {consultations.last_page}
                </p>
            </div>
        </>
    );
}

DoctorConsultations.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Doctor' },
    ],
};

export type { ConsultationRow };
