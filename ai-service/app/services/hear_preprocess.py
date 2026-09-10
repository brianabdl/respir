"""HeAR audio preprocessing.

Ported from the HeAR reference implementation (Apache-2.0):
https://github.com/google-health/hear/blob/master/python/data_processing/audio_utils.py

Turns a 2-second 16 kHz mono clip into the 192x128 single-channel mel-PCEN
image expected by ``google/hear-pytorch``.
"""

import math
from collections.abc import Callable

import torch
import torch.nn.functional as F

SAMPLE_RATE = 16000
CLIP_SAMPLES = 32000


def _enclosing_power_of_two(value: int) -> int:
    return int(2 ** math.ceil(math.log2(value))) if value > 0 else 1


def _compute_stft(
    signals: torch.Tensor,
    frame_length: int,
    frame_step: int,
    fft_length: int | None = None,
    window_fn: Callable[[int], torch.Tensor] | None = torch.hann_window,
    pad_end: bool = True,
) -> torch.Tensor:
    if fft_length is None:
        fft_length = _enclosing_power_of_two(frame_length)

    if pad_end:
        n_frames = math.ceil(signals.shape[-1] / frame_step) if signals.shape[-1] > 0 else 0
        padded_length = (
            max(0, (n_frames - 1) * frame_step + frame_length) if n_frames > 0 else frame_length
        )
        padding_needed = max(0, padded_length - signals.shape[-1])

        if padding_needed > 0:
            signals = F.pad(signals, (0, padding_needed))

    framed_signals = signals.unfold(-1, frame_length, frame_step)

    if framed_signals.shape[-2] == 0:
        return torch.empty(
            *signals.shape[:-1],
            0,
            fft_length // 2 + 1,
            dtype=torch.complex64,
            device=signals.device,
        )

    if window_fn is not None:
        window = window_fn(frame_length).to(framed_signals.device).to(framed_signals.dtype)
        framed_signals = framed_signals * window

    return torch.fft.rfft(framed_signals, n=fft_length, dim=-1)


def _ema(
    inputs: torch.Tensor,
    num_channels: int,
    smooth_coef: float,
    initial_state: torch.Tensor | None = None,
) -> torch.Tensor:
    batch_size, timesteps, _ = inputs.shape

    if initial_state is None:
        ema_state = torch.zeros(
            (batch_size, num_channels), dtype=torch.float32, device=inputs.device
        )
    else:
        ema_state = initial_state

    identity_kernel_gain = smooth_coef
    identity_recurrent_gain = 1.0 - smooth_coef

    identity_kernel = (
        torch.eye(num_channels, dtype=torch.float32, device=inputs.device) * identity_kernel_gain
    )
    identity_recurrent_kernel = (
        torch.eye(num_channels, dtype=torch.float32, device=inputs.device)
        * identity_recurrent_gain
    )

    output_sequence = []

    start = initial_state is not None

    if start:
        output_sequence.append(ema_state)

    for t in range(start, timesteps):
        current_input = inputs[:, t, :]
        output = torch.matmul(current_input, identity_kernel) + torch.matmul(
            ema_state, identity_recurrent_kernel
        )
        ema_state = output
        output_sequence.append(output)

    return torch.stack(output_sequence, dim=1)


def _pcen_function(
    inputs: torch.Tensor,
    num_channels: int = 128,
    alpha: float = 0.8,
    smooth_coef: float = 0.04,
    delta: float = 2.0,
    root: float = 2.0,
    floor: float = 1e-8,
) -> torch.Tensor:
    alpha_param = torch.ones(num_channels) * alpha
    delta_param = torch.ones(num_channels) * delta
    root_param = torch.ones(num_channels) * root

    delta_param = delta_param.to(inputs.device).to(inputs.dtype)
    alpha_param = (
        torch.minimum(alpha_param, torch.ones_like(alpha_param)).to(inputs.device).to(inputs.dtype)
    )
    root_param = (
        torch.maximum(root_param, torch.ones_like(root_param)).to(inputs.device).to(inputs.dtype)
    )

    ema_smoother = _ema(
        inputs,
        num_channels=num_channels,
        smooth_coef=smooth_coef,
        initial_state=inputs[:, 0] if inputs.ndim > 1 else None,
    ).to(inputs.device)

    one_over_root = 1.0 / root_param

    return (
        inputs / (floor + ema_smoother) ** alpha_param + delta_param
    ) ** one_over_root - delta_param**one_over_root


