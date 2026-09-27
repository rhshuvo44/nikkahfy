# NIKKAHFY — Wedding Invitation SaaS (MongoDB/Mongoose Edition)
# Build Prompt for OpenCode

You are a senior SaaS architect, frontend engineer, UI/UX designer,
and full-stack Next.js developer.

Build a production-ready SaaS platform called:

NIKKAHFY

Tagline: "Create beautiful digital wedding invitations."

Users create an account, build a wedding invitation, customize it,
publish it, share the public link, and collect RSVPs/wishes from
guests. This is a MULTI-TENANT SAAS PRODUCT — many users, each owning
one or more weddings.

Do not copy any real code, images, or branding from any existing
site. Use original placeholder content and an original SVG lace/
damask pattern.

---

## 1. LOCKED DECISIONS (do not deviate)

- Database: MongoDB + Mongoose. Do NOT use Prisma or PostgreSQL.
- Auth: Better Auth. Do NOT use Auth.js/NextAuth.
- State: prefer Server Components, URL state, React state, and server
  actions/route handlers. Do not introduce Redux unless something
  genuinely requires it.
- Theming: predefined theme tokens only. Do not store or execute
  arbitrary user CSS.
- Payments: create the Subscription model only. Do not implement any
  payment provider in MVP — that decision comes later.
- Templates: all templates consume the same normalized
  WeddingTemplateProps. Templates must NEVER query the database
  directly. Flow is: Database → Server/Data Layer → WeddingTemplateProps
  → Template. No template-specific database fields.
- Desktop card composition: the public invitation renders as a narrow
  centered card (max-width ~390–430px) on desktop with a calm neutral
  outer background — never full-width. Mobile is full-width with the
  same proportions. The whole thing must feel like an interactive
  digital wedding card, not a generic scrolling website.

---

## 2. CORE PRODUCT FLOW

Landing Page → Sign Up / Login → Dashboard → Create Wedding → Choose
Template → Wedding Information → Events → Family → Gallery → Design
Customization → Preview → Publish → Public Invitation → Share / RSVP

No coding knowledge required from the end user.

---

## 3. TECH STACK

- Next.js 15+, App Router, TypeScript, Tailwind CSS, shadcn/ui
- Lucide React, Framer Motion, React Hook Form, Zod
- MongoDB + Mongoose (see locked decisions)
- Better Auth (see locked decisions)
- Cloudinary for image storage
- Vercel deployment

Keep architecture ready for future Docker/Redis/background jobs/email,
but do not build them now.

---

## 4. DATA MODELS (Mongoose)

```
User
- name, email, image, role: "USER" | "SUPER_ADMIN" (default "USER")
- createdAt, updatedAt

Wedding
- userId (ref User)
- slug (unique)
- title, groomName, groomFullName, brideName, brideFullName
- weddingDateShort   // "Friday • 10.24.25"
- weddingDate, weddingTime
- dressCode
- venueName, venueAddress, mapUrl, wazeUrl
- phone
- musicType: "upload" | "youtube"
- musicUrl        // uploaded audio URL, or a YouTube video/URL when musicType is "youtube"
- status: "draft" | "published" | "archived"
- publishedAt
- createdAt, updatedAt

WeddingEvent
- weddingId (ref Wedding)
- title            // "Engagement", "Holud", "Wedding", "Reception"
- sortOrder
- gratitudeLine     // "With Joy & Gratitude to Almighty Allah"
- sideAParents: string[]
- joiner            // "together with"
- sideBParents: string[]
- schedule: [{ title: String, time: String }]   // stacked timeline items

GalleryImage
- weddingId (ref Wedding)
- url, publicId, alt, sortOrder
- isBlackAndWhitePair: Boolean   // marks the first B&W photo-pair row

Contact
- weddingId (ref Wedding)
- name, role   // e.g. "Father of Bride"
- phone
- sortOrder

GiftItem
- weddingId (ref Wedding)
- title, description
- link          // external store link, or bank/e-wallet details as text
- imageUrl
- sortOrder

RSVP
- weddingId (ref Wedding)
- name
- attendance: "attending" | "not_attending"
- guestCount   // "pax" count, only meaningful when attending
- message
- createdAt

Wish
- weddingId (ref Wedding)
- guestName, message, createdAt

WeddingTheme
- weddingId (ref Wedding)
- template
- primaryColor, secondaryColor, backgroundColor, textColor
- headingFont, bodyFont
  (no customCss field — predefined tokens only)

Subscription
- userId (ref User)
- plan, status, expiresAt

AnalyticsEvent
- weddingId (ref Wedding)
- eventType, metadata, createdAt
```

