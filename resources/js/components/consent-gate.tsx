import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
            <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto">
                <CardHeader>
                    <CardTitle>Before we start</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                    <p>
                        This pre-visit assistant helps collect your symptoms and
                        screen a cough sample before you see the doctor. Nothing
                        here is a diagnosis.
                    </p>

                    <ul className="list-disc space-y-2 pl-4 text-neutral-600 dark:text-neutral-300">
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

                    {error && <p className="text-destructive">{error}</p>}

                    <Button
                        className="w-full"
                        onClick={() => void submit()}
                        disabled={submitting}
                    >
                        {submitting && (
                            <Loader2 className="size-4 animate-spin" />
                        )}
                        {submitting
                            ? 'Recording consent…'
                            : 'I understand and consent'}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
