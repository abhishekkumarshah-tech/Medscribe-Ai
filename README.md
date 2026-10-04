# Medscribe AI

Medscribe AI is a **synthetic-data documentation demo**. It helps a clinician organize consultation text into a draft, then requires review and explicit approval before saving a final record. It does not diagnose and must not be used with real patient information or for clinical care.

## Architecture

- **Frontend:** React 18, TypeScript, React Router 7, Vite 8, Tailwind CSS 4.
- **Backend:** Python 3.12, FastAPI, Pydantic 2, SQLAlchemy 2.
- **Database:** SQLite locally; PostgreSQL through `DATABASE_URL` in hosted deployments.
- **Authentication:** Argon2id password hashes; opaque random bearer tokens whose hashes are stored in the database; the browser keeps only the token in tab-scoped `sessionStorage`; 12-hour default expiry and server-side revocation on logout.
- **AI:** Optional Anthropic API integration. Without an API key, a deterministic local structurer rearranges source sentences without generating clinical facts. If a configured provider fails, the API returns a safe error and does not disguise local output as a successful live request.
- **File uploads:** Not implemented. The application does not currently accept or store documents or attachments.

The API uses `/api`. The included Render Docker setup serves the built single-page application and API from one origin. A separate Vercel frontend can also be used if its API URL and backend CORS origin are configured as described below.

## Local development

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env          # optional; edit values as needed
uvicorn app.main:app --env-file .env --reload --host 0.0.0.0 --port 8000
```

On a development environment, first startup creates `carenote.db` and seeds synthetic demo records. Local demo sign-in:

- Email: `doctor@carenote.demo`
- Password: `demo123`

The demo account and sample records are not seeded in production. The default local database URL is `sqlite:///./carenote.db`; PostgreSQL URLs are also supported. A legacy Render `postgres://` URL is normalized automatically.

### Frontend

```bash
cd frontend
npm ci
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api` to `http://127.0.0.1:8000`, so run both servers. Local demo credentials are offered only when the backend reports that its local demo account is enabled.

### Main workflow

1. Sign in locally, or create an account if registration is enabled.
2. Add a synthetic patient under **Patients**.
3. Create a consultation and enter source notes.
4. Generate a draft, verify it against the source, and edit it as needed.
5. Explicitly approve the final record.
6. Review the account-scoped **Audit Trail**.

## Tests and checks

From the repository root:

```bash
python3 -m venv backend/.venv
backend/.venv/bin/pip install -r backend/requirements-dev.txt
backend/.venv/bin/pytest -q
backend/.venv/bin/ruff check backend/app backend/tests
backend/.venv/bin/ruff format --check backend/app backend/tests

cd frontend
npm ci
npm run typecheck
npm run build
npm audit
```

For a dependency vulnerability scan, install `pip-audit` in a development environment and run `pip-audit -r backend/requirements.txt`.

## Environment variables

Backend variables (see `backend/.env.example`):

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Database connection. Defaults to local SQLite. Render injects its PostgreSQL URL. |
| `APP_ENV` | Set to `production` for hosted production configuration. |
| `ALLOW_SIGNUP` | Enables public self-registration. Defaults off in production and on in development. |
| `SEED_DEMO_DATA` | Enables synthetic local demo seeding. Production seeding is forcibly disabled. |
| `SESSION_TTL_HOURS` | Session lifetime, clamped to 1–168 hours (default 12). |
| `FRONTEND_URL` | Exact allowed browser origin when hosting the frontend separately. |
| `EXTRA_ALLOWED_ORIGINS` | Comma-separated exact extra CORS origins, for example controlled previews. |
| `ANTHROPIC_API_KEY` | Optional secret for hosted Anthropic drafting. Never expose it in frontend variables. |
| `CARENOTE_AI_MODEL` | Optional Anthropic model ID; defaults to `claude-sonnet-4-6`. |

Frontend variable (see `frontend/.env.example`):

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | API base including `/api`, needed for a separate Vercel frontend. Leave blank for same-origin Render or local Vite proxying. |

`VITE_*` variables are compiled into browser-visible frontend assets and must never contain secrets.

## Render deployment (bundled frontend + API)

The repository includes a Dockerfile and `render.yaml` Blueprint. The Blueprint creates a Render PostgreSQL database and one web service that serves the API and built UI over the same HTTPS origin.

1. Create a Render Blueprint from this repository and review the resources and plan before applying it.
2. Set/confirm the Blueprint variables: `APP_ENV=production`, `ALLOW_SIGNUP=true`, and `SEED_DEMO_DATA=false`. The included Blueprint sets these values.
3. `DATABASE_URL` is linked to the provisioned database. `ANTHROPIC_API_KEY` is optional; leave it unset to use local deterministic structuring, or configure it in Render only after reviewing Anthropic's terms and privacy requirements.
4. Wait for the deploy and check `/api/health` for database readiness.

The free Render plan is suitable only for a demo: services may sleep and free database availability/retention is limited. Choose persistent paid hosting and confirm backups before storing data. No deployed service is created by this repository alone.

## Separate Vercel frontend (optional)

The Vercel project should use `frontend/` as its root directory, `npm run build` as its build command, and `dist` as its output directory. Configure:

- Vercel `VITE_API_URL=https://<your-render-service>.onrender.com/api`
- Render `FRONTEND_URL=https://<your-app>.vercel.app`
- Optionally add exact trusted preview origins to Render `EXTRA_ALLOWED_ORIGINS`

Redeploy the frontend after setting `VITE_API_URL`, because Vite bakes it into the static build. Do not use `*` as a CORS origin. The Vercel frontend is static; the backend and database still need to be deployed separately.

## Production safety and limitations

- Every patient and consultation query is scoped to the authenticated account; sharing a login shares that account's records, so use separate accounts.
- Passwords are hashed with Argon2id. Legacy bcrypt hashes from earlier local databases are verified and upgraded on successful sign-in.
- Audit events are metadata-only and append-only through the application's API; they are not a tamper-proof or regulatory audit system.
- No email verification, clinician credential verification, account recovery, login/signup rate limiting, formal security monitoring, or clinical compliance certification is implemented. Public account creation is appropriate only for an isolated demo unless those controls are added.
- Do not enter real protected health information. A hosted AI key sends note text to Anthropic; the application does not claim HIPAA or other regulatory compliance.
- AI-generated output can be incomplete or wrong and is never a guaranteed diagnosis. A clinician must verify all content before approval.
