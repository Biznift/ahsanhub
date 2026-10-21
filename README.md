# Ahsan Hub

Directory of halal software, SaaS and businesses.

| App | Folder | Port | What it is |
| --- | --- | --- | --- |
| Backend | `Backend/` | 3020 | API, PostgreSQL (Prisma), file storage and the admin panel at `/admin` |
| Frontend | `Frontend/` | 3000 | Public site. Proxies `/api/public`, `/api/auth`, `/api/account` and `/files` to the backend |

## First run

```bash
cd Backend
npm install
npm run db:migrate   # creates tables in DATABASE_URL
npm run db:seed      # admin account and categories
npm run db:demo      # optional: 12 demo listings (contact demo@ahsanhub.com)
npm run dev

cd ../Frontend
npm install
npm run dev
```

Admin login: `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from `Backend/.env`.

## Environment

`REVALIDATE_SECRET` must be the same in both `.env` files. The backend uses it to refresh frontend pages right after a listing, category, ad or setting changes. In production set `FRONTEND_URL` (backend) and `BACKEND_URL` (frontend) to the deployed addresses, and `NEXT_PUBLIC_SITE_URL` to the public domain.

Uploaded files live in `Backend/storage/`. Keep that folder on a persistent disk when deploying.
