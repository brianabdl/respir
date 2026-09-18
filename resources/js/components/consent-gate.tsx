import { useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import ConsultationController from '@/actions/App/Http/Controllers/Consult/ConsultationController';

export default function ConsentGate({
    consultationId,
    onConsented,
}: {
    consultationId: number;
    onConsented: () => void;
}) {
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function submit(): Promise<void> {
        setSubmitting(true);
        setError(null);

        try {
            const response = await fetch(
                ConsultationController.consent.url({
                    consultation: consultationId,
                }),
                {
                    method: 'POST',
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                        Accept: 'application/json',
                    },
                },
            );

            if (!response.ok) {
                throw new Error('consent failed');
            }

            onConsented();
        } catch {
            setError('We could not record your consent. Please try again.');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[14px] border border-white/10 bg-[#0B0B0D] text-white shadow-[0_40px_80px_-40px_rgba(0,0,0,0.9)]">
                <div className="border-b border-white/10 p-6">
                    <p className="flex items-center gap-2 font-mono text-[10px] font-semibold tracking-widest text-[#94A3B8] uppercase">
                        <ShieldCheck className="size-3.5" />
                        Before we start
                    </p>
                    <img
                        src="/Respir logo.png"
                        alt="Respir"
                        className="mt-3 h-5 w-auto"
                    />
                </div>
                <div className="space-y-4 p-6 text-sm">
                    <p className="text-[#D4D4D8]">
                        This pre-visit assistant helps collect your symptoms and
                        screen a cough sample before you see the doctor. Nothing
                        here is a diagnosis.
                    </p>

                    <ul className="list-disc space-y-2 pl-4 text-[#A1A1AA]">
                        <li>
                            The live voice conversation (and camera if you turn
                            it on) is processed by Google Gemini for this
                            session only. It is not stored externally.
                        </li>
                        <li>
                            Your cough recording is analysed locally on the
                            clinic&apos;s own AI service.
                        </li>
                        <li>
                            Cough findings and de-identified clinical notes are
                            sent to our Google Vertex AI MedGemma service to
                            write an explanation and a briefing for your doctor.
                            Your name and contact details are removed first.
                        </li>
                        <li>
                            Recordings and photos are stored locally so your
                            doctor can review them. You can stop the camera or
                            voice session at any time.
                        </li>
                    </ul>

                    {error && <p className="text-sm text-[#F87171]">{error}</p>}

                    <button
                        type="button"
                        onClick={() => void submit()}
                        disabled={submitting}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-[14px] bg-white px-4 py-2.5 text-sm font-semibold text-black transition-all duration-200 hover:scale-[1.02] hover:bg-[#CBD5E1] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
                    >
                        {submitting && (
                            <Loader2 className="size-4 animate-spin" />
                        )}
                        {submitting
                            ? 'Recording consent…'
                            : 'I understand and consent'}
                    </button>
                </div>
            </div>
        </div>
    );
}
