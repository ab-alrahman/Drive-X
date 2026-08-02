1 -  check the database for connecting 
2 -  clear all the code 
3 -  split the code for commit it and push  

--- Roadmap / Pillars (planning, not implemented yet) ---

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
18 - New user roles needed: Platform Admin (oversees all vendors) vs Vendor Owner/Staff (scoped to their own vendor) vs Inspection Partner (from Pillar 1) - still needs full design
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
24 - Still to design: multi-tenancy data scoping (vendor_id on cars/leads/deals/admin_users), vendor dashboard needs, commission/take-rate mechanics in detail, buyer-facing catalog experience across multiple vendors

--- 2026-08-02: code audit pass (endpoints + filters) ---

25 - FIXED: GET /v1/admin/auth/me only echoed the JWT payload (id/email/role), never returned fullName -
      admin's real name never displayed anywhere in the dashboard (always fell back to "Admin User").
      Added auth.service.getProfile() that queries admin_users properly.
      
26 - FIXED: Dashboard.tsx "Profile Settings" Save button was a dead stub (just showed
      "endpoint is not available"). Added PATCH /v1/admin/auth/me (fullName only, same as
      customers' non-editable-email pattern) + wired the frontend to it.
      Removed the fake Phone/Address inputs (admin_users has no such columns - they were
      hardcoded placeholder values going nowhere).
27 - FIXED (real filter bug): price filter/sort used
      COALESCE(sale_price_amount, daily_rent_price_amount, monthly_rent_price_amount) - for a
      RENT-only car this compared its DAILY rate (e.g. $75) as if it were a price, always
      sorting/bucketing rent-only cars as "cheapest" regardless of real value. Reordered to
      prefer monthly_rent_price_amount over daily_rent_price_amount (less distorted proxy).
      Fixed in both buildFilters (priceMin/priceMax) and sortClause (priceAsc/priceDesc) -
      6 occurrences in cars.service.ts.
28 - FIXED (data-mismatch bug): Inventory/Home price-range filter buckets (under100k /
      100to200 / 200to500 / above500k) were calibrated for $100k-$500k+ luxury prices (likely
      left over from the old placeholder/mock data). Against the REAL seeded catalog ($12,800-
      $58,500), 3 of 4 buckets always returned zero results - verified empirically against the
      live DB. Recalibrated thresholds to <$20k / $20-30k / $30-40k / >$40k (all 4 buckets now
      return real cars) and updated the i18n labels (EN+AR) to match the new numbers.
29 - FLAGGED, NOT BUILT (out of scope for this pass - needs its own decision): the entire
      Deals admin UI is missing. admin-api.ts has full CRUD (getAdminDeals/createAdminDeal/
      updateAdminDeal/deleteAdminDeal/getAdminDeal) and the backend is solid (transactional,
      see item above from 2026-07-31), but Dashboard.tsx never imports or renders any of it -
      there is no way for an admin to actually create/view a deal from the UI today. This is
      bigger than a one-line fix (needs a Deals tab: list + create-from-approved-lead dialog +
      commission calculator) - needs explicit scoping before building.
30 - Verified working correctly (no changes needed): search/brand/listingType/fuelType/sortBy
      filters on the public catalog, admin car client-side search, all frontend API calls
      cross-checked 1:1 against backend routes (customers/favorites/leads/cars/deals) - no
      other missing endpoints found.
31 - Minor/low-priority, not fixed: backend supports filtering cars by `transmission` but the
      Inventory UI never exposes a transmission filter control (not broken, just unused
      capability - all seed cars are AUTOMATIC anyway so it wouldn't show a difference yet).

32 - BUILT (item 29 above, now done): Deals tab in Dashboard.tsx -
      - New sidebar tab "Deals": table of all deals (car, type, final price, commission, date, delete)
      - "Create Deal" dialog: pick an APPROVED lead with no existing deal yet (dropdown shows
        customer + car), deal type defaults from the lead's intent (BUY->SALE, RENT->RENT) but
        is overridable, final price, commission type/value, notes
      - Delete a deal reverts the car to AVAILABLE and the lead to APPROVED (uses the existing
        transactional deleteDeal from the 2026-07-31 pass)
      - Verified end-to-end against the real dev DB (not just typecheck): created a real deal for
        the "Fadi Hassan / Toyota Corolla" seeded lead (it was APPROVED with no deal - a perfect
        real test case) via the actual service function - confirmed the lead flipped to CLOSED,
        the car flipped to SOLD, and the dashboard's monthlyCommission aggregate picked it up
        correctly (437.50 USD commission on a 17,500 USD sale). This is now permanent demo data,
        not a throwaway test - it completes the narrative already written in the lead's own
        seed message ("Second buyer waiting on Corolla... Approved as backup lead").
      - Known follow-up (not done, small): no "edit deal" dialog yet, only create + delete.
        updateAdminDeal() exists in admin-api.ts and is unused - fine to add later if needed.

33 - FIXED (real bug, user-reported 400 error): Home.tsx's "Quick Search" widget imported
      `categories`/`brands` from the leftover mock file data/cars.ts -
      categories = ["Sports Car","Supercar","SUV","Sedan","Electric","Convertible"] (fake body
      styles, not a real column anywhere in the schema) and brands =
      ["BMW","Porsche","Ferrari","Mercedes-Benz","Audi","Aston Martin"] (fake brand list, half
      real seeded brands missing, half brands that don't exist in our catalog at all). The
      category value was being sent straight to the backend as `listingType`, which only
      accepts SALE/RENT/BOTH - so picking any category except "All" sent e.g.
      `listingType=Sports+Car` and the backend correctly 400'd it (confirmed from the user's own
      server log). Fixed: quick-search "category" dropdown now uses the real listingType enum
      (All/SALE/RENT/BOTH, same as Inventory.tsx's working filter), and the brand dropdown now
      fetches real brands via getFiltersMeta() (same pattern Inventory.tsx already used
      correctly). Also fixed the "Vehicle Categories" browse section further down Home.tsx -
      same fake categories, PLUS hardcoded fake vehicle counts ([12,8,5,15,6,4]) that were never
      real, and links that didn't even pass a filter param when clicked (went to plain
      /inventory regardless of which card was clicked). Now shows 3 real listing-type cards
      (For Sale / For Rent / Sale & Rent) with real counts fetched via getPublicCars(...).total,
      and each card actually filters when clicked.