# PocketBuddy Final Architecture Decisions

Status: accepted for the finals-ready repository
Updated: 2026-07-11
Scope: AWS architecture, data boundaries, cost controls, and production hardening path

## Summary

PocketBuddy uses a cost-aware hybrid AWS architecture.

The product API remains on FastAPI because that is where the business logic lives: auth, profile, transactions, statement import, runway, pools, food, travel, privacy, and companion state. The bursty Android notification path is separated into a serverless ingest lane because phone events need quick acknowledgement, retries, idempotency, and dead-letter handling.

```text
Browser
  -> CloudFront
      -> S3 private origin for React build and APK
      -> EC2 + Nginx + FastAPI for product APIs

Android Connector
  -> CloudFront /api/ingest/notification-v2
  -> API Gateway HTTP API
  -> Ingest Lambda
  -> SQS queue
  -> SQS DLQ
  -> Processor Lambda
  -> DynamoDB ingest ledger with TTL
  -> FastAPI canonical transaction path
  -> MongoDB Atlas product data

AI and observability
  -> Amazon Bedrock Nova Lite
  -> CloudWatch logs and alarms
  -> AWS Budgets
```

## Architecture Principle

Use AWS services where they solve a real product problem:

- CloudFront/S3 solve the current static delivery and APK distribution problem.
- Amplify Hosting is the production frontend operations path because it adds Git-based deployment, previews, SSL, custom domains, and rollback workflow.
- EC2/Nginx/FastAPI keeps the product API stable and cheap for the finals window.
- API Gateway/Lambda/SQS/DLQ/DynamoDB solve bursty mobile notification ingest.
- MongoDB stores flexible product state.
- Bedrock turns deterministic context into short guidance, not source-of-truth calculations.
- CloudWatch and AWS Budgets keep the demo observable and cost-controlled.

This is not a service-count architecture. Each service has a narrow reason to exist.

## Service Decisions

| Layer | Decision | Reason |
| --- | --- | --- |
| Frontend and APK | Current: S3 private bucket behind CloudFront. Production: Amplify Hosting | Current setup is cheap and deployed; production needs managed CI/CD, previews, SSL, domains, and rollbacks. |
| Public entry | CloudFront | Single HTTPS entry for web, APK, product APIs, and mobile ingest routing. |
| Product API | Current: EC2 + Nginx + FastAPI. Production: HTTP API + Lambda or ECS Express Mode | EC2 is stable for the finals window; optimized launch should remove idle public compute first, then move to containers when traffic justifies it. |
| Mobile ingest edge | API Gateway HTTP API | Low-cost request entry for phone events and clean separation from web routes. |
| Ingest function | Lambda | Validate, normalize, and enqueue quickly without tying Android sync to the app server. |
| Buffer | SQS standard queue | Absorbs bursts and retries safely. |
| Failure handling | SQS DLQ | Keeps failed events inspectable and replayable instead of disappearing. |
| Event ledger | DynamoDB with TTL | Idempotent append-heavy event store; prevents duplicate phone notifications from becoming duplicate transactions. |
| Product data | MongoDB Atlas | Flexible state for users, profiles, transactions, pools, food, travel, runway, privacy, and demo data. |
| AI | Bedrock Nova Lite | Bounded text generation after deterministic engines compute the facts. |
| Secrets/config | SSM Parameter Store standard parameters | Enough for this stage and avoids per-secret Secrets Manager cost. |
| Observability | CloudWatch logs and alarms | Lambda errors, queue age, DLQ depth, backend health, and demo debugging. |
| Cost control | AWS Budgets | Alerts before credits are consumed unexpectedly. |

## Database Boundary

### MongoDB Atlas

MongoDB is the product database. It stores:

- users and profiles;
- transactions and statement imports;
- recurring commitments;
- runway inputs and derived records;
- cart pools, requests, members, splits, UTR state, and QR metadata;
- campus food catalogs, OCR candidates, review signals, and meal check-ins;
- travel routes, reports, saved routes, and quote checks;
- privacy records, consent sandbox records, and account deletion scope.

### DynamoDB

DynamoDB is the ingest ledger only. It stores:

- connector event IDs;
- user/device/event dedupe keys;
- masked preview metadata;
- processing state;
- retry status;
- TTL cleanup field;
- DLQ replay correlation metadata.

This split is intentional. Product workflows need flexible document relationships; ingest events need high-write idempotency and retry safety.

## Android Ingest Contract

New Android builds use:

```http
POST /api/ingest/notification-v2
```

The v2 contract requires:

- structured payment fields;
- masked notification preview;
- installation-scoped device ID;
- client event ID;
- timestamp;
- HMAC signature;
- `rawTextSuppressed=true`.

The v2 route must not accept raw notification or SMS body text. The legacy `/api/ingest/notification` route exists only for old connector compatibility and should stay disabled for raw-text ingest unless explicitly migrating an old APK.

See [mobile-ingest-contract.md](./mobile-ingest-contract.md).

## DLQ And Replay

The mobile ingest queue must have a DLQ. A failed event should move to the DLQ after the configured receive count. Operations should be able to:

