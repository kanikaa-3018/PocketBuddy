# PocketBuddy Travel Guard Context

Last updated: 2026-07-08

This document is the single handoff note for PocketBuddy's Travel Guard feature. It explains what the feature is, what is implemented, what to show in the demo, what not to claim, and how the routing/geocoding layer should be hardened after the hackathon version.

## One-Line Positioning

Travel Guard helps a student answer one practical question before getting into a cab, auto, bike, or shared ride:

> "Is this fare fair for this route, right now, with my campus context?"

It is not a generic maps feature. It is a student affordability and safety feature connected to monthly runway, local campus routes, community fare memory, and AI negotiation help.

## Customer Pain

The pain is strongest for:

- first-year students reaching a new campus city;
- students returning late from railway stations, bus stands, airports, exams, or internships;
- students with luggage who cannot easily bargain or compare routes;
- students with limited monthly allowance who do not know whether a driver quote is normal;
- students in smaller cities where local travel prices are informal, negotiated, and inconsistent.

The product value is not "show a map." The value is "reduce uncertainty before a student overpays or takes an unsafe route."

## What Is Implemented

### 1. Route And Fare Surface

The Travel page shows campus routes, estimated distance, duration, mode options, expected fare range, and a suggested anchor fare.

Mode examples:

- Auto
- Cab
- Bike
- Shared Auto / Tempo

For each mode, PocketBuddy exposes:

- `min_fare`
- `max_fare`
- `median_fare`
- `fare_source`
- `fare_basis`
- `report_sample_size`
- `report_threshold`
- trust metadata

### 2. Distance Model Fallback

When there are not enough trusted student fare reports, PocketBuddy uses a distance and city/campus fare model.

This is intentionally labelled as:

- `Model estimate`

This prevents overclaiming. It tells the user and judges that the fare is useful but not yet community-verified.

### 3. Crowdsourced Fare Reports

Students can report what they actually paid after a ride. Reports are treated as signals first, not truth.

The backend filters reports before they influence fare windows:

- invalid or non-positive fares are ignored;
- stale reports outside the trust window are ignored;
- disputed reports are ignored;
- repeated reports from the same reporter identity are deduplicated;
- only the latest report per reporter counts;
- route/mode fare windows update only after the adaptive threshold is reached.

### 4. Shared Trust Lifecycle With Food Guard

Food Guard and Travel Guard now tell the same trust story:

| Trust Stage | Food Meaning | Travel Meaning |
| --- | --- | --- |
| `Model estimate` / baseline | Curated or model-backed item data | Distance and campus-local fare model |
| `Learning` | Student/menu signals exist but are not enough yet | Some trusted fare reports exist, but not enough to anchor recommendations |
| `Student verified` | Enough independent confirmations exist | Enough independent fare reports exist for the route/mode |
| `Disputed` | Item/price has enough negative signals | Fare report is excluded from model influence |
| `Stale` | Old data should not be trusted blindly | Old fare reports reduce confidence |

Judge-safe phrasing:

> Food and Travel use the same trust lifecycle, but different domain logic. Food verifies item prices. Travel verifies route-mode fare ranges. Student submissions are signals first, not truth.

### 5. Adaptive Verification Threshold

Travel no longer uses a tiny fixed "3 reports" rule.

The current backend uses:

- floor: 5 independent trusted reports;
- ceiling: 25 reports;
- sub-linear scaling as the route reporter base grows.

Why this matters:

- 3 reports is too easy to game.
- 3 reports is too weak for campuses with thousands of students.
- The threshold should scale without requiring hundreds of reports for every route.

Current rule:

```text
threshold = max(5, min(25, ceil(1.25 * sqrt(max(active_reporters, 10)))))
```

This is not a perfect production reputation system, but it is defensible for the hackathon version because it avoids both extremes: blind trust after 3 votes and impossible thresholds for cold-start campuses.

### 6. Robust Fare Range

When enough reports exist, PocketBuddy calculates a robust fare range instead of using a simple average.

The current logic:

- sorts positive fare values;
- computes quartiles;
- applies IQR-based outlier filtering;
- falls back to the full set if filtering would remove too much evidence;
- uses percentiles for min, max, and median:
  - 15th percentile for lower range;
  - 85th percentile for upper range;
  - 50th percentile for median.

