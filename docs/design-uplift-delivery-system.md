# Design Uplift Delivery System

You are working through a design uplift backlog for the Wellthy / Supafolio codebase.

The original source critique is:
`~/Projects/wellthy/docs/design-critique.md`

However, do not repeatedly use the full critique as the working context for every task. Your job is to minimise context usage and preserve accuracy by using a staged workflow with compact handoff artifacts.

## Objectives

1. Systematically implement the design recommendations captured in the critique.
2. Use Linear as the execution backlog and dependency source of truth.
3. Ensure every ticket goes through a mini planning stage before code changes.
4. Minimise context-window waste by narrowing inputs at each stage.
5. Avoid duplicated reasoning and avoid multiple agents rediscovering the same systemic issues.

## Core operating rules

- Do not combine critique digestion, ticket sequencing, implementation, and review into one large task.
- Use separate agents or separate prompt stages for:
  1. critique distillation
  2. ticket triage/sequencing
  3. ticket mini-planning
  4. implementation
  5. review
- Each stage should produce a compact artifact for the next stage.
- Prefer short structured handoffs over long narrative explanations.
- Prefer targeted file inspection over broad codebase scanning.
- If a ticket appears to require a shared primitive change, identify that explicitly rather than implementing a one-off local patch.
- Respect Linear blocking relationships.
- If blocked, stop and report the blocker rather than forcing a workaround.

## Required artifacts

Create and maintain these files where useful:

1. `~/Projects/wellthy/docs/design-critique-index.md`
  - distilled implementation-oriented summary of the original critique
2. `~/Projects/wellthy/docs/design-ticket-plan.md`
  - ticket triage, dependency mapping, and sequencing plan
3. `~/Projects/wellthy/docs/tickets/{ticket-id}-plan.md`
  - mini plan for an individual ticket before implementation
4. `~/Projects/wellthy/docs/tickets/{ticket-id}-review.md`
  - review outcome after implementation

## Stage rules

### Stage 1: Critique distillation

Read `design-critique.md` and produce a compact implementation-oriented index.
Do not rewrite the critique verbatim.
Extract only:

- issue category
- affected screens/components
- recommended changes
- whether the issue is local or systemic
- likely shared primitives involved
- validation heuristics

### Stage 2: Ticket triage and sequencing

For each Linear ticket:

- map it to the critique index
- assess dependency/blocking relationships
- classify it as:
  - foundation
  - dependent
  - independent
  - blocked
- note likely implementation surface
- recommend execution order

Do not edit code in this stage.

### Stage 3: Ticket mini-planning

For a single ticket:

- read the ticket
- read only the relevant parts of the critique index and ticket plan
- inspect only the minimum relevant code surface
- produce a concise mini plan before implementation

### Stage 4: Implementation

Implement only from the mini plan.
Keep exploration narrow.
Avoid unrelated refactors.
Prefer shared primitives when the issue is systemic.

### Stage 5: Review

Review against:

- ticket intent
- critique intent
- consistency with surrounding UI
- responsive behaviour
- risk of regression
- accidental one-off styling

## General context-window discipline

- Avoid reopening the full critique unless the distilled index is insufficient.
- Avoid scanning unrelated parts of the codebase.
- Do not load multiple ticket contexts into a single implementation task.
- One ticket at a time for implementation unless multiple tickets clearly share the exact same implementation surface.