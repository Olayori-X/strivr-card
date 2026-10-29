"use client";

import { useEffect, useState } from "react";
import { useCards } from "@/features/cards/CardsProvider";
import { AddSquareIcon, MenuDotsIcon, ShareUpIcon } from "./Icons";
import { Sheet } from "./Sheet";

function isIphone(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes("Mac") && navigator.maxTouchPoints > 1);
}

export function InstallSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { canInstall, promptInstall, toast } = useCards();
  const [tab, setTab] = useState<"android" | "iphone">("android");

  useEffect(() => {
    if (open) setTab(isIphone() ? "iphone" : "android");
  }, [open]);

  return (
    <Sheet open={open} onClose={onClose} label="Add Strivr Cards to your home screen">
      <div className="sheet-head">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/strivr-192.png" alt="" />
        <div>
          <strong>Add Strivr Cards</strong>
          <span>Open your cards in one tap</span>
        </div>
      </div>

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === "android"} className={tab === "android" ? "on" : ""} onClick={() => setTab("android")}>
          Android and desktop
        </button>
        <button role="tab" aria-selected={tab === "iphone"} className={tab === "iphone" ? "on" : ""} onClick={() => setTab("iphone")}>
          iPhone
        </button>
      </div>

      {tab === "iphone" ? (
        <ol className="steps">
          <li><span className="n">1</span><span className="grow">Tap <b>Share</b> in Safari</span><ShareUpIcon size={22} /></li>
          <li><span className="n">2</span><span className="grow">Scroll and tap <b>Add to Home Screen</b></span><AddSquareIcon size={22} /></li>
          <li><span className="n">3</span><span className="grow">Tap <b>Add</b>. Strivr Cards now opens like an app</span></li>
        </ol>
      ) : (
        <>
          {canInstall && (
            <button
              className="btn btn-primary"
              onClick={async () => {
                const ok = await promptInstall();
                if (ok) {
                  toast("Strivr Cards added");
                  onClose();
                }
              }}
            >
              Install Strivr Cards
            </button>
          )}
          <ol className="steps">
            <li><span className="n">1</span><span className="grow">Open your browser menu</span><MenuDotsIcon size={22} /></li>
            <li><span className="n">2</span><span className="grow">Tap <b>Install app</b> or <b>Add to Home screen</b></span><AddSquareIcon size={22} /></li>
            <li><span className="n">3</span><span className="grow">Confirm. Strivr Cards now opens like an app</span></li>
          </ol>
        </>
      )}

      <button className="btn btn-ghost" onClick={onClose}>Maybe later</button>
    </Sheet>
  );
}
