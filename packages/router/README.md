# followthesun-router

> Deterministic family care-work router. Routes tasks to the awake caregiver following the sun across time zones.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

## Install

```bash
npm install followthesun-router luxon
```

## Usage

```typescript
import { route, loadShares, isAwake, findDuplicate, computeRebalance } from "followthesun-router";
import type { Member, LoadEntry } from "@loadbearing/shared";

// Define your family members
const caregivers: Member[] = [
  {
    id: "arjun",
    name: "Arjun",
    role: "caregiver",
    city: "Berlin",
    lat: 52.52, lon: 13.405,
    timeZone: "Europe/Berlin",
    language: "en",
    awakeStart: "07:00",
    awakeEnd: "23:00",
    isLocal: false,
    isBackup: false,
    consentShare: true,
  },
  // ...more members
];

// Route a task to the best-fit caregiver right now
const result = route({
  caregivers,
  entries: [],          // LoadEntry[] from the past 7 days
  openTasks: [],        // accepted-but-unresolved Handoffs
  now: new Date().toISOString(),
  needsLocalPresence: false,
  kind: "planning",
  candidateIds: ["arjun", "meera"],
  excludeIds: [],
  preferences: [],
});

console.log(result.assigneeId, result.reasonCodes);
// → "arjun" ["AWAKE", "LOWEST_LOAD"]
```

## API

### `route(input: RouteInput): RouteResult`

Picks the best eligible caregiver. Eligible = awake AND (local if required) AND in candidateIds AND not in excludeIds.

**Scoring**: `windowLoad + openTaskPenalty`. Lowest score wins. Ties broken by longest idle (oldest last-activity time), then alphabetical id.

**RoutingPreference**: a matching, unexpired preference with `remaining > 0` wins first.

**Fallback**: backup contact if awake, else `status: "unassigned"` with `nextWakeAt`.

### `loadShares(caregivers, entries, nowUtcIso, windowDays?): Map<string, number>`

Compute load share percentages (0–100) for each caregiver over the past `windowDays` (default 7).

### `isAwake(member, nowUtcIso): boolean`

True when the member is within their `[awakeStart, awakeEnd)` local window at the given UTC instant. DST-safe via Luxon.

### `inSleepWindow(member, utcIso): boolean`

Inverse of `isAwake`.

### `nextAwakeInstant(member, nowUtcIso): string`

The next UTC instant when the member's local time hits `awakeStart`.

### `effectiveWeight(kind, sleeping): number`

`KIND_WEIGHT[kind] × (sleeping ? 2 : 1)`

### `findDuplicate(newText, existingMoments, now): string | null`

Jaccard similarity (≥ 0.6) over lowercase content words (stopwords removed) against open moments in the last 48 h. Deterministic, no LLM.

### `evaluateEscalations(handoffs, now): EscalationAction[]`

Returns reroute/unassign actions for handoffs past their `ackDeadline`. Idempotent.

### `computeRebalance(input): RebalanceProposal | null`

Identifies an overloaded caregiver (>10% above fair share) and proposes routing the next 2 planning tasks to the lowest-load member.

## Constants

| Name | Value |
|------|-------|
| `KIND_WEIGHT.doing` | 1.0 |
| `KIND_WEIGHT.planning` | 1.5 |
| `KIND_WEIGHT.emotional` | 1.25 |
| `SLEEP_MULTIPLIER` | 2 |
| `OPEN_TASK_PENALTY` | 0.5 × kindWeight |
| `WINDOW_DAYS` | 7 |
| `DEDUPE_JACCARD_THRESHOLD` | 0.6 |

## License

MIT © LoadBearing Contributors
