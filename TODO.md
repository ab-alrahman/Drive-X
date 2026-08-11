--- Roadmap / Pillars ---

--- 2026-08-03: Pillar 1 backend implementation (BACKEND DONE + VERIFIED, UI still pending) ---
35 - Built: migrations/20260803000100000_inspections.js + mirrored into docs/schema.sql -
      new tables technicians, inspection_cases (one per car, UNIQUE car_id), inspection_rounds
      (full state machine: OPENED/INTERNAL_REVIEW/FILE_ACCEPTED/ESCALATED_TO_TECHNICIAN/
      SCHEDULED/IN_PROGRESS/REPORT_SUBMITTED/CERTIFIED/CANCELLED), inspection_findings.
36 - Built: src/modules/inspections/ (validators, service, controller, routes) -
      POST /v1/admin/cars/:carId/inspection/rounds (seller submits EXTERNAL_FILE or TEMPLATE,
      auto-accepted - see note below), POST .../request-technician (opens a new round straight
      into ESCALATED_TO_TECHNICIAN), PATCH rounds/:id/schedule|start|report|certify|cancel,
      GET /v1/admin/cars/:carId/inspection (full case + round history + findings),
      GET/POST /v1/admin/technicians, PATCH /v1/admin/technicians/:id.
      Known simplification: OPENED->INTERNAL_REVIEW->FILE_ACCEPTED happens instantly on submit
      (no separate "internal reviewer" persona exists in the system yet - Pillar 2's Platform
      Admin role is the natural future home for a real review queue). All the states still
      exist in the schema/type for when that changes.
37 - Enforced (cars.service.ts): a car cannot be created or updated into AVAILABLE/RESERVED
      status without an accepted (FILE_ACCEPTED or CERTIFIED) inspection round - matches the
      "hard requirement, no exceptions" decision (item 28). New cars must be created with a
      non-public status first (e.g. INACTIVE), since a round can't exist before the car's id
      does - clear conflict-error message guides the actual workflow.
38 - Backfilled: seed-demo.ts now creates an inspection_case + FILE_ACCEPTED TEMPLATE round for
      each of the 12 seeded cars (per decision - applies retroactively, no special exemption
      for demo data).
39 - DONE (was deferred, now built - 2026-08-04): buyer/renter-facing customer endpoints,
      Dashboard.tsx UI, CarDetail.tsx UI, and real EXTERNAL_FILE upload. See item 41 below.
