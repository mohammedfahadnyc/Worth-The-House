import { Badge } from "@/components/ui/badge";

export function PermissionBadge({ kind }: { kind: "private" | "view_only" | "can_comment" | "owner" | "collaborator" }) {
  const labels = {
    private: "Private Room",
    view_only: "Public View Only",
    can_comment: "Public Comments Enabled",
    owner: "Owner",
    collaborator: "Collaborator",
  };
  const styles = {
    private: "border-emerald-400/25 bg-emerald-400/10 text-emerald-100",
    view_only: "border-blue-400/25 bg-blue-400/10 text-blue-100",
    can_comment: "border-amber-400/25 bg-amber-400/10 text-amber-100",
    owner: "border-emerald-400/25 bg-emerald-400/10 text-emerald-100",
    collaborator: "border-slate-400/25 bg-slate-400/10 text-slate-200",
  };

  return <Badge className={styles[kind]}>{labels[kind]}</Badge>;
}
