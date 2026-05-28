# DEC_014: Shared adapter contract for API and CLI

Date: 2026-05-28
Status: Accepted (TASK_006; reaffirmed in TASK_007)

## Decision
Both runtime adapters expose the same async function shape:

```
runViaApi({ systemPrompt, userMessage, modelId, maxTokens?, signal?, ... })
  → Promise<AnalysisResponse>

runViaCli({ systemPrompt, userMessage, modelId, signal?, ... })
  → Promise<AnalysisResponse>
```

Callers (TASK_009 route handler, future batch jobs) cannot tell the two
apart at the type/shape level. Mode selection happens upstream of the call.

## Why
- The `POST /api/analyze` contract must remain stable across modes — a
  consumer never branches on whether the response came from CLI or API.
- The same `AnalysisResponse` shape (validated by the single parser in
  `@gospelviral/shared`) returns from both code paths.

## Consequences
- Any new transport (queue, batch, alternate vendor) must conform to the
  same signature or sit behind a translation layer.
- The route handler's logic stays trivial: pick adapter, call, return.
