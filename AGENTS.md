# AGENTS.md (Project Structure & Context)

This file is the primary project guide for AI agents working in this repository.
It defines repository structure, current progress, coding standards, testing instructions, and navigation rules.

## 1) Project Overview

- Project type: static personal website.
- Stack: plain HTML, CSS, JavaScript.
- Build system: none.
- Deployment target: GitHub Pages from repository root.
- Theme behavior: light/dark mode with `localStorage` persistence and system-preference fallback.

## 2) Current Progress Snapshot

Implemented now:
- Multi-page site is live in repo root:
  - `index.html` (About Me)
  - `teaching.html` (teaching info + resources table)
  - `cv.html` (CV download/open + embedded PDF)
  - `404.html` (not found page)
- Shared styling and behavior centralized:
  - `assets/css/styles.css`
  - `assets/js/theme.js`
- Assets present:
  - portrait/avatar images
  - CV and teaching PDF files
- Mobile navigation support is implemented in JS/CSS (`.nav-toggle` + `.nav.open`).
- Footer year auto-updates via JS.

Known content placeholders / follow-ups:
- Teaching terms include multiple `To be updated` placeholders.
- `README.md` references `about.html`, but current homepage is `index.html`.
- `404.html` footer links to `contact.html`, which is not present in this repo.
- `cv.html` and `404.html` contain an extra bottom `#themeToggle` button in addition to header toggle.

## 3) Repository Structure

```
.
├── 404.html
├── README.md
├── cv.html
├── index.html
├── teaching.html
└── assets/
    ├── css/
    │   └── styles.css
    ├── files/
    │   ├── CV.pdf
    │   └── RMSC4003.pdf
    ├── images/
    │   ├── avatar.jpg
    │   └── portrait.jpg
    └── js/
        └── theme.js
```

## 4) How To Navigate This Codebase (Agent Playbook)

When making changes, use this order:
1. Start from page entry points (`index.html`, `teaching.html`, `cv.html`, `404.html`).
2. Confirm shared classes in `assets/css/styles.css` before adding new classes.
3. Confirm shared behavior in `assets/js/theme.js` before adding inline scripts.
4. Reuse existing patterns (header/nav/footer/theme toggle/button styles/table/prose blocks).
5. Keep all page paths relative from repo root (GitHub Pages root deploy model).

Rules for edits:
- Prefer updating shared CSS/JS over duplicating logic per page.
- Keep pages static; do not introduce frameworks/build tools unless explicitly requested.
- Keep accessibility attributes (`aria-*`, semantic headings, alt text) intact.
- Preserve theme initialization behavior to avoid flash.

## 5) Coding Standards

### HTML
- Use semantic sections (`header`, `main`, `footer`, headings in order).
- Keep markup simple and readable (2-space indentation preferred to match existing files).
- Keep shared head tags on all pages:
  - charset, viewport, color-scheme meta
  - favicon
  - `assets/css/styles.css`
  - `assets/js/theme.js` with `defer`
- Use relative links for internal pages and assets.

### CSS
- Use CSS custom properties from `:root` / `html[data-theme="dark"]`.
- Reuse existing utility/component class names where possible (`container`, `prose`, `btn`, `table`, etc.).
- Keep responsive behavior aligned with current breakpoints (`900px`, `700px`).

### JavaScript
- Keep JS framework-free and minimal.
- Extend `assets/js/theme.js` for global behavior instead of adding repeated inline handlers.
- Use defensive checks (`if (element)`) before binding listeners.

## 6) Testing & Verification Instructions

No automated test framework exists. Use manual verification before commit:

1. Open each page locally in browser:
   - `index.html`
   - `teaching.html`
   - `cv.html`
   - `404.html`
2. Confirm top navigation links work across pages.
3. Confirm dark/light toggle works and persists after refresh.
4. Confirm mobile nav opens/closes at narrow viewport widths.
5. Confirm footer year renders current year.
6. Confirm PDF links/embedding load:
   - `assets/files/CV.pdf`
   - `assets/files/RMSC4003.pdf`
7. Confirm no broken internal links (especially footer/header links).

Optional quick local server (recommended for link/path checks):
- `python3 -m http.server 8000`
- Visit `http://localhost:8000`

## 7) Deployment Notes (GitHub Pages)

- Deploy from `main` branch, root folder.
- Since this is a static root-based site, ensure all links remain relative and root-compatible.
- `404.html` must remain in repo root for GitHub Pages not-found handling.

## 8) Change Log Guidance For Future Agents

When updating this repo:
- Append a short "Progress Update" section in this file with date + what changed.
- If new pages/components are added, update the structure tree and navigation rules.
- If tooling is introduced (linters/build/tests), add exact run commands in Section 6.

## Progress Update

- 2026-03-20: Updated visitor tracking so the homepage shows the detected IP, falls back across multiple geolocation providers, and the Node backend now tracks unique visitors by IP instead of counting approximate map areas.
