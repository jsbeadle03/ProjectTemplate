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
