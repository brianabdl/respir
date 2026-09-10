def detect_device(preference: str = "auto") -> str:
    if preference in {"cpu", "cuda"}:
        return preference

    try:
        import torch

        return "cuda" if torch.cuda.is_available() else "cpu"
    except Exception:
        return "cpu"