Add indexes on: Wedding.userId, Wedding.slug (unique), WeddingEvent.weddingId,
GalleryImage.weddingId, Contact.weddingId, GiftItem.weddingId, RSVP.weddingId,
Wish.weddingId, AnalyticsEvent.weddingId.

---

## 5. URL STRUCTURE

```
Public invitation:      /invite/[slug]

User Dashboard (any authenticated user, manages ONLY their own weddings):
                          /dashboard
                          /dashboard/weddings
                          /dashboard/weddings/new
                          /dashboard/weddings/[id]
                          /dashboard/weddings/[id]/edit
                          /dashboard/weddings/[id]/events
                          /dashboard/weddings/[id]/gallery
                          /dashboard/weddings/[id]/contacts
                          /dashboard/weddings/[id]/wishlist
                          /dashboard/weddings/[id]/design
                          /dashboard/weddings/[id]/preview
                          /dashboard/weddings/[id]/rsvp      // RSVP + Wishes tabs
                          /dashboard/weddings/[id]/analytics
                          /dashboard/weddings/[id]/settings

Admin Dashboard (SUPER_ADMIN role only, platform-wide):
                          /admin
                          /admin/users
                          /admin/users/[id]
                          /admin/weddings
                          /admin/weddings/[id]
                          /admin/subscriptions
                          /admin/settings
```

---

## 6. LANDING PAGE

Premium SaaS landing page. Hero: "Create a Wedding Invitation They'll
Remember." Supporting text about designing an invitation in minutes.
CTA "Create Your Invitation", secondary CTA "Explore Templates".
Sections: Hero, How It Works, Templates, Features, Live Preview, RSVP
Management, Mobile Friendly, Pricing, FAQ, Final CTA, Footer. Elegant,
not a generic developer-SaaS look.

---

## 7. TEMPLATE SYSTEM + FIRST TEMPLATE ("Vintage Rose")

Templates live in `templates/vintage-rose/`, `templates/elegant-gold/`,
etc., each implementing the same `WeddingTemplateProps` interface
(`{ wedding, events, gallery, contacts, theme }`). Switching templates
never deletes wedding data (see locked decisions above for the strict
data-flow contract).

Build "Vintage Rose" first, matching this exact section list and
visual language (this is the full, confirmed reference-match scope —
build all of it, not a trimmed version):

