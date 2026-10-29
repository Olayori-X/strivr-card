"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BackIcon, FolderIcon, ImageIcon, LockIcon, ShieldIcon, WarnIcon } from "@/components/Icons";
import { useCards } from "@/features/cards/CardsProvider";

export default function FolderAccessPage() {
  const router = useRouter();
  const { mode, access, supportsFolder, chooseFolder, useBrowserStorage, reconnect, addImages, toast } = useCards();
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const firstRun = mode === null;
  const needsReconnect = mode === "folder" && access === "needs-permission";

  const done = (message: string) => {
    toast(message);
    router.replace("/cards/");
  };

  const onChooseFolder = async () => {
    setBusy(true);
    try {
      await chooseFolder();
      done("Folder connected");
    } catch (e) {
      const err = e as Error;
      if (err.name !== "AbortError") {
        toast(
          err.name === "SecurityError"
            ? "Your browser would not let us use that folder. Pick or create a different one."
            : err.message || "Could not open that folder."
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const onPrivate = async () => {
    setBusy(true);
    try {
      await useBrowserStorage("private");
      done("Using the private folder");
    } finally {
      setBusy(false);
    }
  };

  const onGalleryFiles = async (files: FileList | null) => {
    setBusy(true);
    try {
      await useBrowserStorage("gallery");
      if (files && files.length > 0) {
        const n = await addImages(Array.from(files));
        done(n === 1 ? "1 card added" : `${n} cards added`);
      } else {
        done("Gallery mode on. Add cards any time.");
      }
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onReconnect = async () => {
    if (await reconnect()) done("Folder reconnected");
    else toast("Permission was not granted. Choose the folder again below.");
  };

  return (
    <div className="screen">
      <div className="topbar">
        {!firstRun && (
          <Link href="/cards/" className="icon-btn" aria-label="Back"><BackIcon /></Link>
        )}
        <h1>Card folder</h1>
      </div>

      {needsReconnect && (
        <div className="notice notice-warn">
          <WarnIcon size={18} />
          <span style={{ flex: 1 }}>
            <b>Permission needed again.</b> Your browser asks us to confirm access after a while.
          </span>
          <button className="link-btn" onClick={onReconnect}>Reconnect</button>
        </div>
      )}

      <div>
        <h2 className="big-title">Where should your cards live?</h2>
        <p className="hint">Pick one. You can change this later.</p>
      </div>

      <section className={`option${supportsFolder ? " rec" : ""}`}>
        <div className="option-head">
          <span className="option-icon"><FolderIcon size={20} /></span>
          <div>
            <strong>Choose a folder</strong>
            {supportsFolder && <span className="tag">Recommended where available</span>}
          </div>
        </div>
        <p>
          Pick or create Strivr-card, for example inside Pictures. Cards then show up in your gallery.
          {!supportsFolder && " This browser cannot open folders, so use one of the options below."}
        </p>
        <button className="btn btn-primary" disabled={!supportsFolder || busy} onClick={onChooseFolder}>
          Choose folder
        </button>
      </section>

      <section className="option">
        <div className="option-head">
          <span className="option-icon"><ShieldIcon size={20} /></span>
          <div>
            <strong>Use Strivr&apos;s private folder</strong>
            <span className="tag">Works on every phone, including iPhone</span>
          </div>
        </div>
        <p>Cards are kept safely inside Strivr. Export any card to your gallery when you want.</p>
        <button className="btn btn-ghost" disabled={busy} onClick={onPrivate}>Use private folder</button>
      </section>

      <section className="option">
        <div className="option-head">
          <span className="option-icon"><ImageIcon size={20} /></span>
          <div><strong>Add from your gallery</strong></div>
        </div>
        <p>Pick card images whenever you like. Nothing is read without your choice.</p>
        <button className="btn btn-ghost" disabled={busy} onClick={() => fileRef.current?.click()}>Pick images</button>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => onGalleryFiles(e.target.files)} />
      </section>

      <p className="hint center" style={{ display: "flex", gap: 6, justifyContent: "center", alignItems: "center" }}>
        <LockIcon size={14} /> Nothing is uploaded. Cards stay on your device.
      </p>
    </div>
  );
}
