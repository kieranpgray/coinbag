# Transfers Page — Redesign Direction (Post-Critique)

This document captures the product and design decisions from the design critique Q&A. Use it to guide implementation when redesigning the Transfers page.

---

## 1. Primary action is outside the app

**Decision:** The action (actually moving money) happens in the user’s banking app. Wellthy’s role is **not** to provide CTAs like “Open your bank” or “Copy this week’s transfers.”

**Implication for design:**
- Do **not** add a primary CTA that implies we send users to the bank or copy to clipboard.
- The page should feel like a **clear, trustworthy review tool**: “Here’s what to move and by when.” Purpose = inform the review, not drive an external action.
- Any in-app actions (Edit Pay Cycle, Assign Accounts, View Breakdown) stay secondary/supporting.

---

## 2. Suggested Transfers is the hero

**Decision:** Suggested Transfers is the main content. Cash Flow Summary should not compete with it.

**Implication for design:**
- **Hero:** One clear block for “Suggested Transfers” — the main list the user cares about.
- **Cash Flow Summary:** Treat as supporting context. Options:
  - Compact summary (e.g. a few lines or a small summary bar), or
  - Tabbed/secondary section (e.g. “By account” tab or collapsible “Account cash flow”).
- Avoid two equal-weight cards. One hero, one supporting.

---

## 3. Confident, purposeful layout

**Decision:** Prefer a confident version: one clear headline, one list, pay cycle as context, no card stack of equal blocks.

**Target shape:**
- **Headline:** Clear and time-bound, e.g. “Move these amounts by [date]” (using next pay date or a derived “by when”).
- **One list:** The suggested transfers as the primary content — not buried inside a card-in-card layout.
- **Pay cycle:** Supporting context (e.g. “Next pay: [date] · [frequency] → [account]”) visible but not the visual focus.
- **No card stack:** Flatten hierarchy; avoid nested cards and multiple same-sized blocks. Suggested Transfers can be a single content block with list rows, not cards inside a card.

---

## 4. Primary user: monthly/quarterly reviewer

**Decision:** Primary user is someone **reviewing their finances monthly or quarterly** to ensure expenses are being covered.

**Implication for design and copy:**
- Frame the page for **review**, not setup or automation.
- Emphasize: “Are my expenses covered?” and “What do I need to move?”
- Tone: Reassuring, clear, review-oriented. Avoid “Set up recurring transfer” or automation-heavy language unless that becomes a product goal later.
- Empty/loading states can speak to this: e.g. “When you have income and expenses in different accounts, we’ll show what to move so your expenses are covered.”

---

## Summary: Design principles for the redesign

| Principle | Application |
|-----------|-------------|
| **Purpose** | Inform the monthly/quarterly review: “Here’s what to move and by when.” No fake primary CTA to bank/copy. |
| **Hero** | Suggested Transfers — one clear headline + one list. |
| **Supporting** | Pay cycle (context bar); Cash Flow (compact or tabbed). |
| **Structure** | One dominant block, no card stack; flatten nested cards. |
| **User** | Reviewer checking “are my expenses covered?” — copy and hierarchy support that. |

When implementing, prioritise: (1) Suggested Transfers as hero with a “Move these amounts by [date]” headline, (2) Cash Flow as compact/tabbed, (3) Pay cycle as visible context, (4) No nested cards / equal-weight sections.
