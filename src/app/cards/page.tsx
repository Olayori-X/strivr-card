"use client";

import Link from "next/link";
import { useState } from "react";
import { CardRow } from "@/components/CardBits";
import { InstallSheet } from "@/components/InstallSheet";
import { QrIcon, ScanIcon } from "@/components/Icons";
import { useCards } from "@/features/cards/CardsProvider";

export default function HomePage() {
  const { cards, mode, access, reconnect, isStandalone, folderLabel, toast, canInstall, promptInstall } = useCards();
  const [installOpen, setInstallOpen] = useState(false);

  const needsReconnect = access === "needs-permission";
  const pill =
    mode === "folder" ? "Folder connected" : mode === "gallery" ? "Gallery" : "Private folder";

  const onReconnect = async () => {
    if (!(await reconnect())) toast("We could not reconnect. Open Folder access to choose the folder again.");
  };

  const onAdd = async () => {
    if (canInstall) {
      if (await promptInstall()) toast("Strivr Cards added");
      return;
    }
    setInstallOpen(true);
  };

  return (
    <div className="screen">
      <header className="brand">
        <div className="brand-id">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/strivr-logo.png" alt="" />
          <div>
            <div className="brand-name">STRIVR</div>
            <div className="brand-sub">Card Folder</div>
          </div>
        </div>
        {needsReconnect ? (
          <button className="pill pill-warn" onClick={onReconnect}>Reconnect</button>
        ) : (
          <Link href="/cards/folder/" className="pill pill-good">{pill}</Link>
        )}
      </header>

      <section className="hero" aria-label="Your connections">
        <small>YOUR CONNECTIONS</small>
        <h2>Your business network, in one place.</h2>
        <div className="stats">
          <div className="stat"><strong>{cards.length}</strong><span>Collected cards</span></div>
          <div className="stat accent"><strong>{needsReconnect ? "Paused" : "Ready"}</strong><span>Strivr-card folder</span></div>
        </div>
      </section>

      <div className="btn-row">
        <Link href="/cards/share/" className="btn btn-primary btn-tall"><QrIcon size={26} />Share my card</Link>
        <Link href="/cards/scan/" className="btn btn-ghost btn-tall"><ScanIcon size={26} />Scan a card</Link>
      </div>

      {needsReconnect && (
        <div className="notice notice-warn">
          <span style={{ flex: 1 }}>
            <b>Permission needed again.</b> Your browser asks us to confirm access to the {folderLabel} folder after a while.
          </span>
          <button className="link-btn" onClick={onReconnect}>Reconnect</button>
        </div>
      )}

      <div className="section-head">
        <h2>Recently collected</h2>
        {cards.length > 0 && <Link href="/cards/my-cards/" className="link-btn">See all</Link>}
      </div>

      {cards.length === 0 ? (
        <div className="empty">
          <h3>No cards yet</h3>
          <p>Scan a card from someone&apos;s phone and it will land here.</p>
          <Link href="/cards/scan/" className="btn btn-primary btn-sm">Scan a card</Link>
        </div>
      ) : (
        cards.slice(0, 3).map((c) => <CardRow key={c.id} card={c} />)
      )}

      <a className="row promo" href="https://home.y-strivr.com" target="_blank" rel="noopener noreferrer">
        <p>
          Optimize your business processes
          <br />
          <span style={{ color: "var(--blue-700)", fontWeight: 700 }}>home.y-strivr.com</span>
        </p>
      </a>

      {!isStandalone && (
        <div className="row promo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/strivr-192.png" alt="" />
          <p>Add Strivr Cards to your home screen</p>
          <button className="btn btn-primary btn-sm" onClick={onAdd}>Add</button>
        </div>
      )}

      <InstallSheet open={installOpen} onClose={() => setInstallOpen(false)} />
    </div>
  );
}
