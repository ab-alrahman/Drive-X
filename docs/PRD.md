# PRD - Car Marketplace (Sale, Rent, Commission)

## 1. Product Summary
Digital car marketplace for a single showroom brand where visitors can browse cars without login and submit purchase/rent requests.  
Only showroom owner/admin can create, update, or delete listings and manage requests.

## 2. Problem Statement
Traditional showroom operations are manual, slow in customer follow-up, and weak in request tracking.  
The system centralizes inventory, customer leads, and transaction status to improve conversion and operational control.

## 3. Business Goals
1. Increase qualified leads from online visitors.
2. Reduce response time from inquiry to first contact.
3. Track sale/rent pipeline and commission revenue per deal.
4. Enable delivery request capture for selected orders.

## 4. Users & Roles
1. Visitor (Guest)
- No authentication required.
- Can browse/filter/search/view cars.
- Can submit buy/rent requests.

2. Admin (Showroom Owner/Staff)
- Authenticated via dashboard login.
- Full control over car inventory and lead lifecycle.
- MVP roles are `OWNER` and `STAFF`; `OWNER` keeps full control, while `STAFF` handles day-to-day operations without future staff-management permissions.

## 5. Scope
### In Scope (MVP)
1. Public car catalog (search, filters, details).
2. Visitor lead form (buy or rent, optional delivery request).
3. Admin authentication.
4. Admin car management (CRUD + image upload).
5. Admin lead management (list, assign status, notes).
6. Deal registration and commission tracking.
7. Basic analytics dashboard.

### Out of Scope (Phase 2+)
1. Online payments.
2. Customer accounts and saved favorites.
3. Real-time chat.
4. Multi-showroom/multi-tenant support.

## 6. Core User Stories
1. As a visitor, I can view all available cars without creating an account.
2. As a visitor, I can filter by price, brand, year, condition, fuel, and listing type.
3. As a visitor, I can request to buy or rent a specific car and add delivery details.
4. As admin, I can add/edit/soft-delete car listings with images and pricing.
5. As admin, I can move requests through statuses (new, contacted, negotiated, approved, closed).
6. As admin, I can register finalized deals and calculate commission values.

## 7. Functional Requirements
### 7.1 Public App (React Native + optional web visitor pages)
1. Car list endpoint consumption with pagination.
2. Car detail page with gallery, specs, and availability.
3. Lead request submission (buy/rent).
4. Validation of phone/email, rent dates, delivery address, and required fields.
5. Public catalog shows only non-deleted cars with `AVAILABLE` or `RESERVED` status.

### 7.2 Admin Dashboard (React)
1. Secure login with JWT.
2. Car management table + create/edit forms.
3. Car image upload/removal controls.
4. Lead inbox with filters and status updates.
5. Deal and commission view.
6. KPI cards: total cars, active leads, conversion rate, monthly commission.

### 7.3 Backend (Express.js + TypeScript)
1. REST API with OpenAPI docs.
2. RBAC: admin-only management endpoints.
3. Input validation (Zod).
4. Standard error format.
5. Audit fields (`createdAt`, `updatedAt`, `updatedBy`, `deletedAt` where soft delete applies).

## 8. Non-Functional Requirements
1. Performance: `p95 < 600ms` for list endpoints with caching.
2. Security: JWT access/refresh, rate limit for public lead endpoint.
3. Reliability: 99.5% monthly availability target.
4. Maintainability: modular Express.js + TypeScript architecture, API versioning (`/v1`).
5. Localization-ready: Arabic-first with English-ready content fields.
6. Storage: MVP car images are stored on the backend local filesystem, with a migration path to object storage later.

## 9. Data Entities
1. Car
2. CarImage
3. LeadRequest
4. Deal
5. AdminUser
6. RefreshToken

## 10. KPIs
1. Number of incoming leads per week.
2. Lead-to-deal conversion ratio.
3. Avg first response time.
4. Commission revenue per month.
5. Percentage of listings with complete data.

## 11. Acceptance Criteria (MVP)
1. Visitors can browse and submit requests with no login.
2. Admin can perform full CRUD on cars, including image upload and soft delete.
3. Admin can view/update lead statuses.
4. Dashboard shows at least 6 key metrics.
5. OpenAPI spec is complete and usable by frontend teams.
6. `BOTH` listings require sale price and at least one rent price.
7. Public lead requests validate rent dates and delivery address when applicable.
8. MVP supports `USD` and `SYP` currencies.
9. Paginated endpoints return `items`, `page`, `limit`, `total`, `totalPages`, and `hasNext`.

## 12. Risks and Mitigation
1. Risk: Low-quality car data.  
Mitigation: enforce required listing fields and media quality checks.
2. Risk: Lead spam.  
Mitigation: rate limiting + optional captcha in phase 1.1.
3. Risk: Slow operations with growing inventory.  
Mitigation: indexed filters, pagination, and caching.

## 13. Milestones
1. Week 1: Discovery + PRD + API contract.
2. Week 2: DB + backend modules (auth, cars, leads).
3. Week 3: React Native visitor app.
4. Week 4: React admin dashboard + analytics.
5. Week 5: QA, UAT demo, and thesis presentation prep.


