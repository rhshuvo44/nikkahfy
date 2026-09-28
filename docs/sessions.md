# NIKKAHFY — Session-by-Session Build Prompts (New Project)

Paste these into OpenCode ONE AT A TIME, in a fresh Next.js project.
Finish and verify each session before starting the next. Full context
(data models, template section list, locked decisions) lives in
`nikkahfy-saas-mongodb-prompt.md` — these prompts are self-contained
excerpts of that spec, session by session.

---

## SESSION 1 — Project setup + MongoDB/Mongoose + Better Auth

```text
Scaffold a new Next.js 15 App Router project called NIKKAHFY:

- TypeScript, Tailwind CSS, shadcn/ui, Lucide React, Framer Motion
- React Hook Form + Zod for forms

Do NOT use Prisma or PostgreSQL. Do NOT use Redux unless something
later genuinely requires it. Do NOT use Auth.js/NextAuth.

1. Add MongoDB + Mongoose:
   - `lib/mongodb.ts` — cached connection helper using MONGODB_URI,
     safe for Next.js hot reload (cache on globalThis in development)

2. Add a User Mongoose model:
   - name, email, image
   - role: "USER" | "SUPER_ADMIN", default "USER"
   - disabled: Boolean, default false
   - createdAt, updatedAt

3. Add Better Auth for authentication (email/password is enough for
   MVP — no social login needed yet). Wire it to the User model above.
   Protect nothing yet beyond exposing a working signup/login/logout
   flow at /signup, /login, and a logout action.

4. Set up the base color tokens in globals.css as CSS variables (do
   not build any wedding-specific UI yet):
   --color-primary: #8A6D68
   --color-secondary: #B79A96
   --color-background: #EFE6E2
   --color-text: #2E2523

5. Add a `.env.example` with MONGODB_URI and whatever Better Auth
   requires (secret key, etc).

Verify: a user can sign up, log in, log out, and a User document with
role "USER" is created in MongoDB.
```

---

## SESSION 2 — Dashboard shell + Wedding CRUD

```text
Build the authenticated dashboard shell and basic Wedding management.
Continue in the same project from Session 1 — reuse the auth already
built.

1. Add a Wedding Mongoose model:
   - userId (ref User)
   - slug (unique, sparse — only set once published)
   - title, groomName, groomFullName, brideName, brideFullName
   - weddingDateShort   // "Friday • 10.24.25"
   - weddingDate, weddingTime
   - dressCode
   - venueName, venueAddress, mapUrl, wazeUrl
   - phone
   - musicType: "upload" | "youtube"
   - musicUrl
   - status: "draft" | "published" | "archived", default "draft"
   - publishedAt
   - createdAt, updatedAt
   Index userId and slug.

2. Protect everything under /dashboard: redirect to /login if not
   authenticated (middleware or a shared server check, not a
   client-only check).

3. Build /dashboard: list the current user's weddings as cards
   (name, date, status), with a "Create Wedding" CTA. Empty state:
   "No wedding invitation yet." + CTA.

4. Build /dashboard/weddings/new → creates a draft Wedding owned by
   the current user, redirects to its edit page.

5. Build /dashboard/weddings/[id]/edit: a form (React Hook Form + Zod)
   for all the Wedding fields above. On every read/write, verify
   `currentUser.id === wedding.userId` server-side — never trust the
   URL param alone. Autosave or a clear Save button, either is fine.

Do not build Events/Gallery/Contacts/Wishlist/template rendering yet —
those are later sessions.
```

---

## SESSION 3 — Events + Contacts + Gallery + Wishlist

```text
Add the remaining wedding-scoped content types. All of these belong
to a Wedding (via weddingId) and must be ownership-checked server-side
exactly like the Wedding model in Session 2.

Mongoose models:

WeddingEvent
- weddingId (ref Wedding)
- title            // "Engagement", "Holud", "Wedding", "Reception"
- sortOrder
- gratitudeLine     // "With Joy & Gratitude to Almighty Allah"
- sideAParents: string[]
- joiner            // "together with"
- sideBParents: string[]
- schedule: [{ title: String, time: String }]

Contact
- weddingId (ref Wedding)
- name, role       // e.g. "Father of Bride"
- phone
- sortOrder

GalleryImage
- weddingId (ref Wedding)
- url, publicId, alt, sortOrder
- isBlackAndWhitePair: Boolean

GiftItem
- weddingId (ref Wedding)
- title, description
- link             // external store link, or bank/e-wallet text
- imageUrl
- sortOrder

Build dashboard pages for each, all under /dashboard/weddings/[id]/...:

- /events — add/edit/delete/reorder events; each event's schedule is
  its own add/edit/delete/reorder sub-list of {title, time}
- /contacts — add/edit/delete/reorder contacts
- /gallery — upload via Cloudinary, preview, delete, reorder, and a
  toggle to mark which 2 images form the black-and-white first-row
  pair
- /wishlist — add/edit/delete/reorder gift items (image upload via
  Cloudinary); this list may be empty, that's valid

Use React Hook Form + Zod for every form. Drag-and-drop reordering is
a nice-to-have, not required — a simple up/down button is fine for MVP.
```

