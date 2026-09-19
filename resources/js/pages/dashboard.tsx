import { Head, Link, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { Fragment, useMemo, useState } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { consult, dashboard } from '@/routes';
import { index as consultationsIndex } from '@/routes/doctor/consultations';

type QueueSummary = {
    total: number;
    high: number;
    medium: number;
    low: number;
    unclear: number;
    pending: number;
    needs_briefing: number;
    today: number;
    per_day: Array<{ date: string; count: number }>;
};

type CoughAnalysis = {
    risk_level?: string;
    risk_score?: number | null;
    findings?: string;
    recommendation?: string;
    duration_s?: number;
} | null;

type PatientConsultation = {
    id: number;
    status: string;
    cough_risk?: string | null;
    cough_analysis?: CoughAnalysis;
    follow_up_actions?: string[] | null;
    has_briefing: boolean;
    is_reviewed: boolean;
    reviewed_at?: string | null;
    reviewer_name?: string | null;
    audio_download?: string | null;
    created_at: string;
    updated_at: string;
};

function riskDotClass(risk?: string | null): string {    if (risk === 'high') {
        return 'bg-white';
    }

    if (risk === 'medium') {
        return 'bg-white/60';
    }

    if (risk === 'low') {
        return 'bg-white/30';
    }

    return 'bg-neutral-500';
}

const RISK_BAND_CUTOFFS = { medium: 0.55, high: 0.66 } as const;

const RISK_EXPLAINERS: Record<
    string,
    { meaning: string; next: string[] }
> = {
    low: {
        meaning:
            'No concerning acoustic pattern was heard in this sample. This does not rule out illness — it means this sample looked reassuring.',
        next: [
            'Keep your appointment and mention every symptom.',
            'Record a new sample if your cough changes or worsens.',
        ],
    },
    medium: {
        meaning:
            'An acoustic pattern was heard that a doctor should look at more closely. This is not a diagnosis.',
        next: [
            'Your doctor reviews this together with your interview notes.',
            'Expect follow-up questions or tests at your visit.',
        ],
    },
    high: {
        meaning:
            'A strong acoustic pattern was heard that needs prompt in-person assessment. This is still not a diagnosis.',
        next: [
            'See a doctor soon — do not wait for the next routine visit.',
            'Watch for fever, night sweats, or weight loss and mention them.',
        ],
    },
    unclear: {
        meaning:
            'This sample could not be assessed — it may have been too short, too noisy, or the analysis was unavailable.',
        next: [
            'Record a new sample in a quiet room, close to the microphone.',
        ],
    },
};

function RiskScoreBar({ score }: { score: number }) {
    const pct = Math.min(100, Math.max(0, score * 100));

    return (
        <div>
            <div
                className="relative h-1 overflow-hidden rounded-full bg-white/10"
                role="img"
                aria-label={`Risk score ${Math.round(pct)} out of 100`}
            >
                <div
                    className="absolute top-0 bottom-0 w-px bg-white/40"
                    style={{
                        left: `${RISK_BAND_CUTOFFS.medium * 100}%`,
                    }}
                />
                <div
                    className="absolute top-0 bottom-0 w-px bg-white/40"
                    style={{
                        left: `${RISK_BAND_CUTOFFS.high * 100}%`,
                    }}
                />
                <div
                    className="h-full rounded-full bg-white/70"
                    style={{ width: `${pct}%` }}
                />
            </div>
            <div className="mt-1 flex font-mono text-[9px] tracking-widest text-[#71717A] uppercase">
                <span style={{ width: `${RISK_BAND_CUTOFFS.medium * 100}%` }}>
                    Low
                </span>
                <span
                    className="text-center"
                    style={{
                        width: `${(RISK_BAND_CUTOFFS.high - RISK_BAND_CUTOFFS.medium) * 100}%`,
                    }}
                >
                    Medium
                </span>
                <span className="flex-1 text-right">High</span>
            </div>
        </div>
    );
}

function Eyebrow({ children }: { children: ReactNode }) {
    return (
        <p className="font-mono text-[10px] tracking-widest text-[#71717A] uppercase">
            {children}
        </p>
    );
}

type HistoryFilter = 'all' | 'waiting' | 'reviewed' | 'completed';

const HISTORY_FILTERS: Array<{ value: HistoryFilter; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'waiting', label: 'Waiting for review' },
    { value: 'reviewed', label: 'Reviewed' },
    { value: 'completed', label: 'Completed' },
];

