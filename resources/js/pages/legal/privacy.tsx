import { Head, Link } from '@inertiajs/react';

export default function Privacy() {
    return (
        <>
            <Head title="Privacy Policy" />

            <div className="bg-background text-foreground min-h-screen w-full">
                <div className="mx-auto max-w-2xl px-6 py-16">
                    <Link
                        href="/"
                        className="text-muted-foreground text-sm hover:underline"
                    >
                        ← Back
                    </Link>

                    <h1 className="mt-6 text-3xl font-semibold tracking-tight">
                        Privacy Policy
                    </h1>
                    <p className="text-muted-foreground mt-2 text-sm">
                        Last updated: September 2026
                    </p>

                    <div className="border-border bg-muted/50 mt-6 rounded-md border p-4 text-sm">
                        <strong>Draft notice.</strong> This is a working
                        description of what Respir actually collects and how it
                        is processed, written for the development build. It has
                        not been reviewed by legal counsel and is not a
                        substitute for formal legal advice before handling real
                        patient data.
                    </div>

                    <div className="mt-8 flex flex-col gap-8 text-sm leading-relaxed">
                        <section>
                            <h2 className="text-lg font-semibold">
                                1. What we collect
                            </h2>
                            <p className="mt-2">
                                When you register, we collect your name and
                                email address. Immediately after, we ask you to
                                complete your profile with your date of birth,
                                sex, phone number, home address, and an
                                emergency contact&rsquo;s name and phone number.
                                This information personalizes your consults and
                                lets your care team reach you or someone on your
                                behalf if needed.
                            </p>
                            <p className="mt-2">
                                During a consult, we may also collect: voice and
                                camera presence during your session, cough audio
                                recordings you submit for analysis, and the chat
                                transcript of your conversation.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-lg font-semibold">
                                2. How your health data is processed
                            </h2>
                            <p className="mt-2">
                                Voice and camera are used only for the live
                                interaction itself (via Gemini Live) &mdash;
                                they are not used for cough analysis or clinical
                                reasoning. Cough recordings are analyzed by
                                respiratory screening models (HeAR and a
                                TB-detection model) that run on our own
                                infrastructure, not a third party.
                                Case-similarity lookups use a local embedding
                                model over de-identified data.
                            </p>
                            <p className="mt-2">
                                Clinician briefings may be generated with the
                                assistance of a hosted AI model. Before any data
                                leaves our infrastructure for that purpose,
                                direct identifiers &mdash; your name and email
                                &mdash; are stripped from the request; the
                                receiving system also rejects any request that
                                still contains identifying fields.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-lg font-semibold">
                                3. Consent
                            </h2>
                            <p className="mt-2">
                                Voice, cough, and camera features are locked
                                until you explicitly consent within a given
                                consult &mdash; this is enforced on our servers,
                                not just hidden in the interface. Accepting this
                                Privacy Policy during onboarding is separate
                                from, and required in addition to, that
                                per-consult consent.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-lg font-semibold">
                                4. Who can see your data
                            </h2>
                            <p className="mt-2">
                                Your consult history and briefings are visible
                                to doctors reviewing your case through the
                                clinician console. Every access to your data and
                                every call made to an external AI service is
                                recorded in an append-only audit log. That log
                                records that an access happened, not the
                                clinical content itself.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-lg font-semibold">
                                5. Downloads and sharing
                            </h2>
                            <p className="mt-2">
                                Capture downloads use expiring, signed links and
                                are restricted to you or your treating doctor.
                                We do not sell your data or share it with
                                advertisers.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-lg font-semibold">
                                6. Your choices
                            </h2>
                            <p className="mt-2">
                                You can update your profile details at any time
                                from account settings. To request a copy or
                                deletion of your data, contact your care team
                                directly.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-lg font-semibold">
                                7. Changes to this policy
                            </h2>
                            <p className="mt-2">
                                If this policy changes in a material way,
                                we&rsquo;ll ask you to review and accept it
                                again the next time you sign in.
                            </p>
                        </section>
                    </div>
                </div>
            </div>
        </>
    );
}