40 - VERIFIED end-to-end against the local DB (switched .env back to local Postgres): ran
      db:migrate successfully, re-ran seed:demo (all 12 cars got their FILE_ACCEPTED template
      round), then a full scripted run through cars.service + inspections.service confirmed:
      (a) creating a car directly as AVAILABLE with no inspection is rejected, (b) creating as
      INACTIVE succeeds but updating to AVAILABLE before any inspection exists is still
      rejected, (c) submitting a TEMPLATE inspection then updating to AVAILABLE succeeds,
      (d) requestTechnicianVisit -> scheduleRound -> startRound -> submitReport -> certifyRound
      all transition correctly end-to-end with a real technician row and a real finding,
      (e) re-certifying an already-CERTIFIED round is correctly rejected, (f) getCaseForCar
      returns both rounds (#1 FILE_ACCEPTED, #2 CERTIFIED) in the right order, (g) deleting the
      test car cascades and cleanly removes its case/rounds/findings. The remote Render DB
      access-control issue from 2026-08-02 is still unresolved but no longer blocking - this
      pass verified against local Postgres instead.

--- 2026-08-04: Pillar 1 remaining pieces (customer endpoints + full UI) - DONE + VERIFIED ---
41 - Backend additions:
      - uploadBuffer() (config/cloudinary.ts) now takes a resourceType param ('image' | 'auto')
        so non-image files (PDF maintenance documents) upload correctly via Cloudinary's 'auto'
        detection, not forced as 'image'.
      - New uploadInspectionFile multer instance (middleware/upload.middleware.ts) - same
        memoryStorage pattern as car photos, but also accepts application/pdf, 10MB limit.
      - POST /v1/admin/cars/:carId/inspection/upload - admin uploads a real file (image or PDF),
        gets back a Cloudinary secure_url to pass into submitSellerInspection as externalFileUrl.
      - GET /v1/public/cars/:carId/inspection - public, no auth, returns the same case+rounds+
        findings shape as the admin endpoint (nothing in it is actually sensitive - it's the
        vehicle's own history, same idea as a Carfax report).
      - POST /v1/public/cars/:carId/inspection/request-technician - requireCustomerAuth; body is
        {intent: BUY|RENT, notes?}, mapped to requestedByRole BUYER/RENTER, reuses the exact same
        requestTechnicianVisit() service function the admin side uses (just actor.customerId
        instead of actor.adminId) - one round-opening code path for both.
      - New publicInspectionRoutes router (inspections.routes.ts) mounted at /public.
42 - BUG FOUND AND FIXED (pre-existing, not introduced this pass): favorites.routes.ts had
      `favoriteRoutes.use(requireCustomerAuth)` with no path scoping. A router-wide .use() like
      this runs for EVERY request that reaches that router, not just its own 3 routes - and since
      favoriteRoutes is mounted at /public alongside sibling routers, it silently 401'd any
      request that fell through to it without matching an earlier router, even for paths it
      doesn't own. This was latent (nothing before now needed a /public route mounted AFTER
      favoriteRoutes that wasn't already claimed by an earlier router) until the new public
      inspection route exposed it - confirmed via a real HTTP request returning 401 before the
      fix, 200 after. Fixed by applying requireCustomerAuth per-route instead of router-wide.
      Checked cars.routes.ts/leads.routes.ts for the same pattern - both are safe (their bare
      .use(requireAuth) is on ADMIN-only routers with no unauthenticated sibling routes mounted
      at the same prefix).
43 - Frontend - new lib/inspections-api.ts (admin-scoped: getAdminCarInspection,
      submitSellerInspection, uploadInspectionFile, requestTechnicianVisit, scheduleRound,
      startRound, submitReport, certifyRound, cancelRound, technician CRUD) + two new functions
      in public-api.ts (getCarInspection, requestCarInspection) + new types in api-types.ts
      (InspectionCase, InspectionRound, InspectionFinding, Technician, etc).
44 - Frontend - Dashboard.tsx: new "Inspections" tab (ShieldCheck icon) with a cars-needing-
      action list and full technician partner-network management (add/edit, active toggle). A
      "Manage Inspection" dialog per car shows full round history + findings, and a contextual
      action panel that changes based on the latest round's status (submit file/template ->
      request technician -> schedule -> start -> submit report with dynamic findings rows ->
      certify), plus cancel where applicable.
      - Car creation flow changed to match the new enforcement: new cars are always created as
        INACTIVE regardless of the form's Status field (which is now disabled until the car is
        being edited, with an explanatory note) - then the inspection dialog auto-opens for the
        car that was just created, guiding the admin straight into satisfying the requirement.
