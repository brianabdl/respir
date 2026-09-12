import { Head } from '@inertiajs/react';
import { useState } from 'react';
import { useEcho } from '@laravel/echo-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { briefing as briefingRoute } from '@/actions/App/Http/Controllers/Doctor/ConsultationReviewController';
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

type Briefing = {
    chief_complaint?: string;
    history?: string;
    risk_factors?: string[];
    cough_findings?: string;
    suggested_questions?: string[];
    red_flags?: string[];
    degraded?: boolean;
    generated_by?: string;
};

function BriefingList({ title, items }: { title: string; items?: string[] }) {
    if (!items || items.length === 0) {
        return null;
    }

    return (
        <div>
            <span className="font-medium">{title}:</span>
            <ul className="list-disc pl-5">
                {items.map((item, index) => (
                    <li key={index}>{item}</li>
                ))}
            </ul>
        </div>
    );
}

export default function DoctorConsultationShow({
    consultation,
}: {
    consultation: {
        id: number;
        patient: { id: number; name: string; email: string };
        status: string;
        cough_risk?: string | null;
        report: Briefing | null;
        cough_analysis: CoughAnalysis;
        created_at: string;
        sessions: SessionLog[];
        captures: Array<{
            id: number;
            type: string;
            mime_type: string;
            captured_at?: string | null;
            download: string;
        }>;
    };
}) {
    const [coughRisk, setCoughRisk] = useState<string | null>(
        consultation.cough_risk ?? null,
    );
    const [coughAnalysis, setCoughAnalysis] = useState<CoughAnalysis>(
        consultation.cough_analysis,
    );
    const [report, setReport] = useState<Briefing | null>(consultation.report);
    const [requestingBriefing, setRequestingBriefing] = useState(false);

    useEcho<{
        cough_risk?: string | null;
        risk_level?: string;
        cough_analysis?: CoughAnalysis;
    }>(
        `consultation.${consultation.id}`,
        'cough.analysis',
        (payload) => {
            if (payload.cough_analysis) {
                setCoughAnalysis(payload.cough_analysis);
            }

            setCoughRisk(payload.cough_risk ?? payload.risk_level ?? null);
        },
        [consultation.id],
    );

    useEcho<{ report?: Briefing | null }>(
        `consultation.${consultation.id}`,
        'consultation.updated',
        (payload) => {
            if (payload.report) {
                setReport(payload.report);
                setRequestingBriefing(false);
            }
        },
        [consultation.id],
    );

    async function generateBriefing(): Promise<void> {
        setRequestingBriefing(true);

        try {
            const response = await fetch(
                briefingRoute.url({ consultation: consultation.id }),
                {
                    method: 'POST',
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                        Accept: 'application/json',
                    },
                },
            );

            if (!response.ok) {
                throw new Error('briefing request failed');
            }
        } catch (error) {
            console.error('Could not request the briefing', error);
            setRequestingBriefing(false);
        }
    }

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
                    {coughRisk && (
                        <Badge
                            variant={
                                coughRisk === 'high'
                                    ? 'destructive'
                                    : 'secondary'
                            }
                        >
                            cough risk: {coughRisk}
                        </Badge>
                    )}
                </div>
                <p className="text-sm text-neutral-500">
                    Started {consultation.created_at}
                </p>

                <section className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <h2 className="font-medium">Clinician briefing</h2>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void generateBriefing()}
                            disabled={requestingBriefing}
                        >
                            {requestingBriefing
                                ? 'Generating…'
                                : report
                                  ? 'Regenerate'
                                  : 'Generate briefing'}
                        </Button>
                    </div>
                    {report ? (
                        <div className="flex flex-col gap-2 rounded-xl border p-4 text-sm">
                            {report.chief_complaint && (
                                <p>
                                    <span className="font-medium">
                                        Chief complaint:
                                    </span>{' '}
                                    {report.chief_complaint}
                                </p>
                            )}
                            {report.history && (
                                <p>
                                    <span className="font-medium">
                                        History:
                                    </span>{' '}
                                    {report.history}
                                </p>
                            )}
                            {report.cough_findings && (
                                <p>
                                    <span className="font-medium">
                                        Cough findings:
                                    </span>{' '}
                                    {report.cough_findings}
                                </p>
                            )}
                            <BriefingList
                                title="Risk factors"
                                items={report.risk_factors}
                            />
                            <BriefingList
                                title="Suggested questions"
                                items={report.suggested_questions}
                            />
                            <BriefingList
                                title="Red flags"
                                items={report.red_flags}
                            />
                            {report.degraded && (
                                <p className="text-xs text-amber-600">
                                    Automated briefing unavailable — showing a
                                    fallback summary.
                                </p>
                            )}
                            {report.generated_by && (
                                <p className="text-xs text-neutral-400">
                                    Generated by {report.generated_by}
                                </p>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-neutral-500">
                            No briefing generated yet.
                        </p>
                    )}
                </section>

                <section className="flex flex-col gap-2">
                    <h2 className="font-medium">Voice session transcripts</h2>
                    {consultation.sessions.length === 0 && (
                        <p className="text-sm text-neutral-500">
                            No saved voice sessions yet.
                        </p>
                    )}
                    {consultation.sessions.map((session) => (
                        <div key={session.id} className="rounded-xl border p-4">
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
                                                ? 'bg-primary text-primary-foreground max-w-[85%] self-end rounded-lg px-3 py-2 text-sm'
                                                : 'bg-muted max-w-[85%] self-start rounded-lg px-3 py-2 text-sm'
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
                    {coughAnalysis ? (
                        <div className="rounded-xl border p-4 text-sm">
                            <p>
                                <span className="font-medium">Findings:</span>{' '}
                                {coughAnalysis.findings}
                            </p>
                            <p>
                                <span className="font-medium">
                                    Recommendation:
                                </span>{' '}
                                {coughAnalysis.recommendation}
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

export type { Briefing, Turn, SessionLog };