1. inspect the DLQ payload;
2. identify whether the issue is parser, auth, schema, or downstream availability;
3. patch the processor or data;
4. redrive the DLQ message back to the source queue.

Minimum alarms:

- Lambda processor errors greater than 0;
- SQS approximate age of oldest message greater than the chosen threshold;
- DLQ visible messages greater than 0;
- EC2 backend health check failing.

## AI Boundary

Bedrock Nova Lite is used for language, not truth.

Deterministic code computes:

- runway pace and safe daily spend;
- fare windows and quote deltas;
- food eligibility and verified menu state;
- pool settlement status;
- recurring commitment detection.

Bedrock receives bounded context and produces short guidance. Prompts should forbid invented numbers when deterministic values already exist.

## OCR Boundary

OCR is not a trusted source of menu truth.

Menu scanning can create candidates, but candidates stay in review until campus verification. If `DEMO_MODE=true`, a venue-based fallback may create realistic review candidates when OCR is unavailable. Those rows are still not trusted recommendations immediately.

Do not present Textract as the required architecture. The account hit a real access/subscription blocker earlier, and the product is stronger when OCR is optional and review-first.

## Cost Decisions

Detailed scale estimates are maintained in [aws-cost-model.md](./aws-cost-model.md).

The finals architecture keeps EC2 because it is already stable and cheap enough for a short demo window. The optimized launch architecture removes idle EC2/public IPv4 first: move frontend operations to Amplify Hosting, keep API Gateway/Lambda/SQS/DLQ/DynamoDB for mobile ingest, and move the product API to HTTP API + Lambda only after MongoDB connection reuse and cold-start behavior are tested. ECS Express Mode/ECS Fargate is the next step for sustained traffic, not the cheapest default for the current credit-constrained account.

### Keep

- S3 + CloudFront for current static frontend and APK delivery.
- Amplify Hosting as the production frontend operations path.
- Small EC2 instance for FastAPI during the finals window.
- API Gateway HTTP API, Lambda, SQS, DLQ, and DynamoDB for low-volume mobile ingest.
- SSM Parameter Store standard parameters.
- CloudWatch logs with short retention.
- AWS Budgets alerts.

### Avoid For The Finals Account

- NAT Gateway, because it has an hourly charge even when idle.
- Always-on WAF, because the Web ACL and rules create monthly cost.
- App Runner as a new architecture recommendation, because AWS has closed it to new customers and points teams toward ECS Express Mode.
- ECS/Fargate migration before traffic justifies the fixed load balancer/container baseline.
- Secrets Manager unless rotation is required.
- Textract as a required menu-scanning dependency.
- Large self-hosted OCR/routing services on the small EC2 instance.
- Application Load Balancer until traffic justifies the fixed hourly baseline.

## Production Hardening Path

After finals, harden in this order:

1. Version the mobile ingest infrastructure under `infra/`.
2. Add CloudWatch alarms and DLQ redrive documentation.
3. Put runtime config in SSM Parameter Store.
4. Add a stable domain and avoid EC2 public-DNS drift.
5. Move frontend operations from manual S3 upload to Amplify Hosting.
6. Add WAF only when the budget accepts the fixed monthly cost.
7. Move route/geocode providers from public demo endpoints to self-hosted or commercial providers.
8. Evaluate Aurora/PostgreSQL only if pool settlements become regulated financial obligations requiring relational ledger integrity.
9. Evaluate HTTP API + Lambda for the product API if connection reuse and cold starts are acceptable.
10. Move FastAPI to ECS Express Mode/ECS Fargate only when sustained traffic or operations justify the cost.

## Judge-Safe Explanation

Use this if asked why the architecture is not fully serverless:

> PocketBuddy has two traffic shapes. The web product is interactive and stateful, so FastAPI on a small EC2 instance keeps the finals demo stable and low-cost. For production, frontend operations should move to Amplify Hosting and the API should move to Lambda or ECS Express Mode only after traffic and connection behavior justify it. Mobile notification ingest is bursty and retry-sensitive, so that path is separated through API Gateway, Lambda, SQS, DLQ, and DynamoDB. MongoDB stores product state; DynamoDB stores idempotent ingest events. This keeps AWS usage purposeful instead of adding services for show.

## Current Risk Register

| Risk | Mitigation |
| --- | --- |
| EC2 public DNS changes after stop/start | Verify CloudFront origin after restarting EC2; use stable DNS when available. |
| CloudFront routes API traffic to S3 | Keep behavior priority clear: exact ingest route, `/api/*`, then default S3. |
| DLQ messages ignored | Alarm on DLQ depth and keep replay instructions in the runbook. |
| Android parser misses a bank/payment format | Send low-confidence events to review; collect masked corrections. |
| OCR creates bad food data | Keep OCR rows pending review and never publish directly. |
| Bedrock invents values | Ground prompts with deterministic facts and forbid invented numbers. |
| AWS credits drain | Stop EC2 when not demoing, avoid NAT Gateway/WAF/ALB/ECS until justified, keep budgets enabled. |