This reduces damage from one fake or extreme fare report.

### 7. Quote Comparison

Students can enter:

- driver quote;
- paid fare;
- final negotiated fare;
- optional app quote entered manually.

PocketBuddy compares these against the current fare anchor and labels the situation.

Important: the app quote is user-entered. It is not live Ola/Uber/Rapido pricing.

Judge-safe wording:

> We do not claim live ride-hailing price integration. We let the student compare a quote they see with PocketBuddy's route fare guardrail.

### 8. Bedrock Nova Lite Negotiation Coach

The AI coach receives only deterministic context:

- college;
- city/region;
- route name;
- distance;
- selected mode;
- min/max/median fare;
- fare anchor and source;
- trusted report count;
- user situation;
- optional user-entered app quote.

The prompt explicitly forbids:

- inventing fare numbers;
- inventing live traffic;
- inventing route distance;
- inventing live Ola/Uber/Rapido prices;
- inventing report counts;
- inventing safety claims.

The AI output is meant to be a short script, tactics, and safety note. It is not the source of fare truth. The deterministic fare engine is the source of fare truth.

## What To Show In The Demo

Use Travel Guard as a short, high-impact segment. Do not spend too much time explaining routing internals.

### Demo Flow

1. Open Travel.
2. Select or search a campus route.
3. Show mode cards:
   - Auto;
   - Cab;
   - Shared Auto / Tempo.
4. Point to trust label:
   - `Model estimate`, or
   - `Learning`, or
   - `Student verified`.
5. Enter a driver quote that is above the fair range.
6. Show overcharge/guardrail result.
7. Open AI coach.
8. Show the negotiation script and safety note.
9. Optional: open fare reports and show that one report is signal, not truth.

### Suggested Voiceover

> Travel is where new students overpay because they do not know the local fare. PocketBuddy does not pretend one report is truth. It starts with a distance model, learns from actual student-paid fares, and only marks a route as student verified after enough independent confirmations. The AI coach then turns that verified range into a practical negotiation script and safety note.

### What To Avoid In The Demo

Do not say:

- "We fetch live Ola/Uber/Rapido fares."
- "This is a guaranteed fare."
- "This route is always safe."
- "The AI decides the fare."
- "One student report updates the price."

Say instead:

- "This is a fare guardrail."
- "The source is shown clearly."
- "Student reports are signals until enough independent confirmations exist."
- "The AI is grounded on deterministic fare context."

## Judge Questions And Strong Answers

### Q1. Where do the fare numbers come from?

Answer:

> The fare number starts from a distance and campus-local fare model. As students report actual paid fares, those reports enter a trust lifecycle. Only enough independent, recent, non-disputed reports can replace the model as the student-verified anchor.

### Q2. Why should we trust student reports?

Answer:

> We do not trust a single report. We dedupe reporter identity, filter stale and disputed reports, reject invalid amounts, and require an adaptive threshold before reports influence recommendations. Until then, the UI says Learning or Model estimate.

### Q3. Can one student manipulate a route fare?

Answer:

> Not easily. Multiple submissions from the same reporter identity count once. Disputed reports are excluded. The route needs enough independent confirmations before the fare model changes.

### Q4. Why not integrate Ola/Uber/Rapido live prices?

Answer:

> Live ride-hailing prices are not reliably available as public APIs for this use case. We chose a more defensible route: compare user-visible quotes against official/community fare bands and actual student-paid reports. The product still helps at the decision moment without depending on brittle unofficial scraping.

### Q5. What is the role of Bedrock?

Answer:

> Bedrock does not invent the fare. PocketBuddy computes the fare window first, then Bedrock converts that context into a short negotiation script, tactics, and safety note. The prompt explicitly forbids invented numbers or live ride-hailing claims.

### Q6. How does this scale beyond one campus?

Answer:

> The route model is campus-scoped. Each campus builds its own local fare memory. Sparse routes stay on model estimates; busy routes become student verified. Production routing and geocoding would move from public demo services to either self-hosted open-source services on AWS or managed commercial providers.

## Current Technical Limitations

### 1. No Live Ride-Hailing Pricing

Travel Guard does not fetch live fares from Ola, Uber, Rapido, or other ride-hailing platforms.

Reason:

- public, stable, production-appropriate fare APIs are not generally available for all these platforms;
- unofficial scraping would be brittle and risky;
- live price changes are volatile and can distract from the core value: fair-fare guardrails.

Current design:

- user may manually enter an app quote;
- PocketBuddy compares it against model/community fare anchors;
- AI coach mentions app quote only when supplied.

### 2. Public OSRM / Nominatim Are Not Production Infrastructure

The current prototype can use public OSRM/Nominatim endpoints for demo-scale routing/geocoding. That is acceptable for a hackathon prototype but not a serious production dependency.

Official constraints:

- Nominatim public API has an absolute maximum of 1 request per second per application and requires a valid User-Agent or Referer.
- Nominatim public API discourages bulk geocoding and requires caching.
- Nominatim public API forbids autocomplete-style client-side use, systematic queries, and reselling/geocoding-as-a-service behavior.
- OSRM public demo servers are for demonstration and do not provide production uptime, latency, or data freshness guarantees.

Sources:

- Nominatim Usage Policy: https://operations.osmfoundation.org/policies/nominatim/
- Nominatim project overview: https://nominatim.org/
- OSRM project: https://project-osrm.org/
- OSRM backend repository: https://github.com/Project-OSRM/osrm-backend

### 3. Data Freshness

Fare reports can become outdated because:

- fuel prices change;
- campus gates and routes change;
- admission season and exam season affect prices;
- local driver behavior changes.

Mitigation currently:

- stale reports reduce confidence;
- old reports are filtered from trusted fare calculation;
- UI exposes source and trust level.

Future:

- route-level freshness badge;
- seasonal fare windows;
- report expiry by route volatility.

### 4. Trust Is Still Lightweight

The current trust model is stronger than fixed votes but not a full reputation system.

Missing production-grade pieces:

- reporter reputation over time;
- cross-checking fare reports against real transaction notifications;
- route-specific abuse detection;
- campus moderator review;
- device/account age weighting.

### 5. Safety Is Advisory

Travel Guard can show safety notes and safer alternatives, but it is not a guarantee of physical safety.

Do not claim:

- "safe route guarantee";
- "driver safety verification";
- "emergency response."

## OSRM And Nominatim Improvement Path

### What Can Be Improved Immediately

These changes are small and realistic before finals or soon after:

1. **Provider abstraction**
   - Keep all routing/geocoding behind a `TravelGeoProvider` interface.
   - Supported providers:
     - public OSRM/Nominatim for demo;
     - self-hosted OSRM/Nominatim for production;
     - managed providers later.

2. **Server-side proxy only**
   - Never call Nominatim directly from the browser.
   - Route all geocoding through the backend so we can enforce caching, rate limiting, user-agent, and provider switching.

3. **Cache every lookup**
   - Cache route suggestions and geocode results by normalized query, campus, and city.
   - Cache route geometry by origin/destination coordinate pair.
   - Use MongoDB now; Redis/DynamoDB later if needed.

4. **No autocomplete abuse**
   - Do not call Nominatim on every keypress.
   - Use debounce and minimum query length.
   - Prefer campus-bounded suggestions and saved landmarks.

5. **Campus viewbox**
   - Continue bounding geocoding to the selected campus city.
   - This avoids irrelevant places and reduces API calls.

6. **Graceful fallback**
   - If OSRM fails, use Haversine + urban road factor.
   - UI should say "route estimate" instead of pretending road geometry is live.

7. **Attribution**
   - Show OpenStreetMap attribution wherever map/routing/geocoding data is visible.

### Production Option A: Self-Host OSRM + Nominatim On AWS

Best when:

- PocketBuddy needs predictable routing/geocoding cost;
- usage becomes high;
- the team wants control over caching and SLA;
- campus regions are mostly inside India.

Architecture:

```text
Travel API
  -> Geo Provider Adapter
      -> Amazon ECS / EC2 OSRM service
      -> Amazon ECS / EC2 Nominatim service
      -> Redis/DynamoDB cache
      -> CloudWatch metrics and alarms
```

How to keep it affordable:

- start with India or state-level OpenStreetMap extracts instead of planet-wide import;
- precompute common campus-to-hub routes;
- run one warm service for demo/finals, not continuous overprovisioning;
- use cache-first lookup;
- scale read replicas only when usage grows.

