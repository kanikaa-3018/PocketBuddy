# AWS DLQ And Mobile Ingest Decision Note

Date: 2026-07-11

This note is intentionally separate from the README. It records the exact AWS DLQ decision so the team does not accidentally break the working demo while trying to make the architecture look cleaner.

## Current Live State

The current public Android/web ingest URL is:

```text
https://d3g6cg7q9hn7hi.cloudfront.net/api/ingest/notification-v2
```

CloudFront currently routes:

```text
/api/* -> EC2 FastAPI backend
```

That means the live `notification-v2` path goes to FastAPI on EC2, not directly to API Gateway, SQS, or the DLQ path.

This is acceptable for the finals demo because the EC2 route is already tested with the current pairing, profile, consent, and transaction sync behavior.

## Why We Should Not Reroute Right Now

Do not create a CloudFront behavior like this immediately:

```text
/api/ingest/notification-v2 -> API Gateway
```

Reason: the current Android connector and web setup rely on the FastAPI backend for profile-bound pairing, consent checks, device state, review inbox behavior, and transaction writes. Moving the live path to API Gateway without a full end-to-end test can break the deployed demo.

The safe approach is:

1. Keep the working EC2-backed ingest path live for demo stability.
2. Configure the serverless ingest lane with SQS DLQ and alarms as production hardening.
3. Move the live route only after the API Gateway and Lambda contract fully matches the FastAPI v2 ingest behavior.

## DLQ Setup To Keep Ready

Region:

```text
ap-south-1
```

Expected source queue:

```text
pocketbuddy-ingest-queue
```

Expected DLQ:

```text
pocketbuddy-ingest-dlq
```

Queue type:

```text
Standard
```

Recommended source queue redrive policy:

```text
Dead-letter queue: pocketbuddy-ingest-dlq
Maximum receives: 3
```

AWS requires the source queue and DLQ type to match. A standard source queue should use a standard DLQ. A FIFO source queue should use a FIFO DLQ.

## Lambda Trigger Check

The processor Lambda should consume from:

```text
pocketbuddy-ingest-queue
```

Recommended settings for finals safety:

```text
Batch size: 1
Trigger state: Enabled
```

Batch size `1` keeps debugging simple. If one malformed message fails, it is isolated and can be moved to the DLQ without hiding other events in the same batch.

## CloudWatch Alarm

Create a CloudWatch alarm on the DLQ:

```text
Metric: ApproximateNumberOfMessagesVisible
Queue: pocketbuddy-ingest-dlq
Condition: >= 1
```

Meaning: if even one failed ingest event reaches the DLQ, the team knows immediately.

This is a useful finals Q&A point because it shows the system is designed to recover bad ingest payloads instead of silently dropping them.

## Future Route Migration Criteria

Only route live Android ingest through API Gateway after all of these pass:

1. API Gateway accepts the exact Android connector v2 payload.
2. Ingest Lambda validates pairing, device ID, consent state, idempotency key, and signature rules.
3. Processor Lambda writes the same transaction, parser feedback, review inbox, and companion sync records as FastAPI.
4. Failed messages move to `pocketbuddy-ingest-dlq` after 3 receives.
5. DLQ messages can be replayed or inspected without losing masked payload context.
6. The Android one-tap config uses the final CloudFront URL and still shows connected state in the web app.
7. A real phone test confirms that payment alerts reach the user account without manual intervention.

Until these are verified, keep the live route on EC2.

## Finals Explanation

Use this wording if asked:

> PocketBuddy currently keeps the live product API and Android sync stable through FastAPI on EC2. The serverless ingest lane is the production scaling path: API Gateway accepts phone events, Lambda validates them, SQS buffers bursts, DynamoDB stores the idempotent ingest ledger, and a DLQ keeps failed events inspectable and replayable. We avoided rerouting the working finals demo path until the Lambda contract is fully parity-tested against the FastAPI v2 ingest behavior.

This is accurate and safer than claiming the DLQ protects the currently active CloudFront `/api/ingest/notification-v2` path.

## AWS References

- Amazon SQS DLQs: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html
- Configuring SQS DLQs in the console: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-configure-dead-letter-queue.html
- Lambda with SQS event source mappings: https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html
- AWS guidance: when SQS triggers Lambda, configure the DLQ on the SQS queue, not on the Lambda function: https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-retain-records.html
