import { Head, Link } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { dashboard } from '@/routes';
import { show } from '@/routes/doctor/consultations';

type ConsultationRow = {
    id: number;
    patient: { id: number; name: string; email: string };
    status: string;
    cough_risk?: string | null;
    created_at: string;
    sessions: Array<{ id: number; started_at: string | null; ended_at: string | null; turn_count: number }>;
};

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
                    <Link
                        key={consultation.id}
                        href={show.url({ consultation: consultation.id })}
                        className="block rounded-xl border p-4 transition hover:bg-muted/50"
                    >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-medium">
                                {consultation.patient.name}
                            </span>
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
                            {consultation.created_at} ·{' '}
                            {consultation.sessions.length} session
                            {consultation.sessions.length === 1 ? '' : 's'}
                        </p>
                    </Link>
                ))}

                <p className="text-xs text-neutral-500">
                    Page {consultations.current_page} of {consultations.last_page}
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
