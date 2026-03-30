# FORENSIC SYSTEM MAP — Spirit Revival Africa
**Audit Date:** 2025  
**Auditor:** GitHub Copilot Forensic Engine  
**Scope:** Full-stack — backend (`config/` path), frontend (`src/`), infra config files

---

## 1. Repository Layout

```
SRA/
├── backend/
│   ├── config/
│   │   ├── settings.py          ← main settings (NOT sra_backend/)
│   │   ├── urls.py
│   │   ├── wsgi.py
│   │   └── asgi.py              (unused — WSGI-only deploy)
│   ├── apps/
│   │   ├── accounts/            ← auth, profiles, roles, JWT
│   │   ├── common/              ← AuditLog, Notification, ContentReview, AppealRequest, Announcement
│   │   ├── content/             ← ContentItem, ShortStory, DailyBread, UserPhoto, FetchedPhoto, Gallery
│   │   ├── groups/              ← RevivalGroup, GroupMembership
│   │   ├── hubs/                ← RevivalHub, HubMembership
│   │   ├── messaging/           ← DirectMessage
│   │   ├── prayer/              ← PrayerRequest
│   │   ├── discipleship/        ← Lesson, UserLessonProgress
│   │   └── worship/             ← WorshipTeam, WorshipMember, WorshipTrack
│   ├── media/                   ← user-uploaded files (local dev)
│   ├── static/                  ← Django static assets
│   ├── templates/               ← Django HTML templates (admin)
│   ├── requirements.txt
│   ├── manage.py
│   ├── Procfile                 ← Heroku/Railway process definition
│   ├── railway.json             ← Railway.app deploy config
│   ├── render.yaml              ← Render.com deploy config
│   ├── nixpacks.toml            ← Nixpacks build config
│   ├── passenger_wsgi.py        ← cPanel / Truehost entry point
│   ├── .env                     ← production secrets (git-ignored)
│   ├── .env.example             ← documented template
│   ├── .env.local               ← local dev overrides
│   └── db.sqlite3               ← local dev DB
└── frontend/
    ├── src/
    │   ├── api/                 ← axios wrappers (client.js, homeContent.js, etc.)
    │   ├── components/          ← shared UI (ShareButton, Layout, AnnouncementBanner, etc.)
    │   ├── context/             ← AuthContext.jsx
    │   ├── hooks/               ← usePageMeta.js
    │   ├── pages/               ← route-level components
    │   ├── router/              ← index.jsx (all routes)
    │   └── schemas/             ← zod validation (signupSchemas.js)
    ├── public/
    │   ├── robots.txt           ← disallows /api/, /dashboard, /profile
    │   ├── sitemap.xml          ← static, 11 URLs
    │   ├── sra-logo.png
    │   └── washika.jpg          ← founder photo
    ├── index.html               ← OG tags, Twitter Card, Inter font
    ├── vite.config.js           ← manual chunks: vendor, motion, forms
    └── package.json
```

---

## 2. Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Backend framework | Django | 5.2.11 |
| API layer | Django REST Framework | latest |
| Auth tokens | djangorestframework-simplejwt | latest |
| Token blacklisting | simplejwt token_blacklist | built-in |
| CORS | django-cors-headers | latest |
| Static serving | WhiteNoise | latest |
| Database (prod) | PostgreSQL via dj-database-url | — |
| Database (dev) | SQLite3 | built-in |
| Media (prod options) | S3 / Cloudinary / Local | configurable |
| SMS | Africa's Talking | REST API |
| Frontend framework | React | 19.0.0 |
| Build tool | Vite | 6.1.0 |
| CSS | Tailwind CSS | 3.4.17 |
| Routing | react-router-dom | 7.2.0 |
| Forms | react-hook-form + zod | 7.71.2 / 4.3.6 |
| Motion | framer-motion | 12.34.3 |
| HTTP client | axios | 1.8.2 |
| OAuth | @react-oauth/google | 0.13.4 |

---

## 3. Django Apps & Models

### `apps/accounts`
| Model | Key Fields |
|---|---|
| `User(AbstractUser)` | email (USERNAME_FIELD), role, full_name, phone, gender, bio, country, city, born_again, year_of_salvation, church_name, denomination, serves_in_church, ministry_areas (JSONField), testimony, why_join, unity_agreement, statement_of_faith, code_of_conduct, subscribe_scripture, membership_type, led_ministry_before, leadership_experience, profile_picture, email_verified, is_approved |

**Roles:** `member`, `moderator`, `admin`, `hub_leader`, `super_admin`