def _hertz_to_mel(frequencies_hertz: torch.Tensor) -> torch.Tensor:
    return 2595.0 * torch.log10(1.0 + frequencies_hertz / 700.0)


def _linear_to_mel_weight_matrix(
    device: torch.device,
    num_mel_bins: int = 128,
    num_spectrogram_bins: int = 201,
    sample_rate: float = 16000,
    lower_edge_hertz: float = 0.0,
    upper_edge_hertz: float = 8000.0,
    dtype: torch.dtype = torch.float32,
) -> torch.Tensor:
    sample_rate_tensor = torch.tensor(sample_rate, dtype=dtype)
    lower_edge_hertz_tensor = torch.tensor(lower_edge_hertz, dtype=dtype, device=device)
    upper_edge_hertz_tensor = torch.tensor(upper_edge_hertz, dtype=dtype, device=device)
    zero = torch.tensor(0.0, dtype=dtype, device=device)

    bands_to_zero = 1
    nyquist_hertz = sample_rate_tensor / 2.0
    linear_frequencies = torch.linspace(
        zero, nyquist_hertz, num_spectrogram_bins, dtype=dtype, device=device
    )[bands_to_zero:]
    spectrogram_bins_mel = _hertz_to_mel(linear_frequencies).unsqueeze(1)

    band_edges_mel = torch.linspace(
        _hertz_to_mel(lower_edge_hertz_tensor),
        _hertz_to_mel(upper_edge_hertz_tensor),
        num_mel_bins + 2,
        dtype=dtype,
        device=device,
    )
    band_edges_mel = band_edges_mel.unfold(0, 3, 1)

    lower_edge_mel = band_edges_mel[:, 0].unsqueeze(0)
    center_mel = band_edges_mel[:, 1].unsqueeze(0)
    upper_edge_mel = band_edges_mel[:, 2].unsqueeze(0)

    lower_slopes = (spectrogram_bins_mel - lower_edge_mel) / (center_mel - lower_edge_mel)
    upper_slopes = (upper_edge_mel - spectrogram_bins_mel) / (upper_edge_mel - center_mel)

    mel_weights_matrix = torch.maximum(zero, torch.minimum(lower_slopes, upper_slopes))

    return F.pad(mel_weights_matrix, (0, 0, bands_to_zero, 0), mode="constant", value=0.0)


def _mel_pcen(x: torch.Tensor) -> torch.Tensor:
    x = x.float()
    x -= torch.min(x)
    x = x / (torch.max(x) + 1e-8)
    x = (x * 2) - 1

    frame_length = 16 * 25
    frame_step = 160

    stft = _compute_stft(
        x,
        frame_length=frame_length,
        fft_length=frame_length,
        frame_step=frame_step,
        window_fn=torch.hann_window,
        pad_end=True,
    )
    spectrograms = torch.square(torch.abs(stft))

    mel_transform = _linear_to_mel_weight_matrix(x.device)
    mel_spectrograms = torch.matmul(spectrograms, mel_transform)

    return _pcen_function(mel_spectrograms)


def _torch_resize_bilinear_tf_compat(
    images: torch.Tensor, size: tuple[int, int]
) -> torch.Tensor:
    original_dims = images.dim()
    new_height, new_width = size

    if original_dims not in (3, 4):
        raise ValueError("Input tensor must be 3D [C, H, W] or 4D [B, C, H, W]")

    images = images.to(torch.float32)

    was_3d = False

    if original_dims == 3:
        images = images.unsqueeze(0)
        was_3d = True

    resized = F.interpolate(
        images,
        size=(new_height, new_width),
        mode="bilinear",
        align_corners=False,
        antialias=False,
    )

    return resized.squeeze(0) if was_3d else resized


def preprocess_audio(audio: torch.Tensor) -> torch.Tensor:
    if audio.ndim != 2:
        raise ValueError(f"Input audio must have rank 2, got rank {audio.ndim}")

    if audio.shape[1] < CLIP_SAMPLES:
        n = CLIP_SAMPLES - audio.shape[1]
        audio = torch.nn.functional.pad(audio, pad=(0, n), mode="constant", value=0)
    elif audio.shape[1] > CLIP_SAMPLES:
        raise ValueError(f"Input audio must have {CLIP_SAMPLES} samples, got {audio.shape[1]}")

    spectrogram = _mel_pcen(audio)
    spectrogram = torch.unsqueeze(spectrogram, dim=1)

    return _torch_resize_bilinear_tf_compat(spectrogram, size=(192, 128))
