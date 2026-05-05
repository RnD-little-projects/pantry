---
name: Neon Utility
colors:
  surface: '#121414'
  surface-dim: '#121414'
  surface-bright: '#383939'
  surface-container-lowest: '#0d0e0f'
  surface-container-low: '#1a1c1c'
  surface-container: '#1e2020'
  surface-container-high: '#292a2a'
  surface-container-highest: '#343535'
  on-surface: '#e3e2e2'
  on-surface-variant: '#baccb0'
  inverse-surface: '#e3e2e2'
  inverse-on-surface: '#2f3131'
  outline: '#85967c'
  outline-variant: '#3c4b35'
  surface-tint: '#2ae500'
  primary: '#efffe3'
  on-primary: '#053900'
  primary-container: '#39ff14'
  on-primary-container: '#107100'
  inverse-primary: '#106e00'
  secondary: '#c8c6c5'
  on-secondary: '#313030'
  secondary-container: '#474746'
  on-secondary-container: '#b7b5b4'
  tertiary: '#fcf9f9'
  on-tertiary: '#303030'
  tertiary-container: '#dfdddc'
  on-tertiary-container: '#626161'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#79ff5b'
  primary-fixed-dim: '#2ae500'
  on-primary-fixed: '#022100'
  on-primary-fixed-variant: '#095300'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1c1b1b'
  on-secondary-fixed-variant: '#474746'
  tertiary-fixed: '#e4e2e1'
  tertiary-fixed-dim: '#c8c6c6'
  on-tertiary-fixed: '#1b1c1c'
  on-tertiary-fixed-variant: '#474747'
  background: '#121414'
  on-background: '#e3e2e2'
  surface-variant: '#343535'
typography:
  h1:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h2:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: Space Grotesk
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.1em
  code-snippet:
    fontFamily: Space Grotesk
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.4'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  sidebar_width: 280px
  container_max_width: 1200px
  gutter: 24px
  margin_mobile: 16px
  stack_sm: 8px
  stack_md: 16px
  stack_lg: 32px
---

## Brand & Style
The brand personality is clinical, efficient, and high-energy. It targets the "power user" who manages household logistics with the precision of a software engineer. The UI evokes a sense of digital craftsmanship, blending the focus of a code editor with the accessibility of a consumer tool. 

This design system utilizes a **High-Contrast / Modern** style. It prioritizes information density and legibility through sharp color separation. The aesthetic leans into a "terminal" feel—using black voids and vibrant luminescence—to ensure that even in low-light grocery aisles, the interface remains piercingly clear and responsive.

## Colors
The palette is rooted in a "Pure Dark" philosophy to maximize the pop of the neon accent. The primary background is a deep charcoal (#1A1A1A), but the base canvas is pushed even darker (#0D0D0D) to create a sense of infinite depth. 

Neon Green (#39FF14) is reserved strictly for interactive highlights, success states, and critical information markers. Secondary surfaces use #2D2D2D to provide subtle separation without breaking the dark immersion. Text scales from pure white for headings to a muted neutral (#999999) for secondary metadata to reduce eye strain.

## Typography
The typographic system uses a pairing of **Space Grotesk** for structural elements and **Inter** for lists and long-form data. Space Grotesk provides the "techy," geometric flavor required for headers and labels, while Inter ensures maximum readability for item names and quantities. 

To lean into the "ChatGPT-like" sidebar aesthetic, labels and navigation items should use uppercase Space Grotesk with slight letter spacing to mimic a command-line interface. High contrast ratios between font weights are encouraged to establish clear hierarchy.

## Layout & Spacing
The layout follows a **Fixed Grid** model for the main content area with a persistent, collapsible sidebar. The sidebar is styled with a distinct surface color and a subtle 1px border on the right to separate it from the main list. 

Spacing follows a strict 4px baseline rhythm. Information density should be high but comfortable; list items should have generous horizontal padding (16px) but tight vertical stacking (8px) to allow more items to be visible on-screen at once. Use a 12-column grid for desktop views, collapsing to a single fluid column on mobile devices.

## Elevation & Depth
In this design system, depth is achieved through **Tonal Layers** and **Low-Contrast Outlines** rather than traditional shadows. Shadows are largely avoided to maintain the sleek, flat "tech" aesthetic. 

- **Level 0 (Canvas):** #0D0D0D (Main background).
- **Level 1 (Sidebar/Cards):** #1A1A1A (Primary surface).
- **Level 2 (Active States/Modals):** #2D2D2D with a 1px border of #39FF14 at 20% opacity.
- **Interactive Depth:** When an item is selected or hovered, it should not "lift" with a shadow; instead, it should receive a subtle neon outer glow or a solid neon left-accent border.

## Shapes
The shape language is **Soft (0.25rem)**. This slight rounding prevents the UI from feeling overly aggressive or "brutalist" while maintaining a precise, engineered look. Buttons and input fields use the base 4px radius, while larger containers like cards or the sidebar may scale up to 8px (rounded-lg) for a more modern, sophisticated finish. Checkboxes are kept strictly square to emphasize the technical nature of the app.

## Components
- **Buttons:** Primary buttons are solid Neon Green with black text. Secondary buttons are ghost-style with a 1px white or gray border.
- **Sidebar:** Clean, vertical navigation with a "New List" button styled as a prominent action. Use subtle icons from a geometric icon set.
- **Lists:** Grocery items appear as horizontal rows with a 1px divider (#2D2D2D). Completed items should transition to a 40% opacity with a strikethrough.
- **Checkboxes:** Custom square boxes. When checked, they fill with Neon Green and show a black checkmark.
- **Input Fields:** Bottom-border only or fully enclosed with #2D2D2D background. On focus, the border transitions to Neon Green.
- **Chips/Badges:** Used for categories (e.g., "Produce", "Dairy"). These should use the `accent_low_opacity` background with Neon Green text for high visibility.
- **Quantity Selector:** A compact +/- toggle with a monospaced font for the number.