# Verify implementation before claiming completion

## When this applies

- You are implementing a plan, spec, or task list (step-by-step or checklist).
- You state or imply that work is "done", "complete", "implemented", or "fixed".
- The user has asked you to implement something and you are about to respond that it is finished.

## Required before stating completion

1. **Re-read the modified files**
   - Open each file you changed (or that the plan says must change).
   - Do not rely on memory or on having made an edit in a previous turn.

2. **Confirm each planned change in code**
   - For every item in the plan/spec/task list, identify the exact place in the code that implements it (file path and line range or a short quoted snippet).
   - If the plan says "show X only when Y", the conditional that implements that must be present and correct in the file. If the plan says "add prop Z", the prop must appear in the interface and be passed where specified.
   - If you cannot point to the lines that implement a step, that step is not done—either implement it or do not claim completion.

3. **Report verification explicitly**
   - In the same response where you say implementation is complete, include a short verification section, for example:
     - "Verified: [File A] lines X–Y implement [specific behavior]. [File B] lines P–Q implement [other behavior]."
   - Or: "Verified: Cancel is wrapped in `!(asset && onDelete)` in AssetForm.tsx (lines 824–828) and LiabilityForm.tsx (lines 285–289)."
   - For single-file or single-change work, one sentence is enough.

## What not to do

- Do not say that a plan or step is "implemented" or "complete" without having re-read the relevant code and confirmed the described behavior is present.
- Do not treat "I edited the file" in a previous turn as proof that the current code matches the plan; re-read the file.
- Do not list only the edits you made; tie each planned behavior to the exact location in the current code.

## Optional: checklist for multi-step plans

When the plan has multiple steps, before claiming full completion, mentally or explicitly run through:

- [ ] Step 1: [Brief description] — implemented in [file:lines or snippet].
- [ ] Step 2: ...
- [ ] All steps verified in code as above.

If any step cannot be verified in code, do not claim completion; either implement the missing part or state what remains.
