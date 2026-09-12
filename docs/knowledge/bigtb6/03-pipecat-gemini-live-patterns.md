# BigTB6 — Pipecat + Gemini Live backend patterns

Reusable patterns from `server/bot.py` (950 lines, all mutable state module-global).
Line refs point at the upstream file for traceability.

## Pipeline topology

```python
pipeline = Pipeline([
    transport.input(),              # Daily/WebRTC audio + video in
    latest_image_capture,           # remembers newest InputImageRawFrame
    user_turn_start,                # starts cough window on UserStartedSpeakingFrame
    context_aggregator.user(),
    llm,                            # GeminiLiveLLMService
    transport.output(),
    audio_buffer,                   # AudioBufferProcessor (user turn + track audio)
    context_aggregator.assistant(),
])
task = PipelineTask(pipeline, params=PipelineParams(enable_metrics=True),
                    idle_timeout_secs=None, cancel_on_idle_timeout=False)
```

- Ordering matters: the image-capture and turn-start processors sit _before_ the LLM
  context so they see raw frames but do not disturb conversation state.
- `audio_buffer` is placed _after_ `transport.output()`; the processor receives the
  audio flowing to the client (bot + user mix per config) — workable but surprising.
- Idle timeout is disabled; a `_shutdown_if_no_client(60)` task cancels the pipeline if
  nobody joins. `PipelineTask(...)` is wrapped in `try/except TypeError` for older
  Pipecat signatures (`bot.py:870-879`).

## Tool declarations

```python
from pipecat.adapters.schemas.function_schema import FunctionSchema
from pipecat.adapters.schemas.tools_schema import ToolsSchema

def get_record_tool() -> FunctionSchema:
    return FunctionSchema(
        name="record_cough_sound",
        description="Records the user's cough sound. Call this tool when user wants TB "
                    "analysis. It will capture 4 seconds of audio. Returns a file path. "
                    "Use this BEFORE analyze_cough_for_tb.",
        properties={},
        required=[],
    )

tools_schema = ToolsSchema(standard_tools=[
    record_tool, analyze_tool, capture_palm_tool,
    capture_eye_tool, capture_fingernail_tool, analyze_xray_tool,
])
```

Prompt rules that make tool use reliable (`05-clinical-prompt-and-flow.md`):

- tool descriptions state call ordering ("Use this BEFORE ...") and that no arguments
  are needed;
- `label` props are optional and sanitized server-side before use in filenames.

## One handler for every function

```python
llm = GeminiLiveLLMService(
    api_key=api_key,
    model="gemini-2.5-flash-native-audio-preview-12-2025",
    voice_id="Charon",
    system_instruction=SYSTEM_PROMPT,
    tools=tools_schema,
    function_call_timeout_secs=180.0,
)

async def handle_tool_calls(params: FunctionCallParams):
    if params.function_name == "record_cough_sound":
        ...
    elif params.function_name == "analyze_cough_for_tb":
        ...
    await params.result_callback({"error": f"Unknown function: {params.function_name}"})

for name in ("record_cough_sound", "analyze_cough_for_tb", "capture_palm_photo",
             "capture_eye_photo", "capture_fingernail_photo", "analyze_chest_xray"):
    llm.register_function(name, handle_tool_calls, cancel_on_interruption=False)
llm.register_function(None, handle_tool_calls)   # catch-all
```

- `cancel_on_interruption=False` keeps long-running captures from being killed by
  barge-in.
- `result_callback(...)` must always be called exactly once per invocation, including
  early returns.
- Timeout is raised to 180 s because image/X-ray calls are slow (X-ray ~2 min on CPU).

### Deferred results — `FunctionCallResultProperties`

```python
from pipecat.frames.frames import FunctionCallResultProperties

# immediate ack, do NOT make the LLM talk yet
await params.result_callback(
    {"status": "processing", "message": "Chest X-ray analysis has started."},
    properties=FunctionCallResultProperties(run_llm=False),
)

async def run_xray_analysis():
    result = await analyze_xray_file(latest_path)
    await task.queue_frames([LLMMessagesAppendFrame(messages=[{
        "role": "user",
        "content": "Chest X-ray result JSON: " + json.dumps(result) + ". Use only this data.",
    }])])

asyncio.create_task(run_xray_analysis())
```

`run_llm=False` returns the tool result without triggering a model turn; the later
`LLMMessagesAppendFrame` injects the outcome as a user message so Gemini narrates it.
Same trick is used for "recording complete" and "next check" prompts.

## Cough capture window

