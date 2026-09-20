# Task 5-d — Tours Management View

## Deliverables
- Main: `src/components/views/tours-view.tsx` (~3300 lines, 12 sub-components)
- Modified APIs: `src/app/api/tours/route.ts`, `src/app/api/tours/[id]/route.ts`
- New API: `src/app/api/slots/[id]/route.ts` (PATCH + DELETE)
- Image-gen scripts: `scripts/gen-tour-images.mjs`, `scripts/gen-tour-images-2.mjs`
- Generated assets: `public/tours/{desert,dhow,mountain,city,turtle,wadi}-1.jpg` (6 covers, 1024x1024)
- `src/app/page.tsx` wired to ToursView

## Key Decisions
- Used Sheet (right side, max-w-3xl) for tour detail, Dialog (max-w-4xl) for add/edit form, Dialog (max-w-5xl) for slot management.
- Used `key={tour.id}` remount pattern on `TourDetailContent` to avoid React 19 `set-state-in-effect` lint errors. Same approach used by payments-view for their dialogs.
- `parseJsonArray` helper handles both raw arrays (Prisma Json field) and stringified JSON (API responses) so seed data and fresh API data both render correctly.
- Image onError hides the broken `<img>`, leaving the layered category gradient visible as fallback.
- Category color coding: 10 categories with distinct Tailwind gradients (Desert=amber/orange/yellow, Water Sports=teal/cyan/emerald, Mountain=stone, City Tour=emerald/teal, Adventure=orange/amber/red, Cultural=amber/orange/rose, Diving=cyan/teal/emerald, Fishing=teal/cyan, Family=rose/pink, Luxury=yellow/amber/orange). NO blue/indigo.

## API changes summary
- `GET /api/tours?status=all` returns all tours regardless of status (admin mode). Default (no status param) returns only ACTIVE (customer mode).
- `POST /api/tours` accepts optional `addOns: [{name, price, type}]` array.
- `PUT /api/tours/[id]` accepts optional `addOns` array — replaces existing addOns (delete + recreate).
- `PATCH /api/slots/[id]` with `{status, capacity, priceOverride, seatsBooked}` — auto-recomputes FULL/OPEN.
- `DELETE /api/slots/[id]` deletes a single slot.

## Sub-components
1. `ToursView` (main) — header + filters + grid + dialog state
2. `ErrorState`
3. `EmptyState` (handles both empty + filtered-empty)
4. `TourCard` — premium card with cover image, badges, rating, price, quick actions
5. `TooltipActionButton`
6. `ToursGridSkeleton`
7. `TourDetailSheet` — outer Sheet wrapper, renders `TourDetailContent` keyed by tour.id
8. `TourDetailContent` — fetches full tour with reviews, renders gallery + 5 tabs (Overview/Itinerary/Includes/Add-ons/Reviews)
9. `TourFormDialog` — 5-tab form (Basics/Media/Itinerary/Inclusions/Pricing)
10. `FormTabs` + `Field` + `TagInputField`
11. `SlotManagementDialog` — calendar + slot list + add/bulk dialogs
12. `AddSlotDialog`, `BulkSlotsDialog`, `SlotRow`, `StatBox`

## Verification
- `bun run lint` — 0 errors 0 warnings
- `GET /` → 200
- `GET /api/tours?status=all` → 200 (returns 6 seeded tours with addOns)
- All 6 cover images now serve 200 (after generation)
