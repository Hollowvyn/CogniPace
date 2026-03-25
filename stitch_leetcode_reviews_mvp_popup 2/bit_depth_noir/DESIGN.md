# Design System Strategy: The Kinetic Terminal

## 1. Overview & Creative North Star
This design system is engineered for the high-velocity developer environment. The Creative North Star is **"The Kinetic Terminal"**—a visual language that balances the raw efficiency of a command-line interface with the sophisticated hierarchy of modern editorial design. 

Unlike standard "consumer" extensions that rely on excessive whitespace and soft, bubbly shapes, this system embraces **Modular Density**. We treat the limited real estate of a Chrome extension as a high-performance dashboard. The aesthetic breaks the "template" look through intentional asymmetry, ultra-tight spacing scales, and a high-contrast interplay between deep charcoals and sharp kinetic amber accents. It is technical, authoritative, and unapologetically compact.

---

## 2. Colors: Tonal Architecture
The palette is rooted in a monochromatic dark spectrum, using a single "Heat Map" accent to drive the user's eye to critical technical actions.

### The Foundation
- **Background/Surface:** `#131313` (The void).
- **Primary Accent:** `primary` (`#ffc78b`) and `primary_container` (`#ffa116`). This is our "Action Amber," reserved for the most critical path (e.g., "Start Session," "Submit").
- **Status Tones:** 
    - `tertiary` (`#94dbff`): Technical info/Easy status.
    - `error` (`#ffb4ab`): Overdue/Breaking logic.

### The "No-Line" Rule
To achieve a premium feel, **prohibit the use of 1px solid borders for sectioning.** Boundaries must be defined through background color shifts. 
- Use `surface_container_low` for secondary background areas.
- Use `surface_container_high` for primary interactive cards.
- This creates a "molded" look where elements appear to be carved out of the interface rather than pasted onto it.

### Glass & Texture
For floating elements or dropdowns, use **Glassmorphism**: 
- Background: `surface_bright` at 60% opacity.
- Effect: `backdrop-blur: 12px`.
- This ensures that even in a compact utility, there is a sense of "physical" layering and depth.

---

## 3. Typography: Technical Editorial
We utilize a dual-font strategy to separate "Data" from "Interface."

- **The Display Voice (Space Grotesk):** Used for `display`, `headline`, and `title` scales. Its geometric, slightly quirky apertures provide a "tech-forward" personality that feels custom-built.
- **The Functional Voice (Inter):** Used for all `body` and `label` scales. Inter is chosen for its exceptional legibility at the `label-sm` (0.6875rem) size, critical for dense developer logs or small extension windows.

**Hierarchy Note:** Use `title-sm` (Inter, Bold) for card headers to maintain a compact vertical footprint while ensuring clear scannability.

---

## 4. Elevation & Depth: Tonal Layering
Traditional drop shadows are too heavy for a compact utility. Instead, we use **Tonal Layering**.

- **The Layering Principle:** 
    1. Base Extension Layer: `surface`
    2. Section Grouping: `surface_container_low`
    3. Interactive Card: `surface_container_high`
    4. Hover State: `surface_container_highest`
- **Ambient Shadows:** Only for floating popovers. Use a 12px blur with 8% opacity of `on_surface`. It should feel like a soft glow, not a shadow.
- **The "Ghost Border":** If a separation is needed for accessibility, use `outline_variant` at **15% opacity**. This provides a hint of a structure without cluttering the visual field with hard lines.

---

## 5. Components: Precision Primitives

### Compact Cards
- **Structure:** No borders. Background: `surface_container_high`.
- **Corner Radius:** `sm` (0.125rem) or `DEFAULT` (0.25rem). Avoid `lg` or `xl`; we want a sharp, machined look.
- **Spacing:** Use `spacing.3` (0.6rem) for internal padding to maximize data density.

### Status Pills (Badges)
- **Shape:** `rounded-full` (9999px).
- **Styling:** 
    - *Easy:* `tertiary_container` text on `surface_container_highest`.
    - *Hard/Overdue:* `on_error_container` text on `error_container`.
- **Typography:** `label-sm` (all caps, +0.05em tracking) for a "military-spec" feel.

### Buttons
- **Primary:** `primary` background with `on_primary` text. Use `rounded.DEFAULT`.
- **Icon-Only (Secondary):** Use `on_surface_variant`. On hover, shift to `primary` with a subtle `surface_bright` background.
- **Micro-interactions:** Buttons should have a `active:scale(0.97)` transition to feel tactile within the extension popup.

### Inputs & Search
- **Style:** Subtle underline using `outline_variant` (30% opacity) instead of a full box.
- **Focus:** Transition the underline to `primary` (`#ffc78b`) at 2px height.

---

## 6. Do's and Don'ts

### Do:
- **Use the Spacing Scale:** Stick strictly to `spacing.1` (0.2rem) for related elements and `spacing.4` (0.9rem) for section breaks.
- **Embrace Asymmetry:** Align primary metadata to the left and secondary icon-actions to the far right to create clear visual anchors.
- **Use Monospaced Numbers:** If displaying code or timers, force `font-feature-settings: "tnum"` (tabular figures) to prevent layout jitter.

### Don't:
- **Don't use `rounded-lg` or higher:** Soft corners degrade the "technical tool" aesthetic. Keep it sharp (`0.25rem` max).
- **Don't use Dividers:** Never use a horizontal `<hr>` or border to separate list items. Use a 1px gap with a `surface_container_low` background showing through, or simply `spacing.2`.
- **Don't use Pure White:** `on_surface` (`#e5e2e1`) is an off-white that reduces eye strain in dark environments. Pure white (`#FFFFFF`) is prohibited.