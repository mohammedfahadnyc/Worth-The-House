export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 text-sm text-muted-foreground">
      {label}
    </div>
  );
}
