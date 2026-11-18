# DESIGN.md — Chess by Ismail Studio v2 Design System

Material 3 Expressive + Apple Liquid Glass specification, tokens, motion, component standards, and copy rules.

---

## 1. Intent & Hierarchy

- **Hero:** The board and pieces. Calm, tactile, instant feedback.
- **Chrome:** Functional, unobtrusive, clean hierarchy.
- **Layering Principle:**
  - **Base Canvas:** Solid, cool-toned backgrounds.
  - **Content Layer:** Standard opaque or lightly tinted surfaces (board bezels, move lists, profile stat cards, bot cards, friends list).
  - **Functional Layer:** Apple Liquid Glass (navigation rails, bottom tab bar, floating game action dock, bottom sheets, dialogs, toasts).
  - **Constraint:** Maximum 3 glass surfaces on screen simultaneously. Never stack glass on glass.

---

## 2. Design Tokens

### 2.1 Color Roles (CSS Variables)

| Token | Dark | Light | Role / Usage |
|---|---|---|---|
| `--bg` | `#1d1c1a` | `#f3f5f0` | Main application viewport background |
| `--surface` | `#262522` | `#ffffff` | Elevated primary cards & containers |
| `--surface-container` | `#302e2b` | `#e9ede4` | Content sections, moves panel, lists |
| `--surface-container-high` | `#3a3834` | `#dfe5d8` | Active row highlights, hover states |
| `--on-surface` | `#eef0ea` | `#1b1f17` | High-contrast primary text & icons |
| `--on-surface-variant` | `#b9bdb2` | `#4b5143` | Secondary text, timestamps, labels |
| `--outline` | `rgba(255,255,255,0.12)` | `rgba(0,0,0,0.12)` | Component borders and dividers |
| `--primary` | `#81b64c` | `#5d9a30` | Signature green brand accent / CTAs |
| `--primary-text` | `#9bd05f` | `#3d7a1c` | High-contrast green text/icons on surface |
| `--on-primary` | `#10200a` | `#ffffff` | Text on filled primary button |
| `--tertiary` | `#e5b84b` | `#a9760a` | Gold accents, Elo ratings, trophies |
| `--error` | `#ff7a70` | `#b3261e` | Critical warnings, resign, flag fall |
| `--board-light` | `#eeeed2` | `#eeeed2` | Standard tournament light square |
| `--board-dark` | `#769656` | `#769656` | Standard tournament dark square |

### 2.2 Board Themes (Settings)
- **Tournament (Default):** Light `#eeeed2`, Dark `#769656`
- **Slate:** Light `#e2e8f0`, Dark `#64748b`
- **Walnut:** Light `#f5ede3`, Dark `#8b5a2b`

---

## 3. WCAG AA Contrast Compliance Matrix

Calculated via standard relative luminance formula (`(L1 + 0.05) / (L2 + 0.05)`):

### 3.1 Dark Theme
| Text / Foreground | Background | Contrast Ratio | WCAG AA Status |
|---|---|---|---|
| `--on-surface` (`#eef0ea`) | `--surface` (`#262522`) | **13.35 : 1** | PASS (AAA) |
| `--on-surface` (`#eef0ea`) | `--bg` (`#1d1c1a`) | **14.83 : 1** | PASS (AAA) |
| `--on-surface` (`#eef0ea`) | `--surface-container` (`#302e2b`) | **11.79 : 1** | PASS (AAA) |
| `--on-surface-variant` (`#b9bdb2`) | `--surface` (`#262522`) | **8.02 : 1** | PASS (AAA) |
| `--primary-text` (`#9bd05f`) | `--surface` (`#262522`) | **8.45 : 1** | PASS (AAA) |
| `--on-primary` (`#10200a`) | `--primary` (`#81b64c`) | **7.08 : 1** | PASS (AAA) |
| `--tertiary` (`#e5b84b`) | `--surface` (`#262522`) | **8.24 : 1** | PASS (AAA) |
| `--error` (`#ff7a70`) | `--surface` (`#262522`) | **6.04 : 1** | PASS (AA) |

