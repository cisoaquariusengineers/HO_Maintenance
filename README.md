# HO Housekeeping & Maintenance Helpdesk – Aquarius House

A web app (desktop and mobile) for raising and tracking housekeeping, hygiene and maintenance tickets.

| Link | For | What it does |
|---|---|---|
| `/user` | Employees | Raise a complaint, requirement or suggestion. The ticket number is shown on screen and emailed. |
| `/supervisor?key=…` | Housekeeping Supervisor | In-app notifications, ticket list with filters, assign, mark pending, verify and close |
| `/admin?key=…` | HR & Admin | Summary, floor-wise and category-wise trends, repeat complaints, average resolution time, full history, Excel export, suggestions, staff list |
| `/reopen/…` | Employees | Link in the "resolved" email to reopen a ticket that wasn't fixed |

The `key` is needed only the first time on each device. The browser remembers it.

**Stack:** Next.js 16 (React 19, TypeScript, Tailwind) · MySQL (TiDB Cloud Serverless) via `mysql2` · Nodemailer (Gmail) for email · ExcelJS for exports.

---

## Workflow

1. **Employee** submits a ticket. They get a confirmation email, and the supervisor gets an in-app notification (suggestions go to HR & Admin instead).
2. **Supervisor** assigns one of the staff (or types another housekeeping person's name). The status becomes *Assigned / In Progress*.
3. If spares, an external agency or approval is needed: **Mark Pending**, with an optional reason. HR & Admin can also mark complaints as pending; the supervisor is notified.
4. **Verify & Close.** The attending staff member is mandatory; the action taken is optional. The closing time and the supervisor's name are recorded automatically. Only the supervisor can close complaints. HR & Admin closes suggestions.
5. The employee gets a "resolved" email with a **Reopen** link. Reopening sets the ticket back to *Open* and notifies the supervisor.

Every step is saved in the ticket's history. Open any ticket to see it, or export it to Excel ("History" sheet).

---

## Deploying for free (TiDB Cloud + Vercel)

### 1. Database – TiDB Cloud Serverless (free, 5 GB)
1. Sign up at <https://tidbcloud.com> and create a **Serverless** cluster (pick the Mumbai/Singapore region).
2. Click **Connect**, generate a password, and copy the connection details.
3. Build the connection string:
   `mysql://<USER>:<PASSWORD>@<HOST>:4000/ho_helpdesk`
4. On your computer, copy `.env.example` to `.env.local`, set `DATABASE_URL` to that string and keep `DB_SSL=true`.
5. Run:
   ```bash
   npm install
   npm run db:setup
   ```
   This creates the database and tables, and adds three staff members (Staff A, B, C). Rename them later in Admin → Staff & Tools.

### 2. Gmail for sending emails
1. Create or choose a Gmail account (for example `ho.helpdesk.aquarius@gmail.com`) and turn on **2-Step Verification**.
2. Go to Google Account → Security → **App passwords** and create one called "HO Helpdesk".
3. Use that 16-character password as `SMTP_PASS`, and the Gmail address as `SMTP_USER`.

### 3. Vercel
1. Push this folder to a GitHub repository (private is fine).
2. At <https://vercel.com>, choose **Add New → Project**, import the repository and keep the defaults.
3. Under **Settings → Environment Variables**, add everything from `.env.example`:
   - `DATABASE_URL`, `DB_SSL=true`
   - `SUPERVISOR_KEY`, `ADMIN_KEY`: long random strings, for example from <https://www.uuidgenerator.net>
   - `SUPERVISOR_NAME`, `ADMIN_NAME`
   - `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`
   - `APP_URL`: your Vercel address, for example `https://ho-helpdesk.vercel.app`
4. **Redeploy** so the new settings take effect.

### 4. Share the links
- Employees: `https://<your-app>/user`
- Supervisor: `https://<your-app>/supervisor?key=<SUPERVISOR_KEY>`
- HR & Admin: `https://<your-app>/admin?key=<ADMIN_KEY>`

> Treat the supervisor and admin links like passwords. If one leaks, change the key in Vercel and redeploy. Old links and remembered browsers will stop working.

---

## Running locally

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL (DB_SSL=false for a local MySQL)
npm run db:setup
npm run dev                  # http://localhost:3000/user
```
- If `SMTP_USER`/`SMTP_PASS` are empty, emails are printed in the terminal instead of being sent.
- If `SUPERVISOR_KEY`/`ADMIN_KEY` are empty, those pages are open without a key. Use this for local testing only.

## Acceptance test checklist

1. `/user`: raise tickets on different floors. The ticket number is shown and a confirmation email arrives.
2. `/supervisor`: the bell shows the new tickets.
3. Open a ticket → **Assign** a staff member. The status becomes *Assigned / In Progress*.
4. Try **Close** without choosing who attended. It's blocked with a message.
5. Choose the staff member (action taken is optional) and close. The employee gets the "resolved" email.
6. Click **Reopen** in the email and add a comment. The ticket is *Open* again and the supervisor is notified.
7. `/admin`: check the summary, the unresolved list, repeat complaints, the history in any ticket, and **⬇ Excel**.

## Storage limit (free tier)

- **Database (TiDB, 5 GB):** each ticket with its history is about 2 KB, enough for decades of use.
