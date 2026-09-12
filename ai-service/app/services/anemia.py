"""Local anemia screening from palm, eye and fingernail images.

Palm and eye use the MedSigLIP linear probes published by ``Sidharth1743``
(SigLIP vision encoder + standardised linear head). Fingernails use the
``JetX-GT`` handcrafted-colour-feature MLP. Weights are downloaded on demand
from Hugging Face and cached by the hub; nothing leaves this service.
"""

from __future__ import annotations

import json
import math
import warnings
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image

from app.config import Settings
from app.errors import ModelNotAvailable
from app.schemas.models import AnemiaPart, RiskLevel

IMAGE_SIZE = 448
NAIL_SIZE = 224


@dataclass(frozen=True)
class AnemiaPrediction:
    part: AnemiaPart
    probability: float
    threshold: float
    label: str
    risk_level: RiskLevel
    model_name: str
    model_version: str


def _letterbox(image: Image.Image, size: int = IMAGE_SIZE) -> Image.Image:
    image = image.convert("RGB")
    width, height = image.size
    scale = min(size / width, size / height)
    new_size = (max(1, round(width * scale)), max(1, round(height * scale)))
    resized = image.resize(new_size, Image.Resampling.BILINEAR)
    canvas = Image.new("RGB", (size, size), (0, 0, 0))
    canvas.paste(resized, ((size - new_size[0]) // 2, (size - new_size[1]) // 2))

    return canvas


def _risk_level(probability: float, threshold: float) -> RiskLevel:
    return "high" if probability >= threshold else "low"


class MedSiglipProbe:
    """MedSigLIP encoder with a standardised linear anemia head."""

    def __init__(
        self, settings: Settings, repo_id: str, threshold: float, part: AnemiaPart
    ) -> None:
        self._settings = settings
        self._repo_id = repo_id
        self._threshold = threshold
        self._part = part
        self._device = "cpu"
        self._vision: Any = None
        self._weight: np.ndarray | None = None
        self._bias: float = 0.0
        self._mean: np.ndarray | None = None
        self._std: np.ndarray | None = None

    @property
    def is_loaded(self) -> bool:
        return self._vision is not None

    def load(self) -> None:
        try:
            import joblib
            import torch
            from huggingface_hub import hf_hub_download
            from transformers import SiglipVisionModel
        except ImportError as exc:
            raise ModelNotAvailable(
                f"anemia_{self._part}",
                "install the ml extras with: uv sync --extra ml",
            ) from exc

        from app.ml.device import detect_device

        self._device = detect_device(self._settings.ai_device)

        kwargs: dict[str, Any] = {"token": self._settings.hf_token or None}

        if self._settings.model_cache_dir:
            kwargs["cache_dir"] = self._settings.model_cache_dir

        try:
            self._vision = (
                SiglipVisionModel.from_pretrained(
                    self._repo_id,
                    subfolder="artifacts/vision_model",
                    **kwargs,
                )
                .to(self._device)
                .eval()
            )

            head_path = hf_hub_download(
                self._repo_id, "artifacts/linear_head.pt", **kwargs
            )
            state = torch.load(head_path, map_location="cpu", weights_only=True)
            self._weight = state["weight"].reshape(-1).float().numpy()
            self._bias = float(state["bias"].reshape(-1)[0])

            scaler_path = hf_hub_download(
                self._repo_id, "artifacts/scaler.joblib", **kwargs
            )
            scaler = joblib.load(scaler_path)
            self._mean = np.asarray(scaler["mean"], dtype=np.float32).reshape(-1)
            std = np.asarray(scaler["std"], dtype=np.float32).reshape(-1)
            self._std = np.where(std < 1e-6, 1.0, std)

            config_path = hf_hub_download(
                self._repo_id, "artifacts/config.json", **kwargs
            )
            config = json.loads(Path(config_path).read_text(encoding="utf-8"))
            self._threshold = float(config.get("threshold", self._threshold))
        except Exception as exc:
            self._vision = None
            raise ModelNotAvailable(f"anemia_{self._part}", str(exc)[:300]) from exc

    def close(self) -> None:
        self._vision = None
        self._weight = None
        self._mean = None
        self._std = None

    def predict(self, image: Image.Image) -> tuple[float, float]:
        if self._vision is None:
            self.load()

        import torch

        pixels = np.asarray(_letterbox(image), dtype=np.float32) / 255.0 * 2.0 - 1.0
        tensor = torch.from_numpy(pixels).permute(2, 0, 1).unsqueeze(0).to(self._device)

        with torch.no_grad():
            pooled = self._vision(pixel_values=tensor).pooler_output

        vector = pooled.squeeze(0).float().cpu().numpy()
        norm = float(np.linalg.norm(vector))

        if norm > 0:
            vector = vector / norm

        assert self._mean is not None and self._std is not None
        standardised = (vector - self._mean) / self._std
        logit = float(np.dot(self._weight, standardised)) + self._bias
        probability = 1.0 / (1.0 + math.exp(-logit))

        return probability, self._threshold


def _nail_features(image: Image.Image) -> np.ndarray:
    from scipy.ndimage import uniform_filter

    arr = np.asarray(image.convert("RGB").resize((NAIL_SIZE, NAIL_SIZE)), dtype=float)
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    brightness = 0.299 * r + 0.587 * g + 0.114 * b

    features: list[float] = []
    features.extend([brightness.mean(), brightness.std()])
    features.extend([float(np.percentile(brightness, p)) for p in (10, 25, 50, 75, 90)])

    redness = r / (r + g + b + 1e-10)
    features.extend([redness.mean(), redness.std()])

    white_ratio = (brightness > 180).sum() / brightness.size
    pink_ratio = ((r > 150) & (g < 150) & (b < 150)).sum() / brightness.size
    features.extend([white_ratio, pink_ratio])

    for channel in (r, g, b):
        features.extend([channel.mean(), channel.std()])

    features.extend(
        [
            (r.mean() + 1) / (g.mean() + 1),
            (r.mean() + 1) / (b.mean() + 1),
            (r.mean() - b.mean()) / 255,
        ]
    )

    hb = r / (g + b + 1)
    features.extend([hb.mean(), hb.std()])

    height, width = arr.shape[:2]
    top = brightness[: height // 3, :].mean()
    bottom = brightness[2 * height // 3 :, :].mean()
    features.append(top - bottom)

    center = brightness[height // 4 : 3 * height // 4, width // 4 : 3 * width // 4].mean()
    features.append(center - brightness.mean())

    gx = np.abs(np.diff(brightness, axis=1, prepend=brightness[:, :1]))
    gy = np.abs(np.diff(brightness, axis=0, prepend=brightness[:1, :]))
    gradient = np.sqrt(gx**2 + gy**2)
    features.extend([gradient.mean(), gradient.std()])

    local_mean = uniform_filter(brightness, size=7)
    local_var = np.maximum(uniform_filter((brightness - local_mean) ** 2, size=7), 0)
    features.extend([np.sqrt(local_var).mean(), np.sqrt(local_var).std()])

    return np.asarray(features, dtype=np.float32)


class NailProbe:
    """Handcrafted colour-feature MLP for fingernail anemia screening."""

    def __init__(self, settings: Settings, repo_id: str, threshold: float) -> None:
        self._settings = settings
        self._repo_id = repo_id
        self._threshold = threshold
        self._model: Any = None
        self._scaler: Any = None

    @property
    def is_loaded(self) -> bool:
        return self._model is not None

    def load(self) -> None:
        try:
            import joblib
            from huggingface_hub import hf_hub_download
        except ImportError as exc:
            raise ModelNotAvailable(
                "anemia_nail", "install the ml extras with: uv sync --extra ml"
            ) from exc

        kwargs: dict[str, Any] = {"token": self._settings.hf_token or None}

        if self._settings.model_cache_dir:
            kwargs["cache_dir"] = self._settings.model_cache_dir

        try:
            model_path = hf_hub_download(self._repo_id, "mlp_model.joblib", **kwargs)
            scaler_path = hf_hub_download(self._repo_id, "feature_scaler.joblib", **kwargs)
            metadata_path = hf_hub_download(self._repo_id, "model_metadata.json", **kwargs)

            # Nail artifact predates the service's scikit-learn 1.8 runtime.
            # It is trusted and validated by the probe contract; suppress only
            # its known estimator-version warning during deserialization.
            with warnings.catch_warnings():
                warnings.filterwarnings(
                    "ignore",
                    message="Trying to unpickle estimator .* from version 1.7.2",
                    category=UserWarning,
                )
                self._model = joblib.load(model_path)
                self._scaler = joblib.load(scaler_path)

            metadata = json.loads(Path(metadata_path).read_text(encoding="utf-8"))
            self._threshold = float(metadata.get("optimal_threshold", self._threshold))
        except Exception as exc:
            self._model = None
            raise ModelNotAvailable("anemia_nail", str(exc)[:300]) from exc

    def predict(self, image: Image.Image) -> tuple[float, float]:
        if self._model is None:
            self.load()

        features = _nail_features(image).reshape(1, -1)
        scaled = self._scaler.transform(features)
        probability = float(self._model.predict_proba(scaled)[0, 1])

        return probability, self._threshold

    def close(self) -> None:
        self._model = None
        self._scaler = None


class AnemiaClassifier:
    name = "anemia"
    version = "medsiglip-linear-probe"

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._probes: dict[AnemiaPart, MedSiglipProbe | NailProbe] = {
            "palm": MedSiglipProbe(
                settings,
                settings.anemia_palm_model,
                settings.anemia_palm_threshold,
                "palm",
            ),
            "eye": MedSiglipProbe(
                settings,
                settings.anemia_eye_model,
                settings.anemia_eye_threshold,
                "eye",
            ),
            "nail": NailProbe(
                settings,
                settings.anemia_nail_model,
                settings.anemia_nail_threshold,
            ),
        }

    @property
    def is_loaded(self) -> bool:
        return all(probe.is_loaded for probe in self._probes.values())

    def load(self) -> None:
        for probe in self._probes.values():
            if not probe.is_loaded:
                probe.load()

    def predict(self, part: AnemiaPart, image: Image.Image) -> AnemiaPrediction:
        probe = self._probes[part]
        probability, threshold = probe.predict(image)
        positive = probability >= threshold

        return AnemiaPrediction(
            part=part,
            probability=probability,
            threshold=threshold,
            label="Anemia" if positive else "Non-Anemia",
            risk_level=_risk_level(probability, threshold),
            model_name=self.model_name(part),
            model_version=self.model_version(part),
        )

    def model_name(self, part: AnemiaPart) -> str:
        if part == "palm":
            return self._settings.anemia_palm_model

        if part == "eye":
            return self._settings.anemia_eye_model

        return self._settings.anemia_nail_model

    def model_version(self, part: AnemiaPart) -> str:
        return "handcrafted-mlp" if part == "nail" else "medsiglip-linear-probe"

    def close(self) -> None:
        for probe in self._probes.values():
            probe.close()
