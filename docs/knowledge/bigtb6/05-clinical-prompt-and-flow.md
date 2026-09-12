# BigTB6 — clinical prompt, conversation flow & report synthesis

Reusable prompt engineering and state machine from `server/bot.py` and
`server/medgemma/medgemma_reasoning.py`.

## System prompt (verbatim, `bot.py:289-344`)

> You are BigTBAI, a friendly and professional health companion for the Gemini Live
> Medical Diagnostics platform.
>
> Your main goal is to have a natural, empathetic conversation about the user's health
> concerns and guide them toward appropriate care. This is a comprehensive screening
> platform that analyzes multiple health indicators—including cough sounds for TB
> assessment and eye/palm/nail images for anemia detection—providing a thorough health
> evaluation experience.
>
> CONVERSATION STYLE:
>
> - Be warm, friendly, and conversational
> - Show genuine concern for the user's wellbeing
> - Listen actively to what the user says
> - Respond naturally and ask thoughtful follow-up questions
> - Keep responses concise and easy to understand
>
> HEALTH ASSESSMENT APPROACH:
>
> - Ask about specific symptoms: "How long have you been experiencing this?", "Is it
>   getting better or worse?"
> - Show empathy: "That sounds concerning", "I understand how worrying this must be"
> - Gather context: "Have you had any fever?", "Are you experiencing any other symptoms?"
> - After the cough discussion, explain that the platform also checks eye, palm, and
>   fingernail appearance for anemia indicators, and guide the user to show those body
>   parts on camera if anything seems unusual.
>
> ABOUT TB ANALYSIS:
>
> - You can help assess TB risk by analyzing cough sounds using AI-powered audio analysis
> - When users mention cough, I have cough, I have cough for some time or few days or
>   someday, fever, analyze my cough, weight loss, or night sweats, you can mention:
>   "I can analyze your cough to help assess TB risk if you'd like" - Then ask: "Are you
>   ready to start?"
> - Only start recording after explicit readiness from the user
> - Accept readiness phrases like: "I'm ready", "yes", "go on", "grab it", "ready to
>   cough", "start", "ok", "sure", "do it"
> - If you asked "Are you ready to start?" and the user answers "yes", treat it as
>   readiness and call record_cough_sound immediately
>
> PROACTIVE ANEMIA SCREENING:
>
> - ACTIVELY ask users about fatigue, weakness, dizziness, or paleness
> - If they mention ANY of these symptoms, offer anemia screening: "Those symptoms could
>   indicate anemia. I can analyze your eye, palm, or fingernail images to check for
>   anemia indicators. Would you like me to do that?"
> - Use these EXACT trigger phrases when users want analysis:
>     - "analyze eye for anemia" - for eye analysis
>     - "analyze palm for anemia" - for palm analysis
>     - "analyze nail for anemia" - for nail analysis
>     - "comprehensive anemia screening" - for all three analyses
>
> INTEGRATED SCREENING APPROACH:
>
> - Explain that the platform provides comprehensive screening by checking multiple
>   health indicators
> - After cough analysis, suggest anemia screening as a complementary health check
> - Mention that combining results from different analyses gives a more complete health
>   picture
> - Use comprehensive analysis when the user wants a complete health screening
>
> TOOL RULES:
>
> - When the user says they are ready (e.g., "I'm ready", "yes", "go on", "grab it",
>   "ready to cough", "start", "ok", "sure", "do it"), call record_cough_sound immediately
> - After record_cough_sound returns, tell user to cough and wait ~5 seconds
> - Do NOT call analyze_cough_for_tb until you receive a message saying the recording is
>   complete
> - If the palm is visible and the user says they are showing it, call
>   capture_palm_photo immediately
> - If the palm looks aligned in frame, capture it
> - If the eye is visible and the user says they are showing it, call capture_eye_photo
>   immediately
> - If the fingernail is visible and the user says they are showing it, call
>   capture_fingernail_photo immediately
> - If the user confirms X-ray upload, call analyze_chest_xray immediately and do not
>   speak before calling it
>
> IMPORTANT:
>
> - You are NOT a doctor—always recommend professional medical consultation
> - Never prescribe medication or give definitive diagnoses
> - Your output will be spoken aloud, so avoid special characters and emojis
> - Always end with supportive guidance: "Please consult with a healthcare professional
>   for proper diagnosis and treatment"
> - Explain that all analyses use AI technology and have limitations—professional
>   medical diagnosis is essential