### `apps/common`
| Model | Purpose |
|---|---|
| `AuditLog` | IP, actor, action, target_model, target_id, detail |
| `Notification` | Per-user inbox: info/warning/action/approved/rejected/appeal |
| `ContentReview` | Separate audit trail for content/hub reviews |
| `AppealRequest` | User appeals against rejected decisions |
| `Announcement` | Site-wide banners with priority (info/warning/urgent) and expiry |

### `apps/content`
| Model | Purpose |
|---|---|
| `ContentItem` | Books, sermons, videos, journals, wisdom, daily_scripture, images |
| `ShortStory` | Member testimonies (PENDING/APPROVED/REJECTED status flow) |
| `DailyBread` | Daily verse + reflection + photo |
| `GalleryItem` | Gallery photos (approved=True by default) |
| `UserPhoto` | User-submitted hero collage photos (approved=False default) |
| `FetchedPhoto` | Auto-fetched from Pexels/Unsplash for hero collage |

### `apps/prayer`
| Model | Purpose |
|---|---|
| `PrayerRequest` | Public/private prayer requests with status (pending/approved/rejected) and prayer_count |

### `apps/groups`
| Model | Purpose |
|---|---|
| `RevivalGroup` | Named groups (youth, women, worshippers, etc.) |
| `GroupMembership` | User ↔ Group M2M |

### `apps/hubs`
| Model | Purpose |
|---|---|
| `RevivalHub` | Physical hub locations with leader and status |
| `HubMembership` | User ↔ Hub M2M |

### `apps/messaging`
| Model | Purpose |
|---|---|
| `DirectMessage` | Sender ↔ Receiver DMs |

### `apps/discipleship`
| Model | Purpose |
|---|---|
| `Lesson` | Individual discipleship lessons |
| `UserLessonProgress` | User lesson completion tracking |

### `apps/worship`
| Model | Purpose |
|---|---|
| `WorshipTeam` | Worship team metadata |
| `WorshipMember` | Team members |
| `WorshipTrack` | Audio tracks |

---

## 4. API URL Map

```
/admin/                                         ← Django admin
/api/accounts/
  register/                                     POST - new user
  login/                                        POST - email/password → JWT
  auth/google/                                  POST - Google OAuth → JWT
  token/refresh/                                POST - refresh JWT
  verify-email/                                 POST - verify token
  password-reset/                               POST - request reset
  password-reset/confirm/                       POST - confirm reset
  profile/                                      GET/PATCH - current user profile
  change-password/                              POST
  dashboard/me/                                 GET - member stats
  moderator/stats/                              GET
  hub-leader/stats/                             GET
  admin/stats/                                  GET
  superadmin/stats/                             GET
  users/                                        GET - list (admin+)
  users/<id>/                                   GET - detail (admin+)
  users/<id>/promote/                           POST
  users/<id>/suspend/                           POST
  users/<id>/reactivate/                        POST
  users/search/                                 GET
  users/pending-approval/                       GET
  users/<id>/approve/                           POST
  users/<id>/reject/                            POST
  admin/message-user/<id>/                      POST - DM a user
  admin/broadcast/                              POST - message all users

/api/common/
  announcements/                                GET (public)
  notifications/                                GET/PATCH (mark read)
  notifications/unread-count/                   GET
  stats/                                        GET (public — nations, groups, users, testimonies)
  audit-log/                                    GET (admin+)
  reviews/                                      GET (admin+)
  reviews/<id>/action/                          POST - approve/reject
  appeals/                                      GET/POST
  appeals/<id>/review/                          POST (admin+)

/api/                                           ← content photo_urls
  hero-collage/                                 GET - shuffled approved photos+fetched
  user-photos/                                  GET/POST/PATCH/DELETE
  user-photos/<id>/approve/                     POST (mod+)
  user-photos/<id>/reject/                      POST (mod+)
  fetched-photos/                               GET/POST
  fetched-photos/<id>/approve/                  POST (mod+)

/api/content/
  items/                                        GET/POST
  items/<id>/                                   GET/PATCH/DELETE
  items/<id>/approve/                           POST (mod+)
  items/<id>/reject/                            POST (mod+)
  items/<id>/share/                             GET (public, approved only)
  daily-bread/                                  GET/POST
  short-stories/                                GET/POST
  short-stories/<id>/                           GET/PATCH/DELETE
  short-stories/<id>/share/                     GET (public, approved only)
  home-feed/                                    GET
  gallery/                                      GET/POST

/api/groups/                                    CRUD + join/leave
/api/hubs/                                      CRUD + apply/members
/api/prayer/
  requests/                                     GET/POST
  requests/<id>/                                GET/PATCH/DELETE
  requests/<id>/prayed/                         POST
  requests/<id>/share/                          GET (approved+public only)
/api/discipleship/                              lessons, progress
/api/messaging/                                 DMs, conversations
/api/worship/                                   teams, tracks
```

