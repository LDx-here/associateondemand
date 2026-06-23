# Recover My Value (RMV) - UI Cloning & Component Code (Legora/Clio Aesthetic)

**Author:** Manus AI
**Date:** April 28, 2026
**Project:** Recover My Value (RMV) / Lightship

## 1. Introduction

This document provides the exact CSS/Tailwind configurations and component structures needed to replicate the high-end, professional aesthetic of platforms like Legora and Clio. By providing this directly to Cursor, you bypass the "design interpretation" phase and force the AI to build UI components that look like a polished, $100M legal product.

## 2. Core Design System (Tailwind Configuration)

To achieve the desired look, your `tailwind.config.js` (or equivalent configuration file in your Next.js/Expo setup) must be updated with specific color palettes, typography, and shadow definitions.

### 2.1. Color Palette

The Legora/Clio aesthetic relies heavily on a clean, high-contrast palette with subtle grays and a strong primary brand color (often a deep blue or indigo).

```javascript
// Add this to your tailwind.config.js theme.extend section
colors: {
  brand: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    200: '#99f6e4',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#14b8a6', // Primary Brand Color (Teal/Blue variant)
    600: '#0d9488',
    700: '#0f766e',
    800: '#115e59',
    900: '#134e4a',
  },
  surface: {
    DEFAULT: '#ffffff',
    muted: '#f8fafc', // Very light gray for backgrounds
    border: '#e2e8f0', // Subtle borders
  },
  text: {
    primary: '#0f172a', // Near black for high readability
    secondary: '#64748b', // Muted text for secondary info
    tertiary: '#94a3b8',
  }
}
```

### 2.2. Typography

A clean, modern sans-serif font is crucial. 'Inter' or 'Manrope' are excellent choices that mimic the professional feel of top-tier SaaS platforms.

```javascript
// Add this to your tailwind.config.js theme.extend section
fontFamily: {
  sans: ['Inter', 'sans-serif'], // Or 'Manrope' if preferred
  mono: ['JetBrains Mono', 'monospace'], // For code or specific data points
}
```

### 2.3. Shadows and Borders

Subtle shadows and rounded corners (border-radius) create depth and a modern feel without being overwhelming.

```javascript
// Add this to your tailwind.config.js theme.extend section
boxShadow: {
  'card': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  'dropdown': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
},
borderRadius: {
  'lg': '0.5rem',
  'xl': '0.75rem',
}
```

## 3. Key Component Structures

When instructing Cursor to build components, use these specific structural guidelines to ensure they match the desired aesthetic.

### 3.1. The "Active Matters" Data Table

Legal software relies heavily on data tables. They must be clean, scannable, and interactive.

**Cursor Prompt Instruction:**
> "Build a Data Table component for 'Active Matters'. Use a white background (`bg-surface`) with a subtle border (`border-surface-border`). The header row should have a very light gray background (`bg-surface-muted`) and uppercase, small, bold text (`text-xs font-semibold uppercase tracking-wider text-text-secondary`). Rows should have a bottom border and a subtle hover effect (`hover:bg-surface-muted`). Include status badges (e.g., 'Open', 'Pending') using rounded pills with background colors corresponding to the status."

### 3.2. The "Dashboard KPI" Card

KPI cards provide quick overviews of critical metrics (e.g., Unbilled Time, Upcoming Deadlines).

**Cursor Prompt Instruction:**
> "Build a KPI Card component. It should have a white background (`bg-surface`), rounded corners (`rounded-xl`), and a subtle shadow (`shadow-card`). The layout should include a title at the top (`text-sm font-medium text-text-secondary`), a large primary number in the center (`text-3xl font-bold text-text-primary`), and an optional trend indicator or secondary text below it. Include an icon in the top right corner using a muted color."

### 3.3. The "Matter Details" Sidebar/Panel

When a user clicks on a matter, a detailed view should appear, often as a side panel or a dedicated page with a structured layout.

**Cursor Prompt Instruction:**
> "Build a 'Matter Details' layout. It should feature a clean, two-column design. The left column (main content) should contain a tabbed interface (Overview, Documents, Tasks, Time). The right column (sidebar) should contain 'Case Details' (Filed Date, Jurisdiction, Judge, Opposing Counsel) presented as key-value pairs with muted labels (`text-sm text-text-secondary`) and dark values (`text-sm font-medium text-text-primary`). Use ample padding (`p-6`) and clear visual hierarchy."

## 4. Implementation Strategy for Cursor

To use this document effectively:

1.  **Save this file** as `RMV_UI_Cloning_Code.md` in your project directory.
2.  **Instruct Cursor:** "Read `RMV_UI_Cloning_Code.md`. Update my `tailwind.config.js` with the provided color palette, typography, and shadows. Then, refactor my existing UI components (or build new ones) strictly adhering to the 'Key Component Structures' outlined in the document. The goal is to perfectly replicate the high-end, clean aesthetic of Legora/Clio."
