# Recover My Value (RMV) - UI Cloning & Component Code (Neo/Matrix Aesthetic)

**Author:** Manus AI
**Date:** April 28, 2026
**Project:** Recover My Value (RMV) / Lightship

## 1. Introduction

This document provides the exact CSS/Tailwind configurations and component structures needed to implement a "Neo" (Matrix-inspired) aesthetic for the Recover My Value (RMV) application. This theme will combine the professional, high-end feel of Legora/Clio with a distinct, high-tech, dark-mode, and digital-rain-inspired visual identity. By providing this directly to Cursor, you ensure the AI builds UI components that are both functional and visually striking.

This document supersedes previous UI styling instructions.

## 2. Core Design System (Tailwind Configuration)

To achieve the desired "Neo" look, your `tailwind.config.js` (or equivalent configuration file in your Next.js/Expo setup) must be updated with specific color palettes, typography, and shadow definitions.

### 2.1. Color Palette

The Neo aesthetic will feature a dark base, accented with glowing greens and subtle grays, reminiscent of the Matrix digital rain.

```javascript
// Add this to your tailwind.config.js theme.extend section
colors: {
  primary: {
    DEFAULT: '#00ff41', // Matrix Green
    dark: '#00cc33',
    light: '#33ff66',
  },
  background: {
    DEFAULT: '#0a0a0a', // Deep dark background
    light: '#1a1a1a',
    dark: '#000000',
  },
  surface: {
    DEFAULT: '#1a1a1a', // Dark surface for cards, panels
    muted: '#2a2a2a', // Slightly lighter dark for subtle contrast
    border: '#004d1a', // Dark green border
  },
  text: {
    primary: '#e0e0e0', // Light gray for primary text
    secondary: '#00cc33', // Green for highlights and interactive elements
    tertiary: '#888888', // Muted gray for secondary info
    error: '#ff4100', // Red for errors
  },
  accent: {
    DEFAULT: '#00ff41', // Alias for primary green
  }
}
```

### 2.2. Typography

A monospace font will enhance the digital, terminal-like feel. `JetBrains Mono` or `Fira Code` are excellent choices.

```javascript
// Add this to your tailwind.config.js theme.extend section
fontFamily: {
  sans: ["'JetBrains Mono'", "monospace"], // Primary font for UI
  mono: ["'JetBrains Mono'", "monospace"], // For code blocks and data displays
}
```

### 2.3. Shadows and Borders

Subtle glowing shadows and sharp, sometimes green, borders will define elements.

```javascript
// Add this to your tailwind.config.js theme.extend section
boxShadow: {
  'neo-glow': '0 0 10px rgba(0, 255, 65, 0.5)', // Green glow for interactive elements
  'neo-card': '0 0 5px rgba(0, 255, 65, 0.2)', // Subtle glow for cards
},
borderWidth: {
  DEFAULT: '1px',
  '2': '2px',
  '3': '3px',
},
borderColor: theme => ({
  ...theme('colors'),
  DEFAULT: theme('colors.surface.border'),
  'primary': theme('colors.primary.DEFAULT'),
}),
borderRadius: {
  'none': '0',
  'sm': '0.125rem',
  'md': '0.25rem',
  'lg': '0.375rem',
  'xl': '0.5rem',
  '2xl': '0.75rem',
  '3xl': '1rem',
  'full': '9999px',
}
```

## 3. Key Component Structures (Neo Aesthetic)

When instructing Cursor to build components, use these specific structural guidelines to ensure they match the desired aesthetic.

### 3.1. The "Active Matters" Data Table

**Cursor Prompt Instruction:**
> "Build a Data Table component for 'Active Matters'. Use a deep dark background (`bg-background-DEFAULT`) with subtle green borders (`border-surface-border`). The header row should have a slightly lighter dark background (`bg-surface-muted`) and glowing green, small, bold text (`text-xs font-semibold uppercase tracking-wider text-primary`). Rows should have a bottom border (`border-surface-border`) and a subtle green glow on hover (`hover:bg-surface-muted hover:shadow-neo-card`). Include status badges (e.g., 'Open', 'Pending') using rounded pills with background colors that are dark, and text colors that are primary green."

### 3.2. The "Dashboard KPI" Card

**Cursor Prompt Instruction:**
> "Build a KPI Card component. It should have a dark surface background (`bg-surface-DEFAULT`), slightly rounded corners (`rounded-lg`), and a subtle green glow shadow (`shadow-neo-card`). The layout should include a title at the top (`text-sm font-medium text-text-tertiary`), a large primary number in the center (`text-3xl font-bold text-primary`), and an optional trend indicator or secondary text below it (`text-text-secondary`). Include an icon in the top right corner using the primary green color."

### 3.3. The "Matter Details" Sidebar/Panel

**Cursor Prompt Instruction:**
> "Build a 'Matter Details' layout. It should feature a clean, two-column design. The left column (main content) should contain a tabbed interface (Overview, Documents, Tasks, Time) with active tabs highlighted in primary green. The right column (sidebar) should contain 'Case Details' (Filed Date, Jurisdiction, Judge, Opposing Counsel) presented as key-value pairs with muted labels (`text-sm text-text-tertiary`) and primary green values (`text-sm font-medium text-primary`). Use ample padding (`p-6`) and clear visual hierarchy with dark backgrounds."

### 3.4. Buttons and Interactive Elements

**Cursor Prompt Instruction:**
> "Design primary buttons with a `bg-primary` background, `text-background-DEFAULT` color, and a `shadow-neo-glow` on hover. Secondary buttons should have a `bg-surface-muted` background, `text-primary` color, and a subtle `shadow-neo-card` on hover. All interactive elements should have a clear hover state with a green glow or text highlight."

## 4. Implementation Strategy for Cursor

To use this document effectively:

1.  **Save this file** as `RMV_UI_Cloning_Code_Neo_Theme.md` in your project directory.
2.  **Instruct Cursor:** "Read `RMV_UI_Cloning_Code_Neo_Theme.md`. Update my `tailwind.config.js` with the provided color palette, typography, and shadows. Then, refactor my existing UI components (or build new ones) strictly adhering to the 'Key Component Structures' and 'Buttons and Interactive Elements' outlined in the document. The goal is to implement the 'Neo' (Matrix-inspired) aesthetic across the entire application."

This detailed guide will enable Cursor to transform the visual identity of your RMV application into a unique and powerful interface.
