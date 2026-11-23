---
name: DecideAI Civic Design System
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#434655'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#747686'
  outline-variant: '#c4c5d7'
  surface-tint: '#2151da'
  primary: '#0037b0'
  on-primary: '#ffffff'
  primary-container: '#1d4ed8'
  on-primary-container: '#cad3ff'
  inverse-primary: '#b7c4ff'
  secondary: '#006d30'
  on-secondary: '#ffffff'
  secondary-container: '#92f5a4'
  on-secondary-container: '#007233'
  tertiary: '#6b3700'
  on-tertiary: '#ffffff'
  tertiary-container: '#8d4b00'
  on-tertiary-container: '#ffcba3'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b7c4ff'
  on-primary-fixed: '#001551'
  on-primary-fixed-variant: '#0039b5'
  secondary-fixed: '#95f8a7'
  secondary-fixed-dim: '#79db8d'
  on-secondary-fixed: '#00210a'
  on-secondary-fixed-variant: '#005323'
  tertiary-fixed: '#ffdcc3'
  tertiary-fixed-dim: '#ffb77d'
  on-tertiary-fixed: '#2f1500'
  on-tertiary-fixed-variant: '#6e3900'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display-hero:
    fontFamily: Plus Jakarta Sans
    fontSize: 44px
    fontWeight: '800'
    lineHeight: 52px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: 0em
  title-official:
    fontFamily: Merriweather
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: 0.01em
  body-cert:
    fontFamily: Merriweather
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: 0em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-action:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '700'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-sm: 1rem
  margin: 2rem
  margin-sm: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

The design system establishes a civic, transparent, and modern educational environment engineered for the student union electoral platform of E.E. Engenheiro Urbano Alves de Souza Pereira. It merges institutional authority with youthful civic engagement, treating youth agency with seriousness, clarity, and security.

### Brand Personality & Emotional Impact
- **Trustworthy & Inviolable:** Evokes the cryptographic certainty of a formal ballot while remaining accessible to young voters.
- **Civic & Democratic:** Inspires active citizenship, dignity, and institutional pride.
- **Legible & Frictionless:** Minimizes cognitive load during deliberation, ballot casting, and auditing to prevent misclicks and voter hesitation.

### Aesthetic Direction: Modern Civic Clarity
The aesthetic strategy pairs clean architectural surfaces with high-contrast functional affordances. Rather than relying on gamified tropes, the system uses deliberate white space, strong structural cards, tactile feedback loops, and crisp typography. 

Key visual anchors:
- **Official Institutional Crest Seal:** A distinct white circular containment disk framed by subtle depth borders, dedicated to preserving the school's owl insignia across light, dark, and electoral banner contexts.
- **Deliberate Campaign Identifiers:** Vibrant slate-contained accents (Electric Blue, Radiant Amber/Orange, Vivid Emerald) reserved exclusively for candidate tickets (chapas), ensuring immediate identification without cluttering system chrome.
- **Tangible Interactive Targets:** All interactive voting mechanics enforce an absolute minimum touch zone of 48×48px with pronounced feedback states.

## Colors

The color palette is engineered to meet strict WCAG 2.1 AA/AAA compliance, separating neutral platform governance from partisan campaign identifiers.

### Hierarchy & Systematic Application
- **Primary Institutional Blues (`#0F2942` deep background/text, `#1E40AF` primary focus, `#1D4ED8` interactive primary):** Governs structural headers, official state messaging, active controls, and navigation chrome.
- **Secondary Ballot Green (`#16A34A` confirmation, `#15803D` solid action, `#22C55E` success alert):** Dedicated strictly to ballot confirmation, terminal vote submission, cryptographic validation seals, and active verification states.
- **Tertiary Amber (`#D97706`, `#F59E0B`):** Reserved for scrutiny warnings, active audit alerts, pending voter verification, and critical time-sensitive deadlines.
- **Cool Neutral Slate:**
  - Base White (`#FFFFFF`): Primary card surfaces and the circular crest seal background.
  - Neutral Background (`#F1F5F9`): Low-glare canvas preventing eye fatigue in school lab screens.
  - Neutral Muted (`#64748B`): Secondary metrics, captions, and structural borders (`#E2E8F0`).
  - Neutral Body (`#334155`): High-legibility body text.
  - Neutral Slate Deep (`#0F172A`): Maximum-contrast headlines and structural framing.

### Chapa (Campaign) Token Extensions
To preserve democratic parity, candidate slate colors are isolated to dynamic content chips, candidate profile banners, and ballot selection borders:
- `chapa-alfa`: Electric Blue (`#2563EB`)
- `chapa-beta`: Sunset Orange (`#EA580C`)
- `chapa-gama`: Emerald Green (`#059669`)

## Typography

The typographic hierarchy implements a triple-role strategy:

1. **Plus Jakarta Sans (Display, Headlines, Action Labels):** Provides an approachable, geometrically modern structure with open counters that ensures immediate legibility on institutional signage, voter guidance screens, and large call-to-action touchpoints.
2. **Inter (System Body, Form Controls, Tables, Numerical Data):** Provides neutral, highly legible micro-typography with tall x-height and distinct glyph disambiguation, critical for student identification codes, candidate proposals, and ballot receipts.
3. **Merriweather (Institutional Seals, Formal Attestations, Official Certificates):** Reserved strictly for certified election results, formal minutes (Atas Eleitorais), and voter completion certificates. This serif element establishes institutional gravitas and legal dignity without compromising UI agility.

## Layout & Spacing

The layout operates on an 8pt geometric baseline across a structured 12-column responsive fluid grid designed for low-friction decision-making.