---

## SESSION 4 — Vintage Rose template

```text
Build the public-facing "Vintage Rose" invitation template. This is
the most detail-sensitive session — follow it precisely.

Create `templates/vintage-rose/` implementing a single component that
receives a normalized props object:

WeddingTemplateProps = {
  wedding,      // Wedding fields
  events,       // WeddingEvent[]
  gallery,      // GalleryImage[]
  contacts,     // Contact[]
  gifts,        // GiftItem[]
  theme,        // WeddingTheme (colors/fonts) — hardcode Vintage Rose
                // defaults for now if no theme system exists yet
}

The template must NEVER query the database directly — it only reads
from these props. Do not wire it to real data yet; render it against
a hardcoded mock props object for now (a future session connects it
to the live preview and public page).

DESKTOP CARD COMPOSITION (critical): on desktop, the invitation
renders as a narrow centered card, max-width ~390–430px, with a calm
neutral outer background — never full-width. On mobile (320–414px) it
becomes full-width with the same visual proportions. This must feel
like an interactive digital wedding card, not a generic scrolling
website.

Build these sections, in this order:

1. Cover — full-height original floral/lace SVG pattern (create
   `/public/patterns/lace-pattern.svg`, tileable, dusty rose/mauve/
   taupe, low opacity), centered oval double-border frame ("outer
   floral, inner dotted"), containing: "The Nikkah Of" (serif),
   bride & groom names in script font with "&" between, short date,
   small uppercase "OPEN" label. Tap OPEN → cover fades/scales away →
   invitation reveals → music starts only now (never autoplay before
   this interaction).
2. Sticky header — condensed names + short date, minimal serif, thin
   border, appears after opening.
3. Family invite block (repeats once per event in `events`) — Arabic
   Bismillah line (بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ, proper Arabic font,
   RTL) → "With Joy & Gratitude to Almighty Allah" → thin divider →
   sideA parents → joiner text → sideB parents. Printed-invitation
   feel, not a modern card.
4. Event sections — one per event, separated by the lace-pattern
   divider strip (top/bottom, not a full background).
5. Venue / Date / Time / Dress Code block — bold uppercase labels
   (VENUE / DATE / TIME / DRESS CODE) each with its value centered
   beneath, capped by a "Save The Date" outline-button CTA.
6. Schedule — per event, a stacked timeline card from `event.schedule`:
   bold sub-event name with its time directly beneath, centered,
   generous vertical spacing — not a table.
7. Venue Address block — divider line, address, divider line, "We
   look forward to celebrating with you!", then two small outline
   buttons: "View on Google Maps" (`wedding.mapUrl`) and "Navigate
   with Waze" (`wedding.wazeUrl`).
8. Save to Calendar button — near the Venue/Date/Time block, generates
   an .ics download (or a Google Calendar add-event link) from
   wedding date/time/venue.
9. Gallery — grid from `gallery`; first row renders as the
   black-and-white pair (images flagged `isBlackAndWhitePair`) before
   color photos further down; lightbox on click.
10. Wishlist — heading "GIFT WISHLIST", only rendered if `gifts.length
    > 0`: grid of gift items (image, title, description, "View" link).
    Hide the whole section when there are no gifts.
11. Wishes — heading "WISHES", list of guest wish messages (quote +
    heart icon + bold name), then two outline buttons: "RSVP Now" and
    "Write a Message". (Wire these to real submission in Session 7 —
    for now, render from a mock array.)
12. RSVP & Wishes modal — title "RSVP & Wishes"; first, two pill
    buttons "Attending" (check icon) / "Not Attending" (X icon);
    selecting Attending reveals Name, Total Attendance (pax-count
    dropdown), Wishes (textarea), Cancel/Submit.
13. Contact modal (opened from bottom nav) — heading "CONTACT", list
    from `contacts`: bold name, italic role beneath, phone + message
    icon buttons.
14. Bottom nav — fixed, Contact/Song/Location/RSVP with Phone/Music/
    MapPin/Mail icons, background #8A6D68, icons/text #F7F1EE; same
    width as the card on desktop (centered), full-width on mobile.
15. Music button — subtle floating control. Supports `musicType`
    "upload" (plain `<audio>`) or "youtube" (a minimal/hidden embedded
    YouTube player, audio-focused UI, no visible video frame).

Typography: script font for names (Great Vibes / Alex Brush), serif
for supporting text (Cormorant Garamond / Playfair Display), Inter/DM
Sans for plain body text, Amiri / Scheherazade New for Arabic. No
large shadows, gradients, glassmorphism, or oversized modern buttons
anywhere on the public invitation.

Add a temporary route (e.g. /dev/template-preview) rendering this
template against mock data so it can be visually reviewed before
being wired to real data in later sessions.
```

