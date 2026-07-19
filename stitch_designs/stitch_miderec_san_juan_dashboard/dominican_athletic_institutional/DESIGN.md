---
name: Dominican Athletic Institutional
colors:
  surface: '#fcf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0edec'
  surface-container-high: '#ebe7e7'
  surface-container-highest: '#e5e2e1'
  on-surface: '#1c1b1b'
  on-surface-variant: '#5d3f3c'
  inverse-surface: '#313030'
  inverse-on-surface: '#f3f0ef'
  outline: '#926e6b'
  outline-variant: '#e7bdb8'
  surface-tint: '#c00015'
  primary: '#b90014'
  on-primary: '#ffffff'
  primary-container: '#e31b23'
  on-primary-container: '#fff9f8'
  inverse-primary: '#ffb4ac'
  secondary: '#4a5f85'
  on-secondary: '#ffffff'
  secondary-container: '#bdd2fe'
  on-secondary-container: '#455a80'
  tertiary: '#5a5b5c'
  on-tertiary: '#ffffff'
  tertiary-container: '#727474'
  on-tertiary-container: '#fbfbfb'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad6'
  primary-fixed-dim: '#ffb4ac'
  on-primary-fixed: '#410002'
  on-primary-fixed-variant: '#93000d'
  secondary-fixed: '#d7e3ff'
  secondary-fixed-dim: '#b2c7f3'
  on-secondary-fixed: '#011b3e'
  on-secondary-fixed-variant: '#32476c'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c7'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#fcf9f8'
  on-background: '#1c1b1b'
  surface-variant: '#e5e2e1'
typography:
  display-lg:
    fontFamily: Montserrat
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.3'
  headline-sm:
    fontFamily: Montserrat
    fontSize: 18px
    fontWeight: '700'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-lg:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  label-md:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.2'
spacing:
  container-margin: 2rem
  gutter: 1.5rem
  section-gap: 3rem
  stack-sm: 0.5rem
  stack-md: 1rem
  stack-lg: 1.5rem
---

## Brand & Style
The design system transitions from a generic soft aesthetic to a high-impact, institutional identity rooted in Dominican sports excellence. It balances the authority of a government entity with the kinetic energy of athletic competition. 

The visual language is characterized by **Institutional Boldness**: moving away from translucent effects toward solid fills, heavy borders, and clear architectural hierarchy. It evokes a sense of reliability, urgency, and national pride through the deliberate use of the national palette and structural grid alignments. The mood is professional yet high-energy, designed for administrators managing the pulse of provincial sports.

## Colors
The palette is dominated by the tension between **Vibrant Red** and **Deep Navy**. 

- **Primary Red (#E31B23):** Used exclusively for high-priority actions, critical highlights, and brand-identifying accents like section headers.
- **Deep Navy (#001A3D):** Provides the institutional foundation. Used for sidebars, primary navigation containers, and high-level structural elements.
- **Pure Black/Ink (#121212):** Reserved for primary text to ensure maximum legibility against light backgrounds.
- **Functional Grays:** A cool-toned scale of grays facilitates the "bold border" style without overwhelming the eye.

## Typography
The typography system uses a dual-font approach to marry marketing impact with administrative utility. 

**Montserrat** is used for all headings to maintain the "San Juan" branding. It should be used in bold or extra-bold weights to create an "athletic" headline feel. For data-heavy environments and body copy, **Hanken Grotesk** provides a sharp, contemporary professional look that remains highly legible at smaller sizes. 

Section headers frequently utilize `headline-sm` with a Red left-border accent to ground the user within the information architecture.

## Layout & Spacing
This design system utilizes a **Fixed Grid** philosophy for content areas to maintain a structured, editorial feel, while the Sidebar remains fixed to the viewport.

- **Grid:** 12-column system for desktop with 24px gutters.
- **Margins:** 32px safe-area margins for the main dashboard content.
- **Rhythm:** Spacing follows a strict 8px baseline. Use larger `section-gap` tokens to separate disparate administrative modules (e.g., separating "Statistics" from "Recent Submissions").
- **Responsiveness:** On mobile, margins reduce to 16px and the 12-column grid collapses to a single column.

## Elevation & Depth
In place of shadows and blurs, this design system uses **Bold Borders** and **Tonal Layering** to define hierarchy.

1.  **Primary Level:** The base canvas is a light neutral gray (#F5F7F9).
2.  **Surface Level:** Cards and containers are solid white with a 1px solid border (#E2E8F0).
3.  **Active Level:** Items being hovered or focused gain a 2px Primary Red border or a subtle Deep Navy inset stroke.
4.  **Institutional Header:** The top-level branding bar or section headers use a 4px thick Red vertical line to the left of the title to denote the "active" section of the hierarchy.

## Shapes
To reinforce the institutional and athletic "strong-edge" look, this design system uses **Sharp** geometry. Rounded corners are strictly avoided or kept to a minimal 2px radius for secondary elements only. Primary buttons, input fields, and cards must feature 90-degree angles to project a sense of stability and formal authority.

## Components
- **Buttons:** Primary buttons are solid Primary Red with White uppercase Montserrat text. Secondary buttons use a Deep Navy 2px border with Navy text. No rounded corners.
- **Section Headers:** Must include a 4px Red vertical accent bar to the left. The title is Montserrat Bold, uppercase.
- **Input Fields:** 1px Deep Navy border that thickens to 2px Primary Red on focus. Labels are Hanken Grotesk, Semi-bold, Uppercase.
- **Cards:** White background, 1px Gray border, sharp corners. For "Featured" or "Live" cards, a Primary Red top-border (3px) is added.
- **Chips/Status:** Use a solid block of color (Navy or Red) with white text. No transparency.
- **Sidebar:** Deep Navy background. Active items use a Red left-border and a subtle lighter navy background-shift.