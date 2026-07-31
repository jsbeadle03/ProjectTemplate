# Waflé

Waflé is a privacy-first employee feedback experience created by Team Waffle
Stompers for CIS 440.

## UI shell

The interactive Next.js demo lives in [`wafle-ui`](./wafle-ui). It uses local
mock data only—there is no database or backend connection.

```powershell
cd wafle-ui
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Demo accounts:

| Role | Email | Password |
| --- | --- | --- |
| Employee | `employee@wafle.local` | `demo` |
| Manager | `manager@wafle.local` | `demo` |

## Legacy template

The original Visual Studio ASP.NET template remains in `ProjectTemplate/` and
has not been connected to the Next.js UI. Backend and database integration are
intentionally outside the current shell.

## Database connectivity test

The standalone Next.js route at
[`wafle-ui/src/app/database-test/page.tsx`](./wafle-ui/src/app/database-test/page.tsx)
tests the MySQL connection from the server and renders the result at
[http://localhost:3000/database-test](http://localhost:3000/database-test).

Before starting the app, create `wafle-ui/.env.local` with the database
configuration. Environment files are ignored by Git.

```dotenv
WAFLE_DB_HOST=107.180.1.16
WAFLE_DB_PORT=3306
WAFLE_DB_SCHEMA=cis440sum26team10
WAFLE_DB_USER=cis440sum26team10
WAFLE_DB_PASSWORD=your-password
```

Then run `npm run dev` from `wafle-ui` and open the route above. The TSX page
opens a server-side connection, verifies the selected schema, runs a read-only
`SELECT 1` probe, and closes the connection. The password is never sent to the
browser or committed to the repository.
