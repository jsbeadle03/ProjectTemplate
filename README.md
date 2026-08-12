# Waflé

Waflé is a privacy-first employee feedback app built by Team Waffle Stompers for
CIS 440. Employees check in on their week and share feedback; managers see the
content and respond, but never who wrote it.

The app is a Next.js App Router project in `wafle-ui/`, written in JavaScript
with plain CSS, backed by MariaDB.

## Setup

Requires Node.js 20.9 or newer.

```powershell
cd wafle-ui
npm install
```

Create `wafle-ui/.env.local` (it is gitignored, so each person makes their own):

```dotenv
WAFLE_DB_HOST=107.180.1.16
WAFLE_DB_PORT=3306
WAFLE_DB_SCHEMA=cis440sum26team10
WAFLE_DB_USER=cis440sum26team10
WAFLE_DB_PASSWORD=ask-a-teammate
WAFLE_SESSION_SECRET=any-long-random-string
```

`WAFLE_SESSION_SECRET` signs the session cookie. Generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Apply the schema changes, then start the app:

```powershell
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with one of the
accounts below, or create a new one at `/register`.

## Team accounts

| Name | Email | Role | Password |
| --- | --- | --- | --- |
| Christian Montoya | `cmontoy8@asu.edu` | Employee | `IcGtX9_XEwik` |
| Jonathan Priest | `jtpriest@asu.edu` | Employee | `8-5VpRLZAh33` |
| Jordan Beadle | `jsbeadle@asu.edu` | Employee | `8A0of9F2QNyD` |
| Nahar Alsayedd | `nalsaye1@asu.edu` | Employee | `1PWwd9UFwzwO` |
| Leo Smith | `lnsmit17@asu.edu` | Manager | `bEjzBRrDTwCd` |

All four employees already report to Leo Smith and are accepted, so they can
share feedback straight away.

Change your own password at any time:

```powershell
npm run set-password -- your.email@asu.edu
```

The manager inbox stays empty until three different people have shared
something. That is the anonymity threshold, not a bug: on a smaller team a
manager could work out who wrote what.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run format` | Format with Prettier |
| `npm run test` | Run the test suite |
| `npm run db:migrate` | Apply every migration in `db/migrations` (safe to re-run) |
| `npm run set-password -- <email>` | Set a random password on an account and print it once |
| `npm run seed-moods [days]` | Fill in missing daily check-ins so the dashboard has a trend. Leaves real check-ins alone |

## Accounts and privacy

Passwords are hashed with bcrypt. Signing in sets an HMAC-signed, httpOnly
session cookie; `src/middleware.js` redirects unauthenticated page requests, and
every API route independently checks the session, so the redirect is not the
security boundary.

Each account gets a random `anonymous_id` when it is created. Feedback, mood
check-ins, and reactions are stored against that pseudonym, never the account.
Nothing a manager can reach joins `feedback` to `users` — see the comment above
`FEEDBACK_SELECT` in `src/lib/feedback-format.js`. The client never sends an
identity of its own; it always comes from the signed session.

Team mood stays hidden until enough people have checked in, so a small team
cannot be narrowed down to one person's answer.

Anyone can delete their own account from the **Account** link in the sidebar.
That removes everything they wrote. Feedback other people sent them is kept
rather than erased, since it is not theirs to delete, but nobody will be able
to act on it afterwards.

## Layout

```
wafle-ui/
  db/migrations/   schema changes, applied in name order
  scripts/         migrate, set-password, seed-moods
  src/app/         pages and API routes
  src/components/  shared UI
  src/lib/         database pool, session, query helpers
  tests/           node:test suite
```

`ProjectTemplate/` is the original Visual Studio ASP.NET starter. It is not part
of the app and is not wired to anything.
