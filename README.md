<h1 align="center">Respir</h1>

<p align="center">
  <strong>Agentic AI-powered acoustic screening for early tuberculosis detection.</strong><br/>
  A guided voice pre-visit, a cough-based TB screen, and a structured clinician briefing — before the door opens.
</p>

<p align="center">
  <a href="https://respir.brianabdl.my.id"><strong>Live demo →</strong></a> ·
  <a href="docs/">Technical documentation</a> ·
  <a href="docs/INSTALLATION.md">Installation</a> ·
  <a href="docs/API.md">API</a>
</p>

<p align="center">
  <img alt="Laravel 13" src="https://img.shields.io/badge/Laravel-13-FF2D20?logo=laravel&logoColor=white">
  <img alt="PHP 8.5" src="https://img.shields.io/badge/PHP-8.5-777BB4?logo=php&logoColor=white">
  <img alt="React 19" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black">
  <img alt="Python 3.12" src="https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white">
  <img alt="PostgreSQL + pgvector" src="https://img.shields.io/badge/PostgreSQL-18%20%2B%20pgvector-4169E1?logo=postgresql&logoColor=white">
  <img alt="License MIT" src="https://img.shields.io/badge/License-MIT-green">
</p>

## The problem

Indonesia carries about 10% of the global tuberculosis burden, second only to
India. Roughly 1,090,000 new cases and 125,000 deaths are estimated each year,
while around 885,000 cases were actually found in 2024. The rest went
undiagnosed, untreated, and still infectious.

The bottleneck is triage, not treatment. Xpert cartridges, culture, and chest
X-ray are too scarce to give to everyone who walks in with a cough, so somebody
has to decide who gets tested first — and today that decision is made
informally, by whichever clinician is on duty.

## What Respir does

Respir is a **triage layer that runs before confirmatory testing** and costs
close to nothing per patient.

1. **Guided voice interview.** The patient talks to Sage, an AI voice agent that
   asks pre-visit questions one at a time, handles interruptions, and records
   the transcript.
2. **Cough screen.** The patient coughs toward an ordinary phone or clinic
   microphone. The recording is analyzed locally into a `low` / `medium` /
   `high` / `unclear` TB risk band.
3. **Clinician briefing.** The doctor opens a decision-ready summary — chief
   complaint, history, risk factors, cough findings, suggested questions, red
   flags — plus a similarity lookup against comparable past coughs.

No specialist hardware, no laboratory, no trained operator.

## Live demo

**https://respir.brianabdl.my.id**

Register an account to walk through the patient flow. The demo instance runs the
real ML stack on CPU with no GPU and no Vertex AI endpoint, so briefings are
template-generated and marked `degraded`, and the personal cough gate is
untrained — meaning non-cough audio can still receive a score. Those are the
documented degraded modes, not bugs; see
[AI-PIPELINE.md](docs/AI-PIPELINE.md#degradation-summary).

> **Respir is a screening aid, not a diagnostic device.** It is not cleared or
> approved by any medical regulator, and its thresholds have not been validated
> against microbiological reference standards.

## Architecture

Full detail: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Team

Built for the **GAYATAMA 5 International Web Technology Competition**,
Universitas Negeri Surabaya — theme _"Innovating for a Sustainable Future:
Empowering Communities through Web Technology."_

- Muhammad Brian Abdillah
- Candra Febriyanto
- Adam Nirvana
- Abdullah Masykur

## Acknowledgments

Respir builds on Google's HeAR and MedGemma (Health AI Developer Foundations),
EmbeddingGemma, a community TB dual-head classifier, and the Laravel, React, and
FastAPI ecosystems. Models and libraries carry their own licenses — see
[docs/THIRD-PARTY.md](docs/THIRD-PARTY.md).

Development used AI-assisted tooling, and its configuration is committed
deliberately (`CLAUDE.md`, `AGENTS.md`, `.ai/rules/`, `boost.json`) so the
workflow is reproducible. Those files affect development only, not the running
application.

## License

[MIT](LICENSE).
