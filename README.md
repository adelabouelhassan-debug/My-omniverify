# OmniVerify — Multi-Channel Identity Verification (OTP) Platform

A fully working starter platform for one-time-password verification over SMS,
WhatsApp, and Email — API + dashboard + credit/billing system, backed by
Postgres. Everything else is plain Node.js (no framework) so you can read
every line, then swap in the real-world services you need for production,
anywhere in the world.

## Quick start

Requires a Postgres database — see [Free deployment](#free-deployment-to-start)
below for the $0 way to get one via Render.

```bash
npm install
cp .env.example .env
# edit .env: set DATABASE_URL to your Postgres connection string
node server.js
# open http://localhost:8787
```

On first run the app creates its own table automatically — no manual
migration step.

After signing up you automatically get a project with 100 trial credits and
a set of API keys. Try the full flow from the **Playground** tab in the
dashboard.

### Dev mode
Without a real SMS/WhatsApp/email provider configured, messages aren't
actually sent — instead:
- The code is printed to the server terminal
- It's saved to `data/dev-outbox.json` (this one file stays local/ephemeral
  on purpose — it's a debug convenience, not part of the persisted data)

This lets you build and fully test the product before signing up for any
paid service.

## Structure

```
server.js               Entry point + routing for every endpoint
lib/db.js                 Postgres-backed storage (see "How storage works" below)
lib/auth.js                 Register / login / sessions
lib/otp.js                    OTP generation/sending/verification logic + credit deduction
lib/crypto-utils.js            Password & code hashing (scrypt), API key generation
lib/channels/index.js            Adapter pattern for each send channel (SMS/WhatsApp/Email)
public/dashboard.html              Dashboard (single page, no framework)
public/dashboard.js                  Frontend logic
public/verify-widget.js                Drop-in embed script for a customer's site
render.yaml                              Render blueprint — free web service + free Postgres
render-with-disk.yaml                      Alternative: paid web service + persistent disk instead of Postgres
```

### How storage works

`lib/db.js` keeps the entire app state (users, sessions, projects, OTP
records, usage events) as **one JSON blob in a single Postgres row**,
rather than a normalized set of tables. That's a deliberate, minimal step:
it gets you real persistence on Postgres without a bigger relational
rewrite. `load()` reads that row, `save()` writes it back — every other
file in the project (`auth.js`, `otp.js`, `server.js`) works with that data
exactly like an in-memory object.

This is fine for a solo project or early users. It will *not* scale to
meaningfully concurrent traffic — every write replaces the entire blob, so
writes serialize. When you outgrow that, the natural next step is
splitting `users`/`projects`/`otps`/`events` into real tables with their
own columns and indexes — ask for that migration when you're ready for it.

## Public API endpoints (used by the customer's app)

All require an `X-API-Key: <secretKey>` header for the project.

```
POST /api/v1/otp/send
Body: { "channel": "sms" | "whatsapp" | "email", "destination": "+15550100" }
Response: { "requestId": "...", "expiresInSeconds": 300 }

POST /api/v1/otp/verify
Body: { "requestId": "...", "code": "123456" }
Response: { "verified": true }
```

⚠️ **Security note:** the `secretKey` must stay on your server only — never
put it in browser code. The included widget (`verify-widget.js`) is designed
to talk to *your own backend*, which in turn calls OmniVerify with the
secreteKey — not directly from the browser.

## Security already built in

- Codes are stored **hashed (via scrypt)**, never in plain text
- Codes expire after 5 minutes
- Max 5 verification attempts per code
- 30-second cooldown between new code requests to the same destination
- Timing-safe comparison to resist timing attacks
- Passwords hashed with scrypt + a random salt per user

## Free deployment (to start)

`render.yaml` provisions two things from one blueprint, both free:

- A **free Render web service** running this app ($0/month, 750 free
  instance hours/month — a single hobby project won't come close to using
  them)
- A **free Render Postgres database**, automatically linked via
  `DATABASE_URL`

Steps: push this repo to GitHub → in the Render dashboard, **New → Blueprint**
→ connect the repo → **Apply**. Render reads `render.yaml`, provisions both
resources, runs `npm install`, and starts the app. First deploy takes a
couple of minutes.

Two trade-offs to know about, both real:

- **The web service spins down after 15 minutes with no traffic** and takes
  about a minute to wake back up on the next request. This does *not*
  affect your data — it only affects response time on the first request
  after a period of inactivity.
- **The free Postgres database expires 30 days after creation**, with a
  14-day grace period to upgrade before Render deletes it. This is fine for
  an early demo or a project you know you'll either wrap up or upgrade
  within ~6 weeks. When you're ready to keep it long-term, upgrade the
  database to a paid instance type from the Render dashboard (a few dollars
  a month) — no code or schema changes needed, since your app just talks to
  whatever `DATABASE_URL` points at.

If you'd rather avoid the 30-day clock entirely while staying at $0, two
options:
1. **Supabase free Postgres** instead of Render's — 500 MB, no expiration
   date, only pauses after 7 days with zero requests (easy to avoid with an
   occasional visit or a scheduled ping). Point `DATABASE_URL` at it instead
   of Render's database; no other changes needed.
2. Keep Render's free Postgres and just re-create it every ~6 weeks before
   it's deleted (export/import your data, or accept a reset if you're still
   in early testing).

`render-with-disk.yaml` is kept in this repo as a reference for a different
approach (paid instance + persistent disk instead of Postgres) — not needed
now that the app talks to Postgres directly.

## Going to production

This project is a learning/MVP starting point. For a real production
deployment:

1. **Database**: move from the single-JSONB-blob approach (see "How storage
   works" above) to normalized tables once you have real concurrent
   traffic — same Postgres instance, just a schema upgrade.
2. **Message providers**: `lib/channels/index.js` has ready (commented-out)
   integration code for:
   - **SMS**: Twilio, Vonage (Nexmo), MessageBird, Plivo, or Sinch — all
     route to virtually any country code worldwide
   - **WhatsApp**: Meta WhatsApp Cloud API (requires a verified WhatsApp
     Business Account and an approved message template)
   - **Email**: any SMTP provider, or an API like SendGrid/SES/Postmark
3. **National eID schemes** (e.g. a government digital-identity system):
   if you need to support one for a specific market, that always requires a
   direct official partnership with that government body — this is outside
   the scope of anything buildable independently, and there's no way around
   that requirement for whichever country you target.
4. **Billing**: the `/api/projects/:id/topup` endpoint is currently mocked —
   wire it to Stripe (recommended for global card coverage plus many local
   payment methods) or another global payment provider, and use webhooks to
   confirm payment before crediting the account.
5. **Infrastructure**: add network-level rate limiting (e.g. Cloudflare),
   audit logging, and regular database backups.
6. **Compliance**: get legal advice on the data-protection regime(s) that
   apply to wherever your end users are — e.g. GDPR (EU/UK), CCPA
   (California), or other local frameworks — before processing phone
   numbers or emails commercially. Requirements differ by country, so this
   needs a real legal review for each market you operate in.

## License

This is a starter codebase, entirely yours to modify.