---
name: dynamic-theme-ui
description: "Build frontend UI with dynamic theming. Use when creating or updating components, theme providers, CSS variables, or config-driven color systems that must inherit palette, spacing, typography, or mode from app config."
argument-hint: "What UI should use the dynamic theme?"
user-invocable: true
---

# Dynamic Theme UI

## When to Use
- Building a new UI that must inherit brand colors from config
- Adding or updating a ThemeProvider or design token pipeline
- Converting hardcoded colors to config-driven CSS variables
- Supporting light/dark modes or other theme variants

## Workflow
1. Inspect the theme config source first.
2. Identify the canonical theme values: primary, secondary, accent, background, foreground, border, radius, shadows, and typography.
3. Create or update the ThemeProvider so it:
   - Reads from config at runtime or build time
   - Maps config colors into CSS variables
   - Exposes theme context or hooks to components
   - Falls back safely when config values are missing
4. Update UI components to consume tokens instead of literals.
5. Derive variants and states from the same token system.
6. Check accessibility: contrast, focus states, disabled states, charts, icons, and surfaces.
7. Verify theme inheritance across nested layouts, dialogs, and routed pages.

## Decision Rules
- If the project already has a theme system, extend it rather than replacing it.
- If theme config is global, keep styling token-driven and avoid per-component overrides.
- If a component needs a custom color, derive it from the theme scale instead of introducing a one-off hex value.
- If config is incomplete, add safe defaults and document the missing token.

## Completion Checks
- No hardcoded colors remain where a theme token exists.
- ThemeProvider receives values from config and propagates them consistently.
- UI works in every supported theme mode and viewport.
- New components match the existing design language and spacing scale.

## Output Expectations
- Prefer small, composable changes.
- Explain where the theme data comes from and which tokens each UI surface uses.
- Call out any config gaps that still need product or design input.
