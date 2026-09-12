# Reference modules (verbatim snapshots)

Copied 2026-09-10 from [Sidharth1743/BigTb6](https://github.com/Sidharth1743/BigTb6)
commit `549abb8`, MIT licensed. These are **unchanged upstream files** kept for quick
adaptation; read `../06-lessons-and-pitfalls.md` before using them.

| File                  | Purpose                                                                                                | Known issues                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `tb_audio_tool.py`    | WAV writer + HeAR TB `/predict` client + `AudioCapture` helper                                         | `analyze_cough_file` returns nested `{"result": {...}}`; interpretation thresholds hardcoded |
| `palm_anemia_tool.py` | Palm anemia `/predict` client                                                                          | no timeout set; `file` field                                                                 |
| `eye_anemia_tool.py`  | Eye anemia client                                                                                      | default URL points at the **respira-medsiglip** service, not an eye model                    |
| `nail_anemia_tool.py` | Nail anemia client                                                                                     | API expects multipart field **`image`**, unlike the others                                   |
| `chest_xray_tool.py`  | Chest X-ray `/analyze-tb` client                                                                       | 180 s timeout; response schema in `../02-model-inventory-and-apis.md`                        |
| `xray_store.py`       | Latest-X-ray path handoff between FastAPI and bot                                                      | file-based global state; session-unsafe                                                      |
| `function_helper.py`  | Reflection-based Gemini function declarations/dispatch for the raw WebSocket client (`gemini-live.py`) | `create_function_declarations_from_file` only reads Google/NumPy-style docstrings            |

## Porting notes

- Replace `aiohttp` sessions with the `ai-service` HTTP client conventions and map
  `{"result": ...}` / `{"error": ...}` to the repo's `{error:{code,message,retryable}}`
  envelope.
- Keep the per-service multipart field names and timeouts.
- `save_audio_to_wav` (16-bit PCM, mono, configurable rate) is directly reusable.
- The anemia/X-ray services are unauthenticated public endpoints; for production,
  self-host the HF weights in `ai-service` rather than calling them.
