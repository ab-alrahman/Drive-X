# Drive X API Alignment Report

Date: 2026-05-25

Scope: documentation-only alignment between backend docs and dashboard docs. No application code changes are included.

## 1. Docs Structure Alignment

Backend docs path:

```text
D:\college\Drive X\docs
```

Dashboard docs path:

```text
D:\college\Drive X dashboard\Drive X dashboard\app\docs
```

Current agreed source-of-truth files:

1. `openapi.backend.yaml` is the complete backend contract.
2. `openapi.yaml` is the combined public/admin contract.
3. `openapi.frontend-admin.yaml` is the dashboard-only contract.
4. `openapi.native-public.yaml` is the visitor/native public contract.
5. `API_INTEGRATION_GUIDE.md` is the integration rules summary.
6. `schema.sql` is the database shape reference.
7. This file records cross-side gaps and decisions.

Important structure fix:

- Dashboard docs now need `openapi.backend.yaml` because `openapi.frontend-admin.yaml` references shared schemas from it using `./openapi.backend.yaml#/components/schemas/...`.

## 2. Unified API Shape

Base version:

```text
/v1
```

Public/native app boundary:

```text
/v1/public/*
```

Admin/dashboard boundary:

```text
/v1/admin/*
```

Authentication:

- Public endpoints do not require login in MVP.
- Admin endpoints require `Authorization: Bearer <accessToken>`.
- Refresh tokens are handled only through admin auth endpoints.

Pagination response shape:

```json
{
  "items": [],
  "page": 1,
  "limit": 20,
  "total": 0,
  "totalPages": 0,
  "hasNext": false
}
```

Pagination defaults:

```text
page = 1
limit = 20
max limit = 100
```

Error response shape:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Invalid request payload",
  "details": ["field message"]
}
```

Standard error codes:

```text
VALIDATION_ERROR
UNAUTHORIZED
FORBIDDEN
NOT_FOUND
CONFLICT
RATE_LIMITED
UPLOAD_ERROR
INTERNAL_SERVER_ERROR
```

## 3. Current MVP API Coverage

The current OpenAPI contract covers the MVP flows needed by the dashboard and the public/native app.

Public app APIs:

```text
GET  /v1/public/cars
GET  /v1/public/cars/{carId}
GET  /v1/public/meta/filters
POST /v1/public/leads
```

Dashboard auth APIs:

```text
POST /v1/admin/auth/login
POST /v1/admin/auth/refresh
POST /v1/admin/auth/logout
GET  /v1/admin/auth/me
```

Dashboard cars APIs:

```text
GET    /v1/admin/cars
POST   /v1/admin/cars
GET    /v1/admin/cars/{carId}
PATCH  /v1/admin/cars/{carId}
DELETE /v1/admin/cars/{carId}
POST   /v1/admin/cars/{carId}/images
DELETE /v1/admin/cars/{carId}/images/{imageId}
```

Dashboard lead APIs:

```text
GET   /v1/admin/leads
GET   /v1/admin/leads/{leadId}
PATCH /v1/admin/leads/{leadId}
```

Dashboard deal APIs:

```text
GET  /v1/admin/deals
POST /v1/admin/deals
```

Dashboard summary API:

```text
GET /v1/admin/dashboard/summary
```

## 4. Frontend API Needs Not Fully Covered Yet

These are not blockers for the first MVP, but they should be logged before the dashboard becomes a fuller operational system.

### 4.1 Image Management

Need:

```text
PATCH /v1/admin/cars/{carId}/images/{imageId}
```

Purpose:

- Set or unset `isPrimary`.
- Update image `sortOrder`.
- Optionally update image alt/title metadata later.

Need:

```text
PATCH /v1/admin/cars/{carId}/images/reorder
```

Purpose:

- Reorder multiple images in one request from the dashboard gallery UI.

Current workaround:

- MVP can upload and delete images only.
- Primary image and ordering can be decided by backend defaults until these endpoints are added.

### 4.2 Stronger Dashboard Overview

Current:

```text
GET /v1/admin/dashboard/summary
```

Optional richer fields or endpoints needed by a stronger overview page:

```text
recentLeads
recentCars
leadsByStatus
dealsThisMonth
commissionByMonth
```

Recommended approach:

- Prefer extending `DashboardSummaryResponse` if the data is always shown together.
- Prefer separate endpoints only if charts/tables need independent loading or date filters.

Possible future endpoints:

```text
GET /v1/admin/dashboard/leads-by-status
GET /v1/admin/dashboard/commission-by-month
GET /v1/admin/dashboard/recent-activity
```

### 4.3 Deal Detail and Management

Need, if the dashboard will open a deal details page:

```text
GET /v1/admin/deals/{dealId}
```

Need, if admins can correct deal information after creation:

```text
PATCH /v1/admin/deals/{dealId}
```

Need, if soft-delete/cancel is required:

```text
DELETE /v1/admin/deals/{dealId}
```

Current workaround:

- MVP only lists deals and creates a new deal.

### 4.4 Admin User / Staff Management

Need only if staff management enters MVP:

```text
GET    /v1/admin/users
POST   /v1/admin/users
PATCH  /v1/admin/users/{adminUserId}
DELETE /v1/admin/users/{adminUserId}
```

Current decision:

- Staff management is documented as later work.
- `OWNER` and `STAFF` roles exist, but dashboard user management is not required for first MVP.

### 4.5 Lead Activity History

Need, if the dashboard must show who changed lead status and when:

```text
GET /v1/admin/leads/{leadId}/timeline
```

Current workaround:

- MVP can rely on the current lead status and `adminNotes`.

## 5. Query Parameter Alignment

The dashboard contract should expose the same useful list filters as the backend contract.

Cars list:

```text
GET /v1/admin/cars?page=1&limit=20&status=AVAILABLE
```

Leads list:

```text
GET /v1/admin/leads?page=1&limit=20&status=NEW&intent=BUY
```

Deals list:

```text
GET /v1/admin/deals?page=1&limit=20
```

Future sorting alignment:

```text
cars: newest, priceAsc, priceDesc, yearDesc
leads: newest, oldest
deals: newest, oldest
```

## 6. Backend Decisions Still Needed

These decisions affect API behavior even when endpoint paths already exist:

1. Seed method for first `OWNER` admin user.
2. Exact JWT access/refresh TTL values.
3. Refresh token rotation policy.
4. Image upload max size and allowed MIME types.
5. Whether upload creates thumbnails or compressed variants.
6. Whether image deletion removes the physical file or only the DB record.
7. Rate limits for `POST /v1/public/leads` and `POST /v1/admin/auth/login`.
8. Exact CORS origins and credentials policy.
9. Final `OWNER` vs `STAFF` permission matrix.
10. Rental side effects: when a car becomes `RENTED` and how it returns to `AVAILABLE`.
11. Deal side effects: whether creating a deal automatically closes the lead.
12. Phone/email/date validation rules.
13. Public image URL format from local storage.

## 7. Current Alignment Status

Aligned:

- Public/native contract boundaries.
- Dashboard/admin contract boundaries.
- Auth endpoints.
- Car CRUD endpoints.
- Lead list/detail/update endpoints.
- Deal list/create endpoints.
- Basic dashboard summary endpoint.
- Shared pagination and error response shapes.

Needs backlog decision:

- Image primary/reorder APIs.
- Rich dashboard summary data.
- Deal details/update/cancel APIs.
- Staff management APIs.
- Lead timeline/audit APIs.
- Backend runtime policies listed above.