45 - Frontend - CarDetail.tsx: new "Inspection & Maintenance History" section showing a
      Drive X Certified / Seller-Provided Record / no-record badge (computed by preferring any
      CERTIFIED round over any FILE_ACCEPTED round, regardless of round order - a later round
      still IN_PROGRESS doesn't downgrade an earlier real certification), the full round/findings
      history, and a "Request a Professional Inspection" button (opens a small dialog: BUY/RENT
      intent + optional notes) for logged-in customers.
46 - VERIFIED end-to-end at the real HTTP layer (not just service-level like the 08-03 pass) -
      wrote a self-terminating script that starts the actual Express app on an ephemeral port,
      fires real requests, then closes the server before exiting (never touches port 5000, never
      conflicts with the user's own running dev server): confirmed GET /v1/public/.../inspection
      returns 200 with real data (no auth), admin login -> file upload returns a real
      Cloudinary raw-resource URL, and customer register -> request-technician returns 201 with
      requestedByRole correctly mapped from intent=RENT -> RENTER. This same run is what caught
      and confirmed the favorites.routes.ts bug (41/42) before and after the fix.
47 - Typecheck clean on both backend and frontend; `npm run lint` on the frontend still shows the
      same pre-existing 12 errors/1 warning baseline (all in shadcn boilerplate / Navbar / Home -
      see the 2026-07-31 audit), nothing new introduced by this pass.

Pillar 1 - Inspection / Maintenance branch (فرع الفحص والصيانة) [DONE PLANNING]
4 - Operating model: partner network (external garages/technicians, not Drive X employees), complementary specialties
5 - Requesters: seller / buyer / renter - optional, EXCEPT seller must have a maintenance file at listing (sale or rent), or must request inspection from Drive X if none exists
6 - Buyer/renter decides: trust the existing file, or request a fresh inspection from Drive X
7 - One persistent "inspection case" per car, with reopenable rounds (not a new case each time) - keeps full history
8 - States per round: OPENED -> INTERNAL_REVIEW -> FILE_ACCEPTED (done) OR -> ESCALATED_TO_TECHNICIAN -> SCHEDULED -> IN_PROGRESS -> REPORT_SUBMITTED -> CERTIFIED. CANCELLED possible before FILE_ACCEPTED/CERTIFIED
9 - Report includes findings list (severity + estimated repair cost per issue); if serious issues found, decision (proceed/fix/negotiate) left to buyer, costs documented in the file
10 - Pricing: depends on procedure (quick vs comprehensive), discounts for repeat customers, free for a new customer's first transaction (Drive X absorbs cost, recouped via commission)
11 - Payment follows the sale/rent/purchase flow, not charged in isolation
12 - Maintenance file: ONE unified format/template across all of Drive X (not per-partner)
13 - Technician/partner data (MVP - kept simple): name, city/zone, service tier (quick/comprehensive), specialty tag (informational only, no auto-routing/dispatch algorithm yet - manual assignment for now)
14 - OTP phone verification for new account registration - BACKLOG, not now

Pillar 2 - Multi-vendor marketplace (in progress, planning)
15 - Onboarding: self-serve/direct, no manual approval gate (trust is handled at the car level via Pillar 1, not vendor-level KYC)
16 - Revenue model: commission per deal (base, from day 1) + Premium/"Explore" subscription for boosted visibility (LATER, not at launch)
17 - New vendor incentives (approved): (a) first inspection/certification free, (b) reduced commission for a trial period, (c) free trial of Premium/Explore placement. "Trusted Vendor" badge idea - dropped/out of scope for now
18 - New user roles needed: Platform Admin (oversees all vendors) vs Vendor Owner/Staff (scoped to their own vendor) vs Inspection Partner (from Pillar 1) - see items 21/24 below for how this is implemented
19 - Open question: is the mandatory maintenance-file rule the same for both SALE and RENT listings - confirmed YES, applies to both
21 - Vendor Owner/Staff roles: REUSE the existing OWNER/STAFF permission logic as-is, just scoped per vendor_id (OWNER = full control + delete, STAFF = daily ops, no delete, no staff management) - no new permission model needed
22 - Platform Admin power model: tiered, NOT all-or-nothing -
      (a) full read/visibility across all vendors' data (monitoring, analytics, dispute investigation)
      (b) fast SUSPEND/HIDE power (reversible, not destructive) - the main day-to-day enforcement tool
      (c) permanent DELETE stays with the vendor themselves; Platform Admin only deletes in rare, documented, escalated cases (confirmed fraud etc.)
      all Platform Admin actions must be logged/audited (who did what, why - same pattern as existing updated_by)
23 - Suspend/hide triggers (decided):
      - AUTOMATIC instant hide of a single listing when Pillar 1's own internal review confirms a falsified/fraudulent maintenance file (objective, Drive X's own verified finding - no human gate needed for just hiding that one listing)
      - Buyer-complaint threshold (e.g. 3+ substantiated complaints in 30 days) auto-FLAGS the vendor for Platform Admin review - does NOT auto-suspend (avoids weaponized/rival-abused complaints) - a human makes the final suspend call
      - Any other manual Platform Admin decision (illegal content, scams, repeated no-shows on the mandatory inspection requirement, etc.) - always logged with a reason
24 - Multi-tenancy data scoping (DECIDED): new `vendors` table. `admin_users.vendor_id`
      (nullable) - NULL = Platform Admin, set = scoped to that vendor (implements the
      Platform/Vendor tier with one column). `cars.vendor_id` (required) - every car belongs to
      exactly one vendor. `leads`/`deals` do NOT get their own vendor_id - scope is derived via
      a join to the car's vendor_id, to avoid duplicated/driftable data.
25 - Commission mechanics (DECIDED): single flat platform-wide take-rate at launch (e.g. 2.5% on
      every completed deal, any vendor) - NOT per-vendor negotiated, NOT volume-tiered yet.
      Reuses the existing commissionAmount() calculation pattern from the deals module, applied
      against one central rate instead of a per-deal negotiated one. Volume-based tiering is a
      later-phase idea once real usage data exists to design tiers around.
26 - Vendor dashboard (DECIDED): reuse the existing Dashboard.tsx admin UI as-is for vendors -
      the backend's vendor_id scoping makes it automatically show only that vendor's own
      cars/leads/deals, no new vendor-facing UI needed at launch. The one genuinely NEW surface
      needed is a Platform Admin oversight view (vendor list, suspend/hide action, flagged-
      complaints queue) - small and separate from the existing dashboard.
27 - Buyer catalog experience (DECIDED): one unified public catalog (same Inventory.tsx as
      today) - NOT separate per-vendor storefronts. Vendor becomes just another car attribute
      (like brand/price), shown as a "Sold by: [Vendor Name]" badge on the car detail page.
      Per-vendor storefront pages are a possible later enhancement, not a launch requirement.
28 - Mandatory maintenance-file rule at listing (DECIDED, FINAL): hard requirement, enforced from
      day one, no grace period/exception for pre-existing cars. If the seller has no document to
      upload, they fill in a standard Drive X maintenance-data template (structured fields
      describing service history) instead of an uploaded file - so the requirement is always
      satisfiable (file OR filled-in template), never a hard blocker. Applies retroactively: the
      12 existing seeded demo cars get their template filled in too, no special-cased exemption.
29 - Drive X's own current inventory / identity in the multi-vendor model (DECIDED, FINAL): NO
      special-casing anywhere. Three fully separate, symmetric identity types - Platform Admin /
      Vendor / Customer - and every vendor is governed by the exact same rules with zero
      exceptions. Drive X's own direct-sale inventory becomes its own ordinary vendor row (e.g.
      "Drive X Direct"), managed through a normal Vendor Owner/Staff login like any other vendor.
      Platform Admin keeps ONLY the standard tiered oversight (read/visibility + suspend/hide)
      over every vendor including this one - explicitly rejected giving Platform Admin any extra
      "full control" carve-out for it, to avoid scattering one-off conditionals through the
      authorization logic. The 12 existing seeded cars get migrated to this "Drive X Direct"
      vendor row (not left vendor-less, not attached to the Platform Admin account).