---

## SESSION 5 — Design customizer + Live preview

```text
Add per-wedding theme customization and a live preview.

1. WeddingTheme Mongoose model:
   - weddingId (ref Wedding)
   - template          // "vintage-rose" for now
   - primaryColor, secondaryColor, backgroundColor, textColor
   - headingFont, bodyFont
   (No customCss field — predefined tokens only, never store or
   execute arbitrary user CSS.)

2. Provide preset themes the user can pick from: Dusty Rose, Classic
   Ivory, Elegant Gold, Sage Green, Midnight, Minimal — each a fixed
   set of the WeddingTheme fields above.

3. Build /dashboard/weddings/[id]/design: preset picker + live preview
   pane using the actual Vintage Rose template component from Session
   4, fed with this wedding's real data (events, gallery, contacts,
   gifts) and the currently selected theme.

4. Build /dashboard/weddings/[id]/preview: the same template rendered
   full-size, with Desktop / Tablet / Mobile preview toggles, and
   Save / Publish / Open-Public-Invitation controls (Publish wiring
   comes in Session 6 — for now the button can be a placeholder if
   publishing isn't built yet).

Ownership checks apply here exactly as in previous sessions.
```

---

## SESSION 6 — Publish system + public /invite/[slug]

```text
Wire up publishing and the real public-facing page.

1. Slug generation: from bride + groom names, lowercased and
   hyphenated (e.g. "Tasnia" + "Rajib" → "tasnia-rajib"); if taken,
   append "-2", "-3", etc. Allow editing the slug from
   /dashboard/weddings/[id]/settings, validating uniqueness.

2. Publish action: validates required fields are filled, generates the
   slug if not already set, sets publishedAt, sets status to
   "published". Add an "Unpublish" action too (status back to "draft").

3. Build the public route `/invite/[slug]`:
   - Looks up the Wedding by slug where status === "published" (404
     otherwise)
   - Fetches its events, gallery, contacts, gifts, and theme
   - Renders the Vintage Rose template (Session 4) with this real data
     as WeddingTemplateProps — no dashboard UI, no admin controls, just
     the full-screen invitation
   - Generates dynamic metadata: title "{Bride} & {Groom} — Wedding
     Invitation", description, OpenGraph with a couple/cover image

4. Add Copy Link, and share buttons for WhatsApp/Facebook/Telegram, on
   both the dashboard preview page and after a successful publish.

Verify: an unpublished wedding's /invite/[slug] returns 404; a
published one renders correctly end-to-end with real data.
```

---

## SESSION 7 — RSVP + Wishes (public submission + dashboard tabs)

