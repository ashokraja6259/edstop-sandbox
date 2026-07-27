# EdStop Sandbox

EdStop Sandbox is a Next.js + Supabase codebase for the EdStop campus super-app initiative.

Current active application path is:
- `src/app` (App Router)

Legacy app code has been isolated under:
- `archive/legacy/`

---

## Tech Stack

- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS 4
- Supabase

---

## Project Structure

- `src/app` – active routes/pages
- `src/components` – reusable UI and feature components
- `src/contexts` – React context providers
- `src/hooks` – custom hooks
- `src/lib` – application libraries/services
- `supabase/migrations` – database migrations
- `supabase/functions` – Supabase edge/server functions
- `archive/legacy` – isolated legacy/backup code (non-active)

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in values:

```bash
cp .env.example .env.local
```

Required variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `RAZORPAY_MODE` (`test` or `live`; Test Mode is required for the pilot)
- `NEXT_PUBLIC_RAZORPAY_KEY_ID`

Optional:

- `DIST_DIR` (custom Next.js build output directory; defaults to `.next`)

---

## Local Development

Install dependencies:

```bash
npm install
```

Run dev server:

```bash
npm run dev
```

Open:
- http://localhost:3000

---

## Validation Commands

Lint:

```bash
npm run lint
```

Typecheck:

```bash
npm run typecheck
```

Production build:

```bash
npm run build
```

Run production server after build:

```bash
npm run start
```

---

## Deployment Notes

- Ensure all required environment variables are configured in the deployment platform.
- `NEXT_PUBLIC_*` values must be available at build/runtime for client usage.
- Keep Supabase service role key server-side only.
- Keep `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` server-side only.
- `NEXT_PUBLIC_RAZORPAY_KEY_ID` must equal `RAZORPAY_KEY_ID`; the application
  rejects test/live prefix mismatches instead of silently mixing credentials.
- Configure the Razorpay webhook to send the unmodified request body to
  `/api/razorpay/webhook`. Use a webhook secret distinct from the API secret.
- Run `node scripts/reconcile-razorpay.mjs` for a dry run. The explicit
  `--apply` flag is restricted to trusted backend operations.
- Run migrations in `supabase/migrations` before production rollout.
- Use `npm run lint`, `npm run typecheck`, and `npm run build` as required pre-deploy gates.

---

## Repository Cleanup Policy (Current)

- Active app/config files remain at repository root + `src/`.
- Legacy code is isolated in `archive/legacy/` and should not be used for new development.
- Feature work should target only active paths unless explicitly migrating legacy assets.