Pillar 3 - Customer maintenance service layer (planning, not implementation yet)
30 - Product distinction: keep "inspection" and "maintenance" related but separate.
      Inspection = trust/certification workflow before listing or before buyer/renter decision.
      Maintenance = after-sale / after-rent / owner-care service workflow for customers who
      already own or use a car and need regular service, repair, or follow-up.
31 - Core customer value: customer can request maintenance from Drive X without needing to call
      vendors manually. Drive X becomes the coordinator between customer, vendor, technician/
      garage partner, and the car's known inspection/service history.
32 - MVP entry points:
      (a) customer dashboard: "Request Maintenance" button,
      (b) car detail page: if logged in, request maintenance for this car,
      (c) after a completed deal: customer sees the purchased/rented car under "My Cars" and can
      request maintenance from there,
      (d) admin/vendor dashboard: maintenance requests queue.
      DECIDED: maintenance is ONLY for cars that belong to the Drive X marketplace ecosystem.
      No external/manual-only cars in MVP. A request must link to an existing Drive X car and,
      when possible, to a completed sale/rent deal for that customer.
33 - Customer request form fields (MVP):
      - car reference: existing Drive X car/deal only
      - request type: ROUTINE_SERVICE, REPAIR, DIAGNOSTIC, EMERGENCY, OTHER
      - symptoms/notes
      - preferred city/area
      - preferred date/time window
      - pickup/delivery needed? yes/no
      - customer contact phone
      - optional images/files
