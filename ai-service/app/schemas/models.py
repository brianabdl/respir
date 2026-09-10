from typing import Literal

from pydantic import BaseModel, ConfigDict


class ErrorDetail(BaseModel):
    code: str
    message: str
    retryable: bool


class ErrorEnvelope(BaseModel):
    error: ErrorDetail


RiskLevel = Literal["low", "medium", "high", "unclear"]

AnemiaPart = Literal["palm", "eye", "nail"]


class TranscriptTurn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: Literal["user", "assistant"]
    text: str


class CoughSummary(BaseModel):
    risk_level: RiskLevel
    findings: str
    recommendation: str


class CoughModelInfo(BaseModel):
    name: str
    version: str
    available: bool = True


class CoughAnalysisResponse(BaseModel):
    risk_level: RiskLevel
    risk_score: float | None
    findings: str
    recommendation: str
    embedding: list[float]
    model: CoughModelInfo
    duration_s: float


class AnemiaModelInfo(BaseModel):
    name: str
    version: str
    available: bool = True


class AnemiaAnalysisResponse(BaseModel):
    part: AnemiaPart
    risk_level: RiskLevel
    risk_score: float | None
    prediction: str
    threshold: float | None
    findings: str
    recommendation: str
    model: AnemiaModelInfo


class AnemiaSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    part: AnemiaPart
    risk_level: RiskLevel
    risk_score: float | None = None
    findings: str


class BriefingRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    subject_token: str
    age: int | None = None
    sex: Literal["female", "male", "other", "unknown"] | None = None
    risk_factors: list[str] = []
    transcript: list[TranscriptTurn] = []
    cough: CoughSummary | None = None
    anemia: list[AnemiaSummary] = []


class BriefingResponse(BaseModel):
    chief_complaint: str
    history: str
    risk_factors: list[str]
    cough_findings: str
    anemia_findings: str = ""
    suggested_questions: list[str]
    red_flags: list[str]
    disclaimer: str
    degraded: bool = False
    generated_by: str


class AudioEmbeddingResponse(BaseModel):
    embedding: list[float]
    dim: int
    model: str


class TextEmbeddingRequest(BaseModel):
    texts: list[str]


class TextEmbeddingResponse(BaseModel):
    embeddings: list[list[float]]
    dim: int
    model: str


class ModelState(BaseModel):
    name: str
    loaded: bool
    detail: str | None = None


class VertexState(BaseModel):
    configured: bool
    mode: Literal["endpoint", "fake"]
    model: str


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"]
    device: str
    models: dict[str, ModelState]
    vertex: VertexState