1. **Cover** — full-height original floral/lace SVG pattern (dusty
   rose/mauve/taupe: bg ~#EFE6E2, lines ~#8A6D68), centered oval
   double-border frame containing "The Nikkah Of" (serif), couple
   names in script font with "&" between, short date, and a small
   uppercase "OPEN" label. Tap OPEN → cover animates away → invitation
   reveals → music starts only now if enabled.
2. **Sticky header** — condensed names + short date, minimal serif,
   thin border, appears after opening.
3. **Family invite block** (repeats per WeddingEvent) — Arabic
   Bismillah line (proper Arabic font, RTL) → "With Joy & Gratitude to
   Almighty Allah" → thin divider → sideA parents → "together with" →
   sideB parents. Printed-invitation feel, not a modern card.
4. **Event sections** — one per WeddingEvent, each preceded/followed by
   the lace-pattern divider strip.
5. **Venue / Date / Time / Dress Code block** — bold uppercase labels
   (VENUE / DATE / TIME / DRESS CODE) each with its value centered
   beneath, capped by a "Save The Date" outline-button CTA.
6. **Schedule** — per event, a stacked timeline card: bold sub-event
   name with its time directly beneath, centered, generous spacing —
   not a table.
7. **Venue Address block** — divider line, address, divider line,
   "We look forward to celebrating with you!", followed by two small
   outline buttons: "View on Google Maps" (using `mapUrl`) and
   "Navigate with Waze" (using `wazeUrl`) — Waze deep link format
   `https://waze.com/ul?ll={lat},{lng}&navigate=yes` if coordinates are
   available, otherwise a plain external link to `wazeUrl`.
8. **Save to Calendar button** — a small outline button near the
   Venue/Date/Time block that generates an .ics file (or a Google
   Calendar add-event link) from the wedding's date/time/venue, so
   guests can add the event to their own calendar.
9. **Gallery** — grid; first row renders as a black-and-white photo
   pair (`isBlackAndWhitePair` images) before color photos further
   down; lightbox on click.
10. **Wishlist** — heading "GIFT WISHLIST" (only rendered if the
    wedding has at least one GiftItem): a simple list/grid of gift
    items, each showing image, title, description, and a "View" link
    (external store link, or bank/e-wallet details shown as text if no
    link is given). This section is optional per wedding — templates
    must handle an empty gift list gracefully by hiding the section.
11. **Wishes** — heading "WISHES", list of guest messages (quote + heart
    icon + bold name), then two outline buttons: "RSVP Now" and "Write
    a Message".
12. **RSVP & Wishes modal** — title "RSVP & Wishes"; first, two pill
    buttons "Attending" (check) / "Not Attending" (X); selecting
    Attending reveals Name, Total Attendance (pax-count dropdown),
    Wishes (textarea), Cancel/Submit.
13. **Contact modal** (opened from bottom nav) — heading "CONTACT",
    list of Contact documents: bold name, italic role beneath, phone
    + message icon buttons.
14. **Bottom nav** — fixed, Contact/Song/Location/RSVP, icons Phone/
    Music/MapPin/Mail, background #8A6D68, icons/text #F7F1EE; same
    width as the card on desktop (centered), full-width on mobile.
15. **Music button** — subtle floating control, starts only after the
    cover's OPEN interaction, never autoplay before that. Supports two
    modes per `musicType`: an uploaded audio file (`<audio>` element),
    or a YouTube video played via a hidden/minimal embedded YouTube
    player (audio-focused UI, not a visible video frame).

Typography: script font for names (Great Vibes/Alex Brush), serif for
supporting text (Cormorant Garamond/Playfair Display), Inter/DM Sans
for plain body text, Amiri/Scheherazade New for Arabic. Decorative
lace pattern also used as section dividers, low opacity, never
competing with text. No large shadows, no gradients, no glassmorphism,
no oversized modern buttons anywhere on the public invitation.

---

## 8. DASHBOARD — WEDDING INFORMATION, EVENTS, CONTACTS, GALLERY

Standard CRUD forms (React Hook Form + Zod) for:
- Wedding info: bride/groom names, date, time, dress code, venue name/
  address/map URL, phone, music URL
- Events: add/edit/delete/reorder; each with title, gratitude line,
  sideA/sideB parents, joiner text, and a schedule item list
  (add/edit/delete/reorder sub-events with title + time)
- Contacts: add/edit/delete/reorder; name, role, phone
- Wishlist: add/edit/delete/reorder gift items (title, description,
  link, image via Cloudinary) — entirely optional, template hides the
  section when the list is empty
- Gallery: upload via Cloudinary, preview, delete, reorder, mark which
  images form the black-and-white first-row pair

Autosave where practical.

---

## 9. DESIGN CUSTOMIZER + LIVE PREVIEW

Allow choosing primary/secondary/background/text colors and heading/
body fonts from predefined tokens (preset themes: Dusty Rose, Classic
Ivory, Elegant Gold, Sage Green, Midnight, Minimal) — no arbitrary CSS.
Live preview at `/dashboard/weddings/[id]/preview` renders the exact
same template component used publicly, with desktop/tablet/mobile
preview modes and Save/Publish/Open-Public-Invitation controls.

---

## 10. PUBLISH + SLUG SYSTEM

Wedding status: draft/published/archived. Publishing validates required
fields, generates a slug from bride+groom names (deduplicated with a
numeric suffix if taken), sets publishedAt, and flips status to
published. Public URL `/invite/[slug]`. Provide Copy Link and share
buttons (WhatsApp/Facebook/Telegram). Users can edit the slug from
settings (validate uniqueness).

---

## 11. RSVP + WISHES (per-wedding dashboard)

`/dashboard/weddings/[id]/rsvp` has two tabs:
- **RSVP tab**: summary cards (Total Responses, Attending, Not
  Attending, Total Guests), table (Name, Attendance, Guest Count,
  Message, Submitted At), CSV export.
- **Wishes tab**: table/list (Guest Name, Message, Submitted At),
  delete button per row.

Both scoped strictly to the current wedding (never another user's
data — verify `wedding.userId === currentUser.id` server-side on every
query).

---

## 12. ANALYTICS (basic)

Track invitation views and RSVP submitted/attending/declined per
wedding. Dashboard cards: Views, RSVPs, Attending, Declined. No
advanced analytics in MVP.

---

## 13. SECURITY

Never trust client-side ownership. Every route handler/server action
must verify `currentUser.id === wedding.userId` before reading or
writing wedding-scoped data. Validate all IDs, form data, uploaded
files, and slugs server-side. Prevent access to another user's wedding
by guessing/changing IDs in the URL.

All `/admin/*` routes additionally require `currentUser.role ===
"SUPER_ADMIN"` — checked server-side (middleware or a shared server
check), never on the client alone. A regular user hitting an `/admin/*`
URL directly must be redirected away, not shown a broken/empty page.

---

## 17. ADMIN DASHBOARD (platform-wide, SUPER_ADMIN only)

This is separate from the per-user `/dashboard` built in earlier
sections. `/dashboard` is where any signed-in user manages their own
wedding(s). `/admin` is a platform-wide control panel visible only to
users with `role === "SUPER_ADMIN"`.

Seed exactly one SUPER_ADMIN user (via a seed script reading
ADMIN_EMAIL/ADMIN_PASSWORD-style env vars, or by manually promoting a
User document's role) — there is no public "become admin" flow.

**/admin (overview)**
- Summary cards: Total Users, Total Weddings, Published Weddings,
  Total RSVPs (platform-wide), Total Wishes (platform-wide)
- Recent signups list, recent weddings-published list

**/admin/users**
- Table of all users: name, email, number of weddings, joined date,
  role
- /admin/users/[id]: that user's weddings, ability to disable the
  account (a `disabled: Boolean` flag on User that blocks login)

**/admin/weddings**
- Table of ALL weddings across every user: couple names, slug, owner
  (linked to /admin/users/[id]), status, published date, RSVP count
- /admin/weddings/[id]: read-only view of that wedding's info/events/
  RSVP/wishes counts, plus an "Unpublish" action for moderation
  (sets status back to draft) if content violates guidelines

**/admin/subscriptions**
- Table of Subscription documents: user, plan, status, expiresAt.
  Read-only in MVP since no payment provider is wired up yet.

**/admin/settings**
- A minimal settings page (e.g. toggle new-signup availability) —
  keep this minimal, do not over-build.

Layout: a clean, functional dashboard shell (sidebar or top nav) —
does not need to match the wedding's decorative visual style;
prioritize clarity and fast scanning of tables, consistent with how
the per-wedding RSVP/Wishes tabs (Section 11) are built.

All admin list/detail pages fetch live data server-side on each load —
no mock data. Every admin query and mutation must re-check the
SUPER_ADMIN role server-side, not just render the UI conditionally.

---

## 14. PERFORMANCE, ACCESSIBILITY, MOBILE, SEO

- Server Components where appropriate, Client Components only when
  necessary, `next/image`, optimized Cloudinary images, no N+1 queries.
- Semantic HTML, keyboard navigation, focus states, aria-labels, good
  contrast.
- Test 320/375/390/414/768/1024/1440px — the public invitation must be
  the narrow card described in Section 1 on desktop, full-width with
  the same proportions on mobile; the dashboard must remain usable on
  mobile too. No horizontal overflow anywhere.
- Public invitation generates dynamic metadata (title "Bride & Groom —
  Wedding Invitation", description, OpenGraph with couple image).

---

## 15. DEVELOPMENT ORDER

Do not attempt this in a single OpenCode session. Execute as grouped
sessions, one at a time, verifying each before moving on:

Session 1 — Project setup + MongoDB/Mongoose connection + Better Auth
Session 2 — Dashboard shell + Wedding CRUD (info form)
Session 3 — Events + Contacts + Gallery (Cloudinary)
Session 4 — Vintage Rose template (all 13 sections from Section 7)
Session 5 — Design customizer + Live preview
Session 6 — Publish system + public /invite/[slug] rendering
Session 7 — RSVP + Wishes (public submission + dashboard tabs)
Session 8 — Analytics
Session 9 — Admin Dashboard (Section 17): overview, users, weddings, subscriptions
Session 10 — Security audit + performance + full responsive/mobile pass

---

## 16. FINAL QA CHECKLIST

- [ ] User can register/login (Better Auth) and only see their own weddings
- [ ] MongoDB/Mongoose used throughout — no Prisma, no PostgreSQL
- [ ] Wedding CRUD, Events, Contacts, Gallery all work and are data-driven
- [ ] Vintage Rose template renders all 13 sections correctly, including
      the desktop narrow-card composition
- [ ] Design customizer changes reflect in live preview with no custom CSS
- [ ] Publish generates a working, unique slug at /invite/[slug]
- [ ] RSVP & Wishes modal flow matches exactly (pills → form)
- [ ] Contact modal, Dress Code block, Venue Address block all present
- [ ] Waze button, Google Maps button, and Save-to-Calendar all work; Wishlist section shows/hides correctly based on data; music plays correctly for both upload and YouTube types
- [ ] Dashboard RSVP tab (summary + table + CSV) and Wishes tab (list +
      delete) show accurate live data, scoped to the correct wedding
- [ ] Ownership checks enforced server-side on every wedding-scoped query
- [ ] SUPER_ADMIN-only /admin routes reject regular users server-side, not just hide UI
- [ ] Admin overview/users/weddings/subscriptions pages show accurate live, platform-wide data
- [ ] No horizontal overflow at any breakpoint; no TypeScript/console errors
- [ ] Production-ready code