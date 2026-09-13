import io
import os

import numpy as np
import pytest
import soundfile as sf

os.environ["AI_SERVICE_TOKEN"] = "test-token"
os.environ["VERTEX_PROJECT"] = ""
os.environ["VERTEX_ENDPOINT_ID"] = ""
os.environ["PRELOAD_MODELS"] = ""

from fastapi.testclient import TestClient  # noqa: E402

from app.deps import get_medgemma, get_registry, reset_dependencies  # noqa: E402
from app.main import create_app  # noqa: E402
from tests.stubs import StubMedGemma, StubRegistry  # noqa: E402

TOKEN_HEADERS = {"X-Internal-Token": "test-token"}


def build_client(registry: StubRegistry | None = None, medgemma: StubMedGemma | None = None):
    reset_dependencies()
    app = create_app()
    app.dependency_overrides[get_registry] = lambda: registry or StubRegistry()
    app.dependency_overrides[get_medgemma] = lambda: medgemma or StubMedGemma()

    return app


@pytest.fixture
def client():
    with TestClient(build_client()) as test_client:
        yield test_client


@pytest.fixture
def wav_bytes() -> bytes:
    sample_rate = 44_100
    seconds = 1.0
    time = np.linspace(0, seconds, int(sample_rate * seconds), endpoint=False)
    tone = 0.4 * np.sin(2 * np.pi * 440 * time)
    stereo = np.stack([tone, tone], axis=1)
    buffer = io.BytesIO()
    sf.write(buffer, stereo, sample_rate, format="WAV")

    return buffer.getvalue()


@pytest.fixture
def silence_bytes() -> bytes:
    sample_rate = 44_100
    seconds = 1.0
    stereo = np.zeros((int(sample_rate * seconds), 2))
    buffer = io.BytesIO()
    sf.write(buffer, stereo, sample_rate, format="WAV")

    return buffer.getvalue()