Risks:

- Nominatim imports need disk/RAM and operational care;
- OSRM preprocessing can be memory-heavy for large extracts;
- map updates need a refresh process;
- operational ownership increases.

Judge-safe answer:

> Today, public OSRM/Nominatim are prototype providers. Production would move to a provider adapter with cached, server-side calls and self-hosted OSRM/Nominatim on AWS for high-volume campus clusters.

### Production Option B: Managed Routing/Places Provider

Best when:

- team wants faster production readiness;
- SLA matters more than infrastructure cost;
- geocoding quality and POI coverage are important;
- route usage is moderate.

Possible provider categories:

- Google Routes / Places;
- Mappls / MapmyIndia for India-focused coverage;
- HERE / TomTom;
- Amazon Location Service where coverage and pricing fit.

Risks:

- recurring API cost;
- vendor limits;
- terms may restrict caching/storage;
- fare estimates may still need PocketBuddy's own community layer.

Judge-safe answer:

> Routing is swappable. The product moat is not OSRM itself; it is the campus fare trust layer and the decision engine on top.

### Production Option C: Hybrid

Recommended long-term path.

Use:

- self-hosted OSRM for routing geometry and distance;
- managed places/geocoding provider for high-quality place search;
- PocketBuddy community fare layer for local affordability truth;
- deterministic fallback model when external providers fail.

Why this is strongest:

- avoids public demo server dependency;
- preserves cost control for frequent route calculations;
- uses managed providers where data quality matters;
- keeps PocketBuddy's own trust layer as the differentiator.

## What To Improve After This PR

### Priority 1: Route Provider Adapter

Create a small abstraction so the backend can switch between:

- `PublicOsmProvider`
- `SelfHostedOsmProvider`
- `ManagedMapsProvider`
- `FallbackDistanceProvider`

This makes the production story credible without rewriting the feature later.

### Priority 2: Cache Layer

Add cache collections:

- `travel_geocode_cache`
- `travel_route_cache`

Suggested cache keys:

```text
geocode:{campus_slug}:{normalized_query}
route:{provider}:{origin_lat}:{origin_lon}:{dest_lat}:{dest_lon}:{mode}
```

### Priority 3: Route/Fare Source Panel

UI should show a small expandable "Why this fare?" section:

- source: Model estimate / Learning / Student verified;
- reports: `X/Y`;
- last report age;
- model basis;
- "AI uses this context, not the other way around."

This is useful for judges because it makes trust visible.

### Priority 4: Stronger Reporter Reputation

Report weight should eventually consider:

- account age;
- connector verified payment signal;
- history of accepted reports;
- dispute rate;
- campus affiliation confidence.

### Priority 5: Travel Report From Payment Sync

If a transaction notification has travel-like merchant/context, PocketBuddy can ask:

> "Was this for a campus ride?"

Then the student confirms route/mode/fare. This reduces manual reporting while keeping consent.

## Final Pitch Framing

Use this exact idea:

> Travel Guard is not a maps clone. It is a campus fare trust layer. It starts with model estimates, learns from actual student-paid fares, waits for enough independent confirmations, and then turns that context into a negotiation script and safer route decision.

Avoid this:

> We built live ride-hailing fare comparison.

The second line creates risk. The first line is accurate and stronger.

## Demo Readiness Checklist

Before recording or presenting:

- [ ] Seed at least one route with `Student verified` reports.
- [ ] Keep one sparse route showing `Learning`.
- [ ] Keep one route showing `Model estimate`.
- [ ] Enter an overquoted driver fare and show guardrail.
- [ ] Trigger AI coach once and confirm it does not invent fare numbers.
- [ ] Show report list only briefly.
- [ ] Do not open raw API provider logs.
- [ ] Do not claim live ride-hailing API integration.
- [ ] Mention source/freshness if asked.

## Bottom Line

Travel Guard is now strong enough to present as a serious product feature because it has:

- a real student pain point;
- campus-specific decision context;
- explicit source labels;
- adaptive crowdsourced trust;
- outlier resistance;
- fallback model behavior;
- grounded AI output;
- a clear production path for OSRM/Nominatim.

The next improvement is not more UI decoration. The next improvement is making provider switching and caching explicit, so the routing layer looks production-grade to AWS judges.