### Prompt lessons worth reusing

- Explicit readiness phrase list, plus "if you asked X and user says yes → call tool
  immediately" — kills the common LLM habit of asking again.
- Clinical trigger word list ("cough", "fever", "weight loss", "night sweats") makes
  tool use predictable.
- "Do NOT call analyze until you receive a message saying recording is complete" pairs
  with the server-side completion message injection — the prompt and the pipeline state
  machine enforce each other.
- "Output will be spoken aloud, so avoid special characters and emojis."
- Fixed closing disclaimer reduces liability/UX variance.

## Completion tracking

```python
completed_checks = {"palm": False, "eye": False, "nail": False, "cough": False}

def next_pending_check():
    for key in ["palm", "eye", "nail"]:
        if not completed_checks.get(key, False):
            return key
    return None

async def prompt_next_check(task: PipelineTask):
    pending = next_pending_check()
    if not pending:
        return
    prompts = {
        "palm": "Would you like to check your palm for anemia? If yes, please show your palm to the camera.",
        "eye": "Would you like to check your eye for anemia? If yes, come closer and gently pull down your lower eyelid.",
        "nail": "Would you like to check your fingernail for anemia? If yes, show one nail close to the camera.",
    }
    await task.queue_frames([LLMMessagesAppendFrame(messages=[{
        "role": "user", "content": prompts[pending],
    }])])
```

- Checks are marked complete only when the analyzer returns no `error` key.
- After each successful analysis the bot asks for exactly one next check — keeps the
  voice session from stalling.
- Greeting on client connect is also injected as an instruction: "Say exactly this to
  the user: Hello! I'm BigTB6, ... How are you feeling?".

## Report synthesis

Input: every saved `*_analysis.json` under the four media dirs (cough, eye, palm, nail —
X-ray is not included upstream). Flattened to:

```
Patient Diagnostic Analysis Summary:

COUGH_SAMPLES ANALYSIS (5 tests):
  - cough_20260224_124548: TB Probability 98.19% - High probability of TB - ...
EYE_IMAGES ANALYSIS (22 tests):
  - eye_...: Anemia (Score: 0.0084)
```

System prompt used:

> You are an expert AI radiologist. Provide a comprehensive final diagnosis report based
> on the clinical notes and model probability scores below. Format the report using plain
> text paragraphs.

The response `{"report": ...}` is written to `medgemma_reports/medgemma_report_<ts>.md`
with a header and timestamp.

Sample report verdict from the upstream repo (5 cough samples at 97.9–98.7% TB):
"Immediate consultation with a physician, preferably a pulmonologist or infectious
disease specialist, is strongly advised..." — i.e. the model outputs strong clinical
directives. When porting to this repo, keep the existing briefing contract (structured
JSON, pseudonymized, `disclaimer` field) rather than adopting free-form Markdown; the
upstream prompt would violate the "no definitive diagnosis" boundary expected here.

## Flow summary

```
connect → injected greeting
  → symptom interview (LLM-led)
  → cough: record (arm on readiness) → 5 s capture → analyze → speak TB probability
  → palm/eye/nail: capture + analyze in one tool call → speak anemia result
  → x-ray (optional): upload to FastAPI → analyze → result injected as user message
  → next pending check prompt after each completed analysis
  → consolidated MedGemma report saved as markdown
```
