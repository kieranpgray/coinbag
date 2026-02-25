# Design System - Typography

## Overview

Supafolio uses a token-based typography system defined in `src/index.css` and configured in `tailwind.config.js`. All typography should use design tokens rather than raw Tailwind size classes to ensure consistency and maintainability.

**Baseline**: The body text (`text-body` = 14px) is the baseline throughout the application. All other typography scales from this baseline.

## Typography Tokens

### Base Tokens

| Token | Size | Line Height | Weight | Usage |
|-------|------|-------------|--------|-------|
| `text-body` | 14px | 1.5 | 400 (normal) | **Body baseline** - core descriptions, narrative copy |
| `text-body-sm` | 12px | 1.5 | 400 (normal) | Small body text |
| `text-body-lg` | 16px | 1.35 | 600 (semibold) | Emphasized body text, account-level values |
| `text-caption` | 12px | 1.5 | 400 (normal) | Captions, labels, meta text |
| `text-h3` | 16px | 1.35 | 600 (semibold) | Subsection headings, item titles |
| `text-h2` | 18px | 1.3 | 600 (semibold) | Section headings, card titles |
| `text-h1` | 22px | 1.3 | 700 (bold) | Page headings, business identity |
| `text-balance` | 24px | 1.33 | 700 (bold) | Card-level KPIs, balance values |
| `text-display` | 28px | 1.25 | 700 (bold) | Hero KPIs, page-level totals |
| `text-data-lg` | 24px | 1.33 | 700 (bold) | Alias for balance (backward compatibility) |

### Responsive Token Variants

Use responsive token variants with Tailwind's breakpoint modifiers for headings and numeric values.

#### Heading 1 (h1) Responsive Variants
- `text-h1-sm` - 22px (mobile default)
- `text-h1-md` - 24px (tablet, sm breakpoint)
- `text-h1-lg` - 26px (desktop, lg breakpoint)

**Usage:**
```tsx
<h1 className="text-h1-sm sm:text-h1-md lg:text-h1-lg">Page Title</h1>
```

#### Heading 2 (h2) Responsive Variants
- `text-h2-sm` - 18px (mobile default)
- `text-h2-md` - 19.5px (tablet, sm breakpoint)
- `text-h2-lg` - 21px (desktop, lg breakpoint)

**Usage:**
```tsx
<h2 className="text-h2-sm sm:text-h2-md lg:text-h2-lg">Section Title</h2>
```

#### Display (Hero KPIs) Responsive Variants
- `text-display-sm` - 28px (mobile default)
- `text-display-md` - 30px (tablet, sm breakpoint)
- `text-display-lg` - 32px (desktop, lg breakpoint)

**Usage:**
```tsx
<span className="text-display-sm sm:text-display-md lg:text-display-lg font-bold">
  {formatCurrency(totalAssets)}
</span>
```

#### Balance Responsive Variants
- `text-balance-sm` / `text-data-lg-sm` - 24px (mobile default)
- `text-balance-md` / `text-data-lg-md` - 26px (tablet, sm breakpoint)
- `text-balance-lg` / `text-data-lg-lg` - 28px (desktop, lg breakpoint)

**Usage:**
```tsx
<span className="text-balance-sm sm:text-balance-md lg:text-balance-lg font-bold">
  {formatCurrency(value)}
</span>
```

## Typography Rules

### 1. Numeric Values Are Not Headings

Numeric values should use `text-display` (hero KPIs) or `text-balance` (card-level), not heading tokens.

**Correct:**
```tsx
<span className="text-display font-bold">{formatCurrency(totalAssets)}</span>
<span className="text-balance font-bold">{formatCurrency(cardValue)}</span>
```

**Incorrect:**
```tsx
<h1 className="text-4xl font-bold">{formatCurrency(value)}</h1>
```

### 2. Heading Hierarchy

- **Page headings / business identity**: Use `text-h1` with responsive variants
- **Section headings / card titles**: Use `text-h2` with responsive variants
- **Subsection headings / item titles**: Use `text-h3` (16px)

### 3. Numeric Value Hierarchy

- **Hero KPIs** (page-level totals): `text-display` (28px) with responsive variants
- **Card-level values**: `text-balance` (24px) with responsive variants
- **Account-level / breakdown values**: `text-body-lg` (16px)

### 4. Design Tokens First

Always prefer design tokens over raw Tailwind classes.

**Preferred:**
```tsx
<h1 className="text-h1-sm sm:text-h1-md lg:text-h1-lg">Title</h1>
<span className="text-display font-bold">{formatCurrency(total)}</span>
<span className="text-body text-muted-foreground">Supporting text</span>
```

**Avoid:**
```tsx
<h1 className="text-3xl font-semibold">Title</h1>
<span className="text-[30px] font-bold">{formatCurrency(value)}</span>
```

## Component Usage

### CardTitle Component

The `CardTitle` component defaults to `text-h2-sm sm:text-h2-md lg:text-h2-lg`. Do not override unless necessary.

### Body Text Guidelines

- **Body copy** (paragraphs, descriptions, helper text, error messages) should use `text-body` for 14px, 400 weight. Do not add `font-medium`, `font-semibold`, or `font-bold` unless the intent is a label or heading.
- For **emphasized body text** or **account-level values**, use `text-body-lg` (16px, 600) for numeric displays and data rows.
- **Labels, buttons, and navigation** keep their design-system weights (medium/semibold) for hierarchy.

### NumericValue Component

**Props:**
- `value`: number | string - The numeric value to display
- `size`: 'primary' | 'secondary' | 'tertiary' (default: 'secondary')
- `emphasis`: 'bold' | 'semibold' | 'normal' (default: 'bold')
- `responsive`: boolean (default: false) - Enable responsive variants for primary and secondary sizes
- `children`: ReactNode - For PrivacyWrapper compatibility

**Size Variants:**
- `primary`: `text-display` (28px) - hero KPIs, page-level totals
- `secondary`: `text-balance` (24px) - card-level values
- `tertiary`: `text-body-lg` (16px) - account-level, breakdown values

**Usage:**
```tsx
<NumericValue value={totalAssets} size="primary" responsive />
<NumericValue value={cardValue} size="secondary" responsive />
<NumericValue value={amount} size="tertiary" />
```

## Accessibility

- **Baseline body text**: 14px (`text-body`)
- Minimum font size for body text: 14px
- Small text: 12px (`text-body-sm`, `text-caption`) - use sparingly for captions and meta
- Ensure sufficient contrast ratios for all text sizes