### Grid Specifications & Breakpoints
- **Mobile (< 768px):** 4 columns, `margin-sm` (1rem / 16px), `gutter-sm` (1rem / 16px). Bottom-anchored action bars ensure immediate single-thumb operation.
- **Tablet (768px - 1024px):** 8 columns, `margin` (2rem / 32px), `gutter` (1.5rem / 24px). Dual-column candidate cards with expanded vertical touch areas.
- **Desktop (> 1024px):** 12 columns, max-width container capped at 1280px to preserve comfortable scan lengths for electoral proposals. Side rails contain audit status and session timers.

### Rhythm & Vertical Spacing
- Visual grouping follows strict encapsulation: inputs and associated contextual labels maintain `space-xs` (4px) to `space-sm` (8px).
- Candidate roster items are separated by `space-md` (16px) to avoid accidental selection.
- Ballot step segments and transition boundaries utilize `space-xl` (40px) to clearly separate individual electoral actions.

## Elevation & Depth

To sustain a clean, authoritative civic presence, this design system avoids noisy skeuomorphism and excessive blurs in favor of crisp structural tonal layers paired with ambient micro-shadows.

### Structural Depth Architecture
- **Level 0 (Canvas Base):** Solid `#F1F5F9`. Uninterrupted foundation providing neutral contrast against cards.
- **Level 1 (Cards & Content Panels):** Surface `#FFFFFF` bordered with an imperceptible 1px boundary of `#E2E8F0` and an ultra-diffused drop shadow: `0px 1px 3px rgba(15, 23, 42, 0.05), 0px 4px 12px rgba(15, 23, 42, 0.03)`.
- **Level 2 (Candidate Selection Cards - Active / Hover):** Elevated layer introducing an interactive lift: `0px 4px 6px -1px rgba(15, 23, 42, 0.08), 0px 12px 24px -4px rgba(15, 23, 42, 0.06)`. If selected, this is reinforced by a crisp 2px colored boundary matching the campaign ticket or institutional primary.
- **Level 3 (Modal Confirmation Dialogs & Secure Voting Booth Overlays):** `#FFFFFF` surface floating above a dim scrim (`#0F172A` at 60% opacity) backed by `0px 20px 40px -8px rgba(15, 23, 42, 0.22)`.
- **The Owl Seal Inset:** The circular crest seal utilizes a dedicated recessed white pill disk with an ultra-thin perimeter ring (`1px solid #CBD5E1`) and a soft inner ambient bloom (`inset 0px 1px 2px rgba(0,0,0,0.04)`), ensuring the school insignia remains legible against all banner colors.

## Shapes

The interface embraces a modern, approachable structural geometry using standard base radii of 8px (`0.5rem`), transitioning to generous 16px (`1rem`) and 24px (`1.5rem`) radii for cards and interactive containers.

### Shape Assignment Rules
- **Interactive Buttons & Input Fields:** 8px to 12px corner rounding creates a confident, modern clickable boundary while maintaining structural discipline.
- **Candidate Cards & Modal Containers:** 16px (`rounded-lg`) up to 24px (`rounded-xl`) for external container cards, giving election options an organized, welcoming appearance.
- **Official Seal:** Perfectly circular (border-radius: 9999px) preserving the integrity of the school owl crest.
- **Badge Chips & Audit Identifiers:** Full pill format (`9999px`) for campaign badges, grade levels (e.g., "3º Ano E.M."), and ballot status indicators.

## Components

### Buttons & Voting Triggers
- **Minimum Target Rule:** Every clickable or tappable element must maintain an absolute physical bounding box of at least 48×48px.
- **Urna Confirmation Action (Vote Submission):** Solid green `#15803D`, hover `#16A34A`, height 56px, typography `label-action`, uppercase tracking, white text. Includes a prominent checkmark icon and affirmative tactile state changes.
- **Institutional Primary Button:** Deep blue `#1D4ED8`, hover `#1E40AF`, white text, 48px to 52px height.
- **Correction / Reset Button (Corrige):** Neutral surface `#FFFFFF` with `#D97706` border and text, warning the voter before resetting choice.
- **Blank Vote Button (Branco):** Neutral ghost surface `#F8FAFC` with border `#94A3B8` and text `#334155`.

### Candidate & Ballot Cards
- **Structure:** Clean white `#FFFFFF` cards, 16px corner radius, containing student photo/avatar, official ticket number (prominently sized in `headline-md`), ticket name, and proposal preview.
- **Selection State:** High-contrast 2px border in primary blue or ticket-specific tint, elevation level 2, with an explicit large circular radio selection indicator (minimum 28px diameter).

### Input Fields & Voter Validation
- **Height & Padding:** 48px height minimum, 16px horizontal internal padding.
- **Borders & Focus:** 1.5px border `#CBD5E1`, shifting to a crisp 2px focus ring `#1D4ED8` with a 3px ambient focus halo at 15% opacity.
- **Accessibility:** Permanent visual labels (`label-sm`), never relying solely on disappearing placeholders. High-contrast error messaging in crimson `#DC2626`.

### Checkboxes & Radio Selection Controls
- **Size:** 24×24px visible box centered within a 48×48px touch zone.
- **Active Fill:** Institutional primary `#1D4ED8` or Ballot Green `#15803D` with crisp high-contrast white check or inner dot (minimum 10px).

### Civic Seals & Badges
- **Official Crest Badge:** Pure white circular substrate housing the E.E. Eng. Urbano Alves de Souza Pereira insignia, preventing color distortion when placed over header banners.
- **Chapa Identifier Chips:** Filled pills with 10% opacity tints of the campaign color and 100% solid text (e.g., background `#DBEAFE` with text `#1E40AF`).

### Official Certificate & Result Component
- **Aesthetic:** Editorial framing using `title-official` and `body-cert` (Merriweather), decorated with institutional blue borders and an official cryptographic verification hash stamp rendered in monospaced high-contrast slate.