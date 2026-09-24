# Medscribe AI

AI-assisted clinical documentation prototype for a Healthcare Greenfield
hackathon track. Medscribe AI helps a doctor turn unstructured consultation
notes into a structured documentation draft — it never diagnoses, never
invents clinical information, and every AI draft must be reviewed, edited
as needed, and explicitly approved by a doctor before it becomes a final
clinical record. All patient data in this repo is synthetic/demo data.

Workflow: **Doctor Login → Dashboard → Select Patient → Enter Consultation
Notes → Generate AI Draft → Review/Edit → Approve → Final Clinical Record
→ Audit Trail.**

---

## Tech stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, lucide-react
- **Backend:** Python, FastAPI, SQLAlchemy
- **Database:** SQLite by default (zero setup); the data layer is written
  against a `DATABASE_URL` env var, so pointing it at a PostgreSQL DSN is a
  one-line change — no code changes needed.
- **AI:** a single `generate_draft()` abstraction. If `ANTHROPIC_API_KEY`
  is set, it calls Claude to structure the notes. If not, it falls back to
  a deterministic **mock AI mode** that reorganizes the doctor's own
  sentences into standard clinical sections (Chief Complaint, HPI, Exam,
  Assessment, Plan) — so the entire demo works offline, for free, every
  time.

---

## Run it locally

### 1. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Optional — enables real AI drafting instead of mock mode:
# export ANTHROPIC_API_KEY=sk-ant-...

uvicorn app.main:app --reload --port 8000
```

This creates `carenote.db` (SQLite) on first run and seeds it with:
- Demo doctor: **doctor@carenote.demo** / **demo123**
- 3 synthetic patients (P-1001, P-1002, P-1003)
- 2 sample consultations (one approved, one awaiting a draft)

API docs are available at `http://localhost:8000/docs`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The Vite dev server proxies `/api` to
`http://localhost:8000`, so both servers need to be running.

Click **"Use demo account"** on the login screen, or sign in manually with
the demo credentials above.

### 3. Try the workflow

1. **Dashboard** → "+ New consultation"
2. Pick a patient, type some free-text consultation notes
3. On the consultation page, click **Generate AI draft**
4. Edit the draft if needed, then **Approve as final record**
5. Check **Audit Trail** — every step you just took is logged there

---

## Deploy on Render

This repository includes a production Docker configuration and `render.yaml`
Blueprint. It builds the React UI and serves it through the FastAPI service,
so the website and API share one public HTTPS address.

1. Push this project to a GitHub repository.
2. In Render, select **New → Blueprint**, choose the repository, and deploy
   the detected `render.yaml` file. If Render reports that the service name is
   already taken, choose a unique service name.
3. After the deploy completes, open the service's `onrender.com` URL. The
   health check is available at `/api/health`.

The Blueprint provisions a free PostgreSQL database and uses the mock drafting
mode by default. Add `ANTHROPIC_API_KEY` in Render only if you explicitly want
to enable Claude-based drafts. Free Render services can take about a minute to
wake after being idle, and free databases expire after 30 days; use a paid plan
for a persistent production deployment.

---

## Switching to PostgreSQL

```bash
export DATABASE_URL=postgresql://user:password@localhost:5432/carenote
```

`backend/app/database.py` picks this up automatically; no other backend
code references SQLite directly.

---

## Project structure

```
medscribe-ai/
├── backend/
│   ├── app/
│   │   ├── main.py            FastAPI app, CORS, startup seed
│   │   ├── database.py        SQLite/Postgres engine + session
│   │   ├── models.py          Doctor, Patient, Consultation, AuditEvent
│   │   ├── schemas.py         Pydantic request/response models
│   │   ├── ai_service.py      AI abstraction (real + mock mode)
│   │   ├── seed.py            Demo data seeding (idempotent)
│   │   └── routers/           auth, patients, consultations, audit
│   └── requirements.txt
└── frontend/
    └── src/
        ├── pages/              Login, Dashboard, Patients, PatientDetails,
        │                       Consultation, AIDraftReview, FinalRecord,
        │                       AuditTrail, PrivacySecurity, Settings
        ├── components/         Layout, Sidebar, Topbar, StatusBadge
        └── lib/                api.ts (fetch client), auth.tsx (session)
```

---

## Product safety notes (by design, not afterthought)

- AI output is always visibly labeled **"AI-generated draft"** in the UI.
- The mock AI mode only reorganizes sentences the doctor already wrote —
  it never adds symptoms, vitals, or diagnoses.
- A suspected condition mentioned in notes is rendered as *"Assessment (as
  noted by physician)"*, never as a confirmed diagnosis.
- Approving a record requires an explicit confirmation step and is
  permanently logged with the doctor's name and timestamp.
- Every notes entry, draft generation, edit, and approval writes an
  `AuditEvent` row — visible in full on the Audit Trail page.
