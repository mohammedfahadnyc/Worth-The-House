"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CopyLinkButton } from "@/components/copy-link-button";
import { LoadingState } from "@/components/loading-state";
import { PermissionBadge } from "@/components/permission-badge";
import { PropertyCard } from "@/components/property-card";
import { PropertyList } from "@/components/property-list";
import { PropertyStageSelect } from "@/components/property-stage-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ensureProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/client";
import type { DealRoom, DealRoomMember, DealRoomProperty, Profile, Property, PropertyStage } from "@/lib/types";

export default function DealRoomDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ownerProfile, setOwnerProfile] = useState<Profile | null>(null);
  const [room, setRoom] = useState<DealRoom | null>(null);
  const [members, setMembers] = useState<DealRoomMember[]>([]);
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});
  const [links, setLinks] = useState<DealRoomProperty[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [myProperties, setMyProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [inviteUsername, setInviteUsername] = useState("");
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return router.replace(`/login?returnTo=${encodeURIComponent(`/deal-rooms/${id}`)}`);
    const loadedProfile = await ensureProfile(supabase, auth.user);
    if (!loadedProfile.setup_complete) return router.replace("/setup");
    const { data: roomData } = await supabase.from("deal_rooms").select("*").eq("id", id).single();
    if (!roomData) {
      setLoading(false);
      return;
    }
    const { data: ownerData } = await supabase.from("profiles").select("*").eq("id", roomData.owner_id).single();
    const { data: memberData } = await supabase.from("deal_room_members").select("*").eq("deal_room_id", id);
    const memberIds = (memberData ?? []).map((member) => member.user_id);
    const { data: memberProfiles } = memberIds.length
      ? await supabase.from("profile_directory").select("id, username").in("id", memberIds)
      : { data: [] };
    const { data: linkData } = await supabase.from("deal_room_properties").select("*").eq("deal_room_id", id);
    const propertyIds = (linkData ?? []).map((item) => item.property_id);
    const { data: propertyData } = propertyIds.length
      ? await supabase.from("properties").select("*").in("id", propertyIds)
      : { data: [] };
    const { data: mine } = await supabase.from("properties").select("*").eq("user_id", auth.user.id).order("created_at", { ascending: false });

    setUserId(auth.user.id);
    setProfile(loadedProfile);
    setRoom(roomData as DealRoom);
    setOwnerProfile(ownerData as Profile);
    setMembers((memberData ?? []) as DealRoomMember[]);
    setMemberNames(
      Object.fromEntries((memberProfiles ?? []).map((member) => [member.id, member.username])),
    );
    setLinks((linkData ?? []) as DealRoomProperty[]);
    setProperties((propertyData ?? []) as Property[]);
    setMyProperties((mine ?? []) as Property[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function addExistingProperty() {
    if (!selectedProperty) return;
    const { error } = await supabase.from("deal_room_properties").insert({
      deal_room_id: id,
      property_id: selectedProperty,
      added_by: userId,
    });
    setMessage(error?.code === "23505" ? "Already added." : error ? "Could not add property." : "Property added.");
    await load();
  }

  async function removeMember(member: DealRoomMember) {
    if (!room || !window.confirm("Remove this collaborator from the Deal Room?")) return;
    const { error } = await supabase
      .from("deal_room_members")
      .delete()
      .eq("id", member.id)
      .eq("deal_room_id", room.id);

    setMessage(error ? "Could not remove collaborator." : "Collaborator removed.");
    await load();
  }

  async function deleteRoom() {
    if (!room || !window.confirm("Delete this Deal Room? This only removes the room, not the properties.")) return;
    const { error } = await supabase
      .from("deal_rooms")
      .delete()
      .eq("id", room.id)
      .eq("owner_id", userId);

    if (error) {
      setMessage("Could not delete Deal Room.");
      return;
    }

    router.replace("/deal-rooms");
  }

  async function inviteUser() {
    if (!inviteUsername.trim()) return;
    const { data: found } = await supabase
      .from("profile_directory")
      .select("id, username")
      .eq("username", inviteUsername.trim())
      .maybeSingle();
    if (!found) {
      setMessage("No existing user found. Ask them to sign up first, then invite them here.");
      return;
    }
    const { error } = await supabase.from("deal_room_members").insert({
      deal_room_id: id,
      user_id: found.id,
      role: "collaborator",
    });
    setMessage(error?.code === "23505" ? "That user is already a collaborator." : error ? "Could not invite user." : "Collaborator added.");
    await load();
  }

  async function updateStage(property: Property, stage: PropertyStage) {
    const previous = property;
    setProperties((current) =>
      current.map((item) => (item.id === property.id ? { ...item, stage } : item)),
    );
    const { error } = await supabase.from("properties").update({ stage }).eq("id", property.id);
    if (error) {
      setMessage("Could not update deal stage.");
      setProperties((current) =>
        current.map((item) => (item.id === property.id ? previous : item)),
      );
      return;
    }
    setMessage("Deal stage updated.");
  }

  if (loading) return <LoadingState label="Loading Deal Room..." />;
  if (!profile || !room || !ownerProfile) {
    return <main className="p-8 text-sm text-muted-foreground">This Deal Room is unavailable.</main>;
  }

  const isOwner = room.owner_id === userId;
  const roomUrl = typeof window !== "undefined" ? `${window.location.origin}/deal-rooms/${room.id}` : "";
  const canChangeStage = (property: Property) => isOwner || property.user_id === userId;

  return (
    <AppShell profile={profile}>
      <section className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <PermissionBadge kind="private" />
            <PermissionBadge kind={isOwner ? "owner" : "collaborator"} />
          </div>
          <h1 className="text-3xl font-semibold tracking-normal sm:text-4xl">{room.name}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{room.description || "No description yet."}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {roomUrl ? <CopyLinkButton value={roomUrl} /> : null}
          <Button asChild>
            <Link href={`/deal-rooms/${room.id}/properties/new`}>
              <Plus className="h-4 w-4" />
              Add House in Room
            </Link>
          </Button>
        </div>
      </section>

      <Card className="mb-6 border-emerald-400/15 bg-emerald-400/[0.05] p-4">
        <div className="space-y-2 text-sm text-emerald-100">
          <p className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Calculations use {isOwner ? "your" : `${ownerProfile.username}'s`} buying profile.
          </p>
          <p className="text-emerald-100/80">
            Share this private room link with invited collaborators. Only added members can open it after login.
          </p>
        </div>
      </Card>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Import Existing Property</CardTitle>
            <CardDescription>Add one of your properties to this room without duplicating it.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <select className="h-11 w-full rounded-md border border-input bg-white/[0.04] px-3 text-sm" value={selectedProperty} onChange={(event) => setSelectedProperty(event.target.value)}>
              <option value="">Choose a property</option>
              {myProperties.map((property) => <option key={property.id} value={property.id}>{property.address}</option>)}
            </select>
            <Button onClick={addExistingProperty} disabled={!selectedProperty}>Add to room</Button>
          </CardContent>
        </Card>

        {isOwner ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" /> Manage Members</CardTitle>
              <CardDescription>Invite an existing user by exact profile username.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="invite">Username</Label>
                <Input id="invite" value={inviteUsername} onChange={(event) => setInviteUsername(event.target.value)} />
              </div>
              <Button onClick={inviteUser}>Invite collaborator</Button>
              <div className="space-y-2 pt-2">
                <p className="text-sm text-muted-foreground">{members.length} collaborator(s)</p>
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {memberNames[member.user_id] ?? "Collaborator"}
                      </p>
                      <p className="text-xs text-muted-foreground">{member.user_id.slice(0, 8)}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => removeMember(member)}>
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {message ? <p className="mb-6 rounded-md border border-white/10 bg-white/[0.03] p-3 text-sm text-muted-foreground">{message}</p> : null}

      <PropertyList
        profile={ownerProfile}
        properties={properties}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        getPropertyHref={(property) => `/deal-rooms/${room.id}/properties/${property.id}`}
        onStageChange={updateStage}
        canChangeStage={canChangeStage}
        renderCards={(visibleProperties) => (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleProperties.map((property) => {
              const addedBy = links.find((link) => link.property_id === property.id)?.added_by;
              return (
                <div key={property.id} className="space-y-2">
                  <PropertyCard
                    property={property}
                    profile={ownerProfile}
                    href={`/deal-rooms/${room.id}/properties/${property.id}`}
                  />
                  <p className="px-1 text-xs text-muted-foreground">
                    Added by {addedBy === userId ? "you" : "a collaborator"}
                  </p>
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-xs text-muted-foreground">Deal stage</span>
                    <PropertyStageSelect
                      value={property.stage}
                      disabled={!canChangeStage(property)}
                      onChange={(stage) => updateStage(property, stage)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      />

      {isOwner ? (
        <Card className="mt-8 border-red-400/20 bg-red-400/[0.04]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-100">
              <Trash2 className="h-5 w-5" />
              Delete Deal Room
            </CardTitle>
            <CardDescription>
              This removes the room and its links. Your properties stay in your private dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={deleteRoom}>
              Delete Deal Room
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </AppShell>
  );
}
