import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Card className="flex min-h-[280px] flex-col items-center justify-center p-8 text-center">
      <div className="mb-5 h-1 w-16 rounded-full bg-emerald-400/70" />
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </Card>
  );
}
