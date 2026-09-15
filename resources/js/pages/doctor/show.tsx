import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { useEcho } from '@laravel/echo-react';
import {
    Activity,
    AlertTriangle,
    Calendar,
    ChevronLeft,
    FileText,
    Mic,
    Video,
    Download,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
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
    history_present_illness?: string;
    medical_history?: string;
    social_history?: string;
    family_history?: string;
    review_of_systems?: string;
    clinical_impression?: string;
    recommendations?: string;
};

type Capture = {
    id: number;
    type: string;
    mime_type: string;
    captured_at: string;
    download: string;
};

export default function DoctorConsultationShow({
    consultation,
}: {
    consultation: {
        id: number;
        patient: { id: number; name: string; email: string };
        status: string;
        cough_risk?: string | null;
        report?: Briefing | null;
        cough_analysis?: CoughAnalysis | null;
        created_at: string;
        sessions: SessionLog[];
        captures: Capture[];
    };
}) {
    const [activeTab, setActiveTab] = useState<'briefing' | 'transcript' | 'cough' | 'media'>(
        'briefing',
    );
    const [requestingBriefing, setRequestingBriefing] = useState(false);

    useEcho({
        channel: 'doctor-queue',
        event: '.consultation.updated',
        callback() {
            router.reload({ only: ['consultation'] });
        },
    });

    const handleRequestBriefing = async () => {
        setRequestingBriefing(true);
        try {
            const response = await fetch(briefingRoute.url({ consultation: consultation.id }), {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '',
                },
            });

            if (!response.ok) {
                throw new Error('briefing request failed');
            }
        } catch (error) {
            console.error('Could not request the briefing', error);
        } finally {
            setRequestingBriefing(false);
        }
    };

    const riskScore = consultation.cough_analysis?.risk_score ?? 0;
    const riskPercentage = Math.round(riskScore * 100);

    return (
        <>
            <Head title={`Consultation #${consultation.id}`} />
            
            <div className="min-h-screen bg-black text-white">
                <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                    <div className="mb-6 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Link href={doctorIndexRoute()}>
                                <Button variant="outline" size="sm" className="rounded-full border-white/10 bg-transparent text-[#94A3B8] hover:border-white/20 hover:bg-white/5">
                                    <ChevronLeft className="mr-2 size-4" />
                                    Back to Triage
                                </Button>
                            </Link>
                        </div>

                        <div className="flex items-center gap-3">
                            {consultation.cough_risk === 'high' && (
                                <Badge className="rounded-full border border-red-500/20 bg-red-500/10 text-red-400">
                                    <Activity className="mr-1 size-3" />
                                    HIGH RISK
                                </Badge>
                            )}
                            {consultation.cough_risk === 'medium' && (
                                <Badge className="rounded-full border border-yellow-500/20 bg-yellow-500/10 text-yellow-400">
                                    <Activity className="mr-1 size-3" />
                                    MEDIUM RISK
                                </Badge>
                            )}
                            <Badge className="rounded-full border border-white/10 bg-white/5 text-[#94A3B8]">
                                #{consultation.id}
                            </Badge>
                        </div>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-3">
                        <div className="lg:col-span-2 space-y-6">
                            <Card className="border-white/10 bg-[#0B0B0D]">
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-6">
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h2 className="text-2xl font-bold">
                                                    {consultation.patient.name}
                                                </h2>
                                                <div className="h-10 w-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center">
                                                    <span className="text-xl">👤</span>
                                                </div>
                                            </div>
                                            <p className="mt-1 font-mono text-sm text-[#71717A]">
                                                {consultation.patient.email}
                                            </p>
                                            <p className="mt-1 text-sm text-[#71717A]">
                                                Consultation: {consultation.created_at}
                                            </p>
                                        </div>

                                        {!consultation.report && consultation.status === 'completed' && (
                                            <Button
                                                onClick={handleRequestBriefing}
                                                disabled={requestingBriefing}
                                                className="rounded-full bg-[#94A3B8] text-black hover:bg-[#A1A1AA]"
                                            >
                                                {requestingBriefing ? 'Generating...' : 'Generate Briefing'}
                                            </Button>
                                        )}
                                    </div>

                                    <div className="mt-6">
                                        <nav className="flex flex-wrap gap-2">
                                            <Button
                                                variant={activeTab === 'briefing' ? 'default' : 'ghost'}
                                                onClick={() => setActiveTab('briefing')}
                                                className="rounded-[14px]"
                                            >
                                                <FileText className="mr-2 size-4" />
                                                AI Briefing
                                            </Button>
                                            <Button
                                                variant={activeTab === 'transcript' ? 'default' : 'ghost'}
                                                onClick={() => setActiveTab('transcript')}
                                                className="rounded-[14px]"
                                            >
                                                <Activity className="mr-2 size-4" />
                                                Transcript
                                                ({consultation.sessions.reduce((acc, s) => acc + s.turns.length, 0)} turns)
                                            </Button>
                                            <Button
                                                variant={activeTab === 'cough' ? 'default' : 'ghost'}
                                                onClick={() => setActiveTab('cough')}
                                                className="rounded-[14px]"
                                            >
                                                <Mic className="mr-2 size-4" />
                                                Cough Analysis
                                            </Button>
                                            <Button
                                                variant={activeTab === 'media' ? 'default' : 'ghost'}
                                                onClick={() => setActiveTab('media')}
                                                className="rounded-[14px]"
                                            >
                                                <Video className="mr-2 size-4" />
                                                Media
                                                ({consultation.captures.length} files)
                                            </Button>
                                        </nav>

                                        <div className="mt-6">
                                            {activeTab === 'briefing' && (
                                                <div className="space-y-6">
                                                    {consultation.report ? (
                                                        <div className="space-y-4">
                                                            {consultation.report.chief_complaint && (
                                                                <div>
                                                                    <h3 className="text-sm font-medium text-[#94A3B8] uppercase tracking-wide">Chief Complaint</h3>
                                                                    <p className="mt-2 text-[#FFFFFF]">{consultation.report.chief_complaint}</p>
                                                                </div>
                                                            )}
                                                            {consultation.report.history_present_illness && (
                                                                <div>
                                                                    <h3 className="text-sm font-medium text-[#94A3B8] uppercase tracking-wide">History of Present Illness</h3>
                                                                    <p className="mt-2 text-[#FFFFFF]">{consultation.report.history_present_illness}</p>
                                                                </div>
                                                            )}
                                                            {consultation.report.clinical_impression && (
                                                                <div>
                                                                    <h3 className="text-sm font-medium text-[#94A3B8] uppercase tracking-wide">Clinical Impression</h3>
                                                                    <p className="mt-2 text-[#FFFFFF]">{consultation.report.clinical_impression}</p>
                                                                </div>
                                                            )}
                                                            {consultation.report.recommendations && (
                                                                <div>
                                                                    <h3 className="text-sm font-medium text-[#94A3B8] uppercase tracking-wide">Recommendations</h3>
                                                                    <ul className="mt-2 list-disc space-y-1 pl-6 text-[#FFFFFF]">
                                                                        {consultation.report.recommendations.split('\n').map((item, i) => (
                                                                            <li key={i}>{item.trim()}</li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <Card className="border-yellow-500/20 bg-yellow-500/5">
                                                            <CardContent className="flex min-h-[200px] flex-col items-center justify-center p-8">
                                                                <AlertTriangle className="size-12 text-yellow-400" />
                                                                <p className="mt-4 text-[#FFFFFF]">No AI Briefing generated yet</p>
                                                                <p className="mt-1 text-sm text-[#71717A]">Click "Generate Briefing" to create a summary of this consultation</p>
                                                            </CardContent>
                                                        </Card>
                                                    )}
                                                </div>
                                            )}

                                            {activeTab === 'transcript' && (
                                                <div className="space-y-4">
                                                    {consultation.sessions.map((session) => (
                                                        <div key={session.id} className="rounded-[14px] border border-white/10 bg-[#000000]/50 p-4">
                                                            <div className="mb-3 flex items-center gap-2 text-xs text-[#71717A]">
                                                                <Calendar className="size-3" />
                                                                <span>Session #{session.id}</span>
                                                                {session.started_at && (
                                                                    <>
                                                                        <span>•</span>
                                                                        <span>{session.started_at}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                            <div className="space-y-3">
                                                                {session.turns.map((turn, i) => (
                                                                    <div key={i} className={cn('flex gap-3', turn.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                                                                        <div className={cn('rounded-[14px] px-4 py-2 text-sm max-w-[85%]', turn.role === 'user' ? 'bg-white text-black' : 'border border-white/10 bg-white/5 text-white')}>
                                                                            {turn.text}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {consultation.sessions.length === 0 && (
                                                        <p className="text-center text-[#71717A]">No transcripts available</p>
                                                    )}
                                                </div>
                                            )}

                                            {activeTab === 'cough' && consultation.cough_analysis && (
                                                <div className="space-y-6">
                                                    <div className="rounded-[14px] border border-white/10 bg-[#0B0B0D] p-6">
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <h3 className="text-sm font-medium text-[#94A3B8] uppercase tracking-wide">TB Risk Score</h3>
                                                                <p className="mt-2 text-4xl font-bold">
                                                                    {riskPercentage}%
                                                                </p>
                                                            </div>
                                                            <div className="flex flex-col items-center">
                                                                <div className="size-32 rounded-full border-8 border-white/10 flex items-center justify-center bg-gradient-to-br from-[#0B0B0D] to-[#18181B]">
                                                                    <div className="text-center">
                                                                        {riskPercentage >= 70 && (
                                                                            <span className="block text-5xl">🔴</span>
                                                                        )}
                                                                        {riskPercentage >= 40 && riskPercentage < 70 && (
                                                                            <span className="block text-5xl">🟡</span>
                                                                        )}
                                                                        {riskPercentage < 40 && (
                                                                            <span className="block text-5xl">🟢</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <p className="mt-3 text-sm font-medium">
                                                                    {riskPercentage >= 70 ? 'High Risk' : riskPercentage >= 40 ? 'Medium Risk' : riskPercentage > 0 ? 'Low Risk' : 'No Cough Detected'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {consultation.cough_analysis.risk_level && (
                                                        <div className="grid gap-4 sm:grid-cols-2">
                                                            <Card className="border-white/10 bg-[#0B0B0D]">
                                                                <CardContent className="p-5">
                                                                    <h4 className="text-sm font-medium text-[#94A3B8] uppercase tracking-wide">Risk Level</h4>
                                                                    <p className="mt-2 text-lg font-semibold">
                                                                        {consultation.cough_analysis.risk_level.toUpperCase()}
                                                                    </p>
                                                                </CardContent>
                                                            </Card>
                                                            {consultation.cough_analysis.risk_score && (
                                                                <Card className="border-white/10 bg-[#0B0B0D]">
                                                                    <CardContent className="p-5">
                                                                        <h4 className="text-sm font-medium text-[#94A3B8] uppercase tracking-wide">Risk Score</h4>
                                                                        <p className="mt-2 text-lg font-semibold">
                                                                            {riskScore.toFixed(2)}
                                                                        </p>
                                                                    </CardContent>
                                                                </Card>
                                                            )}
                                                        </div>
                                                    )}

                                                    {consultation.cough_analysis.explanation && (
                                                        <Card className="border-white/10 bg-[#0B0B0D]">
                                                            <CardContent className="p-5">
                                                                <h4 className="text-sm font-medium text-[#94A3B8] uppercase tracking-wide">MedGemma Analysis</h4>
                                                                <p className="mt-2 text-[#FFFFFF]">{consultation.cough_analysis.explanation}</p>
                                                            </CardContent>
                                                        </Card>
                                                    )}
                                                </div>
                                            )}

                                            {activeTab === 'cough' && !consultation.cough_analysis && (
                                                <Card className="border-white/10 bg-[#0B0B0D]">
                                                    <CardContent className="flex min-h-[200px] flex-col items-center justify-center p-8">
                                                        <p className="text-[#A1A1AA]">No cough analysis data available</p>
                                                    </CardContent>
                                                </Card>
                                            )}

                                            {activeTab === 'media' && (
                                                <div className="grid gap-4 sm:grid-cols-2">
                                                    {consultation.captures.map((capture) => (
                                                        <Card key={capture.id} className="border-white/10 bg-[#0B0B0D]">
                                                            <CardContent className="p-5">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        {capture.type === 'video' || capture.mime_type.startsWith('video/') ? (
                                                                            <Video className="size-5 text-[#94A3B8]" />
                                                                        ) : (
                                                                            <FileText className="size-5 text-[#94A3B8]" />
                                                                        )}
                                                                        <span className="text-sm font-medium">{capture.type}</span>
                                                                    </div>
                                                                    <a href={capture.download}>
                                                                        <Button variant="outline" size="sm" className="rounded-full border-white/10 text-[#94A3B8] hover:border-white/20">
                                                                            <Download className="size-3" />
                                                                            <span className="sr-only">Download</span>
                                                                        </Button>
                                                                    </a>
                                                                </div>
                                                                <p className="mt-3 text-xs text-[#71717A]">
                                                                    {capture.captured_at}
                                                                </p>
                                                            </CardContent>
                                                        </Card>
                                                    ))}
                                                    {consultation.captures.length === 0 && (
                                                        <p className="col-span-2 text-center text-[#71717A]">
                                                            No media captures available
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-6">
                            <Card className="border-white/10 bg-[#0B0B0D]">
                                <CardContent className="p-5">
                                    <h3 className="text-sm font-medium text-[#94A3B8] uppercase tracking-wide">Patient Summary</h3>
                                    <div className="mt-4 space-y-3">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-[#71717A]">Email</span>
                                            <span className="font-mono text-[#94A3B8]">{consultation.patient.email}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-[#71717A]">Status</span>
                                            <span className={cn(
                                                'rounded-full px-2 py-0.5 text-xs font-mono',
                                                consultation.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                                                consultation.status === 'chatting' ? 'bg-blue-500/10 text-blue-400' :
                                                'bg-[#71717A]/10 text-[#71717A]'
                                            )}>
                                                {consultation.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-[#71717A]">Session Count</span>
                                            <span className="font-mono text-[#94A3B8]">{consultation.sessions.length}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-[#71717A]">Media Captures</span>
                                            <span className="font-mono text-[#94A3B8]">{consultation.captures.length}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-[#71717A]">Consultation</span>
                                            <span className="font-mono text-[#94A3B8]">
                                                {consultation.created_at.split(' ')[0]}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-white/10 bg-[#0B0B0D]">
                                <CardContent className="p-5">
                                    <h3 className="text-sm font-medium text-[#94A3B8] uppercase tracking-wide">Session Timeline</h3>
                                    <div className="mt-4 space-y-4">
                                        {consultation.sessions.map((session, i) => (
                                            <div key={session.id} className="relative pl-6">
                                                {i < consultation.sessions.length - 1 && (
                                                    <div className="absolute left-[15px] top-6 bottom-0 w-px bg-white/10" />
                                                )}
                                                <div className="absolute left-0 top-0 size-3 rounded-full bg-white/10" />
                                                <div className="space-y-1">
                                                    <p className="font-mono text-xs text-[#94A3B8]">
                                                        {session.started_at ? new Date(session.started_at).toLocaleTimeString() : 'N/A'}
                                                    </p>
                                                    <p className="text-sm text-[#FFFFFF]">
                                                        {session.turns.length} turns
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                        {consultation.sessions.length === 0 && (
                                            <p className="text-sm text-[#71717A]">No sessions recorded</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-white/10 bg-[#0B0B0D]">
                                <CardContent className="p-5">
                                    <h3 className="text-sm font-medium text-[#94A3B8] uppercase tracking-wide">Cough Analysis</h3>
                                    <div className="mt-4 space-y-3">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-[#71717A]">TB Risk</span>
                                            {consultation.cough_risk ? (
                                                <span className={cn(
                                                    'rounded-full px-2 py-0.5 text-xs font-mono',
                                                    consultation.cough_risk === 'high' ? 'bg-red-500/10 text-red-400' :
                                                    consultation.cough_risk === 'medium' ? 'bg-yellow-500/10 text-yellow-400' :
                                                    consultation.cough_risk === 'low' ? 'bg-green-500/10 text-green-400' :
                                                    'bg-[#71717A]/10 text-[#71717A]'
                                                )}>
                                                    {consultation.cough_risk.toUpperCase()}
                                                </span>
                                            ) : (
                                                <span className="text-[#71717A]">N/A</span>
                                            )}
                                        </div>
                                        {consultation.cough_analysis?.risk_score && (
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-[#71717A]">Risk Score</span>
                                                <span className="font-mono text-[#94A3B8]">
                                                    {consultation.cough_analysis.risk_score.toFixed(2)}
                                                </span>
                                            </div>
                                        )}
                                        {consultation.cough_analysis?.explanation && (
                                            <div className="mt-3 rounded-[14px] bg-[#000000]/50 p-3">
                                                <p className="text-xs text-[#71717A]">AI Explanation</p>
                                                <p className="mt-1 text-sm text-[#FFFFFF]">
                                                    {consultation.cough_analysis.explanation.substring(0, 100)}...
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
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
