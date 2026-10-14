# Tata EV Diagnostics

A failed-sessions dashboard with its own login page, its own database, and live updates.
Everything runs as **one program**: no external services or accounts needed.

## Run it (5 minutes)

1. Install **Node.js 24 LTS** (or 22.13+) from https://nodejs.org. Accept the defaults.
2. Unzip this folder, open a terminal **inside it**, and run:

   ```
   npm install
   npm start
   ```

3. Open **http://localhost:3000** and sign in:
   - Email: `admin@tataev.local`
   - Password: `ChangeMe@123`

4. Change that password straight away (stop the app with Ctrl+C first, or use a second terminal):

   ```
   npm run user -- admin@tataev.local YourNewPassword admin
   ```

On first start the app creates its database (`data/tata-ev.db`) and loads 37 sessions:
7 from your CSV plus 30 dummy rows marked as sample data.

## Users

Only people you create can sign in; there is no public sign-up.

```
npm run user -- priya@company.com TheirPassword123 viewer
npm run user -- ravi@company.com  TheirPassword123 admin
```

| Role   | Can do |
|--------|--------|
| viewer | See the dashboard, filter, open sessions, export CSV |
| admin  | Everything above, plus add sessions, import CSV, delete sessions, remove dummy rows |

Running the same command again for an existing email resets that person's password or role.

## Keeping the data current

Admins use the **Manage data** button (top right):

- **Add a session**: type in one failed session.
- **Import CSV**: upload a file with the same columns as the Failed Sessions extract
  (`Date, Time, EVSE ID, Connector, Location, CDM Session ID, Start phase`;
  optional `Stop reason, Error code, Charger model`). Rows already in the database are skipped.
- **Remove dummy rows**: delete the 30 sample sessions once real data is in.

Every open dashboard updates within a second when data changes: new rows flash and a
notification appears. No refresh needed.

## Letting others open it

`localhost` only works on the computer running the app. To share it:

- **Same office network:** run it on one always-on PC, then others open
  `http://<that PC's IP address>:3000`. Allow port 3000 through the PC's firewall.
- **On the internet:** run it on a cloud server or a hosting service that supports Node.js
  **and a persistent disk** (the database is a file in `data/`). Set `PORT` if the host
  requires it, and put the site behind HTTPS (most hosts do this for you).

## Back up

The whole database is the file `data/tata-ev.db`. Stop the app and copy that file.

## Settings (optional)

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | 3000 | Web port |
| `DB_PATH` | `data/tata-ev.db` | Where the database file lives |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | see above | First admin, used only when the database has no users |

## For developers

- `server/`: Express API, SQLite (built into Node), login with scrypt-hashed passwords and
  cookie sessions, live updates over Server-Sent Events.
- `src/`: React 18 + Recharts front end, built with Vite into `dist/` (already built).
- After changing anything in `src/`, run `npm run build`. For hot reload, run `npm start`
  in one terminal and `npm run dev` in another (opens on port 5173).