State machine (module globals): `awaiting_cough_after_prompt`, `is_recording_cough`,
`is_recording_cough_stream`, `got_user_track_audio`, `last_cough_record_end_ts`.

```python
class UserTurnStartProcessor(FrameProcessor):
    """Starts cough recording window when the user begins speaking."""
    async def process_frame(self, frame, direction):
        if isinstance(frame, StartFrame):
            self._started = True
        if self._started and isinstance(frame, UserStartedSpeakingFrame):
            if awaiting_cough_after_prompt and not is_recording_cough:
                asyncio.create_task(self._start_cough_callback())
        await self.push_frame(frame, direction)
```

- The tool call only _arms_ recording; capture starts when the user actually speaks,
  avoiding recording the bot's own "please cough" prompt.
- 5 s window, then stop and inject "Recording complete ... call analyze_cough_for_tb".
- 5 s cooldown via `last_cough_record_end_ts` prevents re-trigger loops.
- `record_cough_sound` asks the LLM to speak instructions (`run_llm=True`) while arming.
- WAV writer: `wave` module, mono, 16-bit, 24 kHz (`tb_audio_tool.save_audio_to_wav`).
- Empty capture → `{"error": "No audio recorded..."}` rather than a silent failure.
- `AudioBufferProcessor` config (`bot.py:764-771`):

```python
audio_buffer = AudioBufferProcessor(
    enable_turn_audio=True,
    num_channels=1,
    sample_rate=24000,
    user_continuous_stream=True,          # chunks keep flowing mid-recording
    buffer_size=24000 * 2 * 1,            # 1 s chunks so callbacks fire often
)
```

- Handlers: `on_user_turn_audio_data`, `on_audio_data`, `on_track_audio_data`. The
  track handler is the reliable source of _user-only_ audio (prefer `user_audio`);
  the turn handler is the fallback. Pipecat's callback signatures differ between minor
  versions — the upstream plan and final code disagree, so guard with `*args`/kwargs if
  porting.

## Frame capture for stills

```python
class LatestImageCaptureProcessor(FrameProcessor):
    async def process_frame(self, frame, direction):
        global latest_image_frame
        if isinstance(frame, InputImageRawFrame):
            latest_image_frame = frame          # keep only the newest frame
        await self.push_frame(frame, direction)
```

Saving a captured frame handles two encodings (`bot.py:477-487`):

```python
image_format = latest_image_frame.format or "RGB"
if image_format.startswith("image/"):
    image = Image.open(io.BytesIO(latest_image_frame.image))   # encoded PNG/JPEG
else:
    image = Image.frombytes(image_format, latest_image_frame.size,
                            latest_image_frame.image)           # raw RGB
image.save(file_path, format="PNG")
```

`maybe_capture_participant_camera(transport, client, framerate=1)` on client connect is
what populates those frames; `llm.set_video_input_paused(False)` must be called too.

## Transcript bridge (subprocess → browser SSE)

Assistant turn handler emits one stdout line per completed bot turn:

```python
@context_aggregator.assistant().event_handler("on_assistant_turn_stopped")
async def on_assistant_turn_stopped(aggregator, message):
    text = (getattr(message, "content", "") or "").strip()
    if text:
        print(f"BOT_TEXT:{json.dumps({'text': text, 'room_url': room_url})}")
```

FastAPI (`main.py`) reads the bot subprocess pipes on threads, parses `BOT_TEXT:` lines,
and fans them out to `/events` SSE subscribers. Each event carries `room_url` so the
client discards transcripts from a previous session (`page.tsx:221-229`). Subscribers
live in a module-level `set[asyncio.Queue]`; removal happens in the generator's
`finally`.

## Raw Gemini Live WebSocket alternative (no Pipecat)

`gemini-live.py` is a standalone client (PyAudio + `websockets`) for the same
`gemini-2.5-flash-native-audio-preview-12-2025` model. Useful when you need a minimal
reference for the wire protocol:

- setup frame with `response_modalities: ["AUDIO"]`, voice config, `system_instruction`,
  `tools[].function_declarations`;
- `realtimeInput.mediaChunks` with `audio/pcm;rate=16000` and `image/jpeg` chunks;
- `toolCall` → `toolResponse.functionResponses` with `id` + `name`;
- 24 kHz PCM out, buffered and drained by a PyAudio callback.

`function_helper.py` (copied to `reference/`) turns plain Python functions into Gemini
function declarations via signature + docstring reflection, and dispatches calls,
including async ones. Handy for prototypes, not for the browser-direct stack used here.
