import { Head, Link } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { useEcho } from '@laravel/echo-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
    isSelected,
    onToggleSelect,
}: {
    consultation: ConsultationRow;
    isSelected: boolean;
    onToggleSelect: (id: number) => void;
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
        <div className="hover:bg-muted/50 relative block rounded-xl border p-4 transition">
            <div className="flex items-start gap-3">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                        e.stopPropagation();
                        onToggleSelect(consultation.id);
                    }}
                    className="mt-1 size-4 rounded border-gray-300"
                />
                <Link
                    href={show.url({ consultation: consultation.id })}
                    className="flex-1"
                >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">
                            {consultation.patient.name}
                        </span>
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
                                    <Badge variant="outline">
                                        needs briefing
                                    </Badge>
                                )
                            )}
                        </span>
                    </div>
                    <p className="text-sm text-neutral-500">
                        {timeAgo(consultation.updated_at)} · {status} ·{' '}
                        {consultation.sessions.length} session
                        {consultation.sessions.length === 1 ? '' : 's'} ·{' '}
                        {totalTurns} turn{totalTurns === 1 ? '' : 's'} ·{' '}
                        {consultation.captures_count} capture
                        {consultation.captures_count === 1 ? '' : 's'}
                    </p>
                </Link>
            </div>
        </div>
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
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [bulkReviewing, setBulkReviewing] = useState(false);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

    const toggleSelect = (id: number) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
        );
    };

    const selectAll = () => {
        setSelectedIds(visible.map((c) => c.id));
    };

    const clearSelection = () => {
        setSelectedIds([]);
    };

    const handleBulkMarkReviewed = async () => {
        if (selectedIds.length === 0) {
            toast.warning(
                'Please select at least one consultation to mark as reviewed',
            );
            return;
        }

        setConfirmDialogOpen(false);
        setBulkReviewing(true);
        
        try {
            await Promise.all(
                selectedIds.map((id) =>
                    fetch(`/doctor/consultations/${id}/review`, {
                        method: 'POST',
                        headers: {
                            'X-CSRF-TOKEN':
                                document
                                    .querySelector('meta[name="csrf-token"]')
                                    ?.getAttribute('content') ?? '',
                        },
                    }),
                ),
            );
            toast.success(
                `${selectedIds.length} consultation(s) marked as reviewed successfully`,
            );
            window.location.reload();
        } catch (error) {
            console.error('Bulk review failed', error);
            toast.error(
                'Failed to mark consultations as reviewed. Please try again.',
            );
        } finally {
            setBulkReviewing(false);
        }
    };

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
                        {selectedIds.length > 0 && (
                            <div className="sticky top-0 z-10 flex items-center justify-between rounded-xl border border-orange-500/30 bg-gradient-to-r from-orange-500/10 to-orange-600/10 p-4 shadow-lg backdrop-blur-sm">
                                <div className="flex items-center gap-3">
                                    <span className="font-semibold text-orange-600 dark:text-orange-400">
                                        {selectedIds.length} selected
                                    </span>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={clearSelection}
                                        disabled={bulkReviewing}
                                    >
                                        Clear
                                    </Button>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        onClick={() => setConfirmDialogOpen(true)}
                                        disabled={bulkReviewing}
                                        className="bg-orange-500 text-white hover:bg-orange-600"
                                    >
                                        {bulkReviewing
                                            ? 'Processing...'
                                            : 'Mark as Reviewed'}
                                    </Button>
                                </div>
                            </div>
                        )}
                        {attention.length > 0 && (
                            <section className="flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-sm font-semibold tracking-wide text-neutral-500 uppercase">
                                        Needs attention
                                    </h2>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={selectAll}
                                    >
                                        Select all
                                    </Button>
                                </div>
                                {attention.map((consultation) => (
                                    <ConsultationRowItem
                                        key={consultation.id}
                                        consultation={consultation}
                                        isSelected={selectedIds.includes(
                                            consultation.id,
                                        )}
                                        onToggleSelect={toggleSelect}
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
                                    isSelected={selectedIds.includes(
                                        consultation.id,
                                    )}
                                    onToggleSelect={toggleSelect}
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
                                isSelected={selectedIds.includes(
                                    consultation.id,
                                )}
                                onToggleSelect={toggleSelect}
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

            {/* Custom Bulk Review Confirmation Dialog */}
            <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
                <DialogContent className="border-white/10 bg-[#0B0B0D] text-white sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <svg className="size-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Bulk Mark as Reviewed
                        </DialogTitle>
                        <DialogDescription className="text-[#94A3B8] pt-2">
                            Are you sure you want to mark {selectedIds.length} consultation(s) as reviewed?
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-4">
                        <div className="rounded-lg border border-white/10 bg-[#000000]/50 p-4 space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-[#71717A]">Total Selected:</span>
                                <span className="font-mono text-lg font-semibold text-orange-400">{selectedIds.length}</span>
                            </div>
                            <div className="pt-2 border-t border-white/5">
                                <p className="text-xs text-[#71717A]">
                                    Selected consultations will be marked as <strong className="text-white">"Reviewed"</strong> and status badge will appear on the dashboard.
                                </p>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setConfirmDialogOpen(false)}
                            disabled={bulkReviewing}
                            className="rounded-full border-white/10 text-[#94A3B8] hover:bg-white/5"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleBulkMarkReviewed}
                            disabled={bulkReviewing}
                            className="rounded-full bg-orange-500 text-white hover:bg-orange-600"
                        >
                            {bulkReviewing ? 'Processing...' : 'Confirm Review'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
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

// force rebuild 20.30.59

// translation complete 20.36.02
