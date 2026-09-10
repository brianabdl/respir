import io
import subprocess

import numpy as np
import soundfile as sf

SAMPLE_RATE = 16_000


class AudioDecodeError(Exception):
    pass


def decode_to_mono_16k(data: bytes, timeout_s: int = 30) -> np.ndarray:
    try:
        result = subprocess.run(
            [
                "ffmpeg",
                "-hide_banner",
                "-loglevel",
                "error",
                "-i",
                "pipe:0",
                "-f",
                "wav",
                "-ac",
                "1",
                "-ar",
                str(SAMPLE_RATE),
                "pipe:1",
            ],
            input=data,
            capture_output=True,
            timeout=timeout_s,
            check=False,
        )
    except FileNotFoundError as exc:
        raise AudioDecodeError("ffmpeg is not installed on this host.") from exc
    except subprocess.TimeoutExpired as exc:
        raise AudioDecodeError("Audio decoding timed out.") from exc

    if result.returncode != 0 or not result.stdout:
        detail = result.stderr.decode(errors="replace").strip()[:300]
        raise AudioDecodeError(f"Could not decode audio: {detail or 'empty stream'}")

    waveform, _ = sf.read(io.BytesIO(result.stdout), dtype="float32", always_2d=False)

    if isinstance(waveform, np.ndarray) and waveform.ndim > 1:
        waveform = waveform.mean(axis=1)

    return np.asarray(waveform, dtype=np.float32)


def duration_seconds(waveform: np.ndarray) -> float:
    return round(len(waveform) / SAMPLE_RATE, 3)
