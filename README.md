# Karyon

Chat with your lecture recordings [or really just any video]

Video demo: https://youtu.be/U8iJKj3dahg 

## Setup

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # Mac/Linux
pip install -r requirements.txt
```

Create `backend/.env`:
```
OPEN_AI_KEY=your-openai-api-key
DEBUG=True
```

Run:
```bash
python manage.py migrate
python manage.py runserver
```

Runs at `http://localhost:8000`. Uses SQLite locally by default.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Create `frontend/.env`:
```
VITE_API_URL=http://localhost:8000/api
```

Runs at `http://localhost:5173`.

## Production

- **Backend**: Railway (Docker, PostgreSQL plugin, volume mounted at `/app/media`)
  - Set env vars: `DATABASE_URL`, `DJANGO_SECRET_KEY`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `DEBUG=False`, `OPEN_AI_KEY`
  - Migrations run automatically on deploy via Dockerfile CMD
- **Frontend**: Vercel (root directory: `frontend`)
  - Set env var: `VITE_API_URL=https://<railway-backend-url>/api`
  - Redeploy after changing env vars (Vite bakes them at build time)