34 - Maintenance request statuses:
      NEW -> TRIAGED -> ASSIGNED_TO_PARTNER -> SCHEDULED -> IN_PROGRESS -> WAITING_CUSTOMER_APPROVAL
      -> COMPLETED. CANCELLED possible before completion. REJECTED possible during triage if the
      request is invalid/out of service area.
      Rental flow decision: rent-related maintenance must pass Platform Admin review first, then
      be routed to the vendor. Vendor cannot directly accept/start rental maintenance before the
      platform sees it. This keeps liability, fraud checks, and customer protection centralized.
      Possible extra statuses for rental path: ADMIN_REVIEW -> SENT_TO_VENDOR -> VENDOR_ACKNOWLEDGED.
35 - Partner operating model:
      Reuse the existing technicians/partner network concept initially, but treat maintenance
      partners as service providers with capabilities. A partner can do inspections, maintenance,
      or both. Do not build complex auto-dispatch in MVP; use manual assignment from dashboard.
36 - Data model proposal:
      - maintenance_requests: customer_id, car_id NOT NULL, deal_id nullable, vendor_id nullable,
        assigned_partner_id nullable, request_type, status, city, preferred_time, pickup_needed,
        notes, contact_phone, quoted_amount/currency, approved_amount/currency, timestamps.
      - maintenance_request_files: request_id, file_url, storage_key, file_type.
      - maintenance_updates: request_id, author_role, author_admin_id/customer_id nullable,
        status_from/status_to, note, created_at. This gives timeline/audit history.
      - optional later: maintenance_invoices and maintenance_payments once payment flow is real.
      Engineering note: because external cars are out of scope, car_id should be NOT NULL in the
      final schema. deal_id can stay nullable to support marketplace-owned cars that do not yet
      have a closed deal link, but customer-owned "My Cars" UX should prefer deal_id when present.
37 - Role permissions:
      - Customer: create request, see own requests, add notes/files, approve/reject quote,
        cancel before work starts.
      - Vendor owner/staff: see requests related to their sold/rented cars if vendor involvement
        is needed, add notes, coordinate with Drive X, acknowledge rental maintenance after
        Platform Admin routes it, but not see unrelated customer requests.
      - Platform Admin: full maintenance queue, triage, assign partner, set quote, change status,
        close/cancel, audit all actions.
      - Partner/technician portal: later phase. For MVP, platform admin can enter partner updates
        manually.
38 - Integration with deals:
      When a deal becomes CLOSED, create or expose a "My Cars" customer asset record so the
      customer can request maintenance for a car they bought or rented. For MVP, maintenance
      requests must always resolve to an existing Drive X car; if no completed deal link exists,
      Platform Admin must verify the relationship during triage before the request can proceed.