function matchesHistoryFilter(
    consultation: PatientConsultation,
    filter: HistoryFilter,
): boolean {
    if (filter === 'waiting') {
        return !consultation.is_reviewed;
    }

    if (filter === 'reviewed') {
        return consultation.is_reviewed;
    }

    if (filter === 'completed') {
        return consultation.status === 'completed';
    }

    return true;
}

function formatDate(value: string): string {
    return new Date(value).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

type JourneyStep = {
    key: string;
    label: string;
    state: 'done' | 'current' | 'pending';
};

function journeySteps(consultation: PatientConsultation): JourneyStep[] {
    const hasSample =
        Boolean(consultation.audio_download) ||
        Boolean(consultation.cough_analysis);
    const hasAnalysis = Boolean(consultation.cough_analysis);

    return [
        {
            key: 'consult',
            label: 'Consult',
            state:
                hasSample || hasAnalysis || consultation.status !== 'chatting'
                    ? 'done'
                    : 'current',
        },
        {
            key: 'analysis',
            label: 'Analysis',
            state: hasAnalysis
                ? 'done'
                : hasSample
                  ? 'current'
                  : 'pending',
        },
        {
            key: 'review',
            label: 'Review',
            state: consultation.is_reviewed
                ? 'done'
                : hasAnalysis
                  ? 'current'
                  : 'pending',
        },
    ];
}

function VisitJourney({
    consultation,
}: {
    consultation: PatientConsultation;
}) {
    const steps = journeySteps(consultation);

    return (
        <ol
            aria-label="Visit journey"
            className="flex items-start"
        >
            {steps.map((step, index) => (
                <Fragment key={step.key}>
                    {index > 0 && (
                        <li
                            aria-hidden
                            className={`mx-1 mt-2.5 h-px flex-1 sm:mx-2 ${
                                steps[index - 1].state === 'done'
                                    ? 'bg-white/60'
                                    : 'bg-white/15'
                            }`}
                        />
                    )}
                    <li className="flex flex-col items-center gap-1.5">
                        <span
                            aria-hidden
                            className={`flex size-5 items-center justify-center rounded-full border text-[9px] font-bold ${
                                step.state === 'done'
                                    ? 'border-white bg-white text-black'
                                    : step.state === 'current'
                                      ? 'animate-pulse border-[#94A3B8] text-[#94A3B8]'
                                      : 'border-white/15 text-[#71717A]'
                            }`}
                        >
                            {step.state === 'done' ? '✓' : index + 1}
                        </span>
                        <span
                            aria-current={
                                step.state === 'current' ? 'step' : undefined
                            }
                            className={`font-mono text-[9px] tracking-widest whitespace-nowrap uppercase ${
                                step.state === 'current'
                                    ? 'text-white'
                                    : step.state === 'done'
                                      ? 'text-[#A1A1AA]'
                                      : 'text-[#71717A]'
                            }`}
                        >
                            {step.label}
                        </span>
                    </li>
                </Fragment>
            ))}
        </ol>
    );
}

function ScoreTrend({
    consultations,
}: {
    consultations: PatientConsultation[];
}) {
    const points = consultations
        .filter(
            (c): c is PatientConsultation & {
                cough_analysis: { risk_score: number };
            } =>
                typeof c.cough_analysis?.risk_score === 'number',
        )
        .reverse();

    if (points.length < 2) {
        return null;
    }

    const width = 280;
    const height = 72;
    const pad = 8;
    const x = (i: number) =>
        points.length === 1
            ? width / 2
            : pad + (i * (width - pad * 2)) / (points.length - 1);
    const y = (score: number) =>
        height - pad - Math.min(1, Math.max(0, score)) * (height - pad * 2);
    const line = points
        .map(
            (c, i) =>
                `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(c.cough_analysis.risk_score).toFixed(1)}`,
        )
        .join(' ');

    return (
        <div className="rounded-[14px] border border-white/10 bg-[#0B0B0D] p-4 sm:p-5">
            <Eyebrow>Tren skor batuk</Eyebrow>
            <svg
                viewBox={`0 0 ${width} ${height}`}
                role="img"
                aria-label={`Tren skor dari ${points.length} kunjungan`}
                className="mt-3 w-full"
            >
                {[0.55, 0.66].map((cutoff) => (
                    <line
                        key={cutoff}
                        x1={pad}
                        x2={width - pad}
                        y1={y(cutoff)}
                        y2={y(cutoff)}
                        stroke="#71717A"
                        strokeWidth="1"
                        strokeDasharray="3 3"
                        opacity="0.6"
                    />
                ))}
                <path
                    d={line}
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    strokeLinecap="round"
                />
                {points.map((c, i) => (
                    <circle
                        key={c.id}
                        cx={x(i)}
                        cy={y(c.cough_analysis.risk_score)}
                        r="3"
                        fill="#94A3B8"
                    />
                ))}
            </svg>
            <div className="mt-1 flex justify-between font-mono text-[9px] tracking-widest text-[#71717A] uppercase">
                <span>{formatDate(points[0].created_at)}</span>
                <span>
                    {formatDate(points[points.length - 1].created_at)}
                </span>
            </div>
        </div>
    );
}

function HistoryItem({
    consultation,
    isLatest,
    index,
}: {
    consultation: PatientConsultation;
    isLatest: boolean;
    index: number;
}) {
    const analysis = consultation.cough_analysis ?? null;
    const followUps = consultation.follow_up_actions ?? [];

    return (
        <article
            className="animate-aura-rise rounded-[14px] border border-white/10 bg-[#0B0B0D] p-5 sm:p-6"
            style={{ animationDelay: `${Math.min(index, 5) * 90}ms` }}
        >
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <span
                        aria-hidden
                        className={`size-2 rounded-full ${riskDotClass(consultation.cough_risk)}`}
                    />
                    <div>
                        <Eyebrow>{formatDate(consultation.created_at)}</Eyebrow>
                        <h3 className="mt-0.5 text-base font-semibold text-white">
                            {consultation.cough_risk ? (
                                <span className="capitalize">
                                    {consultation.cough_risk} risk
                                </span>
                            ) : (
                                'No result yet'
                            )}
                        </h3>
                    </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/40 px-3 py-1 font-mono text-[10px] tracking-widest text-[#E4E4E7] uppercase">
                    {consultation.is_reviewed
                        ? 'Reviewed by doctor'
                        : 'Waiting for review'}
                </span>
            </div>

            <div className="mt-4 border-t border-white/10 pt-4">
                <VisitJourney consultation={consultation} />
            </div>
            {analysis ? (
                <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4">
                    <Eyebrow>
                        Cough result
                        {analysis.risk_level
                            ? ` · ${analysis.risk_level}`
                            : ''}
                    </Eyebrow>
                    {typeof analysis.risk_score === 'number' && (
                        <RiskScoreBar score={analysis.risk_score} />
                    )}
                    <p className="text-xs leading-relaxed text-[#71717A]">
                        The score reflects acoustic patterns in your cough
                        sample — not your probability of being ill.
                    </p>
                    {analysis.risk_level &&
                        RISK_EXPLAINERS[analysis.risk_level] && (
                            <>
                                <p className="text-sm leading-relaxed text-[#E4E4E7]">
                                    {
                                        RISK_EXPLAINERS[analysis.risk_level]
                                            .meaning
                                    }
                                </p>
                                <ul className="flex flex-col gap-1.5">
                                    {RISK_EXPLAINERS[
                                        analysis.risk_level
                                    ].next.map((step, stepIndex) => (
                                        <li
                                            key={stepIndex}
                                            className="flex items-start gap-2.5 text-sm text-[#A1A1AA]"
                                        >
                                            <span
                                                aria-hidden
                                                className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#94A3B8]"
                                            />
                                            {step}
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                    {analysis.findings && (
                        <p className="text-sm text-[#A1A1AA]">
                            <span className="font-medium text-[#E4E4E7]">
                                Findings:{' '}
                            </span>
                            {analysis.findings}
                        </p>
                    )}
                    {analysis.recommendation && (
                        <p className="text-sm text-[#A1A1AA]">
                            <span className="font-medium text-[#E4E4E7]">
                                Recommendation:{' '}
                            </span>
                            {analysis.recommendation}
                        </p>
                    )}
                    <p className="text-xs text-[#71717A] italic">
                        Screening support only — not a diagnosis. A doctor
                        must assess you in person.
                    </p>
                </div>
            ) : (
                <p className="mt-4 border-t border-white/10 pt-4 text-sm text-[#71717A]">
                    No cough sample analysed yet.
                </p>
            )}

            {consultation.audio_download && (
                <div className="mt-4 flex flex-col gap-2 border-t border-white/10 pt-4">
                    <Eyebrow>Your recording</Eyebrow>
                    <audio
                        controls
                        preload="none"
                        src={consultation.audio_download}
                        className="w-full"
                    />
                </div>
            )}

            <div className="mt-4 flex flex-col gap-2 border-t border-white/10 pt-4">
                <Eyebrow>Doctor review</Eyebrow>
                {consultation.is_reviewed ? (
                    <>
                        <p className="text-sm text-[#A1A1AA]">
                            Reviewed
                            {consultation.reviewer_name
                                ? ` by ${consultation.reviewer_name}`
                                : ''}
                            {consultation.reviewed_at
                                ? ` · ${formatDate(consultation.reviewed_at)}`
                                : ''}
                            .
                        </p>
                        {followUps.length > 0 && (
                            <ul className="flex flex-col gap-1.5">
                                {followUps.map((action, actionIndex) => (
                                    <li
                                        key={actionIndex}
                                        className="flex items-start gap-2.5 text-sm text-[#E4E4E7]"
                                    >
                                        <span
                                            aria-hidden
                                            className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#94A3B8]"
                                        />
                                        {action}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </>
                ) : (
                    <p className="text-sm text-[#A1A1AA]">
                        {consultation.has_briefing
                            ? 'Your doctor has a briefing ready and will review soon.'
                            : 'Your doctor is reviewing your session.'}
                    </p>
                )}
            </div>

            {isLatest && consultation.status === 'chatting' && (
                <div className="mt-5">
                    <Button
                        asChild
                        className="rounded-[14px] bg-white font-semibold text-black hover:bg-[#CBD5E1]"
                    >
                        <Link href={consult()}>Continue consult</Link>
                    </Button>
                </div>
            )}
        </article>
    );
}

function HistorySummary({
    consultations,
}: {
    consultations: PatientConsultation[];
}) {
    const waiting = consultations.filter((c) => !c.is_reviewed).length;
    const latest = consultations[0];
    const metrics = [
        { value: String(consultations.length), label: 'visits' },
        {
            value: latest?.cough_risk
                ? latest.cough_risk.charAt(0).toUpperCase() +
                  latest.cough_risk.slice(1)
                : '—',
            label: 'latest result',
        },
        { value: String(waiting), label: 'waiting for review' },
    ];

    return (
        <dl className="grid grid-cols-3 gap-2 sm:gap-3">
            {metrics.map((metric) => (
                <div
                    key={metric.label}
                    className="rounded-[14px] border border-white/10 bg-[#0B0B0D] p-4 sm:p-5"
                >
                    <dd className="text-xl font-semibold text-white sm:text-2xl">
                        {metric.value}
                    </dd>
                    <dt className="mt-1 font-mono text-[10px] tracking-widest text-[#71717A] uppercase">
                        {metric.label}
                    </dt>
                </div>
            ))}
        </dl>
    );
}

function ChartTooltip({
    active,
    payload,
    label,
}: {
    active?: boolean;
    payload?: Array<{ name?: string; value?: number | string }>;
    label?: string;
}) {
    if (!active || !payload || payload.length === 0) {
        return null;
    }

    return (
        <div className="bg-popover text-popover-foreground rounded-md border px-3 py-1.5 text-xs shadow-md">
            {label && <p className="font-medium">{label}</p>}
            {payload.map((entry) => (
                <p key={String(entry.name ?? label ?? 'value')}>
                    {entry.name ? `${entry.name}: ` : ''}
                    {entry.value}
                </p>
            ))}
        </div>
    );
}

const RISK_SLICES: Array<{
    key: keyof Pick<
        QueueSummary,
        'high' | 'medium' | 'low' | 'unclear' | 'pending'
    >;
    label: string;
    fill: string;
}> = [
    { key: 'high', label: 'High', fill: '#FFFFFF' },
    { key: 'medium', label: 'Medium', fill: 'rgba(255,255,255,0.6)' },
    { key: 'low', label: 'Low', fill: 'rgba(255,255,255,0.35)' },
    { key: 'unclear', label: 'Unclear', fill: '#71717A' },
    {
        key: 'pending',
        label: 'No result yet',
        fill: 'rgba(255,255,255,0.15)',
    },
];

function RiskDonut({ summary }: { summary: QueueSummary }) {
    const data = RISK_SLICES.map((slice) => ({
        name: slice.label,
        value: summary[slice.key],
        fill: slice.fill,
    })).filter((slice) => slice.value > 0);

    if (data.length === 0) {
        return (
            <p className="text-sm text-neutral-500">
                No consultations to chart yet.
            </p>
        );
    }

    return (
        <div>
            <div className="relative mx-auto max-w-64">
                <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                        <Tooltip content={<ChartTooltip />} />
                        <Pie
                            data={data}
                            dataKey="value"
                            nameKey="name"
                            innerRadius="62%"
                            outerRadius="88%"
                            paddingAngle={2}
                            stroke="none"
                        >
                            {data.map((slice) => (
                                <Cell key={slice.name} fill={slice.fill} />
                            ))}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-2xl font-semibold">{summary.total}</p>
                    <p className="text-xs text-neutral-500">consultations</p>
                </div>
            </div>
            <ul className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-neutral-500">
                {data.map((slice) => (
                    <li key={slice.name} className="flex items-center gap-1.5">
                        <span
                            aria-hidden
                            className="size-2.5 rounded-full"
                            style={{ backgroundColor: slice.fill }}
                        />
                        {slice.name} ({slice.value})
                    </li>
                ))}
            </ul>
        </div>
    );
}

function ConsultationsBar({ summary }: { summary: QueueSummary }) {
    if (summary.total === 0) {
        return (
            <p className="text-sm text-neutral-500">
                No consultations in the last 30 days.
            </p>
        );
    }

    return (
        <div className="text-neutral-500">
            <ResponsiveContainer width="100%" height={220}>
                <BarChart
                    data={summary.per_day}
                    margin={{ top: 4, right: 4, bottom: 0, left: -16 }}
                >
                    <CartesianGrid stroke="currentColor" vertical={false} />
                    <XAxis
                        dataKey="date"
                        tickFormatter={(date: string) => date.slice(5)}
                        tick={{ fill: 'currentColor', fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        minTickGap={24}
                    />
                    <YAxis
                        allowDecimals={false}
                        tick={{ fill: 'currentColor', fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                    />
                    <Tooltip
                        content={<ChartTooltip />}
                        labelFormatter={(date) =>
                            typeof date === 'string' || typeof date === 'number'
                                ? String(date)
                                : ''
                        }
                    />
                    <Bar
                        dataKey="count"
                        fill="#94A3B8"
                        radius={[4, 4, 0, 0]}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

function DoctorDashboard({ summary }: { summary: QueueSummary }) {
    const stats: Array<{ label: string; value: number }> = [
        { label: 'Total queue', value: summary.total },
        { label: 'High risk', value: summary.high },
        { label: 'Medium risk', value: summary.medium },
        { label: 'Needs briefing', value: summary.needs_briefing },
        { label: 'New today', value: summary.today },
    ];

    return (
        <div className="dark flex flex-col gap-4">
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
            <div className="grid gap-2 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Risk distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <RiskDonut summary={summary} />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Consultations per day</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ConsultationsBar summary={summary} />
                    </CardContent>
                </Card>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Review queue</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                    <p className="text-sm text-neutral-500">
                        {summary.needs_briefing > 0
                            ? `${summary.needs_briefing} consultation${summary.needs_briefing === 1 ? '' : 's'} waiting for a clinician briefing.`
                            : 'Nothing waiting for a briefing. New patient consultations will appear here.'}
                    </p>
                    <div>
                        <Button asChild>
                            <Link href={consultationsIndex.url()}>
                                Open Doctor Console
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function PatientDashboard({
    consultations,
    patientName,
}: {
    consultations: PatientConsultation[];
    patientName?: string;
}) {
    const [filter, setFilter] = useState<HistoryFilter>('all');
    const visible = useMemo(
        () => consultations.filter((c) => matchesHistoryFilter(c, filter)),
        [consultations, filter],
    );
    return (
        <div className="flex flex-col gap-4 sm:gap-5">
            <div
                className="animate-aura-rise overflow-hidden rounded-[14px] bg-black text-white"
                style={{
                    backgroundImage:
                        'radial-gradient(120% 90% at 85% 0%, rgba(148,163,184,0.16) 0%, rgba(0,0,0,0) 55%)',
                }}
            >
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                    <div>
                        <Eyebrow>Respir · pre-visit</Eyebrow>
                        <h2 className="mt-1 text-xl font-semibold sm:text-2xl">
                            {patientName
                                ? `Your visits, ${patientName}`
                                : 'Your visits'}
                        </h2>
                        <p className="mt-1 max-w-md text-sm leading-relaxed text-[#A1A1AA]">
                            {consultations.length === 0
                                ? 'Answer a few questions with Sage, record a cough sample, and your doctor reviews everything before your visit.'
                                : 'Track every visit, its result, and whether your doctor has reviewed it.'}
                        </p>
                    </div>
                    <Button
                        asChild
                        size="lg"
                        className="shrink-0 rounded-[14px] bg-white font-semibold text-black transition-transform hover:bg-[#CBD5E1] active:scale-[0.98]"
                    >
                        <Link href={consult()}>Start consult</Link>
                    </Button>
                </div>
            </div>

            {consultations.length === 0 ? (
                <div className="rounded-[14px] border border-dashed border-white/15 bg-[#0B0B0D] p-6 text-center">
                    <Eyebrow>No consultations yet</Eyebrow>
                    <p className="mt-2 text-sm text-[#A1A1AA]">
                        Your history will appear here once you start your first
                        visit.
                    </p>
                </div>
            ) : (
                <>
                    <HistorySummary consultations={consultations} />
                    <ScoreTrend consultations={consultations} />
                    <div
                        role="group"
                        aria-label="Filter history"
                        className="flex flex-wrap gap-2"
                    >
                        {HISTORY_FILTERS.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setFilter(option.value)}
                                aria-pressed={filter === option.value}
                                className={`rounded-full border px-4 py-1.5 font-mono text-[10px] tracking-widest uppercase transition-colors ${
                                    filter === option.value
                                        ? 'border-white bg-white font-semibold text-black'
                                        : 'border-white/15 bg-transparent text-[#A1A1AA] hover:text-white'
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                    {visible.length === 0 ? (
                        <div className="rounded-[14px] border border-dashed border-white/15 bg-[#0B0B0D] p-6 text-center">
                            <p className="text-sm text-[#A1A1AA]">
                                No visits match this filter.
                            </p>
                        </div>
                    ) : (
                        visible.map((consultation) => (
                            <HistoryItem
                                key={consultation.id}
                                consultation={consultation}
                                isLatest={
                                    consultation.id === consultations[0]?.id
                                }
                                index={consultations.findIndex(
                                    (c) => c.id === consultation.id,
                                )}
                            />
                        ))
                    )}
                </>
            )}
        </div>
    );
}

export default function Dashboard({
    view,
    summary,
    consultations,
}: {
    view: 'doctor' | 'patient';
    summary?: QueueSummary;
    consultations?: PatientConsultation[];
}) {
    const name = usePage().props.auth.user.name;

    return (
        <>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <h1 className="text-lg font-semibold">
                    {name ? `Welcome, ${name}` : 'Welcome'}
                </h1>
                {view === 'doctor' && summary ? (
                    <DoctorDashboard summary={summary} />
                ) : (
                    <PatientDashboard
                        consultations={consultations ?? []}
                        patientName={name ?? undefined}
                    />
                )}
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};
