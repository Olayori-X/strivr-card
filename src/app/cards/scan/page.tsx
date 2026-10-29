"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cardHref } from "@/components/CardBits";
import { CameraIcon, CheckIcon, CloseIcon, FolderIcon, WarnIcon } from "@/components/Icons";
import { useCards } from "@/features/cards/CardsProvider";
import { FrameAssembler } from "@/infrastructure/card-transfer/frames";
import { startScanner } from "@/infrastructure/card-transfer/scanner";
import { openPacket, type ReceivedCard } from "@/infrastructure/card-transfer/transfer";

export default function ScanPage() {
  const [received, setReceived] = useState<ReceivedCard | null>(null);
  const [round, setRound] = useState(0); // bump to open the camera again
  const onCard = useCallback((c: ReceivedCard) => setReceived(c), []);

  if (received) {
    return (
      <Received
        card={received}
        onDiscard={() => {
          setReceived(null);
          setRound((r) => r + 1);
        }}
      />
    );
  }
  return <Camera key={round} onCard={onCard} />;
}

/* ---------------------------------- camera ---------------------------------- */

function cameraMessage(e: unknown): string {
  const err = e as Error;
  if (err.name === "NotAllowedError" || err.name === "SecurityError")
    return "Camera access is blocked. Allow the camera for this site in your browser settings, then try again.";
  if (err.name === "NotFoundError" || err.name === "OverconstrainedError") return "No camera was found on this device.";
  return err.message || "The camera could not start.";
}

function Camera({ onCard }: { onCard: (c: ReceivedCard) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [seen, setSeen] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [progress, setProgress] = useState({ received: 0, total: 0 });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let cancelled = false;
    let finished = false;
    let stop: (() => void) | null = null;
    const assembler = new FrameAssembler();
    setError(null);
    setCameraOn(false);

    startScanner(video, (text) => {
      setSeen((n) => n + 1);
      if (finished) return;
      const r = assembler.accept(text);
      if (r.status === "progress") {
        setWarning(null);
        setProgress((p) => (p.received === r.received && p.total === r.total ? p : { received: r.received, total: r.total }));
      } else if (r.status === "complete") {
        finished = true;
        try {
          const card = openPacket(r.packet);
          navigator.vibrate?.(60);
          onCard(card);
        } catch {
          // Damaged or wrong type: start over and keep looking.
          assembler.reset();
          finished = false;
          setProgress({ received: 0, total: 0 });
          setWarning("That transfer was damaged. Ask them to show the code again.");
        }
      }
    })
      .then((s) => {
        if (cancelled) s();
        else {
          stop = s;
          setCameraOn(true);
        }
      })
      .catch((e) => !cancelled && setError(cameraMessage(e)));

    return () => {
      cancelled = true;
      stop?.();
    };
  }, [onCard, attempt]);

  const pct = progress.total ? Math.round((progress.received / progress.total) * 100) : 0;

  return (
    <div className="fullscreen dark">
      <div className="topbar" style={{ justifyContent: "space-between" }}>
        <Link href="/cards/" className="icon-btn" aria-label="Close"><CloseIcon /></Link>
        <span className="pill pill-plain" style={{ background: "rgba(255,255,255,.12)", color: "#fff" }}>
          <CameraIcon size={14} /> {cameraOn ? "Camera on" : "Camera off"}
        </span>
      </div>

      <div className="center">
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>Point at their QR code</h1>
        <p style={{ opacity: 0.85, fontSize: 14, marginTop: 4 }}>Hold steady until the bar fills</p>
      </div>

      <div className="camera">
        <video ref={videoRef} muted playsInline />
        <div className="finder" aria-hidden="true">
          <span className="tl" /><span className="tr" /><span className="bl" /><span className="br" />
          <span className="line" />
        </div>
      </div>

      {error ? (
        <div className="notice notice-warn">
          <WarnIcon size={18} />
          <span style={{ flex: 1 }}>{error}</span>
          <button className="link-btn" onClick={() => setAttempt((a) => a + 1)}>Try again</button>
        </div>
      ) : (
        <div className="panel-dark" aria-live="polite">
          <div className="head">
            <strong>Receiving card</strong>
            <span className="pct">{pct}%</span>
          </div>
          <div className="meter"><i style={{ width: `${pct}%` }} /></div>
          <p>
            {warning ??
              (progress.total
                ? `${progress.received} of ${progress.total} frames collected. Missing frames repeat on their screen.`
                : "Waiting for a Strivr QR code. Ask them to open Share my card.")}
          </p>
        </div>
      )}
    </div>
  );
}

/* ---------------------------- save the received card ---------------------------- */

function Received({ card, onDiscard }: { card: ReceivedCard; onDiscard: () => void }) {
  const router = useRouter();
  const { resolveFileName, saveReceived, folderLabel, toast } = useCards();
  const [name, setName] = useState(card.name);
  const [url, setUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const u = URL.createObjectURL(card.blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [card.blob]);

  const { fileName, duplicate } = resolveFileName(name, card.mime);
  const suffix = /\((\d+)\)\.[a-z]+$/i.exec(fileName)?.[1];

  const onSave = async () => {
    setSaving(true);
    try {
      const saved = await saveReceived(name, card.blob, card.mime);
      toast(`Saved ${saved.fileName}`);
      router.replace(cardHref(saved.id));
    } catch (e) {
      toast((e as Error).message);
      setSaving(false);
    }
  };

  return (
    <div className="fullscreen light">
      <div className="topbar">
        <button className="icon-btn" aria-label="Close" onClick={onDiscard}><CloseIcon /></button>
        <h1>Card received</h1>
      </div>

      <div>
        <span className="pill pill-good pill-plain"><CheckIcon size={14} /> Transfer complete and verified</span>
      </div>

      <div className="card-box">
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="card-img" src={url} alt="The card you received" />
        )}
      </div>

      <div>
        <label className="field-label" htmlFor="saveas">Save as</label>
        <input id="saveas" className="input" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
        <p className="hint">File name: {folderLabel} / {fileName}</p>
      </div>

      {duplicate && (
        <div className="notice notice-warn">
          <WarnIcon size={18} />
          <span>
            A card named <b>{name.trim() || "Card"}</b> is already in your folder. We add ({suffix ?? 2}) so nothing is overwritten.
          </span>
        </div>
      )}

      <button className="btn btn-primary" disabled={saving} onClick={onSave}>
        <FolderIcon size={20} /> Save to {folderLabel}
      </button>
      <button className="btn btn-ghost" disabled={saving} onClick={onDiscard}>Discard</button>
    </div>
  );
}
