import { Head, Link, usePage } from '@inertiajs/react';
import type { ComponentProps, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import {
    Activity,
    ArrowRight,
    AudioLines,
    BrainCircuit,
    CheckCircle2,
    ChevronDown,
    ClipboardList,
    FileText,
    Lock,
    Menu,
    Mic,
    ShieldCheck,
    Sparkles,
    X,
    Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { dashboard, login, register } from '@/routes';
import Lenis from 'lenis';

const ACCENT = '#94A3B8';
const INK = '#FFFFFF';
const MUTED = '#A1A1AA';

type RevealProps = {
    className?: string;
    delay?: number;
    children: ReactNode;
};

function Reveal({ className, delay = 0, children }: RevealProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const node = ref.current;
        if (!node) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry?.isIntersecting) {
                    setVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.15 },
        );

        observer.observe(node);
        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={ref}
            style={{ transitionDelay: `${delay}ms` }}
            className={cn(
                'transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]',
                visible
                    ? 'translate-y-0 opacity-100'
                    : 'translate-y-6 opacity-0',
                className,
            )}
        >
            {children}
        </div>
    );
}

function Logo() {
    return (
        <img src="/Respir logo.png" alt="respir-logo" className="h-10 w-auto" />
    );
}

function PrimaryButton({
    href,
    children,
}: {
    href: ComponentProps<typeof Link>['href'];
    children: ReactNode;
}) {
    return (
        <Link
            href={href}
            className="group inline-flex items-center gap-1 rounded-[6px] bg-white px-5 py-2.5 text-sm font-semibold text-black transition-all duration-200 hover:scale-105 hover:bg-neutral-200 active:scale-95"
        >
            {children}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
    );
}

function SecondaryButton({
    href,
    children,
}: {
    href: ComponentProps<typeof Link>['href'];
    children: ReactNode;
}) {
    return (
        <Link
            href={href}

            className="inline-flex items-center gap-2 rounded-[6px] border border-white/15 px-5 py-2.5 text-sm font-semibold transition-all duration-200 hover:scale-105 hover:bg-white/10 active:scale-95"
            style={{ color: INK }}
        >
            {children}
        </Link>
    );
}

function TypewriterText({ text }: { text: string }) {
    return (
        <motion.span
            initial="hidden"
            animate="visible"
            variants={{
                visible: { transition: { staggerChildren: 0.05 } },
            }}
            className="inline-flex"
        >
            {text.split('').map((char, i) => (
                <motion.span
                    key={i}
                    variants={{
                        hidden: { opacity: 0, display: 'none' },
                        visible: { opacity: 1, display: 'inline' },
                    }}
                >
                    {char === ' ' ? '\u00A0' : char}
                </motion.span>
            ))}
        </motion.span>
    );
}

function BannerEyebrow({ text }: { text: string }) {
    return (
        <div className="w-full border-y border-white/[0.08] bg-gradient-to-r from-transparent via-white/[0.04] to-transparent py-2.5 flex justify-center items-center shadow-sm backdrop-blur-sm">
            <p className="flex items-center gap-2 font-mono text-xs font-medium tracking-wide text-white/80">
                <Sparkles className="h-3.5 w-3.5 text-[#A1A1AA]" />
                <TypewriterText text={text} />
            </p>
        </div>
    );
}

