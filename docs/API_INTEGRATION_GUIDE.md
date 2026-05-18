# API Integration Guide (React Native + React + Express.js + TypeScript)

## 1. Integration Strategy
1. Backend is the single source of truth through `openapi.yaml`.
2. React Native app consumes only `/v1/public/*` endpoints.
3. React admin dashboard consumes `/v1/admin/*` endpoints.
4. JWT required only for admin routes.

## 2. Frontend Contracts
### 2.1 React Native (Visitor)
- `GET /v1/public/cars` -> Home + search + filters.
- `GET /v1/public/cars/{carId}` -> Car details screen.
- `POST /v1/public/leads` -> Buy/Rent request form.
- `GET /v1/public/meta/filters` -> Filter dropdowns.

### 2.2 React Dashboard (Admin)
- `POST /v1/admin/auth/login`, `POST /v1/admin/auth/refresh`, `POST /v1/admin/auth/logout`, `GET /v1/admin/auth/me`.
- `GET/POST/PATCH/DELETE /v1/admin/cars`.
- `POST /v1/admin/cars/{carId}/images` and `DELETE /v1/admin/cars/{carId}/images/{imageId}`.
- `GET/PATCH /v1/admin/leads`.
- `GET/POST /v1/admin/deals`.
- `GET /v1/admin/dashboard/summary`.

## 3. Express.js Module Mapping
1. `src/modules/auth` -> login/refresh/logout/me.
2. `src/modules/cars` -> public read + admin CRUD + local image upload.
3. `src/modules/leads` -> public create + admin management.
4. `src/modules/deals` -> finalized transactions + commissions.
5. `src/modules/dashboard` -> KPI aggregation endpoints.

## 4. Validation Rules
1. Visitor must submit at least: `carId`, `intent`, `fullName`, `phone`.
2. `intent=RENT` should include `rentalStartDate` and `rentalEndDate`.
3. `requestDelivery=true` should include `deliveryAddress`.
4. `listingType=SALE` or `listingType=BOTH` should include `salePrice`.
5. `listingType=RENT` or `listingType=BOTH` should include `dailyRentPrice` or `monthlyRentPrice`.
6. Car deletion is a soft delete using `deletedAt`; public catalog endpoints must exclude deleted cars.
7. Deal commission amount is calculated by the backend from `finalPrice`, `commissionType`, and `commissionValue`.
8. Public catalog endpoints show only `AVAILABLE` and `RESERVED` cars.
9. Supported MVP currencies are `USD` and `SYP`.

## 5. Pagination Contract

All paginated endpoints return:

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

## 6. Error Handling Contract
- Error shape:
```json
{
  "code": "VALIDATION_ERROR",
  "message": "Invalid request payload",
  "details": ["phone must be valid"]
}
```

## 7. Security
1. Store admin tokens in secure storage.
2. Attach `Authorization: Bearer <token>` for admin routes.
3. Refresh token before expiry.
4. Store refresh tokens hashed in the database and revoke them on logout.
5. Apply rate limiting to `POST /v1/public/leads`.

## 8. Image Storage

For the MVP, uploaded car images are stored on the backend local filesystem.

- Suggested local directory: `uploads/cars/{carId}/`.
- Store public URL/path in `image_url`.
- Store internal file reference in `storage_key` and `local_path`.
- Keep storage access behind the backend so it can later move to S3, Cloudinary, or another object store without changing frontend contracts.

## 9. Admin Roles

- `OWNER`: full access to cars, images, leads, deals, dashboard, and staff management when added later.
- `STAFF`: operational access to cars, images, leads, deals, and dashboard. Staff should not manage admin users.

## 10. Suggested Versioning
- Keep current contract at `v1`.
- Introduce breaking changes only in `v2` with migration notes.

