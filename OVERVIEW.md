Project Summary: Clinic AI Agent for TB Detection & Pre-Visit Assistance
Overview
An interactive agentic AI system designed to assist patients at clinics by guiding them through pre-visit interviews and performing preliminary diagnostic screening, with a specific focus on detecting Tuberculosis (TB) from cough sounds. The system combines a Laravel backend, React frontend, Python AI microservices, and pre-trained medical AI models to deliver a seamless, real-time patient experience.

Core Objective
Pre-visit anamnesis: Conduct structured patient interviews to collect chief complaints, history of present illness, and medical history.

Preliminary TB screening: Analyze cough audio using health-acoustic AI models to produce a TB risk score.

Clinician briefing: Generate a structured summary for doctors before consultation.

Interactive agent: Provide a conversational, empathetic interface for patients, with real-time feedback.

System Architecture
The system follows a hybrid microservices architecture:

Frontend (React SPA): Handles chat interface, audio recording, and real-time updates. Built with React, Vite, TypeScript, Tailwind CSS, and Laravel Echo React.

Backend (Laravel): Acts as the orchestrator. Manages authentication, session state, queues, broadcasting, and database operations. Uses Laravel AI SDK for agentic workflows.

AI Microservice (Python FastAPI): Runs heavy AI models (HeAR for audio, MedGemma for text). Communicates with Laravel via HTTP/webhooks.

Database (PostgreSQL + pgvector): Stores relational data (patients, sessions, tasks) and vector embeddings for RAG and audio similarity search.

Redis: Powers Laravel queues, caching, and Laravel Reverb for WebSocket broadcasting.

WebSocket (Laravel Reverb): Enables real-time updates from backend to frontend.

Local LLM (Ollama + MedGemma): Runs MedGemma locally for privacy-preserving clinical reasoning.

Key Components & Technologies
Component Technology / Model Purpose
Agent Orchestrator Laravel AI SDK, ClinicOrchestratorAgent Manages conversation flow, tool calling, and state.
Chat Interface React, @laravel/stream-react (useStream) Real-time streaming of AI responses.
Cough Recorder MediaRecorder API, Web Audio API Records patient cough for analysis.
Real-time Updates Laravel Reverb, @laravel/echo-react (useEcho) Pushes analysis results to frontend.
Audio AI HeAR (Google) Extracts embeddings from cough sounds.
TB Classifier XGBoost on HeAR embeddings, or pre-trained HeAR-TB Domain-Aware Dual Heads Predicts TB risk score.
Clinical LLM MedGemma (via Ollama or API) Handles text/vision reasoning, dialogue, and summarization.
Vector Search PostgreSQL + pgvector Stores embeddings for RAG and similarity search.
Queues & Cache Redis Asynchronous job processing and caching.
Pre-trained Models Utilized
HeAR (Health Acoustic Representations) – Google's foundation model for health acoustics. Available on Hugging Face: google/hear, google/hear-pytorch.

MedGemma – Google's medical vision-language model for text and images. Runs locally via Ollama.

HeAR-TB Domain-Aware Dual Heads – Pre-trained TB classifier on HeAR embeddings. Hugging Face: sach3v/Domain_aware_dual_head_HEar.

ResNet50 & VGGish – Alternative approaches for spectrogram and audio feature classification (from academic research).

CODA TB DREAM Challenge models – Various algorithms for cough-based TB screening.

Implementation Phases
Laravel Setup: Install Laravel 12+, Laravel AI SDK, configure agents and tools.

Database Setup: PostgreSQL with pgvector, create migrations for patients, sessions, and embeddings.

WebSocket Setup: Install and configure Laravel Reverb for real-time communication.

React Frontend: Set up Vite + React + TypeScript + Tailwind, integrate Laravel Echo React and streaming hooks.

Python AI Service: Build FastAPI endpoints for /analyze-cough and /analyze-text, load HeAR and MedGemma.

MedGemma Local: Install Ollama, pull medgemma model.

Redis & Queues: Configure Redis for queues and caching, run queue workers.

Integration: Connect Laravel jobs to Python microservice, broadcast results via Reverb.

Testing & Validation: Verify each service, test end-to-end flow.

Security & Privacy Considerations
Encrypt database at rest and in transit (SSL/TLS).

Use audit logging for all patient data access.

Run MedGemma locally to avoid sending sensitive data to external APIs.

Anonymize audio and text data before processing where possible.

Implement role-based access control for clinicians and admins.

Future Enhancements
Add chest X-ray analysis using MedGemma's vision capabilities.

Expand to other respiratory diseases (COVID-19, pneumonia).

Multilingual support via TranslateGemma.

Mobile app version for remote screening.

Integration with Electronic Health Records (EHR) via FHIR.

This summary captures the architectural decisions, technology stack, and key models for the Clinic AI Agent project. It can be used as a reference for development, documentation, or project onboarding.
