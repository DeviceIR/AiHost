# AiHost

Next.js + TypeScript AI chat platform with:
- NextAuth (Credentials, Google, GitHub)
- Role-based access (`MANAGER`, `VIP`, `MEMBER`)
- Chat history + model selection
- Manager control panel for providers/models/users
- i18n (`en`, `fa`) and light/dark themes
- Tailwind CSS + TanStack Query

## 1) Local Setup

```bash
npm install
cp .env.example .env
```

Set `.env` values:

```env
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-long-random-secret"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GITHUB_ID=""
GITHUB_SECRET=""
MANAGER_EMAIL="manager@example.com"
MANAGER_PASSWORD="Manager123!"
BLOB_READ_WRITE_TOKEN=""
```

Initialize DB:

```bash
npm run prisma:generate
npm run prisma:push
npm run prisma:seed
```

Run app:

```bash
npm run dev
```

## 2) OAuth Callback URLs

For local development:
- GitHub: `http://localhost:3000/api/auth/callback/github`
- Google: `http://localhost:3000/api/auth/callback/google`

For production replace host with your real domain.

## 3) Vercel Deployment (Recommended)

### A. Services
- App hosting: Vercel
- Database: Neon Postgres
- Upload storage: Vercel Blob

### B. Vercel Environment Variables
Add all vars from `.env` to your Vercel project, especially:
- `DATABASE_URL` (Neon Postgres connection string, not Data API URL)
- `NEXTAUTH_URL` (`https://your-domain.com`)
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `GITHUB_ID`, `GITHUB_SECRET`
- `MANAGER_EMAIL`, `MANAGER_PASSWORD`
- `BLOB_READ_WRITE_TOKEN`

### C. Build / Prisma
`postinstall` already runs `prisma generate`.
After env vars are configured, run one DB sync:

```bash
npm run prisma:push
npm run prisma:seed
```

You can run these from local machine against the Neon DB, or in CI.

### D. Blob Upload Behavior
- If `BLOB_READ_WRITE_TOKEN` exists, attachments upload to Vercel Blob.
- If token is missing, app falls back to local `uploads/` directory (dev only).

## 4) Manager Login

Seed creates manager account from:
- `MANAGER_EMAIL`
- `MANAGER_PASSWORD`

After login, open `/en/admin` to manage providers/models/users.
