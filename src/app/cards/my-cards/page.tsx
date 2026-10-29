"use client";

import { useRef, useState } from "react";
import { CardTile } from "@/components/CardBits";
import { ImageIcon, PlusIcon, SearchIcon } from "@/components/Icons";
import { useCards } from "@/features/cards/CardsProvider";
import Link from "next/link";

export default function MyCardsPage() {
  const { cards, mode, access, reconnect, addImages, toast, folderLabel } = useCards();
  const [query, setQuery] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const shown = cards.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()));
  const needsReconnect = access === "needs-permission";

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      const n = await addImages(Array.from(files));
      toast(n === 0 ? "No images were added" : n === 1 ? "1 card added" : `${n} cards added`);
    } catch (e) {
      toast((e as Error).message);
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="screen">
      <div className="section-head">
        <h1 className="big-title">My Cards</h1>
        <button className="btn btn-primary btn-sm" onClick={() => fileRef.current?.click()}>
          <PlusIcon size={18} /> Add
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
      </div>

      <div className="section-head">
        <span className="hint" style={{ marginTop: 0 }}>
          {folderLabel} | {cards.length} {cards.length === 1 ? "card" : "cards"}
        </span>
        {needsReconnect ? (
          <button className="pill pill-warn" onClick={() => reconnect()}>Reconnect</button>
        ) : (
          <span className="pill pill-good">{mode === "folder" ? "Connected" : "On this phone"}</span>
        )}
      </div>

      <label className="search">
        <span className="sr-only">Search by name</span>
        <SearchIcon size={18} />
        <input className="input" placeholder="Search by name" value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>

      {cards.length === 0 ? (
        <div className="empty">
          <ImageIcon size={32} />
          <h3>Your folder is empty</h3>
          <p>Scan a card, or add card images you already have.</p>
          <div className="btn-row">
            <Link href="/cards/scan/" className="btn btn-primary btn-sm">Scan a card</Link>
            <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>Add images</button>
          </div>
        </div>
      ) : shown.length === 0 ? (
        <p className="hint">No card matches &ldquo;{query}&rdquo;.</p>
      ) : (
        <div className="grid">
          {shown.map((c) => (
            <CardTile key={c.id} card={c} />
          ))}
        </div>
      )}
    </div>
  );
}
