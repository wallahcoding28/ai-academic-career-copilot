# DESIGN SYSTEM SPECIFICATION
## Product: AI Academic & Career Copilot

---

### 1. Vision & Brand Identity

The **AI Academic & Career Copilot** is a high-utility, academic-grade web platform engineered for university students transitioning from academic coursework to technical careers. It bridges coursework, resume preparation, competency evaluation, interview readiness, and exam revision without hype or artificial vanity metrics.

* **Personality:** Professional, minimal, academic, credible, structured, and focused.
* **Inspiration:** Linear, Notion, GitHub Academic, and modern developer documentation.
* **Target Audience:** Undergraduate and graduate CS/Engineering students, university professors, lab examiners, and technical evaluators during viva presentations.
* **Anti-Patterns (Strictly Avoid):**
  * NO neon colors, purple-pink crypto gradients, or glowing borders.
  * NO futuristic robot, cyborg, neural mesh, or sci-fi illustrations.
  * NO glassmorphism, blur overload, or heavy backdrop filters.
  * NO distracting spring physics, floating particles, or complex looped canvas animations.
  * NO fake user testimonials, simulated counts, or mock statistics.

---

### 2. Color System & Contrast Tokens

All colors are calibrated for WCAG AA/AAA compliance against light canvases. The color model relies on a deep Slate neutral foundation with restrained, purposeful functional accents.

#### 2.1 Neutral Foundation (Canvas, Surfaces, Typography)
* **Canvas Background:** `Slate 50` (`#f8fafc`) — Soft, clean off-white background reducing glare.
* **Card & Surface Background:** `White` (`#ffffff`) — Crisp elevated foreground for cards, modals, and toolbars.
* **Sub-Surface / Inset Background:** `Slate 100/60` (`#f1f5f9`) — Used for input dropzones, code blocks, and subtle background groupings.
* **Border Default:** `Slate 200/80` (`#e2e8f0`) — Clean 1px boundary lines.
* **Border Subtle:** `Slate 100` (`#f1f5f9`) — Internal table rows and secondary dividers.
* **Border Strong:** `Slate 300` (`#cbd5e1`) — Active input borders and hover states on cards.

#### 2.2 Typographic Contrast
* **Text Primary (Headings & Values):** `Slate 900` (`#0f172a`) — High-contrast, sharp readability.
* **Text Body / Secondary:** `Slate 700` (`#334155`) — Clear paragraph and descriptive text.
* **Text Muted / Tertiary:** `Slate 500` (`#64748b`) — Meta notes, subtitles, file sizes, and timestamps.
* **Text Disabled:** `Slate 400` (`#94a3b8`) — Disabled button text and inactive icons.

#### 2.3 Semantic & Functional Accents
* **Primary Interactive Accent:**
  * Base: `Slate 900` (`#0f172a`) / Hover: `Slate 800` (`#1e293b`) for high-contrast primary actions.
  * Secondary Brand Accent: `Blue 600` (`#2563eb`) / `Blue 700` (`#1d4ed8`) for links, active tabs, and primary selections.
* **Success / Matched (ATS Verified, Passed Criteria):**
  * Foreground: `Emerald 700` (`#047857`)
  * Background: `Emerald 50` (`#ecfdf5`)
  * Border: `Emerald 200` (`#a7f3d0`)
  * Solid Dot / Indicator: `Emerald 500` (`#10b981`)
* **Warning / Gap / Stage Notice (Upcoming Milestones, Missing Skills):**
  * Foreground: `Amber 800` (`#92400e`)
  * Background: `Amber 50` (`#fffbeb`)
  * Border: `Amber 200` (`#fde68a`)
  * Solid Dot / Indicator: `Amber 500` (`#f59e0b`)
* **Error / Critical (Failed Upload, Validation Faults):**
  * Foreground: `Rose 700` (`#be123c`)
  * Background: `Rose 50` (`#fff1f2`)
  * Border: `Rose 200` (`#fecdd3`)
  * Solid Dot / Indicator: `Rose 500` (`#f43f5e`)

---

### 3. Typography & Spacing Scale

* **Primary Font Family:** `Inter`, `-apple-system`, `BlinkMacSystemFont`, `"Segoe UI"`, `Roboto`, `sans-serif`.
* **Monospace Font Family:** `ui-monospace`, `SFMono-Regular`, `Menlo`, `Monaco`, `Consolas`, `monospace` (for endpoints, file names, and raw resume text).
* **OpenType Features:** `'cv02', 'cv03', 'cv04', 'cv11'` for optimal legibility of lowercase letters and digits.
* **Tabular Numbers:** `font-variant-numeric: tabular-nums` used for all numerical scores, latencies, percentages, and counters to prevent layout jank.

