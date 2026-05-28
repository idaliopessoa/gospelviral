# DEC_021: `/api/analyze` JSON response envelope

Date: 2026-05-28
Status: Accepted

## Decision
Success: `200 { status: 'ok', data: AnalysisResponse }`. Errors:
`<status> { status: 'error', code: '<stable-code>', message: '<human-friendly>' }`.

Stable error codes and HTTP statuses:

| Code                     | HTTP | Cause                                                    |
|---|---|---|
| invalid_body             | 400  | Body is not JSON or root isn't an object                 |
| invalid_url              | 400  | url empty or not a string                                |
| invalid_transcript       | 400  | transcript empty or not a string                         |
| transcript_missing_timestamps | 400 | No `\\d{1,2}:\\d{2}` pattern in transcript          |
| invalid_mode             | 400  | mode not in cli/api/auto                                 |
| invalid_model            | 400  | model not in default/fast/debug                          |
| cli_unavailable          | 503  | mode=cli but `detectRuntime().cli.available` is false    |
| api_key_missing          | 503  | mode=api but no `ANTHROPIC_API_KEY`                      |
| no_runtime_available     | 503  | mode=auto and neither CLI nor API available              |
| runtime_misconfigured    | 503  | `AdapterConfigError` from the adapter (e.g. no binPath)  |
| timeout                  | 504  | `ANALYZE_TIMEOUT_MS` exceeded; AbortError propagated     |
| parse_failed             | 502  | `AnalysisResponseError` from shared parser               |
| adapter_failed           | 502  | Any other `AdapterTransportError` or unexpected throw    |

The `message` field is fixed-vocabulary; payload content, API keys, and raw
adapter output never escape into it.

## Why
- Frontend (TASK_010) and any future consumer can branch on a stable `code`
  without scraping the `message` text.
- HTTP statuses follow the IETF recommendations: 4xx for client mistakes,
  503 for runtime unavailability, 504 for upstream timeout, 502 for
  upstream bad gateway.
- Mode-routing failures are 503 (resource not present), not 400 (client
  fault), because the user can recover by installing the CLI or setting
  the API key.

## Consequences
- TASK_010 maps `code` to UI strings, not `message`.
- Future SSE streaming (see ROADMAP) will introduce a new content type and
  a new envelope variant; this one stays the JSON contract.
