# Recover My Value (RMV) - UI Cloning & Component Code (Professional Enterprise Aesthetic)

**Author:** Manus AI
**Date:** April 28, 2026
**Project:** Recover My Value (RMV) / Lightship

## 1. Introduction

This document provides the exact CSS/Tailwind configurations and component structures needed to implement a professional, enterprise-grade SaaS aesthetic for the Recover My Value (RMV) application. This theme will draw inspiration from the clean, functional, and modern designs of platforms like Legora, Clio, and E-immigration, ensuring a user-friendly and trustworthy experience. By providing this directly to Cursor, you ensure the AI builds UI components that are both functional and visually appealing to legal professionals.

This document supersedes all previous UI styling instructions, including the "Neo" theme, and establishes the new visual standard for RMV.

## 2. Core Design System (Tailwind Configuration)

To achieve the desired professional look, your `tailwind.config.js` (or equivalent configuration file in your Next.js/Expo setup) must be updated with specific color palettes, typography, and shadow definitions.

### 2.1. Color Palette

The professional aesthetic will feature a clean, light base with muted blues, grays, and subtle accents, conveying trust and efficiency.

```javascript
// Add this to your tailwind.config.js theme.extend section
colors: {
  primary: {
    DEFAULT: '#3B82F6', // A professional, calming blue
    dark: '#2563EB',
    light: '#60A5FA',
  },
  secondary: {
    DEFAULT: '#6B7280', // Muted gray for secondary actions
    dark: '#4B5563',
    light: '#9CA3AF',
  },
  background: {
    DEFAULT: '#F9FAFB', // Light, clean background
    dark: '#F3F4F6',
    light: '#FFFFFF',
  },
  surface: {
    DEFAULT: '#FFFFFF', // White for cards, panels
    muted: '#F3F4F6', // Slightly off-white for subtle contrast
    border: '#E5E7EB', // Light gray border
  },
  text: {
    primary: '#1F2937', // Dark gray for primary text
    secondary: '#4B5563', // Medium gray for secondary info
    tertiary: '#6B7280', // Lighter gray for subtle text
    error: '#EF4444', // Red for errors
  },
  accent: {
    DEFAULT: '#10B981', // A subtle green for success/positive actions
  }
}
```

### 2.2. Typography

A clean, sans-serif font will ensure readability and a modern feel. `Inter` or `Roboto` are excellent choices.

```javascript
// Add this to your tailwind.config.js theme.extend section
fontFamily: {
  sans: ["'Inter'", "'sans-serif'"], // Primary font for UI
  serif: ["'Inter'", "'sans-serif'"], // Fallback for consistency
}
```

### 2.3. Shadows and Borders

Subtle shadows and clean borders will define elements, similar to modern SaaS applications.

```javascript
// Add this to your tailwind.config.js theme.extend section
boxShadow: {
  'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
},
borderWidth: {
  DEFAULT: '1px',
},
borderColor: theme => ({
  ...theme('colors'),
  DEFAULT: theme('colors.surface.border'),
  'primary': theme('colors.primary.DEFAULT'),
}),
borderRadius: {
  'none': '0',
  'sm': '0.125rem',
  'md': '0.375rem',
  'lg': '0.5rem',
  'xl': '0.75rem',
  '2xl': '1rem',
  '3xl': '1.5rem',
  'full': '9999px',
}
```

## 3. Key Component Structures (Professional Aesthetic)

When instructing Cursor to build components, use these specific structural guidelines to ensure they match the desired aesthetic, incorporating the functional patterns observed in Legora, Clio, and E-immigration.

### 3.1. The Main Dashboard & Navigation

**Cursor Prompt Instruction:**
> "Build the main dashboard and a persistent left-side navigation. The dashboard should feature clean KPI cards (similar to the 'Dashboard KPI' card below) for active cases, upcoming deadlines, and recent activities. The left navigation should provide access to 'Cases,' 'Clients,' 'Reports,' 'Templates,' and 'Settings' modules. Ensure the entire layout adheres to the professional theme, with light backgrounds, primary blue accents, and clean sans-serif typography. The navigation should be clearly organized and indicate the active section."

### 3.2. The "Active Matters" Data Table (Case List)

**Cursor Prompt Instruction:**
> "Build a Data Table component for 'Active Matters' (Case List). Use a light background (`bg-background-DEFAULT`) with subtle gray borders (`border-surface-border`). The header row should have a slightly off-white background (`bg-surface-muted`) and dark gray, small, bold text (`text-xs font-semibold uppercase tracking-wider text-text-primary`). Columns should include 'Case Number,' 'Client Name,' 'Case Type,' and 'Status.' Implement search and filter functionalities. Rows should have a bottom border (`border-surface-border`) and a subtle hover state (`hover:bg-background-dark`). Include status badges (e.g., 'Open', 'Pending') using rounded pills with appropriate background and text colors (e.g., `bg-primary-light` with `text-primary-dark`)."

### 3.3. The "Dashboard KPI" Card

**Cursor Prompt Instruction:**
> "Build a KPI Card component. It should have a white surface background (`bg-surface-DEFAULT`), moderately rounded corners (`rounded-lg`), and a subtle shadow (`shadow-md`). The layout should include a title at the top (`text-sm font-medium text-text-secondary`), a large primary number in the center (`text-3xl font-bold text-text-primary`), and an optional trend indicator or secondary text below it (`text-text-secondary`). Include an icon in the top right corner using the primary blue color."

### 3.4. The "Matter Details" View (Case Detail Tabs)

**Cursor Prompt Instruction:**
> "Build a 'Matter Details' view that opens when a case is selected from the 'Active Matters' list. This view should feature a tabbed interface at the top, similar to E-immigration, with tabs for 'Case Information,' 'Forms,' 'Documents,' 'Notes,' and 'Questionnaires.' Active tabs should be highlighted in primary blue. The content within each tab should adhere to the professional theme. For 'Case Information,' display key-value pairs. For 'Forms' and 'Documents,' implement lists with upload/management functionalities. For 'Notes,' create a chronological log. For 'Questionnaires,' provide an interface to send/receive client questionnaires. Ensure the layout is clean, with ample padding and clear visual hierarchy."

### 3.5. Buttons and Interactive Elements

**Cursor Prompt Instruction:**
> "Design primary buttons with a `bg-primary` background, `text-white` color, and a subtle shadow (`shadow-md`) on hover. Secondary buttons should have a `bg-secondary-light` background, `text-secondary-dark` color, and a subtle hover state. All interactive elements should have clear hover and focus states consistent with a professional SaaS application."

## 4. Implementation Strategy for Cursor

To use this document effectively:

1.  **Save this file** as `RMV_UI_Cloning_Code_Professional_Theme.md` in your project directory.
2.  **Instruct Cursor:** "Read `RMV_UI_Cloning_Code_Professional_Theme.md`. Update my `tailwind.config.js` with the provided color palette, typography, and shadows. Then, refactor my existing UI components (or build new ones) strictly adhering to the 'Key Component Structures' and 'Buttons and Interactive Elements' outlined in the document, specifically incorporating the E-immigration patterns for the dashboard, case list, and case detail tabs. The goal is to implement the professional enterprise aesthetic across the entire application."

This detailed guide will enable Cursor to transform the visual identity of your RMV application into a clean, professional, and highly functional interface, incorporating the best practices from leading legal SaaS platforms.
