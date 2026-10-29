"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cardHref } from "@/components/CardBits";
import { BackIcon, DownloadIcon, PencilIcon, TrashIcon } from "@/components/Icons";
import { Sheet } from "@/components/Sheet";
import { useCards } from "@/features/cards/CardsProvider";
import { exportToGallery } from "@/lib/export";
import { formatBytes, formatDateTime, mimeLabel } from "@/lib/format";

function CardDetail() {
  const router = useRouter();
  const id = useSearchParams().get("id") ?? "";
  const { cards, folderLabel, renameCard, removeCard, toast } = useCards();
  const card = cards.find((c) => c.id === id);

  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  if (!card) {
    return (
      <div className="screen">
        <div className="topbar">
          <Link href="/cards/my-cards/" className="icon-btn" aria-label="Back"><BackIcon /></Link>
          <h1>Card</h1>
        </div>
        <div className="empty">
          <h3>Card not found</h3>
          <p>It may have been renamed or deleted.</p>
          <Link href="/cards/my-cards/" className="btn btn-primary btn-sm">Back to My Cards</Link>
        </div>
      </div>
    );
  }

  const onExport = async () => {
    try {
      const r = await exportToGallery(card);
      if (r === "downloaded") toast("Saved to your downloads");
    } catch (e) {
      toast((e as Error).message);
    }
  };

  const onRename = async () => {
    setBusy(true);
    try {
      const nextId = await renameCard(card.id, newName);
      setRenameOpen(false);
      toast("Card renamed");
      if (nextId !== card.id) router.replace(cardHref(nextId));
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    setBusy(true);
    try {
      await removeCard(card.id);
      toast("Card deleted");
      router.replace("/cards/my-cards/");
    } catch (e) {
      toast((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="screen">
      <div className="topbar">
        <Link href="/cards/my-cards/" className="icon-btn" aria-label="Back"><BackIcon /></Link>
        <h1>Card</h1>
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="card-img" src={card.url} alt={`Business card of ${card.name}`} />

      <div>
        <h2 className="detail-name">{card.name}</h2>
        <p className="detail-path">{folderLabel} / {card.fileName}</p>
      </div>

      <dl className="info-table" style={{ margin: 0 }}>
        <div><dt>Type</dt><dd>{mimeLabel(card.mime)}</dd></div>
        <div><dt>Size</dt><dd>{formatBytes(card.size)}</dd></div>
        <div><dt>Received</dt><dd>{formatDateTime(card.savedAt)}</dd></div>
      </dl>

      <button className="btn btn-primary" onClick={onExport}><DownloadIcon size={20} /> Export to gallery</button>
      <div className="btn-row">
        <button className="btn btn-ghost" onClick={() => { setNewName(card.name); setRenameOpen(true); }}>
          <PencilIcon size={18} /> Rename
        </button>
        <button className="btn btn-danger" onClick={() => setDeleteOpen(true)}>
          <TrashIcon size={18} /> Delete
        </button>
      </div>

      <Sheet open={renameOpen} onClose={() => setRenameOpen(false)} label="Rename card">
        <h2 className="detail-name" style={{ fontSize: 20 }}>Rename card</h2>
        <div>
          <label className="field-label" htmlFor="rename">Name</label>
          <input id="rename" className="input" value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
          <p className="hint">This becomes the file name.</p>
        </div>
        <button className="btn btn-primary" disabled={busy || !newName.trim()} onClick={onRename}>Save name</button>
        <button className="btn btn-ghost" onClick={() => setRenameOpen(false)}>Cancel</button>
      </Sheet>

      <Sheet open={deleteOpen} onClose={() => setDeleteOpen(false)} label="Delete card">
        <h2 className="detail-name" style={{ fontSize: 20 }}>Delete {card.name}?</h2>
        <p className="hint" style={{ marginTop: -6 }}>
          The file is removed from your {folderLabel} folder. This cannot be undone.
        </p>
        <button className="btn btn-danger" disabled={busy} onClick={onDelete}><TrashIcon size={18} /> Delete card</button>
        <button className="btn btn-ghost" onClick={() => setDeleteOpen(false)}>Keep it</button>
      </Sheet>
    </div>
  );
}

export default function CardDetailPage() {
  return (
    <Suspense fallback={null}>
      <CardDetail />
    </Suspense>
  );
}