#### Typographic Hierarchy
| Role | Size | Line Height | Weight | Letter Spacing | Tailwind Equivalent |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Page Title** | 24px (1.5rem) | 32px | 700 (Bold) | `-0.025em` | `text-2xl font-bold tracking-tight text-slate-900` |
| **Section Header** | 18px (1.125rem) | 28px | 600 (Semibold) | `-0.02em` | `text-lg font-semibold tracking-tight text-slate-900` |
| **Card Header** | 15px (0.9375rem) | 22px | 600 (Semibold) | `-0.01em` | `text-base font-semibold text-slate-900` |
| **Body Large** | 14px (0.875rem) | 22px | 400 (Regular) | `normal` | `text-sm text-slate-700 leading-relaxed` |
| **Body Regular** | 13px (0.8125rem) | 20px | 400 (Regular) | `normal` | `text-[13px] text-slate-600 leading-normal` |
| **Labels & UI Actions**| 12px (0.75rem) | 16px | 600 (Semibold) | `0.01em` | `text-xs font-semibold text-slate-800` |
| **Badge / Meta Caption**| 11px (0.6875rem) | 14px | 500 (Medium) | `0.02em` | `text-[11px] font-medium text-slate-500` |
| **Overline / Category**| 10px (0.625rem) | 12px | 700 (Bold) | `0.05em` | `text-[10px] font-bold uppercase tracking-wider text-slate-400` |

---

### 4. Geometry, Elevation & Layout System

#### 4.1 Corner Radii (Predictable Geometry)
* **Pill Elements (Status dots, Tag chips, Badges):** `9999px` (`rounded-full`)
* **Interactive Elements (Buttons, Inputs, Selects, Dropdowns):** `8px` (`rounded-lg`)
* **Standard Cards & Containers (Feature cards, Upload dropzone, Report blocks):** `12px` (`rounded-xl`)
* **Major Surfaces & Shell Panels (Sidebar, Hero banner, Modal frames):** `16px` (`rounded-2xl`)

#### 4.2 Elevation & Shadows
Shadows must remain subtle, avoiding blurry diffused dark halos:
* **Subtle Shadow (Cards & Panels):**
  `box-shadow: 0 1px 2px 0 rgba(15, 23, 42, 0.04), 0 1px 1px 0 rgba(15, 23, 42, 0.02);` (`shadow-xs`)
* **Card Hover Elevation:**
  `box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.05), 0 2px 4px -2px rgba(15, 23, 42, 0.03);` (`hover:shadow-card`)
* **No Glows:** Strict prohibition against colored blur filters (`drop-shadow-[0_0_...`).

#### 4.3 Layout Grid & Sizing
* **Desktop Sidebar:** Fixed `w-64` (256px) on left edge with a persistent right border.
* **Mobile Drawer:** Overlay drawer with backdrop overlay (`bg-slate-900/40 backdrop-blur-xs`).
* **Header Height:** Fixed `h-16` (64px) with border bottom.
* **Content Constrained Containers:**
  * Standard Form / Diagnostics view: `max-w-5xl mx-auto` (prevents long unwieldy text lines).
  * Dashboard & Overview Grids: `max-w-7xl mx-auto`.
* **Standard Padding:**
  * Mobile: `p-4` (16px)
  * Tablet: `sm:p-6` (24px)
  * Desktop: `lg:p-8` (32px)

---

### 5. Standard Component Guidelines

#### 5.1 Primary & Secondary Buttons
* **Primary Button:** `bg-slate-900 text-white hover:bg-slate-800 px-4 py-2 rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-2`
* **Secondary Button:** `bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 px-4 py-2 rounded-lg text-xs font-semibold shadow-2xs transition-colors`
* **Destructive / Remove Button:** `text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors`

#### 5.2 Dropzone & File Uploader
* Standard empty state: Dashed border (`border-2 border-dashed border-slate-200`), soft background (`bg-slate-50/60`), centered cloud icon in white badge.
* Drag-active state: Solid active border (`border-slate-900 bg-slate-100/80`).
* File attached state: Solid card with document icon, file size, format badge, and remove icon.

#### 5.3 Diagnostic Score Indicators (ATS Overall Readiness)
* Prominent score display: `text-3xl font-extrabold tabular-nums` paired with `/100` meta label.
* Clean segmented or precision progress bar: Track `bg-slate-200 h-2 rounded-full overflow-hidden`, fill colored conditionally (Emerald >= 75, Amber >= 55, Rose < 55).
* Readability Index & Coverage cards: Displayed in a 3-column responsive metric grid with crisp uppercase category labels.

#### 5.4 Semantic Skill Badges (Matched vs. Missing)
* **Matched Competency:** `bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2.5 py-1 rounded-md text-xs font-medium inline-flex items-center gap-1.5`
* **Missing Target Skill:** `bg-amber-50 text-amber-900 border border-amber-200/80 px-2.5 py-1 rounded-md text-xs font-medium inline-flex items-center gap-1.5`

#### 5.5 Actionable Bullet Rewrites (Google X-Y-Z Formula)
* Card container: `border border-slate-200 rounded-xl p-4 bg-slate-50/40 space-y-3`.
* Original bullet: Soft gray background with italicized quote and red "Original" badge.
* High-impact rewrite: White elevated card with emerald accent border, clear typography, and a dedicated 1-click "Copy" button with temporary "Copied" checkmark feedback.
* Rationale tag: Small explanatory caption highlighting why the change strengthens ATS impact.

#### 5.6 Status Indicators & Live Telemetry
* Backend Health: Micro ping indicator in the sidebar with live pulsing dot (Emerald when active, Amber when checking, Rose when disconnected) and exact response latency in milliseconds (`${latencyMs}ms`).
* Stage Pills: Discreet neutral tags (`Stage 2 Active`, `Stage 3 Planned`) to maintain absolute transparency regarding what is implemented vs upcoming.
