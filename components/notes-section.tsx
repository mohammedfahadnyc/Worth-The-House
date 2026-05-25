"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type NotesSectionProps = {
  title: string;
  description?: string;
  value: string;
  placeholder: string;
  onSave: (value: string) => Promise<void>;
};

export function NotesSection({ title, description, value, placeholder, onSave }: NotesSectionProps) {
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      await onSave(draft);
      setMessage("Saved");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save notes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={placeholder}
          className="min-h-[260px] resize-y text-base leading-7"
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
            {saving ? "Saving..." : `Save ${title.toLowerCase()}`}
          </Button>
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
