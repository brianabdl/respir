# BigTB6 — Daily.co / Next.js client patterns

Reference: `client/app/page.tsx` (619 lines), `client/components/*`, `server/main.py`.
Stack: Next.js 16 app router, React 18, Tailwind 3, `@daily-co/daily-js` 0.87.

## Session start sequence

```
POST /create-room                → { url, token }          (Daily REST)
POST /start-bot {room_url,token} → spawns bot subprocess
DailyIframe.createCallObject({ subscribeToTracksAutomatically: false })
callObject.join({ url, token })
callObject.setLocalAudio(micEnabled); setLocalVideo(cameraEnabled)
callObject.startTranscription()
EventSource(apiBase + '/events') → bot transcripts
```

Bot starts **before** the client joins; the bot waits for `on_client_connected`.

## Daily room config (`main.py:create_daily_room`)

```python
room_config = {"properties": {
    "enable_screenshare": True,
    "enable_chat": False,
    "enable_knocking": False,
    "start_video_off": True,
    "start_audio_off": False,
    "exp": now + 1800,            # room lives 30 min
    "eject_at_room_exp": True,
}}
# meeting token: exp now+3600, is_owner True
```

## Manual track subscription (critical)

Auto-subscription is disabled, then each remote participant is subscribed explicitly.
Without this, remote audio tracks may never start and the bot is silent.

```ts
const callObject = DailyIframe.createCallObject({
    subscribeToTracksAutomatically: false,
});

callObject.on('participant-joined', (event: any) => {
    const id = event?.participant?.participantId ?? event?.participant?.id;
    if (id && event?.participant?.local !== true) {
        callObject.updateParticipant(id, { setSubscribedTracks: true });
    }
});
```

## Remote bot audio + autoplay policy

Sound only plays after a user gesture in most browsers, so playback failure flips a
`needsAudioGesture` flag that renders an "Enable Audio" button calling `.play()` again.

```ts
callObject.on('track-started', (event: any) => {
  const track = event?.track;
  const participant = event?.participant;
  if (!track || track.kind !== 'audio' || participant?.local === true) return;
  attachRemoteAudioTrack(track);   // sets botAudioRef.current.srcObject
});

// hidden element rendered in page
<audio ref={botAudioRef} autoPlay playsInline className="hidden" />
{needsAudioGesture && <button onClick={() => botAudioRef.current?.play()}>Enable Audio</button>}
```

Pipecat may publish bot audio as `audio` **or** `customAudio`; the fallback logic in
`updateMediaStreams()` checks `remoteAudio?.state === 'playable'` first, then
`remoteCustomAudio`. Local camera preview is read from
`participants.local.tracks.video.persistentTrack`.

## Transcripts — two independent paths

1. **Daily transcription**: `callObject.startTranscription()` then
   `transcription-message`; speaker attributed by checking
   `callObject.participants()[participantId].local`.
2. **Bot turns via SSE**: FastAPI `/events` forwards `BOT_TEXT:` stdout lines emitted by
   the Pipecat assistant-turn handler. Payload includes `room_url`; the client drops
   events whose room URL does not match the current session (prevents stale session
   text after reconnect).

Both feed the same `TranscriptMessage` list rendered by `TranscriptPanel` (auto-scroll
via a ref on the message container).

## X-ray upload UX (`page.tsx:372-422`, `526-588`)

- File input + upload button; `FormData` POST to `/upload_xray`.
- While uploading, the form fades out and an overlay fades in with a rotating status
  line ("Scanning image parameters...", "Analyzing hemoglobin indicators...", ...) every
  2 s, plus an animated progress bar. Pure theater, but good pattern for slow async ops.
- Object-URL preview created/revoked in a `useEffect`.

## UI composition

- `VideoConsultation` — local camera feed, animated assistant placeholder
  (`/baymax.png`), status pill, optional `sidePanel` slot (used for the X-ray card).
- `ControlBar` — mic / camera / screen-share toggles (the header in `page.tsx`
  duplicates these inline; `ControlBar` is not imported there).
- `ConnectionStatus` — 4-state dot (`disconnected|connecting|connected|error`).
- Teal brand color `#099c8f`, slate neutrals, fixed header/footer with disclaimer.

## Client-side pitfalls seen upstream

- `startSession()` returns early if `callObjectRef.current` is set; on a failed join the
  call object is never destroyed, so retries silently do nothing.
- `stopSession` leaves `setSessionId`-style server state alone; bot subprocesses are
  only killed on pipeline disconnect, not by the browser leaving the room.
- Track event payloads vary across daily-js versions (`participantId` vs `id` vs
  `session_id`, `text` vs `transcript` vs `payload.*`); upstream defensively checks
  several keys — keep that if pinning to an older version.
- Debug `console.log` calls for every track state are left in production code.
