"use client";

import { useMemo, useState } from "react";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import type { PublicPropertyComment, Showcase } from "@/lib/types";

export function PublicCommentsSection({
  showcase,
  propertyId,
  initialComments,
}: {
  showcase: Showcase;
  propertyId: string;
  initialComments: PublicPropertyComment[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [comments, setComments] = useState(initialComments);
  const [displayName, setDisplayName] = useState("");
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    const trimmed = comment.trim().slice(0, 2000);
    if (!trimmed) return;
    setSaving(true);
    setMessage("");
    const payload = {
      showcase_id: showcase.id,
      property_id: propertyId,
      display_name: displayName.trim() || "Anonymous",
      comment: trimmed,
    };
    const { data, error } = await supabase
      .from("public_property_comments")
      .insert(payload)
      .select("*")
      .single();
    setSaving(false);
    if (error) {
      setMessage("Could not add that comment, but the showcase is still available.");
      return;
    }
    setComments((current) => [...current, data as PublicPropertyComment]);
    setComment("");
    setMessage("Comment added. The owner will see it here.");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Public comments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {comments.length ? (
          <div className="space-y-3">
            {comments.map((item) => (
              <div key={item.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm font-medium">{item.display_name || "Anonymous"}</p>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">{item.comment}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No comments yet.</p>
        )}

        {showcase.access_mode === "can_comment" ? (
          <div className="space-y-3 border-t border-white/10 pt-5">
            <div className="space-y-2">
              <Label htmlFor="display-name">Your name</Label>
              <Input id="display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Anonymous" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="comment">Comment</Label>
              <Textarea
                id="comment"
                value={comment}
                maxLength={2000}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Leave a quick note for the buyer..."
              />
            </div>
            <Button type="button" onClick={submit} disabled={saving || !comment.trim()}>
              {saving ? "Adding..." : "Submit comment"}
            </Button>
            {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
          </div>
        ) : (
          <p className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-muted-foreground">
            This showcase is view-only.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
