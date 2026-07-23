# Waflé UI

This folder contains the localhost-only Waflé application shell. It is a
Next.js App Router project written in JavaScript with plain CSS and realistic
in-browser mock data.

## Run locally

Requirements:

- Node.js 20.9 or newer
- npm

```powershell
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

## Demo accounts

- Employee: `employee@wafle.local` / `demo`
- Manager: `manager@wafle.local` / `demo`

The guided demo buttons on the login page open either workspace without typing
the credentials.

## Available views

- Public trust landing page and demo login
- Employee mood check-in, feedback form, feedback wall, and manager responses
- Manager dashboard, searchable feedback inbox, feedback detail, and action
  queue

## Data and privacy

All data is supplied by `src/lib/mock-wafle-service.js`. It never sends a
network request and resets when the browser refreshes. The selected demo role
is retained only for the current browser tab through `sessionStorage`.

Feedback records contain no employee identifier, email address, or display
name. The dashboard includes a small-response suppression example so the UI is
ready to render that privacy state when a real service is added later.

## Validation

```powershell
npm run lint
npm run build
```
