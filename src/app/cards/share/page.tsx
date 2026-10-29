"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toCanvas } from "qrcode";
import { BackIcon, CheckIcon, ImageIcon, QrIcon } from "@/components/Icons";
import { Sheet } from "@/components/Sheet";
import { useCards } from "@/features/cards/CardsProvider";
import { frameCountFor, prepareTransfer, type PreparedTransfer } from "@/infrastructure/card-transfer/transfer";
import { formatBytes } from "@/lib/format";
import { optimiseImage, renderCardImage, type Optimised, type Profile } from "@/lib/image";

export default function SharePage() {
  const { profile, setProfile, myCardImage, setMyCardImage, toast } = useCards();
  const [step, setStep] = useState<"choose" | "show">("choose");
  const [source, setSource] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [optimised, setOptimised] = useState<Optimised | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [prepared, setPrepared] = useState<PreparedTransfer | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // 1. The picture to share: the person's own image, or a card drawn from their details.
  useEffect(() => {
    if (myCardImage) {
      setSource(myCardImage);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      renderCardImage(profile)
        .then((b) => !cancelled && setSource(b))
        .catch((e: Error) => !cancelled && setProblem(e.message));
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [myCardImage, profile]);

  // 2. Show it, and shrink it so it crosses in a few seconds.
  useEffect(() => {
    if (!source) return;
    const url = URL.createObjectURL(source);
    setPreviewUrl(url);
    setOptimised(null);
    setProblem(null);
    let cancelled = false;
    optimiseImage(source)
      .then((o) => !cancelled && setOptimised(o))
      .catch((e: Error) => !cancelled && setProblem(e.message));
    return () => {
      cancelled = true;
      URL.revokeObjectURL(url);
    };
  }, [source]);

  const onPick = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("Please pick an image");
      return;
    }
    await setMyCardImage(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const onShow = async () => {
    if (!optimised) return;
    setBusy(true);
    try {
      setPrepared(await prepareTransfer(optimised.blob, optimised.mime, profile.name));
      setStep("show");
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (step === "show" && prepared) {
    return <QrStage prepared={prepared} onDone={() => setStep("choose")} />;
  }

  const seconds = optimised ? Math.max(1, Math.round(frameCountFor(optimised.blob.size) / 8)) : null;

  return (
    <div className="screen">
      <div className="topbar">
        <Link href="/cards/" className="icon-btn" aria-label="Back"><BackIcon /></Link>
        <h1>Share my card</h1>
      </div>

      <div className="crumbs" aria-label="Steps">
        <span className="crumb on">1 Choose card</span>
        <span>&gt;</span>
        <span className="crumb">2 Show QR</span>
      </div>

      <div className="card-box">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="card-img" src={previewUrl} alt="Your business card" />
        ) : (
          <div className="card-img" aria-busy="true" />
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 18, flexWrap: "wrap" }}>
        <button className="link-btn" onClick={() => fileRef.current?.click()}>
          <ImageIcon size={18} /> Change image from gallery
        </button>
        {myCardImage && (
          <button className="link-btn" onClick={() => setMyCardImage(null)}>Use drawn card</button>
        )}
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onPick(e.target.files)} />
      </div>

      <div>
        <label className="field-label" htmlFor="owner">Name on the card</label>
        <input
          id="owner"
          className="input"
          value={profile.name}
          maxLength={80}
          onChange={(e) => setProfile({ ...profile, name: e.target.value })}
        />
        <p className="hint">This becomes the file name on their phone.</p>
      </div>

      {!myCardImage && (
        <>
          {(
            [
              ["title", "Role"],
              ["company", "Organization"],
              ["phone", "Phone number"],
              ["email", "Email"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label className="field-label" htmlFor={`f-${key}`}>{label}</label>
              <input
                id={`f-${key}`}
                className="input"
                type={key === "phone" ? "tel" : key === "email" ? "email" : "text"}
                value={profile[key]}
                maxLength={80}
                onChange={(e) => setProfile({ ...profile, [key]: e.target.value })}
              />
            </div>
          ))}

          <div className="tabs" role="group" aria-label="Card style">
            <button className={profile.theme === "white" ? "on" : ""} onClick={() => setProfile({ ...profile, theme: "white" })}>Light card</button>
            <button className={profile.theme === "navy" ? "on" : ""} onClick={() => setProfile({ ...profile, theme: "navy" })}>Navy card</button>
          </div>
        </>
      )}

      {problem ? (
        <div className="notice notice-warn"><span>{problem}</span></div>
      ) : (
        <div className="notice notice-info" aria-live="polite">
          <CheckIcon size={18} />
          <span>
            {optimised && seconds ? (
              <>
                <b>Optimised {formatBytes(optimised.blob.size)}</b>
                <br />About {seconds} seconds to transfer, no internet needed.
              </>
            ) : (
              "Optimising your card…"
            )}
          </span>
        </div>
      )}

      <button className="btn btn-primary" disabled={!optimised || busy || !profile.name.trim()} onClick={onShow}>
        <QrIcon size={20} /> Show QR code
      </button>

      <DetailsSheet open={editOpen} onClose={() => setEditOpen(false)} profile={profile} onChange={setProfile} />
    </div>
  );
}

/* --------------------------------- QR stage --------------------------------- */

function QrStage({ prepared, onDone }: { prepared: PreparedTransfer; onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const indexRef = useRef(0);
  const [index, setIndex] = useState(0);
  const [speed, setSpeed] = useState<"fast" | "reliable">("fast");
  const total = prepared.frames.length;

  // Step through the frames forever, at 8 or 4 a second.
  useEffect(() => {
    const id = window.setInterval(() => {
      indexRef.current = (indexRef.current + 1) % total;
      setIndex(indexRef.current);
    }, speed === "fast" ? 125 : 250);
    return () => window.clearInterval(id);
  }, [speed, total]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    toCanvas(canvas, prepared.frames[index], {
      errorCorrectionLevel: "L",
      margin: 1,
      width: 640,
      color: { dark: "#000000", light: "#ffffff" },
    }).catch(() => undefined);
  }, [index, prepared]);

  // Keep the screen awake and bright while sharing.
  useEffect(() => {
    type Lock = { release(): Promise<void> };
    let lock = null as Lock | null;
    const nav = navigator as Navigator & { wakeLock?: { request(t: "screen"): Promise<Lock> } };
    nav.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => undefined);
    return () => {
      void lock?.release().catch(() => undefined);
    };
  }, []);

  return (
    <div className="fullscreen dark">
      <header className="brand">
        <div className="brand-id">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/strivr-logo.png" alt="" style={{ width: 30, height: 30 }} />
          <div className="brand-name">STRIVR</div>
        </div>
        <span className="chip-file">{prepared.fileName}</span>
      </header>

      <div className="center">
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Ask them to scan</h1>
        <p style={{ opacity: 0.85, fontSize: 14, marginTop: 4 }}>Open Scan a card on their phone</p>
      </div>

      <div className="qr-panel" role="img" aria-label="Animated QR code carrying your card">
        <canvas ref={canvasRef} />
      </div>

      <div>
        <div className="meter-meta">
          <span>Frame {index + 1} of {total}</span>
          <span>Repeats until they finish</span>
        </div>
        <div className="meter"><i style={{ width: `${((index + 1) / total) * 100}%` }} /></div>
      </div>

      <div className="seg" role="group" aria-label="Speed">
        <button className={speed === "fast" ? "on" : ""} onClick={() => setSpeed("fast")}>Fast 8/s</button>
        <button className={speed === "reliable" ? "on" : ""} onClick={() => setSpeed("reliable")}>Reliable 4/s</button>
      </div>
      <p className="tiny">Keep your screen bright and steady</p>

      <button className="btn btn-outline-dark" onClick={onDone}>Done</button>
    </div>
  );
}

/* ------------------------------ details editor ------------------------------ */

function DetailsSheet({
  open,
  onClose,
  profile,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  profile: Profile;
  onChange: (p: Profile) => void;
}) {
  const field = (key: keyof Omit<Profile, "theme">, label: string, type = "text") => (
    <div key={key}>
      <label className="field-label" htmlFor={`f-${key}`}>{label}</label>
      <input
        id={`f-${key}`}
        className="input"
        type={type}
        value={profile[key]}
        maxLength={80}
        onChange={(e) => onChange({ ...profile, [key]: e.target.value })}
      />
    </div>
  );
  return (
    <Sheet open={open} onClose={onClose} label="Your card details">
      <h2 style={{ fontSize: 20, fontWeight: 800 }}>Your card details</h2>
      {field("name", "Name")}
      {field("title", "Job title")}
      {field("company", "Company")}
      {field("phone", "Phone", "tel")}
      {field("email", "Email", "email")}
      <div className="tabs" role="group" aria-label="Card style">
        <button className={profile.theme === "white" ? "on" : ""} onClick={() => onChange({ ...profile, theme: "white" })}>Light card</button>
        <button className={profile.theme === "navy" ? "on" : ""} onClick={() => onChange({ ...profile, theme: "navy" })}>Navy card</button>
      </div>
      <button className="btn btn-primary" onClick={onClose}>Done</button>
    </Sheet>
  );
}
