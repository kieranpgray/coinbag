# Design System - Typography

## Overview

Supafolio uses a token-based typography system defined in `src/index.css` and configured in `tailwind.config.js`. All typography should use design tokens rather than raw Tailwind size classes to ensure consistency and maintainability.

**Baseline**: The navigation text (`text-sm` = 14px) is the baseline for body text throughout the application. All other typography scales from this baseline.

## Typography Tokens

### Base Tokens

| Token | Size | Line Height | Weight | Usage |
|-------|------|-------------|--------|-------|
| `text-body` | 14px | 20px | 400 (normal) | **Body baseline** - matches nav text |
| `text-body-sm` | 12px | 16.8px | 400 (normal) | Small body text, captions |
| `text-body-lg` | 16px | 22.4px | 500 (medium) | Emphasized body text |
| `text-h3` | 18px | 24px | 600 (semibold) | Subsection headings |
| `text-h2` | 23.4px | 32.76px | 600 (semibold) | Section headings, card titles |
| `text-h1` | 28.08px | 37.44px | 600 (semibold) | Page headings |
| `text-balance` | 24px | 32px | 700 (bold) | Balance values, primary numeric |
| `text-data-lg` | 24px | 32px | 700 (bold) | Large numeric values (alias for balance) |
| `text-caption` | 12px | 16.8px | 400 (normal) | Captions, labels |
| `text-base` | 14px | - | - | Base font size (matches body) |

### Responsive Token Variants

For responsive typography, use responsive token variants with Tailwind's breakpoint modifiers:

#### Heading 1 (h1) Responsive Variants
- `text-h1-sm` - 28.08px (mobile default)
- `text-h1-md` - 31.2px (tablet, sm breakpoint)
- `text-h1-lg` - 35.1px (desktop, lg breakpoint)

**Usage:**
```tsx
<h1 className="text-h1-sm sm:text-h1-md lg:text-h1-lg">Page Title</h1>
```

#### Heading 2 (h2) Responsive Variants
- `text-h2-sm` - 23.4px (mobile default)
- `text-h2-md` - 26px (tablet, sm breakpoint)
- `text-h2-lg` - 28.6px (desktop, lg breakpoint)

**Usage:**
```tsx
<h2 className="text-h2-sm sm:text-h2-md lg:text-h2-lg">Section Title</h2>
```

#### Balance/Data Large Responsive Variants (reduced from oversized 37.44px)
- `text-balance-sm` / `text-data-lg-sm` - 24px (mobile default, reduced from 37.44px)
- `text-balance-md` / `text-data-lg-md` - 26px (tablet, sm breakpoint, reduced from 41.6px)
- `text-balance-lg` / `text-data-lg-lg` - 28px (desktop, lg breakpoint, reduced from 46.8px)

**Usage:**
```tsx
<span className="text-data-lg-sm sm:text-data-lg-md lg:text-data-lg-lg">
  {formatCurrency(total)}
</span>
```

## Typography Rules

### 1. Numeric Values Are Not Headings

Numeric values (especially balance/currency values) should use `text-balance` (24px) for emphasis, not heading tokens. The previous `text-data-lg` was oversized at 37.44px and has been reduced.

**Correct:**
```tsx
<span className="text-balance font-bold">{formatCurrency(value)}</span>
```

**Incorrect:**
```tsx
<h1 className="text-4xl font-bold">{formatCurrency(value)}</h1>
<span className="text-data-lg font-bold">{formatCurrency(value)}</span> {/* Too large at 37.44px */}
```

### 2. Heading Hierarchy

- **Page headings**: Use `text-h1` with responsive variants (`text-h1-sm sm:text-h1-md lg:text-h1-lg`)
- **Section headings**: Use `text-h2` with responsive variants (`text-h2-sm sm:text-h2-md lg:text-h2-lg`)
- **Subsection headings**: Use `text-h3` (18px)
- **Card titles**: Use `CardTitle` component (defaults to `text-h2`)

### 3. Numeric Value Hierarchy

- **Primary totals** (balance values): `text-balance` (24px) - reduced from oversized 37.44px
- **Secondary values** (card-level): `text-body-lg` (16px) standard
- **Tertiary values** (breakdowns): `text-body` (14px) or `text-body-lg` (16px)

### 4. Design Tokens First

Always prefer design tokens over raw Tailwind classes:

**Preferred:**
```tsx
<h1 className="text-h1-sm sm:text-h1-md lg:text-h1-lg">Title</h1>
<span className="text-balance">$1,000</span>
```

