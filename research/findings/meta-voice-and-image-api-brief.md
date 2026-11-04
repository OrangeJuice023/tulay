# Meta Model API — Voice Transcribe vs Image Understanding (Tulay research)

Research only. Verified from official Meta docs (dev.meta.ai). Assumptions/unknowns labeled.

## Voice Transcribe (Muse Voice Transcribe) — verified

- Model ID: `muse-voice-transcribe-1.0`. Input audio → text transcript. Two endpoints: `wss://api.meta.ai/v1/asr/realtime` (WebSocket, live) and `POST https://api.meta.ai/v1/asr/transcribe` (multipart file). Auth: `Authorization: Bearer <MODEL_API_KEY>` for file; realtime credential goes in handshake frame `authorization.accessToken` (HTTP Authorization header ignored).
- File input: WAV (RIFF/WAVE), mono, 16-bit integer PCM at 16 or 24 kHz. Convert others with ffmpeg. No other formats for file endpoint.
- Realtime input: raw PCM signed 16-bit LE mono; `PCM_24KHZ` (48k bytes/s, native) or `PCM_16KHZ` (32k bytes/s, resampled). Pace frames ~real time.
- Modes: PUSH_TO_TALK (default, single turn), ENDPOINTING (model-detected turns), DIARIZATION (speaker labels). Speakers up to 20+.
- Features: 25 languages with code-switching, language biasing (`languageBias` array of language names), vocabulary/keyword biasing, partial transcripts (CUMULATIVE/DELTA), speech-turn detection, audio progress events, turn-level timestamps. Word-level timestamps, confidence scores, sound-event/emotion detection, reformatting NOT available.
- Pricing: $0.18/hour audio processed (streaming and non-streaming same); ZDR priced at parity; billed to whole seconds, rounded down; failed/rate-limited requests not billed.
- Rate limits: no RPM/TPM; 256 concurrent streams, 16,000 streams/hour (shared by realtime+file). Rejection: realtime closes 1013; file returns 429.
- Realtime close codes: 1000 normal, 1008 invalid/backlog, 1011 internal (max session duration → new session), 1013 rate limited.
- Language support: 25 evaluated languages with code-switching verified. Tagalog/Taglish explicitly? Docs say "25 supported languages" but list not shown in fetched pages — assume likely includes Tagalog given Meta's PH focus but NOT verified. Unknown: exact language list, Tagalog WER, code-switching quality for Taglish.
- Data retention: Standard mode content not used to train (verified for token-priced models; voice in Standard mode assumed same, not explicitly stated). ZDR available at parity price (verified). Contributor mode not available for voice. Unknown: default retention period for non-ZDR audio.

## Image Understanding (Muse Spark) — verified

- Model: Muse Spark (`muse-spark-1.3` / `1.2` / `1.1`) via Responses API or Chat Completions. Input: text + image (and video/audio/PDF). Output text.
- Image input methods: public URL, base64 data URL, uploaded file_id (Files API). Images only in user-role messages.
- Formats: JPEG, PNG, GIF, WebP, ICO (x-icon). Max 50 images/request (HTTP 400 beyond). Inline image_url max 50 MB; Files API input_file max 1 GiB. Undecodable → 400. PDFs: first 50 page-images count toward budget.
- Perception grounding: normalized 0–1000 grid coordinates; point/box/count modes; structured output supported.
- Token cost: resolution-dependent; ~1280px image ≈ 1,300–1,500 tokens; use `/v1/responses/input_tokens` for exact count. Fixed prompt overhead ~110 tokens. Muse Spark pricing: input $1.25/1M (standard), cached $0.15/1M, output $4.25/1M. Contributor mode discounted ($0.10/$0.002/$0.20) but content may be used for training.
- Rate limits: Muse Spark 3,000 RPM, 4,000,000 TPM per team. Undocumented image-specific limits; image understanding uses token budget.
- Portfolio evaluation: supported in principle (image understanding + structured output + grounding). No dedicated "portfolio evaluation" API; it's a prompt + schema task. Unknown: accuracy on Filipino-language text in images, multi-page portfolio handling (50-image cap).
- Data handling: Standard mode content not used to train (verified for token models). Unknown: image retention period, ZDR availability for image requests (ZDR mentioned for voice; not explicitly for image/text). Unknown: whether uploaded files retained.

## Concise technical comparison

| Dimension | Voice Transcribe | Image Understanding |
|---|---|---|
| Capability | Audio → text transcript | Image (+prompt) → text/coords |
| Realtime | Yes (WebSocket) | No (request/response) |
| Formats | WAV (file) / PCM (stream) | JPEG/PNG/GIF/WebP/ICO |
| Limits | 256 concurrent streams, 16k/hr | 50 images/req, 50MB inline |
| Pricing | $0.18/hr audio | Token-based ~$1.25/1M in |
| Lang support | 25 langs + code-switching (Tagalog unverified) | Multilingual text in images (unverified quality) |
| Turnaround | Streaming partials | Single response |

## Recommended MVP integration for Tulay

- Image Understanding first for "portfolio/skills evidence" review: user uploads work samples/certificates; Muse Spark returns structured skill tags + short summary via response_format JSON schema; feeds deterministic matching. Lower risk: no realtime infra, no audio capture UX, fits existing Next.js server action pattern.
- Voice Transcribe later/optional: only if a voice input for stating career goal is prioritized; requires client audio capture + PCM conversion or ffmpeg on server, WebSocket proxy, session management. Cost low but infra complexity high for hackathon.
- Use Standard mode (not Contributor) to avoid training on user content. Validate all model output with Zod before use (per product rule 3). Never send contact details to model.

## Limitations and risks

- Voice: WAV/PCM-only means client-side capture must convert (m4a/webm from browsers unsupported directly); realtime needs WebSocket proxy through Next.js (server action can't stream easily); Tagalog/Taglish quality unverified → test before demo; 256 concurrent stream cap; audio retention/ZDR cost parity.
- Image: 50-image cap and 50MB inline limit; token cost scales with resolution (resize before send); only user-role images; undecodable images fail whole request; no portfolio-specific evaluation (prompt engineering required); Filipino text OCR quality unverified; contributor mode risks data training.

## Which feature first

Integrate Image Understanding first. It is simpler (HTTP request/response, no WebSocket, no audio pipeline), directly supports portfolio/skills evidence evaluation feeding matching, and has lower demo risk. Defer Voice Transcribe to post-MVP unless voice goal-capture is a demo requirement; if needed, use file endpoint (not realtime) to minimize complexity.