---

## 5. Authentication Flow

```
EMAIL REGISTRATION:
  POST /api/accounts/register/ 
    → User created (is_approved=False, email_verified=False)
    → Verification email sent + SMS welcome
  POST /api/accounts/verify-email/
    → email_verified=True
  Admin approves via /admin/ or API
    → is_approved=True
  POST /api/accounts/login/
    → JWT access (30min) + refresh (7d, rotated, blacklisted on rotation)

GOOGLE OAUTH:
  Frontend: GoogleAuthButton → credential from Google
  POST /api/accounts/auth/google/
    → Token verified server-side via google.oauth2.id_token
    → New user: created with email_verified=True, is_approved defaults to True (⚠️ see security report)
    → Existing user: returns tokens
    → Returns JWT access + refresh
```

---

## 6. Permission Hierarchy

```
AllowAny → IsAuthenticatedOrReadOnly → IsAuthenticated
  → IsModeratorOrAbove (moderator, admin, super_admin)
  → IsAdminOrAbove (admin, super_admin)
  → IsSuperAdmin (super_admin only)
```

---

## 7. Settings Architecture

**Settings file:** `backend/config/settings.py`

Key behaviours:
- `SECRET_KEY` falls back to `"insecure-dev-key"` but exits on prod if unchanged
- `DEBUG=False` in production activates: HSTS (1yr), secure cookies, SSL proxy trust
- `DATABASE_URL` empty → SQLite; set → PostgreSQL via dj-database-url
- `MEDIA_STORAGE`: `local` (default) → `s3` → `cloudinary`
- `CORS_ALLOWED_ORIGINS`: comma-separated from env
- Rate limits: anon 60/min, user 300/min, login 10/min, password_reset 5/hr
- Email: SMTP in prod, console backend in DEBUG if no host set
- Throttle classes apply globally via `DEFAULT_THROTTLE_CLASSES`

---

## 8. Infra / Deploy Configs

| File | Purpose |
|---|---|
| `Procfile` | Heroku/Railway: `web: gunicorn config.wsgi` |
| `railway.json` | Railway.app build + deploy settings |
| `render.yaml` | Render.com service definition |
| `nixpacks.toml` | Nixpacks builder config for Railway |
| `passenger_wsgi.py` | cPanel/Truehost Passenger WSGI entry |

**Current local dev:** Django `manage.py runserver 8000`, Vite `5173`

---

## 9. Frontend Route Map

| Path | Component | Protected | Role |
|---|---|---|---|
| `/` | `HomePage` | No | Public |
| `/login` | `LoginPage` | No | Public |
| `/register` | `RegisterPage` | No | Public |
| `/prayer` | `PrayerPage` | No | Public (submit requires auth) |
| `/content` | `ContentPage` | No | Public |
| `/stories/submit` | `StorySubmissionPage` | No → redirects on submit | Auth required for POST |
| `/stories/:id` | `StoryPage` | No | Public |
| `/gallery` | `GalleryPage` | No | Public |
| `/groups` | `GroupsPage` | No | Public |
| `/hubs` | `HubsPage` | No | Public |
| `/discipleship` | `DiscipleshipPage` | No | Public |
| `/worship` | `WorshipPage` | No | Public |
| `/book/beneath-the-crown` | `BookPage` | No | Public |
| `/profile` | `ProfilePage` | Yes | Any auth |
| `/profile/settings` | `ProfileSettingsPage` | Yes | Any auth |
| `/dashboard` | `DashLayout` | Yes | Any auth |
| `/dashboard/prayer` | Dashboard child | Yes | Any auth |
| `/dashboard/content` | Dashboard child | Yes | Any auth |
| `/dashboard/hubs` | Dashboard child | Yes | Any auth |
| `/messages` | `MessagesPage` | Yes | Any auth |
| `/admin-panel/*` | admin panel routes | Yes | admin/super_admin |

---

## 10. Data Flow Summary

```
User submits content
  → pending state (is_approved=False or status=PENDING)
  → Moderator/Admin reviews in Django admin or dashboard
  → Approved → notification sent → content visible publicly
  → Rejected → notification with reason sent → user can edit/resubmit
  → User can file AppealRequest → Admin reviews → upheld/overturned

Admin creates content directly
  → save_model override: auto-approved (ContentItem.approved=True, UserPhoto.approved=True)
  → Appears immediately on homepage

Homepage data sources:
  → GET /api/content/home-feed/ → DailyBread (latest active) + ShortStory (approved)
  → GET /api/common/announcements/ → active, non-expired Announcements
  → GET /api/hero-collage/ → approved UserPhoto + FetchedPhoto (shuffled, max 24)
  → visibilitychange listener refetches all 3 when tab regained focus
```