function ProductMockup() {
    const lines = [
        {
            role: 'Sage',
            text: "Hi Kira! Let's get you ready to see Dr. Okafor.",
        },
        { role: 'You', text: 'Hi, I have a cough that will not go away.' },
        { role: 'Sage', text: 'Sorry to hear that. How long have you had it?' },
        { role: 'You', text: 'About three weeks. It is worse at night.' },
    ];
    const flow = [
        { step: 'Intake', done: true },
        { step: 'Interview', done: true },
        { step: 'Cough', done: true },
        { step: 'Brief', done: false },
        { step: 'Review', done: false },
    ];

    return (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0B0B0D] shadow-[0_40px_80px_-40px_rgba(0,0,0,0.9)]">
            <div className="flex items-center gap-2 border-b border-white/10 bg-[#111114] px-4 py-2.5">
                <span className="flex gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                    <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                    <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                </span>
                <span className="mx-auto flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-0.5 font-mono text-[10px] font-medium text-[#94A3B8]">
                    <Lock className="h-2.5 w-2.5" />
                    app.respir.health/consult
                </span>
                <span className="w-10" />
            </div>

            <div className="grid gap-4 p-4 sm:grid-cols-[1.2fr_0.8fr] sm:p-5">
                <div className="rounded-xl border border-white/10 bg-[#0F0F12]">
                    <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
                        <span className="flex items-center gap-1.5 font-mono text-[10px] font-semibold text-[#94A3B8]">
                            <Mic
                                className="h-3 w-3"
                                style={{ color: ACCENT }}
                            />
                            LIVE VOICE
                        </span>
                        <span className="flex items-center gap-1 font-mono text-[10px] font-semibold text-[#E4E4E7]">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/70" />
                            RECORDING
                        </span>
                    </div>
                    <div className="space-y-2.5 p-3">
                        {lines.map((line) => (
                            <div
                                key={line.text}
                                className={cn(
                                    'max-w-[88%] rounded-lg px-3 py-1.5 text-[11px] leading-relaxed',
                                    line.role === 'Sage'
                                        ? 'bg-white/10 text-[#D4D4D8]'
                                        : 'ml-auto bg-white text-[#0B0B0D]',
                                )}
                            >
                                {line.text}
                            </div>
                        ))}
                        <div className="ml-auto flex h-8 w-14 items-end justify-center gap-0.5 rounded-lg bg-white/10 px-2 pb-1.5">
                            {[30, 55, 75, 45, 65].map((h, i) => (
                                <span
                                    key={i}
                                    className="w-1 origin-bottom animate-pulse rounded-full bg-white/70"
                                    style={{
                                        height: `${h}%`,
                                        animationDelay: `${i * 120}ms`,
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-4 border-t border-white/10 px-3 py-2 font-mono text-[9px] font-semibold text-[#94A3B8]">
                        <span>Q7 / 19</span>
                        <span>BARGE-IN ON</span>
                        <span className="ml-auto" style={{ color: ACCENT }}>
                            16k PCM
                        </span>
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="rounded-xl border border-white/10 bg-[#0F0F12] p-3">
                        <div className="font-mono text-[10px] font-semibold text-[#94A3B8]">
                            COUGH SCREEN
                        </div>
                        <div className="mt-2 flex items-center gap-3">
                            <svg
                                viewBox="0 0 64 64"
                                className="h-12 w-12"
                                role="img"
                                aria-label="TB risk low at 12%"
                            >
                                <circle
                                    cx="32"
                                    cy="32"
                                    r="26"
                                    fill="none"
                                    stroke="rgba(255,255,255,0.12)"
                                    strokeWidth="6"
                                />
                                <circle
                                    cx="32"
                                    cy="32"
                                    r="26"
                                    fill="none"
                                    stroke={ACCENT}
                                    strokeWidth="6"
                                    strokeLinecap="round"
                                    strokeDasharray="19.6 163"
                                    transform="rotate(-90 32 32)"
                                />
                                <text
                                    x="32"
                                    y="36"
                                    textAnchor="middle"
                                    className="fill-white font-mono text-[10px] font-semibold"
                                >
                                    12
                                </text>
                            </svg>
                            <div>
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#94A3B8]" />
                                    Low risk
                                </div>
                                <div className="mt-0.5 font-mono text-[10px] text-[#94A3B8]">
                                    TB AUC 0.987
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-[#0F0F12] p-3">
                        <div className="font-mono text-[10px] font-semibold text-[#94A3B8]">
                            CLINICIAN BRIEF
                        </div>
                        <div className="mt-2 space-y-1.5">
                            {[
                                'Chief complaint',
                                'History of present illness',
                                'Risk & red flags',
                                'Suggested questions',
                            ].map((row, i) => (
                                <div
                                    key={row}
                                    className="flex items-center gap-2 text-[11px] text-[#A1A1AA]"
                                >
                                    <CheckCircle2
                                        className="h-3 w-3 shrink-0"
                                        style={{ color: ACCENT }}
                                    />
                                    <span
                                        className={cn(
                                            'truncate',
                                            i === 3 && 'opacity-60',
                                        )}
                                    >
                                        {row}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-2.5 border-t border-white/10 pt-2 font-mono text-[9px] font-semibold text-[#94A3B8]">
                            DE-IDENTIFIED BEFORE SEND
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between border-t border-white/10 bg-[#111114] px-4 py-2.5">
                <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] font-semibold text-[#94A3B8]">
                    {flow.map((item, i) => (
                        <span
                            key={item.step}
                            className="flex items-center gap-2"
                        >
                            {i > 0 && (
                                <ChevronDown className="h-3 w-3 rotate-[-90deg] text-white/25" />
                            )}
                            <span
                                className={cn(
                                    'flex items-center gap-1.5',
                                    item.done ? 'text-white' : 'text-white/40',
                                )}
                            >
                                {item.done && (
                                    <CheckCircle2
                                        className="h-3 w-3"
                                        style={{ color: ACCENT }}
                                    />
                                )}
                                {item.step}
                            </span>
                        </span>
                    ))}
                </div>
                <span
                    className="font-mono text-[10px] font-semibold"
                    style={{ color: ACCENT }}
                >
                    READY
                </span>
            </div>
        </div>
    );
}

const features = [
    {
        icon: AudioLines,
        title: 'Guided voice interview',
        body: 'Patients tell their story naturally to a friendly AI triage assistant. Live voice with barge-in, real-time transcripts, and a text fallback keep the interview moving.',
        tag: 'Patient experience',
    },
    {
        icon: Activity,
        title: 'Cough-based TB screening',
        body: 'A short recorded cough is embedded with HeAR and scored by a domain-aware TB classifier — a low, medium, or high risk signal in seconds.',
        tag: 'Clinical AI',
    },
    {
        icon: BrainCircuit,
        title: 'Clinician briefing',
        body: 'MedGemma synthesizes the interview and screen into an organized file — chief complaint, history, risk, suggested questions — before the door opens.',
        tag: 'Requested reading',
    },
    {
        icon: ClipboardList,
        title: 'Doctor review console',
        body: 'Live-updating list and detail views with full transcripts, cough findings, briefings, and acoustically similar cases for follow-up.',
        tag: 'Follow-up',
    },
    {
        icon: ShieldCheck,
        title: 'Consent-first design',
        body: 'A blocking consent gate precedes any microphone, camera, or capture — enforced server-side, never only in the UI.',
        tag: 'Trust',
    },
    {
        icon: FileText,
        title: 'Complete audit trail',
        body: 'Every access and external AI call is recorded in an append-only log that never stores clinical content. Privacy you can prove.',
        tag: 'Compliance',
    },
];

const steps = ['Intake', 'Interview', 'Cough', 'Brief', 'Review'];

const faqs = [
    {
        q: 'What is Respir?',
        a: 'Respir is an agentic clinical assistant for primary care. It guides patients through a private pre-visit interview, screens a recorded cough for tuberculosis risk, and hands the clinician a structured briefing before the consultation starts.',
    },
    {
        q: 'Where does patient audio and data go?',
        a: 'Cough audio and embeddings stay on your clinic hardware. Only de-identified text is sent to external models — direct identifiers like names and emails are scrubbed at the boundary and never reach Gemini or Vertex AI.',
    },
    {
        q: 'How accurate is the TB screening?',
        a: 'The cough screen is powered by Google HeAR embeddings and a domain-aware dual-head classifier with an AUC of 0.987. Results are surfaced as low, medium, or high risk for the clinician to review — never as a diagnosis.',
    },
    {
        q: 'Is consent really enforced?',
        a: 'Yes. Microphone, camera, cough capture, and live sessions all require a recorded consent on the consultation — checked server-side, so no client-side workaround can bypass it.',
    },
    {
        q: 'How long does a pre-visit take?',
        a: 'Most patients finish in about 12 minutes and answer roughly 19 questions. The clinician opens a file that is already organized.',
    },
    {
        q: 'Can I run Respir in the browser?',
        a: 'No installation is needed. The guided interview runs in the browser with live voice via the Gemini Live API, and results arrive in real time over WebSockets.',
    },
];

export default function Welcome() {
    const { auth } = usePage().props;
    const [menuOpen, setMenuOpen] = useState(false);
    const primaryHref = auth.user ? dashboard() : register();

    // Parallax Effect Hooks
    const { scrollYProgress } = useScroll();
    const parallaxY = useTransform(scrollYProgress, [0, 3], [0, -550]);

    const navLinks = [
        { href: '#features', label: 'Features' },
        { href: '#how-it-works', label: 'How it works' },
        { href: '#security', label: 'Security' },
        { href: '#faq', label: 'FAQ' },
    ];

    useEffect(() => {
        const lenis = new Lenis({
            lerp: 0.05,
            wheelMultiplier: 0.7,
            smoothWheel: true,
        });

        function raf(time: number) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);

        const handleAnchorClick = (e: MouseEvent) => {
            const target = e.currentTarget as HTMLAnchorElement;
            const href = target.getAttribute('href');

            if (href && href.startsWith('#')) {
                e.preventDefault();
                lenis.scrollTo(href, { offset: -80, duration: 1.2 });
            }
        };

        const anchorLinks = document.querySelectorAll('a[href^="#"]');
        anchorLinks.forEach((link) => {
            link.addEventListener('click', handleAnchorClick as EventListener);
        });

        return () => {
            anchorLinks.forEach((link) => {
                link.removeEventListener('click', handleAnchorClick as EventListener);
            });
            lenis.destroy();
        };
    }, []);

    return (
        <>
            <Head title="Respir — The guided pre-visit for primary care" />

            <div className="min-h-screen bg-black antialiased" style={{ fontFamily: 'Geist, sans-serif' }}>
                <header className="sticky top-0 z-40 border-b border-white/10 bg-black/80 backdrop-blur-md">
                    <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
                        <Link href={dashboard()} aria-label="Respir home">
                            <Logo />
                        </Link>

                        <motion.nav
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                            className="hidden items-center gap-3 md:flex"
                        >
                            {navLinks.map((link) => (
                                <a
                                    key={link.href}
                                    href={link.href}
                                    className="rounded-[6px] px-3 py-2 text-sm font-medium text-[#A1A1AA] transition-all duration-200 hover:scale-105 hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                                >
                                    {link.label}
                                </a>
                            ))}
                        </motion.nav>

                        <div className="hidden items-center gap-2 md:flex">
                            {auth.user ? (
                                <PrimaryButton href={primaryHref}>
                                    Open dashboard
                                </PrimaryButton>
                            ) : (
                                <>
                                    <Link
                                        href={login()}
                                        className="rounded-lg px-1 py-2.5 text-sm font-semibold text-[#e4e4e4] transition-all duration-200 hover:scale-110 hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                                    >
                                        Sign in
                                    </Link>
                                    <PrimaryButton href={register()}>
                                        Get started
                                    </PrimaryButton>
                                </>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() => setMenuOpen((open) => !open)}
                            className="rounded-lg p-2 text-[#A1A1AA] hover:bg-white/10 md:hidden"
                            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                        >
                            {menuOpen ? (
                                <X className="h-5 w-5" />
                            ) : (
                                <Menu className="h-5 w-5" />
                            )}
                        </button>
                    </div>

                    <AnimatePresence>
                        {menuOpen && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden border-t border-white/10 bg-[#0B0B0D] md:hidden"
                            >
                                <div className="px-6 py-4">
                                    <nav className="flex flex-col gap-1">
                                        {navLinks.map((link) => (
                                            <a
                                                key={link.href}
                                                href={link.href}
                                                onClick={() => setMenuOpen(false)}
                                                className="origin-left rounded-[6px] px-3 py-2 text-sm font-medium text-[#A1A1AA] transition-all duration-200 hover:scale-105 hover:text-white"
                                            >
                                                {link.label}
                                            </a>
                                        ))}
                                    </nav>
                                    <div className="mt-3 flex flex-col gap-2 border-t border-white/10 pt-3">
                                        {auth.user ? (
                                            <PrimaryButton href={primaryHref}>
                                                Open dashboard
                                            </PrimaryButton>
                                        ) : (
                                            <>
                                                <SecondaryButton href={login()}>
                                                    Sign in
                                                </SecondaryButton>
                                                <PrimaryButton href={register()}>
                                                    Get started
                                                </PrimaryButton>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </header>

                <main>
                    <section className="relative overflow-hidden">
                        {/* Efek Cahaya Senter Bulat dari Bawah */}
                        <div
                            aria-hidden
                            className="pointer-events-none absolute left-1/2 top-[45vh] h-500px w-500px -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.12),transparent_60%)] blur-2xl"
                        />

                        {/* Kontainer setinggi layar penuh */}
                        <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center pb-20 pt-8 z-10">

                            <BannerEyebrow text="Now in clinical use" />

                            {/* Jarak container atas (pt) diperkecil dari pt-10 menjadi pt-5 */}
                            <div className="relative mx-auto max-w-3xl px-6 pt-5 text-center">
                                <Reveal delay={80}>
                                    <h1

                                        className="mt-2 text-4xl font-normal tracking-[-0.02em] sm:text-5xl lg:text-6xl lg:leading-[1.08] bg-linear-to-r from-white to-neutral-400 bg-clip-text text-transparent"
                                    >
                                        Guided pre-visits,{' '}
                                        <span>
                                            before the door opens.
                                        </span>
                                    </h1>
                                </Reveal>
                                <Reveal delay={160}>
                                    <p
                                        className="mx-auto mt-6 max-w-2xl font-light text-base leading-[1.7] sm:text-lg lg:leading-[1.6]"
                                        style={{ color: MUTED }}
                                    >
                                        Respir guides patients through a private
                                        voice interview, screens a recorded
                                        cough for TB risk, and hands your
                                        clinicians an organized briefing. Less
                                        waiting-room paperwork, more time with
                                        the patient.
                                    </p>
                                </Reveal>
                                <Reveal delay={240}>
                                    <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                                        <PrimaryButton href={primaryHref}>
                                            Start a pre-visit
                                        </PrimaryButton>
                                        <SecondaryButton href="#how-it-works">
                                            See how it works
                                        </SecondaryButton>
                                    </div>
                                </Reveal>
                                <Reveal delay={320}>
                                    <p className="mt-5 flex items-center justify-center gap-2 font-mono text-[11px] font-semibold text-[#71717A]">
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        No patient identifiers leave your clinic
                                        network
                                    </p>
                                </Reveal>
                            </div>
                        </div>

                        {/* Parallax murni berbasis scroll */}
                        <motion.div
                            style={{ y: parallaxY }}
                            className="relative z-20 mx-auto w-full max-w-[95%] pb-20 xl:max-w-1200px"
                        >
                            <ProductMockup />
                        </motion.div>
                    </section>

                    <section className="border-y border-white/10 bg-[#060607]">
                        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-6 py-14 sm:grid-cols-4">
                            {[
                                { value: '12m', label: 'Average pre-visit' },
                                { value: '0.987', label: 'TB screen AUC' },
                                { value: '19', label: 'Questions per visit' },
                                {
                                    value: '4/4',
                                    label: 'Models ready in-clinic',
                                },
                            ].map((stat, i) => (
                                <Reveal key={stat.label} delay={i * 60}>
                                    <div className="text-center">
                                        <div
                                            className="font-mono text-3xl font-semibold sm:text-4xl"
                                            style={{ color: INK }}
                                        >
                                            {stat.value}
                                        </div>
                                        <div className="mt-1.5 text-xs font-medium text-[#71717A]">
                                            {stat.label}
                                        </div>
                                    </div>
                                </Reveal>
                            ))}
                        </div>
                    </section>

                    <section
                        id="features"
                        className="mx-auto max-w-6xl scroll-mt-20 px-6 py-20 lg:py-28"
                    >
                        <Reveal>
                            <div className="max-w-2xl">
                                <h2
                                    className="mt-5 text-3xl font-medium tracking-[-0.02em] sm:text-4xl"
                                    style={{ color: INK }}
                                >
                                    Everything a pre-visit needs, handled for
                                    you
                                </h2>
                                <p
                                    className="mt-4 text-base leading-[1.7]"
                                    style={{ color: MUTED }}
                                >
                                    The visit starts before the patient arrives.
                                    Respir collects the story, screens the cough,
                                    and prepares the file — so the clinician
                                    reads, not transcribes.
                                </p>
                            </div>
                        </Reveal>

                        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                            {features.map((feature, i) => (
                                <Reveal
                                    key={feature.title}
                                    delay={(i % 3) * 80}
                                >
                                    <article className="group h-full border border-white/10 bg-[#0B0B0D] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:shadow-[0_20px_40px_-24px_rgba(0,0,0,0.9)]">
                                        <div className="flex items-center justify-between">
                                            <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                                                <feature.icon
                                                    className="h-5 w-5"
                                                    style={{ color: ACCENT }}
                                                />
                                            </span>
                                            <span className="font-mono text-[10px] font-semibold tracking-wide text-[#71717A] uppercase">
                                                {feature.tag}
                                            </span>
                                        </div>
                                        <h3
                                            className="mt-5 text-lg font-semibold"
                                            style={{ color: INK }}
                                        >
                                            {feature.title}
                                        </h3>
                                        <p
                                            className="mt-2 text-sm leading-[1.7]"
                                            style={{ color: MUTED }}
                                        >
                                            {feature.body}
                                        </p>
                                    </article>
                                </Reveal>
                            ))}
                        </div>
                    </section>

                    <section
                        id="how-it-works"
                        className="scroll-mt-20 bg-[#060607]"
                    >
                        <div className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
                            <Reveal>
                                <div className="max-w-2xl">
                                    <h2
                                        className="mt-5 text-3xl font-medium tracking-[-0.02em] sm:text-4xl"
                                        style={{ color: INK }}
                                    >
                                        From waiting room to ready-to-review in
                                        minutes
                                    </h2>
                                    <p
                                        className="mt-4 text-base leading-[1.7]"
                                        style={{ color: MUTED }}
                                    >
                                        One gentle flow. Five clear stages. No
                                        forms to fill in the waiting room.
                                    </p>
                                </div>
                            </Reveal>

                            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
                                {steps.map((step, i) => (
                                    <Reveal key={step} delay={i * 80}>
                                        <div className="relative h-full border border-white/10 bg-[#0B0B0D] p-6">
                                            <div
                                                className="font-mono text-xs font-semibold"
                                                style={{ color: ACCENT }}
                                            >
                                                STEP{' '}
                                                {String(i + 1).padStart(2, '0')}
                                            </div>
                                            <h3
                                                className="mt-3 text-lg font-semibold"
                                                style={{ color: INK }}
                                            >
                                                {step}
                                            </h3>
                                            <p
                                                className="mt-2 text-sm leading-[1.7]"
                                                style={{ color: MUTED }}
                                            >
                                                {
                                                    [
                                                        'The patient checks in on a tablet in the waiting room.',
                                                        'Sage guides a private voice conversation, one question at a time.',
                                                        'A short recorded cough is screened locally for TB risk.',
                                                        'MedGemma assembles a de-identified clinician briefing.',
                                                        'The clinician reviews the organized file before the door opens.',
                                                    ][i]
                                                }
                                            </p>
                                        </div>
                                    </Reveal>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section
                        id="security"
                        className="mx-auto max-w-6xl scroll-mt-20 px-6 py-20 lg:py-28"
                    >
                        <Reveal>
                            <div className="overflow-hidden border border-white/10 bg-[#0B0B0D]">
                                <div className="grid gap-8 p-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:p-12">
                                    <div>
                                        <p className="flex items-center gap-2 font-mono text-[11px] font-semibold text-[#CBD5E1]">
                                            <ShieldCheck className="h-3.5 w-3.5" />
                                            PRIVACY BY DESIGN
                                        </p>
                                        <h2 className="mt-3 text-2xl font-medium tracking-[-0.02em] text-white sm:text-3xl">
                                            Patient data never leaves the clinic
                                            network.
                                        </h2>
                                        <p className="mt-3 max-w-xl text-base leading-[1.7] text-[#A1A1AA]">
                                            The briefing payload is scrubbed at
                                            the boundary. Names never ride the
                                            voice path. Every access and model
                                            call is recorded by the audit core,
                                            and consent gates each interaction
                                            server-side.
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            {
                                                icon: ShieldCheck,
                                                text: 'PHI stays local',
                                            },
                                            {
                                                icon: Lock,
                                                text: 'Consent enforced',
                                            },
                                            {
                                                icon: FileText,
                                                text: 'Audit trail',
                                            },
                                            {
                                                icon: Zap,
                                                text: 'De-identified sends',
                                            },
                                        ].map((tag) => (
                                            <span
                                                key={tag.text}
                                                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/90"
                                            >
                                                <tag.icon
                                                    className="h-3.5 w-3.5"
                                                    style={{ color: ACCENT }}
                                                />
                                                {tag.text}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </Reveal>
                    </section>

                    <section id="faq" className="scroll-mt-20 bg-[#060607]">
                        <div className="mx-auto max-w-3xl px-6 py-20 lg:py-28">
                            <Reveal>
                                <div className="text-center">
                                    <h2
                                        className="mt-5 text-3xl font-medium tracking-[-0.02em] sm:text-4xl"
                                        style={{ color: INK }}
                                    >
                                        Questions, answered
                                    </h2>
                                </div>
                            </Reveal>

                            <div className="mt-10 divide-y divide-white/10 border border-white/10 bg-[#0B0B0D] px-6">
                                {faqs.map((faq, i) => (
                                    <Reveal key={faq.q} delay={i * 40}>
                                        <details className="group py-5">
                                            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-white">
                                                {faq.q}
                                                <ChevronDown className="h-4 w-4 shrink-0 text-[#71717A] transition-transform duration-200 group-open:rotate-180" />
                                            </summary>
                                            <p
                                                className="mt-3 text-sm leading-[1.7]"
                                                style={{ color: MUTED }}
                                            >
                                                {faq.a}
                                            </p>
                                        </details>
                                    </Reveal>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section className="mx-auto max-w-6xl px-6 pb-20 lg:pb-28">
                        <Reveal>
                            <div className="rounded-[6px] bg-[#F4F4F5] p-10 text-black shadow-[0_40px_80px_-40px_rgba(0,0,0,0.9)] lg:p-14">
                                <div className="grid gap-8 lg:grid-cols-[1.4fr_0.6fr] lg:items-center">
                                    <div>
                                        <p className="flex items-center gap-2 font-mono text-[11px] font-semibold text-[#71717A]">
                                            <Sparkles className="h-3.5 w-3.5" />
                                            GETTING STARTED
                                        </p>
                                        <h2 className="mt-3 text-3xl font-medium tracking-[-0.02em] lg:text-4xl">
                                            Run your first guided pre-visit
                                            today
                                        </h2>
                                        <p className="mt-4 max-w-xl text-base leading-[1.7] text-[#52525B]">
                                            Create an account, open the clinic
                                            console, and start a guided
                                            interview, cough screen, and
                                            clinician briefing in minutes.
                                        </p>
                                    </div>
                                    <div className="flex flex-col gap-3 lg:items-end">
                                        <Link
                                            href={primaryHref}
                                            className="group inline-flex items-center gap-2 rounded-[6px] bg-black px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:scale-[0.98] hover:bg-[#27272A] active:scale-95"
                                        >
                                            Create account
                                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                                        </Link>
                                        <Link
                                            href={login()}
                                            className="inline-flex items-center justify-center rounded-[6px] border border-black/20 px-5 py-2.5 text-sm font-semibold text-black transition-all duration-200 hover:scale-[0.98] hover:bg-black/5 active:scale-95"
                                        >
                                            Sign in
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </Reveal>
                    </section>
                </main>

                <footer className="border-t border-white/10">
                    <div className="mx-auto max-w-6xl px-6 py-12">
                        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
                            <div className="max-w-xs">
                                <Logo />
                                <p className="mt-3 text-sm leading-[1.7] text-[#71717A]">
                                    The guided pre-visit for primary care. Voice
                                    interview, cough screening, and clinician
                                    briefing — before the door opens.
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
                                <div>
                                    <div className="font-mono text-[11px] font-semibold tracking-wide text-[#71717A] uppercase">
                                        Product
                                    </div>
                                    <ul className="mt-3 space-y-2 text-sm text-[#A1A1AA]">
                                        <li>
                                            <a
                                                href="#features"
                                                className="transition-colors hover:text-white"
                                            >
                                                Features
                                            </a>
                                        </li>
                                        <li>
                                            <a
                                                href="#how-it-works"
                                                className="transition-colors hover:text-white"
                                            >
                                                How it works
                                            </a>
                                        </li>
                                        <li>
                                            <a
                                                href="#security"
                                                className="transition-colors hover:text-white"
                                            >
                                                Security
                                            </a>
                                        </li>
                                    </ul>
                                </div>
                                <div>
                                    <div className="font-mono text-[11px] font-semibold tracking-wide text-[#71717A] uppercase">
                                        Company
                                    </div>
                                    <ul className="mt-3 space-y-2 text-sm text-[#A1A1AA]">
                                        <li>
                                            <a
                                                href="#faq"
                                                className="transition-colors hover:text-white"
                                            >
                                                FAQ
                                            </a>
                                        </li>
                                        <li>
                                            <Link
                                                href={register()}
                                                className="transition-colors hover:text-white"
                                            >
                                                Get started
                                            </Link>
                                        </li>
                                        <li>
                                            <Link
                                                href={login()}
                                                className="transition-colors hover:text-white"
                                            >
                                                Sign in
                                            </Link>
                                        </li>
                                    </ul>
                                </div>
                                <div className="hidden sm:block">
                                    <div className="font-mono text-[11px] font-semibold tracking-wide text-[#71717A] uppercase">
                                        Clinical
                                    </div>
                                    <ul className="mt-3 space-y-2 text-sm text-[#A1A1AA]">
                                        <li>TB screening AUC 0.987</li>
                                        <li>Consent enforced</li>
                                        <li>De-identified first</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-sm text-[#71717A] sm:flex-row">
                            <span>© 2026 Respir Health</span>
                            <span className="font-mono text-xs">
                                Built with Gemini Live · HeAR · MedGemma
                            </span>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}