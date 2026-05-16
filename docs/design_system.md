# DriveX Design System

## 1. Design Principles

Core concept: speed, clarity, and control.

- Fast browsing.
- Clear decisions.
- Minimal complexity.
- Arabic-first content with English-ready layouts.

## 2. Color System

### Public App / Visitor Web

- Background: `#0B0F19`.
- Surface: `#121826`.
- Primary accent: `#00D2FF`.
- Secondary accent: `#3A7BFF`.
- Text: `#F0F6FC`.
- Muted text: `#9CA3AF`.

### Admin Dashboard

The admin dashboard should be calmer and denser than the public app.

- Background: `#F8FAFC`.
- Surface: `#FFFFFF`.
- Border: `#E5E7EB`.
- Text: `#111827`.
- Muted text: `#6B7280`.
- Primary action: `#2563EB`.
- Success: `#16A34A`.
- Warning: `#D97706`.
- Danger: `#DC2626`.

## 3. Typography

- Headings: Montserrat or Inter, bold.
- Body: Inter, regular.
- Dashboard numbers/code: JetBrains Mono where useful.

Suggested sizes:

- H1: 32px.
- H2: 24px.
- Body: 16px.
- Small: 14px.

## 4. Spacing

Use an 8px spacing system:

- 4px.
- 8px.
- 16px.
- 24px.
- 32px.

## 5. Components

### Button

- Primary: solid primary color, white text.
- Secondary: outlined primary color.
- Destructive: red background for irreversible actions.
- Radius: 8px for dashboard, 12px for public app.

### Input

- Clear label.
- Visible focus state.
- Error text below the field.
- Phone and price fields should use suitable keyboard/input types.

### Car Card

- Image.
- Brand, model, year.
- Price or rent price.
- Listing type badge.
- Availability status.
- Main CTA.

### Badge

- Sale: blue.
- Rent: purple.
- Both: cyan.
- Sold/Rented: gray.
- Reserved: amber.

### Dashboard Table

- Dense rows.
- Search and status filters.
- Clear row actions.
- Empty and loading states.

## 6. Main Screens

### Public App

- Home/catalog.
- Search and filters.
- Car details and gallery.
- Buy/rent request form.

### Admin Dashboard

- Login.
- KPI overview.
- Cars table and create/edit forms.
- Lead inbox and status workflow.
- Deals and commission records.

## 7. Motion

- Duration: 150ms to 250ms.
- Use subtle fade or slide transitions.
- Avoid heavy animation in admin workflows.

## 8. UX Rules

- Keep the primary action obvious.
- Avoid more than two competing actions in compact mobile views.
- Always show validation errors near the related field.
- Public pages should prioritize visual confidence.
- Admin pages should prioritize scanning, filtering, and repeated actions.

## 9. API Integration Rules

- Public app uses only `/v1/public/*`.
- Admin dashboard uses only `/v1/admin/*`.
- Generated API types should come from `openapi.yaml` or `openapi.backend.yaml`.
- Do not calculate commission in the frontend; show the backend result.

## 10. Future Expansion

- Light mode for public app.
- Full bilingual UI.
- Saved favorites.
- Push notifications.
- Advanced analytics.