```text
Wire the RSVP & Wishes modal (built visually in Session 4) to real
persistence, and add the dashboard views to review responses.

1. Mongoose models:

RSVP
- weddingId (ref Wedding)
- name
- attendance: "attending" | "not_attending"
- guestCount
- message
- createdAt

Wish
- weddingId (ref Wedding)
- guestName, message, createdAt

2. Public API routes (no auth required — these are guest-facing, but
   validate everything server-side and never trust client input for
   `attendance`):
   - POST /api/weddings/[slug]/rsvp
   - GET  /api/weddings/[slug]/wishes   (for rendering the Wishes list)
   - POST /api/weddings/[slug]/wishes

3. Wire the public invitation's Wishes list to fetch real wishes, and
   the "RSVP Now" / "Write a Message" flows to these routes instead of
   mock data.

4. Build /dashboard/weddings/[id]/rsvp with two tabs, scoped strictly
   to this wedding (verify ownership server-side on every query):
   - RSVP tab: summary cards (Total Responses, Attending, Not
     Attending, Total Guests), table (Name, Attendance, Guest Count,
     Message, Submitted At), "Export CSV" button
   - Wishes tab: table/list (Guest Name, Message, Submitted At),
     delete button per row (with confirmation)

Verify: submitting the public RSVP form creates a real RSVP document
that shows up correctly on the dashboard RSVP tab for that wedding
only.
```

---

## SESSION 8 — Analytics

```text
Add basic per-wedding analytics.

1. AnalyticsEvent Mongoose model:
   - weddingId (ref Wedding)
   - eventType   // "view" | "rsvp_submitted" | "rsvp_attending" | "rsvp_declined"
   - metadata
   - createdAt

2. Record a "view" event when /invite/[slug] is loaded (server-side,
   not client-side, to avoid easy spoofing), and the relevant RSVP
   events when an RSVP is submitted (reuse the logic from Session 7).

3. Add an /dashboard/weddings/[id]/analytics page with summary cards:
   Views, RSVPs, Attending, Declined — scoped to this wedding only, no
   charts or advanced breakdowns needed for MVP.
```

---

## SESSION 9 — Admin Dashboard (SUPER_ADMIN)

```text
Build the platform-wide admin panel, separate from the per-user
/dashboard. Only accessible to users with role === "SUPER_ADMIN" on
the User model (already added in Session 1).

1. Seed exactly one SUPER_ADMIN (a script that promotes a User
   document's role by email, run manually — no public "become admin"
   flow).

2. Protect all /admin/* routes server-side (middleware or a shared
   check): verify `currentUser.role === "SUPER_ADMIN"`, redirecting
   regular users away — never rely on hiding UI client-side.

3. Build:
   - /admin — overview: Total Users, Total Weddings, Published
     Weddings, Total RSVPs, Total Wishes (all platform-wide), recent
     signups, recent published weddings
   - /admin/users — table of all users (name, email, wedding count,
     joined date, role); /admin/users/[id] shows that user's weddings
     and a "Disable account" action (sets `disabled: true`, and make
     sure disabled users can't log in)
   - /admin/weddings — table of ALL weddings across every user (couple
     names, slug, owner link, status, published date, RSVP count);
     /admin/weddings/[id] is a read-only detail view with an
     "Unpublish" moderation action
   - /admin/subscriptions — read-only table of Subscription documents
     (add a minimal Subscription model: userId, plan, status,
     expiresAt — no payment provider wired up yet, this is just the
     data structure)
   - /admin/settings — minimal, e.g. a toggle for whether new signups
     are allowed

Keep the admin UI plain and functional — it does not need to match the
wedding invitation's decorative style; prioritize clarity.
```

---

## SESSION 10 — Security audit + performance + responsive pass

```text
Final hardening pass across the whole app. Do not add new features —
only fix what's found here.

1. Security: re-check every route handler/server action that reads or
   writes wedding-scoped data (Wedding, WeddingEvent, Contact,
   GalleryImage, GiftItem, RSVP, Wish, WeddingTheme, AnalyticsEvent) —
   confirm `currentUser.id === wedding.userId` is verified server-side
   in every single one, and that all /admin/* routes verify
   `currentUser.role === "SUPER_ADMIN"` server-side. Try to access
   another user's wedding by editing an ID in the URL and confirm it's
   blocked.

2. Performance: Server Components where appropriate, Client Components
   only where needed, `next/image` everywhere, Cloudinary images
   optimized, check for and fix any N+1 query patterns in dashboard
   list pages.

3. Responsive QA: test 320 / 375 / 390 / 414 / 768 / 1024 / 1440px on
   both the public invitation and the dashboard/admin panels. The
   public invitation must show the narrow desktop card (max-width
   ~390-430px) described in Session 4 — confirm it hasn't regressed to
   full-width. No horizontal scroll anywhere, no clipped script-font
   names, no broken oval frame, no bottom-nav overflow.

4. Fix any remaining TypeScript or console errors across the app.
```