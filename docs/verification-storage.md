# Verification document storage

Verification documents use a **private Vercel Blob store**. The application persists only opaque keys, normalized display filenames, MIME type, byte size, SHA-256 digest, and provider name in MongoDB. Blob URLs are never stored or returned to users.

## Configuration

Connect a private Blob store to the Vercel project. Production can use Vercel OIDC credentials (`VERCEL_OIDC_TOKEN` and `BLOB_STORE_ID`) provided to the deployment. Local development or environments without OIDC require the server-only `BLOB_READ_WRITE_TOKEN`.

Never prefix these values with `NEXT_PUBLIC_`. The upload-token endpoint authenticates the user, checks state and rate limits, then issues a ten-minute, content-restricted token. Finalization downloads the private object server-side, validates its signature, and moves it to a new opaque key.

## Operations and retention

- Pending uploads older than one hour are deleted by `yarn verification:cleanup`.
- Unreferenced permanent objects older than 24 hours are deleted by the same job.
- Replaced objects are deleted after the database transaction commits. Failed deletions are handled by the orphan pass.
- Failed database submissions delete newly finalized objects immediately when possible.
- Customer documents remain private until an approved account/data-retention deletion process removes both the database reference and object. Set an organizational retention period with legal/privacy counsel before enabling real customers.
- Run cleanup on a protected scheduled worker with server-only database and Blob credentials. Alert on failures.

Legacy `development/` keys are rejected with HTTP 410 rather than pretending the local file exists. Run `yarn verification:legacy-report` before deployment. It reports recoverable and unrecoverable counts without printing filenames or user identifiers. Any recoverable item requires a controlled, identity-confirmed re-upload.

## Enablement checklist

1. Connect a private Blob store and configure credentials.
2. Run the legacy report and resolve every legacy reference.
3. Run `yarn verification:cleanup` successfully from the production environment.
4. Verify MongoDB supports transactions (replica set/Atlas).
5. Configure monitoring, incident response, retention/deletion procedures, and access reviews.
6. Complete privacy, regulatory, and threat-model review for every country served.
