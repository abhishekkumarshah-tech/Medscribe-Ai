# CareNote AI

AI-assisted clinical documentation prototype for a Healthcare Greenfield
hackathon track. CareNote AI helps a doctor turn unstructured consultation
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

## Switching to PostgreSQL

```bash
export DATABASE_URL=postgresql://user:password@localhost:5432/carenote
```

`backend/app/database.py` picks this up automatically; no other backend
code references SQLite directly.

---

## Project structure

```
carenote-ai/
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
