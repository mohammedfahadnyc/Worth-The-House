"use client";

import { Share2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import type { DealRoom, Showcase } from "@/lib/types";

export function SharePropertyDialog({ propertyId }: { propertyId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [rooms, setRooms] = useState<DealRoom[]>([]);
  const [showcases, setShowcases] = useState<Showcase[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      if (!open) return;
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data: roomData } = await supabase.from("deal_rooms").select("*").order("created_at", { ascending: false });
      const { data: showcaseData } = await supabase
        .from("showcases")
        .select("*")
        .eq("owner_id", userData.user.id)
        .order("created_at", { ascending: false });
      setRooms((roomData ?? []) as DealRoom[]);
      setShowcases((showcaseData ?? []) as Showcase[]);
    }
    load();
  }, [open, supabase]);

  async function addToRoom(roomId: string) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { error } = await supabase.from("deal_room_properties").insert({
      deal_room_id: roomId,
      property_id: propertyId,
      added_by: userData.user.id,
    });
    setMessage(error?.code === "23505" ? "Already added to that Deal Room." : error ? "Could not add to room." : "Added to Deal Room.");
  }

  async function addToShowcase(showcaseId: string) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { error } = await supabase.from("showcase_properties").insert({
      showcase_id: showcaseId,
      property_id: propertyId,
      added_by: userData.user.id,
    });
    setMessage(error?.code === "23505" ? "Already added to that Showcase." : error ? "Could not add to showcase." : "Added to Showcase.");
  }

  return (
    <div className="relative">
      <Button type="button" variant="outline" onClick={() => setOpen((current) => !current)}>
        <Share2 className="h-4 w-4" />
        Share
      </Button>
      {open ? (
        <Card className="absolute right-0 z-30 mt-3 w-[min(92vw,420px)] p-4 shadow-glow">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium">Add to Deal Room</p>
              <div className="mt-2 space-y-2">
                {rooms.length ? rooms.map((room) => (
                  <Button key={room.id} type="button" variant="secondary" className="w-full justify-between" onClick={() => addToRoom(room.id)}>
                    {room.name}
                  </Button>
                )) : <p className="text-sm text-muted-foreground">No Deal Rooms yet.</p>}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium">Add to Showcase</p>
              <div className="mt-2 space-y-2">
                {showcases.length ? showcases.map((showcase) => (
                  <Button key={showcase.id} type="button" variant="secondary" className="w-full justify-between" onClick={() => addToShowcase(showcase.id)}>
                    {showcase.name}
                  </Button>
                )) : <p className="text-sm text-muted-foreground">No Showcases yet.</p>}
              </div>
            </div>
            {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