39 - Integration with inspection history:
      Maintenance requests should show the latest inspection/certification summary for context.
      Completed maintenance should append to the vehicle's visible service history, but it should
      not automatically certify the car. Certification still belongs to inspection rounds.
      DECIDED: completed maintenance history should appear on the public car detail page. However,
      public display must be sanitized: show service type/date/status/partner or Drive X verified
      label and high-level notes, but never expose customer identity, phone, private complaint
      text, invoice details, exact address, or internal admin/vendor notes.
40 - Pricing/quote model:
      Start with manual quote: admin reviews request, assigns partner, enters estimated amount,
      customer approves, then work proceeds. Online payment is later; for now track quote/approval
      and final amount as records only.
      DECIDED FOR MVP: do not implement real payments in the first maintenance release. Keep
      quote/approval/status tracking only, so the workflow is stable before money movement is
      introduced.
41 - Frontend surfaces:
      - CustomerDashboard: new "My Cars" tab and "Maintenance" tab.
      - Maintenance request dialog with upload support.
      - Dashboard.tsx admin/platform tab: maintenance queue with filters by status, city, partner,
        request type, and date.
      - CarDetail: "Request Maintenance" only for logged-in customers; for visitors route to login.
42 - Backend endpoints (proposal):
      - POST /v1/public/maintenance/requests (customer auth)
      - GET /v1/public/me/maintenance/requests (customer auth)
      - GET /v1/public/me/cars (customer auth, derived from completed deals)
      - POST /v1/public/maintenance/requests/:id/files (customer auth)
      - PATCH /v1/public/maintenance/requests/:id/cancel (customer auth)
      - PATCH /v1/public/maintenance/requests/:id/approve-quote (customer auth)
      - GET /v1/admin/maintenance/requests
      - PATCH /v1/admin/maintenance/requests/:id/triage
      - PATCH /v1/admin/maintenance/requests/:id/assign
      - PATCH /v1/admin/maintenance/requests/:id/schedule
      - PATCH /v1/admin/maintenance/requests/:id/status
      - POST /v1/admin/maintenance/requests/:id/updates
43 - Build order:
      1) backend schema + types + validators,
      2) customer create/list/cancel/approve endpoints,
      3) admin list/triage/assign/status endpoints,
      4) minimal frontend customer tab,
      5) admin maintenance queue,
      6) seed demo maintenance requests,
      7) tests for state transitions and vendor/customer scoping.
      DECIDED: build maintenance as a full product, delivered in phases. Phase 1 is the
      foundation, not the final scope. Phase 2 is part of the intended system roadmap and should
      be designed for from day one, even if implemented after Phase 1 is stable.
      Phase 1 - foundation:
      - customer "My Cars" surface,
      - create maintenance request,
      - Platform Admin maintenance queue,
      - basic state transitions,
      - rental requests pass Platform Admin first, then vendor,
      - completed maintenance appears as sanitized service history on CarDetail.
      Phase 2 - full workflow expansion:
      - quote approval polish,
      - richer file attachments,
      - notifications,
      - stronger rental responsibility workflow,
      - partner/technician portal,
      - payment/invoice flow.
      Engineering requirement: Phase 1 schema/API should not paint us into a corner. Keep audit
      trails, status history, nullable future payment/invoice references, partner assignment, and
      public/private record separation ready for Phase 2.
44 - Out of scope for MVP:
      - automatic partner dispatch/routing,
      - real online payment,
      - partner mobile portal,
      - live chat,
      - warranty contracts,
      - predictive maintenance reminders.
      - emergency maintenance workflow/SLA until the business rules are discussed in detail.
45 - Open decisions before implementation:
      - Emergency priority/SLA needs deeper discussion before implementation and should remain
        disabled/hidden or marked as later until then.
      - For sold cars, decide whether Platform Admin always triages first or whether simple
        routine service can go directly into scheduling.
      - Decide the exact public/private field split for completed maintenance records before
        exposing them on CarDetail.