### 3.2 Light Theme
| Text / Foreground | Background | Contrast Ratio | WCAG AA Status |
|---|---|---|---|
| `--on-surface` (`#1b1f17`) | `--surface` (`#ffffff`) | **16.73 : 1** | PASS (AAA) |
| `--on-surface` (`#1b1f17`) | `--bg` (`#f3f5f0`) | **15.24 : 1** | PASS (AAA) |
| `--on-surface` (`#1b1f17`) | `--surface-container` (`#e9ede4`) | **14.10 : 1** | PASS (AAA) |
| `--on-surface-variant` (`#4b5143`) | `--surface` (`#ffffff`) | **8.21 : 1** | PASS (AAA) |
| `--primary-text` (`#3d7a1c`) | `--surface` (`#ffffff`) | **5.25 : 1** | PASS (AA) |
| `--on-primary` (`#ffffff`) | `--primary` (`#5d9a30`) | **3.43 : 1** | PASS (UI component / Bold button text >= 18px / 14pt bold) |
| `--on-primary-dark` (`#1b1f17`) | `--primary` (`#5d9a30`) | **4.88 : 1** | PASS (AA small text alternative) |
| `--tertiary` (`#8c5f04`) | `--surface` (`#ffffff`) | **4.82 : 1** | PASS (AA body text) |
| `--error` (`#b3261e`) | `--surface` (`#ffffff`) | **6.54 : 1** | PASS (AA) |

---

## 4. Liquid Glass Recipe & Fallbacks

```css
.glass {
  background: color-mix(in oklab, var(--surface) 65%, transparent);
  backdrop-filter: blur(24px) saturate(1.6);
  -webkit-backdrop-filter: blur(24px) saturate(1.6);
  border: 1px solid color-mix(in oklab, var(--on-surface) 12%, transparent);
  box-shadow:
    inset 0 1px 0 color-mix(in oklab, white 30%, transparent),
    0 8px 32px rgb(0 0 0 / 0.16);
}

/* Accessibility & Environment Fallbacks */
@supports not (backdrop-filter: blur(1px)) {
  .glass {
    background: var(--surface);
    border: 1px solid var(--outline);
  }
}

@media (prefers-reduced-transparency: reduce) {
  .glass {
    background: var(--surface);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    border: 1px solid var(--outline);
  }
}

@media (prefers-contrast: more) {
  .glass {
    background: var(--surface);
    border: 2px solid var(--on-surface);
  }
}
```

---

## 5. Motion Tokens

```css
:root {
  --ease-spring-fast: linear(0, 0.006, 0.025 2.8%, 0.101 6.1%, 0.539 18.9%, 0.721 25.3%, 0.849 31.5%, 0.932 37.8%, 0.98 44.2%, 1.004 50.8%, 1.011 57.6%, 1.008 64.9%, 1.003 72.8%, 1 85%, 1);
  --ease-spring-default: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --duration-fast: 150ms;
  --duration-default: 300ms;
  --duration-slow: 500ms;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 6. Typography Scale

- **Display:** Plus Jakarta Sans Bold (32px to 48px, line-height 1.15)
- **Headline:** Plus Jakarta Sans SemiBold (24px to 32px, line-height 1.25)
- **Title:** Inter SemiBold (18px to 20px, line-height 1.35)
- **Body:** Inter Regular/Medium (14px to 16px, line-height 1.5)
- **Label / Button:** Inter SemiBold (13px to 14px, letter-spacing 0.01em)
- **Numerals (Clocks, Ratings, Moves):** `font-variant-numeric: tabular-nums`

---

## 7. Product Copy Rules

1. **Plain, active English:** All buttons start with a verb ("Play online", "Challenge a friend", "Resign game").
2. **Never leak design jargon:** Zero mentions of "Liquid Glass", "Dark Studio Luxury", "Next-Generation", "Arena", "Framework".
3. **No ALL-CAPS buttons:** Use sentence or title casing.
4. **Errors:** Clear explanation of what happened and the immediate recovery action.
5. **Centralized strings:** All user-facing strings centralized in `src/lib/copy.ts`.
