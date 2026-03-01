# Spirit Revival Africa (SRA)

Production-ready starter platform for an interdenominational revival movement centered on Jesus Christ.

## Stack
- Backend: Django, DRF, PostgreSQL, Channels, Redis, JWT
- Frontend: React (Vite), Tailwind CSS, Axios, React Router
- Storage-ready: Local (default), AWS S3 (optional via env)

## Structure
- `backend/` Django API + realtime websocket layer
- `frontend/` React web app (dark mode-first)

## Backend Setup
1. Create and activate Python environment.
2. Install dependencies:
   - `pip install -r backend/requirements.txt`
3. Configure environment:
   - `copy backend/.env.example backend/.env`
4. Run migrations:
   - `python backend/manage.py makemigrations`
   - `python backend/manage.py migrate`
5. Seed default groups:
   - `python backend/manage.py seed_groups`
6. Create admin user:
   - `python backend/manage.py createsuperuser`
7. Run backend:
   - `python backend/manage.py runserver`

## Frontend Setup
1. Install dependencies:
   - `cd frontend && npm install`
2. Configure environment:
   - `copy .env.example .env`
3. Start dev server:
   - `npm run dev`

## Redis (Channels)
- Start Redis locally and set `REDIS_URL` in backend `.env`.

## Implemented Modules
- Accounts: registration, email login, JWT, role system, email verification, profile, user promotion
- Admin API: site statistics endpoint, moderation/approval hooks
- Content: flexible media model, search/filter/pagination, approve/reject workflow
- Groups: public/private groups, moderators, join/leave, default seeded groups
- Messaging: direct + group messages, optional audio, REST + websocket consumers
- Prayer: public/private requests, prayed count tracking
- Discipleship: courses, lessons, progress tracking
- Hubs: apply/create pending hubs, approve hubs, assign leaders, join hubs

## Security/Scalability Baseline
- JWT auth, role-based permission checks, DRF throttling (rate limiting)
- CSRF middleware enabled, secure cookie flags in non-debug mode
- Model indexes on commonly queried fields
- Modular app architecture for future expansion

## Notes
- For production websocket auth with pure JWT clients, add JWT websocket middleware strategy if you do not use session auth.
- Media storage can be switched to S3 via `MEDIA_STORAGE=s3` and AWS env variables.
