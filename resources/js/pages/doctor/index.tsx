import { Head, Link } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { useEcho } from '@laravel/echo-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { dashboard } from '@/routes';
import {
    index as consultationsIndex,
    show,
} from '@/routes/doctor/consultations';

// commit
type ConsultationRow = {
    id: number;
    patient: { id: number; name: string; email: string };
    status: string;
    cough_risk?: string | null;
    has_briefing: boolean;
    is_reviewed?: boolean;
    captures_count: number;
    created_at: string;
    updated_at: string;
    sessions: Array<{
        id: number;
        started_at: string | null;
        ended_at: string | null;
        turn_count: number;
    }>;
};

type QueueSummary = {
    total: number;
    high: number;
    medium: number;
    needs_briefing: number;
    today: number;
};

type ConsultationEvent = {
    status?: string;
    cough_risk?: string | null;
    risk_level?: string;
    report?: Record<string, unknown> | null;
};

type RiskFilter = 'all' | 'high' | 'medium' | 'low' | 'unclear' | 'pending';

const RISK_FILTERS: Array<{ value: RiskFilter; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
    { value: 'unclear', label: 'Unclear' },
    { value: 'pending', label: 'No result yet' },
];

function timeAgo(value: string): string {
    const timestamp = new Date(value.replace(' ', 'T')).getTime();

    if (Number.isNaN(timestamp)) {
        return value;
    }

    const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));

    if (seconds < 60) {
        return 'just now';
    }

    const minutes = Math.floor(seconds / 60);

    if (minutes < 60) {
        return `${minutes}m ago`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
        return `${hours}h ago`;
    }

    return `${Math.floor(hours / 24)}d ago`;
}

function ConsultationRowItem({
    consultation,
}: {
    consultation: ConsultationRow;
}) {
    const [coughRisk, setCoughRisk] = useState<string | null>(
        consultation.cough_risk ?? null,
    );
    const [status, setStatus] = useState(consultation.status);
    const [hasBriefing, setHasBriefing] = useState(consultation.has_briefing);

    useEcho<ConsultationEvent>(
        `consultation.${consultation.id}`,
        // Leading dots: must match broadcastAs() verbatim, or Echo prepends
        // the App.Events namespace and this handler never fires.
        ['.cough.analysis', '.consultation.updated'],
        (payload) => {
            const risk = payload.cough_risk ?? payload.risk_level;

            if (risk) {
                setCoughRisk(risk);
            }

            if (payload.status) {
                setStatus(payload.status);
            }

            if (payload.report !== undefined) {
                setHasBriefing(payload.report !== null);
            }
        },
        [consultation.id],
    );

    const totalTurns = consultation.sessions.reduce(
        (count, session) => count + session.turn_count,
        0,
    );

    return (
        <Link
            href={show.url({ consultation: consultation.id })}
            className="hover:bg-muted/50 block rounded-xl border p-4 transition"
        >
            <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{consultation.patient.name}</span>
                <span className="flex flex-wrap gap-2">
                    {coughRisk ? (
                        <Badge
                            variant={
                                coughRisk === 'high'
                                    ? 'destructive'
                                    : 'secondary'
                            }
                        >
                            cough risk: {coughRisk}
                        </Badge>
                    ) : (
                        <span className="text-xs text-neutral-500">
                            no result yet
                        </span>
                    )}
                    {consultation.is_reviewed && (
                        <Badge className="border-green-500/20 bg-green-500/10 text-green-400">
                            reviewed
                        </Badge>
                    )}
                    {hasBriefing ? (
                        <Badge variant="outline">briefing ready</Badge>
                    ) : (
                        coughRisk && (
                            <Badge variant="outline">needs briefing</Badge>
                        )
                    )}
                </span>
            </div>
            <p className="text-sm text-neutral-500">
                {timeAgo(consultation.updated_at)} · {status} ·{' '}
                {consultation.sessions.length} session
                {consultation.sessions.length === 1 ? '' : 's'} · {totalTurns}{' '}
                turn{totalTurns === 1 ? '' : 's'} ·{' '}
                {consultation.captures_count} capture
                {consultation.captures_count === 1 ? '' : 's'}
            </p>
        </Link>
    );
}

