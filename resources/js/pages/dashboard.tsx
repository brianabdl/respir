import { Head, Link, usePage } from '@inertiajs/react';
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
import { Badge } from '@/components/ui/badge';
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

type PatientConsultation = {
    id: number;
    status: string;
    cough_risk?: string | null;
    has_briefing: boolean;
    created_at: string;
    updated_at: string;
} | null;

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
    { key: 'high', label: 'High', fill: '#ef4444' },
    { key: 'medium', label: 'Medium', fill: '#f59e0b' },
    { key: 'low', label: 'Low', fill: '#10b981' },
    { key: 'unclear', label: 'Unclear', fill: '#a3a3a3' },
    { key: 'pending', label: 'No result yet', fill: '#d6d3d1' },
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
                    <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
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
        <div className="flex flex-col gap-4">
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
    consultation,
}: {
    consultation: PatientConsultation;
}) {
    if (!consultation) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Welcome</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                    <p className="text-sm text-neutral-500">
                        Start a pre-visit consultation: answer a few questions
                        with Sage, record a cough sample, and your doctor will
                        review everything before your visit.
                    </p>
                    <div>
                        <Button asChild>
                            <Link href={consult()}>Start consult</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    Your latest consultation
                    {consultation.cough_risk && (
                        <Badge
                            variant={
                                consultation.cough_risk === 'high'
                                    ? 'destructive'
                                    : 'secondary'
                            }
                        >
                            {consultation.cough_risk}
                        </Badge>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
                <p className="text-sm text-neutral-500">
                    Status: {consultation.status} ·{' '}
                    {consultation.has_briefing
                        ? 'Your doctor has a briefing ready.'
                        : 'Your doctor is reviewing your session.'}
                </p>
                <div>
                    <Button asChild>
                        <Link href={consult()}>Continue consult</Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export default function Dashboard({
    view,
    summary,
    consultation,
}: {
    view: 'doctor' | 'patient';
    summary?: QueueSummary;
    consultation?: PatientConsultation;
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
                    <PatientDashboard consultation={consultation ?? null} />
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