**Avoid:**
```tsx
<h1 className="text-3xl font-semibold">Title</h1>
<span className="text-[30px] font-bold">$1,000</span>
<span className="text-data-lg">$1,000</span> {/* Old oversized size */}
```

### 5. Responsive Typography

Use responsive token variants with Tailwind breakpoints:

**Correct:**
```tsx
<h1 className="text-h1-sm sm:text-h1-md lg:text-h1-lg">Title</h1>
```

**Incorrect:**
```tsx
<h1 className="text-2xl sm:text-3xl lg:text-4xl">Title</h1>
```

## Component Usage

### CardTitle Component

The `CardTitle` component defaults to `text-h2-sm sm:text-h2-md lg:text-h2-lg` (23.4px/26px/28.6px). Do not override unless absolutely necessary.

**Correct:**
```tsx
<CardTitle>Card Title</CardTitle>
```

**Avoid:**
```tsx
<CardTitle className="text-lg">Card Title</CardTitle>
```

### NumericValue Component

The `NumericValue` component provides consistent numeric display with size variants:

**Props:**
- `value`: number | string - The numeric value to display
- `size`: 'primary' | 'secondary' | 'tertiary' (default: 'secondary')
- `emphasis`: 'bold' | 'semibold' | 'normal' (default: 'bold')
- `responsive`: boolean (default: false) - Enable responsive variants for primary size
- `children`: ReactNode - For PrivacyWrapper compatibility

**Size Variants:**
- `primary`: `text-balance` (24px) - page-level totals (reduced from 37.44px)
- `secondary`: `text-body-lg` (16px) - card values (default)
- `tertiary`: `text-body` (14px) - breakdown values

**Usage:**
```tsx
import { NumericValue } from '@/components/shared/NumericValue';
import { PrivacyWrapper } from '@/components/shared/PrivacyWrapper';

// Primary numeric value (page-level)
<NumericValue value={totalAssets} size="primary" responsive />

// Secondary numeric value (card-level)
<NumericValue value={cardValue} size="secondary" />

// With PrivacyWrapper
<NumericValue value={sensitiveValue} size="primary">
  <PrivacyWrapper value={sensitiveValue} />
</NumericValue>
```

## Migration Guide

### Replacing Raw Tailwind Classes

1. **Page headings**: Replace `text-2xl`/`text-3xl` with `text-h1-sm sm:text-h1-md lg:text-h1-lg`
2. **Section headings**: Replace `text-xl`/`text-2xl` with `text-h2-sm sm:text-h2-md lg:text-h2-lg`
3. **Subsection headings**: Replace `text-lg` with `text-h3`
4. **Numeric values**: Replace `text-2xl`/`text-3xl`/`text-4xl`/`text-xl` with `text-balance` (24px) for balance values, or `text-body-lg` (16px) for secondary values

### Replacing Arbitrary Values

- `text-[30px]` → `text-balance` (24px) - reduced from oversized values
- `text-[17px]` → `text-body-lg` (16px)
- `text-[18px]` → `text-h3` (18px) for headings, `text-body-lg` (16px) for text
- `text-[14px]` → `text-body` (14px baseline)
- `text-[12px]` → `text-body-sm` or `text-caption` (12px)
- `text-[10px]` → `text-caption` (validate accessibility, use 12px minimum)

## Accessibility

- **Baseline body text**: 14px (`text-body` or `text-sm`) - matches navigation text
- Minimum font size for body text: 14px (`text-body`, `text-base`, `text-sm`)
- Small text: 12px (`text-body-sm`, `text-caption`) - use sparingly
- Ensure sufficient contrast ratios for all text sizes
- The navigation text (14px) serves as the baseline for all body text

## Examples

### Page Heading
```tsx
<h1 className="text-h1-sm sm:text-h1-md lg:text-h1-lg font-semibold">
  Dashboard
</h1>
```

### Card Title
```tsx
<CardTitle>Net Worth</CardTitle>
```

### Primary Numeric Value (Balance)
```tsx
<span className="text-balance font-bold">
  {formatCurrency(totalAssets)}
</span>
```

### Secondary Numeric Value (Card)
```tsx
<span className="text-body-lg font-bold">
  {formatCurrency(value)}
</span>
```

### Breakdown Value
```tsx
<span className="text-body font-bold text-foreground">
  {formatCurrency(amount)}
</span>
```