export default function DoctorConsultations({
    consultations,
    summary,
    filters,
}: {
    consultations: {
        data: ConsultationRow[];
        current_page: number;
        last_page: number;
    };
    summary: QueueSummary;
    filters?: {
        search?: string;
        risk?: string;
        reviewed?: string;
        date_from?: string;
        date_to?: string;
        sort?: string;
    };
}) {
    const [riskFilter, setRiskFilter] = useState<RiskFilter>('all');
    const [query, setQuery] = useState('');

    const visible = useMemo(() => {
        const needle = query.trim().toLowerCase();

        return consultations.data.filter((consultation) => {
            if (
                riskFilter === 'pending'
                    ? consultation.cough_risk
                    : riskFilter !== 'all' &&
                      consultation.cough_risk !== riskFilter
            ) {
                return false;
            }

            return (
                needle.length === 0 ||
                consultation.patient.name.toLowerCase().includes(needle) ||
                consultation.patient.email.toLowerCase().includes(needle) ||
                consultation.id.toString().includes(needle)
            );
        });
    }, [consultations.data, query, riskFilter]);

    const isDefaultView = riskFilter === 'all' && query.trim() === '';
    const attention = visible.filter(
        (consultation) =>
            consultation.cough_risk === 'high' ||
            consultation.cough_risk === 'medium',
    );
    const rest = visible.filter(
        (consultation) =>
            consultation.cough_risk !== 'high' &&
            consultation.cough_risk !== 'medium',
    );

    const stats: Array<{ label: string; value: number }> = [
        { label: 'Total queue', value: summary.total },
        { label: 'High risk', value: summary.high },
        { label: 'Medium risk', value: summary.medium },
        { label: 'Needs briefing', value: summary.needs_briefing },
        { label: 'New today', value: summary.today },
    ];

    return (
        <>
            <Head title="Consultation reviews" />
            <div className="flex flex-col gap-4 p-4">
                <h1 className="text-lg font-semibold">Patient consultations</h1>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {stats.map((stat) => (
                        <Card key={stat.label}>
                            <CardContent className="p-3">
                                <p className="text-2xl font-semibold">
                                    {stat.value}
                                </p>
                                <p className="text-xs text-neutral-500">
                                    {stat.label}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="flex flex-wrap gap-2">
                        {RISK_FILTERS.map((filter) => (
                            <Button
                                key={filter.value}
                                type="button"
                                size="sm"
                                variant={
                                    riskFilter === filter.value
                                        ? 'default'
                                        : 'outline'
                                }
                                onClick={() => setRiskFilter(filter.value)}
                            >
                                {filter.label}
                            </Button>
                        ))}
                    </div>
                    <Input
                        aria-label="Search patients"
                        placeholder="Search patients…"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        className="sm:ml-auto sm:max-w-56"
                    />
                </div>

                {consultations.data.length === 0 ? (
                    <div className="rounded-xl border p-6 text-center">
                        <p className="font-medium">No consultations yet</p>
                        <p className="text-sm text-neutral-500">
                            New pre-visit consultations from patients will
                            appear here as they arrive.
                        </p>
                    </div>
                ) : visible.length === 0 ? (
                    <div className="rounded-xl border p-6 text-center">
                        <p className="font-medium">No matches</p>
                        <p className="text-sm text-neutral-500">
                            Try a different search or risk filter.
                        </p>
                    </div>
                ) : isDefaultView ? (
                    <>
                        {attention.length > 0 && (
                            <section className="flex flex-col gap-3">
                                <h2 className="text-sm font-semibold tracking-wide text-neutral-500 uppercase">
                                    Needs attention
                                </h2>
                                {attention.map((consultation) => (
                                    <ConsultationRowItem
                                        key={consultation.id}
                                        consultation={consultation}
                                    />
                                ))}
                            </section>
                        )}
                        <section className="flex flex-col gap-3">
                            <h2 className="text-sm font-semibold tracking-wide text-neutral-500 uppercase">
                                All consultations
                            </h2>
                            {rest.map((consultation) => (
                                <ConsultationRowItem
                                    key={consultation.id}
                                    consultation={consultation}
                                />
                            ))}
                        </section>
                    </>
                ) : (
                    <section className="flex flex-col gap-3">
                        {visible.map((consultation) => (
                            <ConsultationRowItem
                                key={consultation.id}
                                consultation={consultation}
                            />
                        ))}
                    </section>
                )}

                <div className="flex items-center justify-between">
                    <p className="text-xs text-neutral-500">
                        Page {consultations.current_page} of{' '}
                        {consultations.last_page}
                    </p>
                    <div className="flex gap-2">
                        {consultations.current_page > 1 && (
                            <Button asChild size="sm" variant="outline">
                                <Link
                                    href={consultationsIndex.url({
                                        query: {
                                            page:
                                                consultations.current_page - 1,
                                        },
                                    })}
                                >
                                    Previous
                                </Link>
                            </Button>
                        )}
                        {consultations.current_page <
                            consultations.last_page && (
                            <Button asChild size="sm" variant="outline">
                                <Link
                                    href={consultationsIndex.url({
                                        query: {
                                            page:
                                                consultations.current_page + 1,
                                        },
                                    })}
                                >
                                    Next
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>
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
