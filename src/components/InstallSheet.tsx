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

/** Best-effort: names the app when the page is open inside another app's built-in browser. */
function inAppBrowser(): string | null {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;
  if (/LinkedInApp/i.test(ua)) return "LinkedIn";
  if (/Twitter/i.test(ua)) return "X";
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return "Facebook";
  if (/Instagram/i.test(ua)) return "Instagram";
  if (/WhatsApp/i.test(ua)) return "WhatsApp";
  if (/MicroMessenger/i.test(ua)) return "WeChat";
  if (/; wv\)/.test(ua)) return "this app"; // Android WebView
  return null;
}

export function InstallSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { canInstall, promptInstall, toast } = useCards();
  const [tab, setTab] = useState<"android" | "iphone">("android");
  const [inApp, setInApp] = useState<string | null>(null);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast("Link copied. Paste it into your browser.");
    } catch {
      toast("Could not copy. Copy the link from the address bar instead.");
    }
  };

  useEffect(() => {
    if (open) {
      setTab(isIphone() ? "iphone" : "android");
      setInApp(inAppBrowser());
    }
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

      {inApp && (
        <div className="note-box">
          <p>
            You are viewing this inside {inApp}. Phones cannot add apps to the home screen from here. Open the
            page in <b>{tab === "iphone" ? "Safari" : "Chrome"}</b> first (menu, then <b>Open in browser</b>), or copy
            the link.
          </p>
          <button className="btn btn-ghost btn-sm" onClick={copyLink}>Copy link</button>
        </div>
      )}

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
          {!canInstall && !inApp && (
            <div className="note-box">
              <p>
                Your browser has not offered a one-tap install. Use the steps below. If you do not see them, open this
                page in <b>Chrome</b> (Samsung Internet and Firefox also work).
              </p>
              <button className="btn btn-ghost btn-sm" onClick={copyLink}>Copy link</button>
            </div>
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
