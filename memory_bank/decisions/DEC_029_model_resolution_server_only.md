# DEC_029: Model resolution lives in `apps/server/src/config/models.js`

Date: 2026-05-28
Status: Accepted (originated in TASK_005; materialized retroactively in TASK_012)

## Decision
The mapping from user-facing model preference (`'default' | 'fast' | 'debug'`)
to the wire-format Anthropic slug
(`claude-opus-4-7 | claude-sonnet-4-6 | claude-haiku-4-5-20251001`) lives
exclusively in `apps/server/src/config/models.js`. The frontend never sees
or sends slugs — only the preference labels.

## Why
- The slugs are an Anthropic implementation detail. Hard-coding them in
  the web bundle would force a frontend rebuild every time Anthropic
  ships a new model.
- Both adapters (`runViaApi`, `runViaCli`) need the slug; centralizing the
  resolution lets each adapter accept the validated preference and call
  `resolveModel(preference)` itself.
- Unknown preferences fall back to `'default'` + a warn log; the function
  never throws — the route handler doesn't need a guard.

## Consequences
- `MODEL_SLUGS` is frozen to prevent accidental in-process mutation.
- Verifying a new slug requires editing `models.js` and updating the spec;
  no frontend change.
- TASK_009's `/api/analyze` validator allowlists exactly the three
  preference labels; the frontend cannot send an arbitrary string and
  reach a wire slug it shouldn't see.
