"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ImagePlus } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { createClient } from "@/lib/supabase/client";
import { NFL_TEAMS } from "@/lib/data/nflTeams";
import { CARD_SETS, PARALLELS, CONDITIONS } from "@/lib/data/cardCatalog";
import type { CardStatus } from "@/lib/types/database";

export default function AddCardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [playerName, setPlayerName] = useState("");
  const [team, setTeam] = useState("");
  const [setName, setSetName] = useState("");
  const [parallel, setParallel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [condition, setCondition] = useState("");
  const [status, setStatus] = useState<CardStatus>("personal_collection");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setPhoto(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You need to be logged in to add a card.");
      setSubmitting(false);
      return;
    }

    let imageUrl: string | null = null;

    if (photo) {
      const path = `${user.id}/${crypto.randomUUID()}-${photo.name}`;
      const { error: uploadError } = await supabase.storage
        .from("card-photos")
        .upload(path, photo);

      if (uploadError) {
        setError(uploadError.message);
        setSubmitting(false);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("card-photos").getPublicUrl(path);
      imageUrl = publicUrl;
    }

    const { error: insertError } = await supabase.from("cards").insert({
      owner_id: user.id,
      player_name: playerName,
      team: team || null,
      set_name: setName || null,
      parallel: parallel || null,
      serial_number: serialNumber || null,
      condition: condition || null,
      status,
      image_url: imageUrl,
    });

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    router.push("/collection");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-xl">
      <Link
        href="/collection"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-text"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Collection
      </Link>

      <h1 className="text-2xl font-bold text-text">Add a Card</h1>
      <p className="mt-1 text-sm text-muted">
        Add a card to your collection, or list it as available for trade.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text" htmlFor="photo">
            Photo
          </label>
          <label
            htmlFor="photo"
            className="flex aspect-[5/7] w-40 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-surface text-muted hover:border-primary/40"
          >
            {photoPreview ? (
              <Image
                src={photoPreview}
                alt="Card preview"
                width={160}
                height={224}
                unoptimized
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex flex-col items-center gap-2 px-4 text-center text-xs">
                <ImagePlus className="h-6 w-6" />
                Upload photo
              </span>
            )}
          </label>
          <input
            id="photo"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
          />
        </div>

        <div>
          <label htmlFor="playerName" className="mb-1.5 block text-sm font-medium text-text">
            Player name
          </label>
          <Input
            id="playerName"
            required
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="e.g. Ja'Marr Chase"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="team" className="mb-1.5 block text-sm font-medium text-text">
              Team
            </label>
            <Select id="team" value={team} onChange={(e) => setTeam(e.target.value)}>
              <option value="">Select a team</option>
              {NFL_TEAMS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label htmlFor="setName" className="mb-1.5 block text-sm font-medium text-text">
              Set
            </label>
            <Select id="setName" value={setName} onChange={(e) => setSetName(e.target.value)}>
              <option value="">Select a set</option>
              {CARD_SETS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="parallel" className="mb-1.5 block text-sm font-medium text-text">
              Parallel
            </label>
            <Select id="parallel" value={parallel} onChange={(e) => setParallel(e.target.value)}>
              <option value="">Select a parallel</option>
              {PARALLELS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label htmlFor="serialNumber" className="mb-1.5 block text-sm font-medium text-text">
              Serial number
            </label>
            <Input
              id="serialNumber"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              placeholder="e.g. 12/99"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="condition" className="mb-1.5 block text-sm font-medium text-text">
              Condition
            </label>
            <Select
              id="condition"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
            >
              <option value="">Select condition</option>
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label htmlFor="status" className="mb-1.5 block text-sm font-medium text-text">
              Status
            </label>
            <Select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as CardStatus)}
            >
              <option value="personal_collection">Personal Collection</option>
              <option value="for_trade">For Trade</option>
            </Select>
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? "Adding card..." : "Add card"}
        </button>
      </form>
    </div>
  );
}
