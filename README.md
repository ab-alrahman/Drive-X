# DriveX Backend

Express.js + TypeScript + PostgreSQL backend for the DriveX car marketplace.

## Stack

- Express.js + TypeScript
- PostgreSQL
- Zod validation
- JWT access/refresh auth
- Multer local image uploads
- Raw SQL through `pg`

## Setup

1. Create `.env` from `.env.example`.
2. Create a PostgreSQL database matching `DATABASE_URL`.
3. Install dependencies:

```bash
npm install
```

If `npm.cmd` fails on Windows with a user path permission issue, run npm directly through Node:

```powershell
& 'C:\Program Files\nodejs\node.exe' 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js' install
```

4. Apply schema:

```bash
npm run db:setup
```

5. Seed the first owner account:

```bash
ADMIN_EMAIL=owner@example.com ADMIN_PASSWORD=ChangeMe123 npm run seed:admin
```

PowerShell:

```powershell
$env:ADMIN_EMAIL='owner@example.com'
$env:ADMIN_PASSWORD='ChangeMe123'
npm run seed:admin
```

6. Start development server:

```bash
npm run dev
```

The API runs on `http://localhost:3000` by default.

## API Docs

- Swagger UI: `http://localhost:3000/api-docs`
- Raw OpenAPI YAML: `http://localhost:3000/openapi.yaml`
- Postman collection: [docs/postman_collection.json](docs/postman_collection.json)

## Main Endpoints

- `GET /health`
- `GET /v1/public/cars`
- `GET /v1/public/cars/:carId`
- `POST /v1/public/leads`
- `POST /v1/admin/auth/login`
- `POST /v1/admin/auth/refresh`
- `POST /v1/admin/auth/logout`
- `GET /v1/admin/auth/me`
- `GET/POST/PATCH/DELETE /v1/admin/cars`
- `POST /v1/admin/cars/:carId/images`
- `GET/PATCH /v1/admin/leads`
- `GET/POST /v1/admin/deals`
- `GET /v1/admin/dashboard/summary`
