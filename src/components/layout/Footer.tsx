export function Footer() {
  return (
    <footer className="border-t bg-card p-4">
      <div className="container mx-auto flex justify-center gap-4">
        <button
          type="button"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Report Error
        </button>
        <button
          type="button"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Feedback
        </button>
      </div>
    </footer>
  );
}

