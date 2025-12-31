/**
 * Visual divider component between income and expenses sections
 * Shows a simple horizontal line
 */
export function VisualDivider() {
  return (
    <div className="py-8" aria-hidden="true">
      <div className="w-full border-t border-neutral-200" />
    </div>
  );
}

