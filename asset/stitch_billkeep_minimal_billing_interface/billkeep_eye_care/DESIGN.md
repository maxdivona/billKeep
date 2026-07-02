---
name: BillKeep Eye-Care
colors:
  surface: '#faf9f5'
  surface-dim: '#dadad6'
  surface-bright: '#faf9f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f4f0'
  surface-container: '#eeeeea'
  surface-container-high: '#e8e8e4'
  surface-container-highest: '#e2e3df'
  on-surface: '#1a1c1a'
  on-surface-variant: '#43474c'
  inverse-surface: '#2f312e'
  inverse-on-surface: '#f1f1ed'
  outline: '#74777c'
  outline-variant: '#c4c6cc'
  surface-tint: '#506071'
  primary: '#455565'
  on-primary: '#ffffff'
  primary-container: '#5d6d7e'
  on-primary-container: '#e2efff'
  inverse-primary: '#b8c8db'
  secondary: '#4e635a'
  on-secondary: '#ffffff'
  secondary-container: '#cee5da'
  on-secondary-container: '#52675e'
  tertiary: '#76473a'
  on-tertiary: '#ffffff'
  tertiary-container: '#925f51'
  on-tertiary-container: '#ffe9e4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d3e4f8'
  primary-fixed-dim: '#b8c8db'
  on-primary-fixed: '#0c1d2b'
  on-primary-fixed-variant: '#394858'
  secondary-fixed: '#d1e8dd'
  secondary-fixed-dim: '#b5ccc1'
  on-secondary-fixed: '#0b1f18'
  on-secondary-fixed-variant: '#374b43'
  tertiary-fixed: '#ffdbd1'
  tertiary-fixed-dim: '#f7b8a6'
  on-tertiary-fixed: '#331107'
  on-tertiary-fixed-variant: '#673b2e'
  background: '#faf9f5'
  on-background: '#1a1c1a'
  surface-variant: '#e2e3df'
typography:
  headline-lg:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 64px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style

The design system is engineered for prolonged financial focus, prioritizing ocular comfort and cognitive clarity. The brand personality is dependable, tranquil, and restorative—moving away from the high-stress, high-vibration visuals typical of fintech.

The style is a blend of **Soft Modernism** and **Tactile Minimalism**. It utilizes low-luminance backgrounds and a matte finish to eliminate screen glare. By reducing visual "noise" through generous whitespace and desaturated tones, the interface facilitates a state of flow for users managing complex financial data over extended periods.

## Colors

The palette is rooted in an "Eye-Care First" philosophy, strictly avoiding pure black (#000000) and pure white (#FFFFFF) to prevent light-scatter and eye fatigue.

- **Backgrounds**: A warm, desaturated sage-gray (#EAEAE3) serves as the primary canvas, providing a low-stimulus environment.
- **Primary Surface**: A slightly lighter tint (#F2F2EE) is used for cards and containers to create gentle depth without high-contrast edges.
- **Accents**:
  - **Primary (Slate Blue-Gray)**: Used for core navigation and interactive elements.
  - **Secondary (Muted Sage)**: Used for "success" states and growth indicators.
  - **Tertiary (Terracotta)**: Used sparingly for alerts or critical calls to action to ensure they remain visible but not jarring.
- **Typography**: The primary text color (#2D3436) provides sufficient contrast for accessibility (WCAG AA+) while softening the "vibration" of text on light backgrounds.

## Typography

This design system employs **Atkinson Hyperlegible Next** across all roles. This typeface was specifically designed for maximum character recognition, which significantly reduces the cognitive load during long sessions of data review.

- **Legibility Strategy**: We use increased line heights (minimum 1.5x for body text) to prevent "line skipping."
- **Letter Spacing**: Headlines use slight tracking contraction to feel cohesive, while labels and small body text use expanded tracking (+0.02em) to maintain clarity at smaller scales.
- **Financial Data**: All numerical values should be set with tabular lining figures where available to ensure vertical alignment in tables and lists.

## Layout & Spacing

The layout philosophy follows a **Fluid-Fixed Hybrid** model. Content is organized within a 12-column grid on desktop (max-width 1440px) to prevent excessively long line lengths which can cause eye strain.

- **Breathing Room**: The system uses a 1:1.5 spacing ratio. If an element has 16px of internal padding, it should ideally have 24px of external margin to preserve a sense of "calm."
- **Rhythm**: All spacing is derived from an 8px base unit.
- **Responsive Behavior**: On mobile, margins reduce to 16px, and the 12-column grid collapses to a single column, with cards expanding to the full width of the safe area to maximize touch targets and text size.

## Elevation & Depth

To maintain the "matte" and restful aesthetic, this design system avoids heavy, dark shadows.

- **Tonal Layering**: Depth is primarily communicated through color-stepping. The main background is the darkest "light" tone, and active containers are the lightest.
- **Soft Ambient Shadows**: Where elevation is required (e.g., for modals or floating action buttons), use extremely diffused, low-opacity shadows. Use a shadow color tinted with the primary hue (#5D6D7E at 8% opacity) rather than pure gray to maintain the natural, organic feel.
- **Flat Depth**: Preference should be given to 1px solid borders in a slightly darker shade than the background over shadows for defining card boundaries.

## Shapes

The shape language is defined by **Soft Geometricism**.

Rounded corners are applied universally to eliminate "sharp" visual points that draw unnecessary ocular attention. Standard containers and cards utilize a 16px (`rounded-xl`) radius. Interactive components like buttons use a 12px (`rounded-lg`) radius, providing a tactile, approachable feel that mimics physical office stationery.

## Components

- **Buttons**: Primary buttons are solid blocks of the Primary color with high-contrast text. Secondary buttons use the Secondary color at 15% opacity with solid text. All buttons have a minimum height of 48px to ensure ease of interaction.
- **Cards**: Cards feature a 1px border (#D1D1CB) and a subtle 16px corner radius. They do not use shadows unless they are in a "hover" or "active" state.
- **Input Fields**: Fields use the Primary Surface color (#F2F2EE) as a fill to distinguish them from the background. The focus state is indicated by a 2px solid border in the Primary color, never a glow or blur.
- **Lists & Tables**: Row heights are generous (minimum 56px). Alternate row striping is discouraged; instead, use thin horizontal separators in a low-contrast neutral to maintain a clean horizontal scan-line.
- **Chips/Status Labels**: Statuses use desaturated background fills with darker text of the same hue (e.g., a soft green chip for "Paid"). Avoid high-vibrancy "neon" status lights.
- **Charts**: Use the muted secondary and tertiary colors for data visualization. Ensure that different data series are distinguishable by both color and pattern/texture to assist with color-blindness and reduce "color-hunting" eye strain.
