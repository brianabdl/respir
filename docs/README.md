# Respir Technical Documentation

This directory is the technical reference for Respir. The root
[README](../README.md) is the short introduction; everything below is the
detail behind it.

| Document                             | What it covers                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------------- |
| [ARCHITECTURE.md](ARCHITECTURE.md)   | Services, request/response paths, the boundaries the system must not cross      |
| [INSTALLATION.md](INSTALLATION.md)   | Native setup and Docker setup, step by step, with troubleshooting               |
| [CONFIGURATION.md](CONFIGURATION.md) | Every environment variable in both services and what breaks without it          |
| [API.md](API.md)                     | HTTP endpoints (Laravel and the Python service) and the Reverb WebSocket events |
| [DATA-MODEL.md](DATA-MODEL.md)       | Tables, columns, relationships, ERD, and the pgvector index                     |
| [AI-PIPELINE.md](AI-PIPELINE.md)     | Cough screening and briefing generation end to end, including failure behavior  |
| [SECURITY.md](SECURITY.md)           | Consent gate, de-identification, audit log, rate limits, signed downloads       |
| [DEPLOYMENT.md](DEPLOYMENT.md)       | Production Docker Compose stack, Caddy, Vertex AI wiring, operations            |
| [TESTING.md](TESTING.md)             | Test suites, how to run them, what each one covers, CI                          |
| [THIRD-PARTY.md](THIRD-PARTY.md)     | Third-party models, datasets, and libraries with their licenses                 |

## Reading order

If you are evaluating the project, read
[ARCHITECTURE.md](ARCHITECTURE.md) → [AI-PIPELINE.md](AI-PIPELINE.md) →
[SECURITY.md](SECURITY.md). Those three explain what the system does, how the
clinical part works, and why it is safe to point at a patient.

If you are running the project, read [INSTALLATION.md](INSTALLATION.md) →
[CONFIGURATION.md](CONFIGURATION.md) → [TESTING.md](TESTING.md).

## Conventions used in these documents

- Paths are relative to the repository root.
- `ai-service/` is the Python FastAPI microservice; everything else is the
  Laravel application unless stated otherwise.
- Commands assume a POSIX shell.
- Where a document states a threshold or a timeout, the value is the one in the
  code at the time of writing; the file and line are named so it can be checked.
