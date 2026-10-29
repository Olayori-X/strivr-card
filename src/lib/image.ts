import { initials } from "./format";

export interface Profile {
  name: string;
  title: string;
  company: string;
  phone: string;
  email: string;
  theme: "navy" | "white";
}

export const DEFAULT_PROFILE: Profile = {
  name: "John Doe",
  title: "Founder",
  company: "Strivr",
  phone: "+234 800 000 0000",
  email: "name@example.com",
  theme: "white",
};

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxWidth) t = t.slice(0, -1);
  return t.trimEnd() + "…";
}

const CARD_FOOTER = "Made with Strivr Cards  ·  home.y-strivr.com";

const FONT = '-apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

/** Draws a simple business card from the person's details. 1000 x 572, the shape of a 3.5 x 2 inch card. */
export async function renderCardImage(p: Profile): Promise<Blob> {
  const W = 1000;
  const H = 572;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");

  const dark = p.theme === "navy";
  if (dark) {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#0A2A4D");
    g.addColorStop(1, "#0F74BA");
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = "#FFFFFF";
  }
  ctx.fillRect(0, 0, W, H);
  if (!dark) {
    ctx.strokeStyle = "#DCE6F1";
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, W - 4, H - 4);
  }

  // avatar with initials
  ctx.beginPath();
  ctx.arc(110, 120, 52, 0, Math.PI * 2);
  ctx.fillStyle = dark ? "rgba(255,255,255,0.22)" : "#0F74BA";
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `700 40px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(initials(p.name), 110, 122);

  // brand dot
  ctx.beginPath();
  ctx.arc(W - 70, 70, 14, 0, Math.PI * 2);
  ctx.fillStyle = "#00A9F4";
  ctx.fill();

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const ink = dark ? "#FFFFFF" : "#0B2545";
  const soft = dark ? "rgba(255,255,255,0.85)" : "#4A6078";
  const maxW = W - 120;

  ctx.fillStyle = ink;
  ctx.font = `700 70px ${FONT}`;
  ctx.fillText(fitText(ctx, p.name || "Your name", maxW), 60, 340);

  ctx.fillStyle = soft;
  ctx.font = `500 42px ${FONT}`;
  ctx.fillText(fitText(ctx, p.title, maxW), 60, 400);

  ctx.font = `400 32px ${FONT}`;
  const line1 = [p.company, p.phone].filter(Boolean).join("  |  ");
  ctx.fillText(fitText(ctx, line1, maxW), 60, 472);
  ctx.fillText(fitText(ctx, p.email, maxW), 60, 516);

  // Footer. The card is shrunk to ~480px wide before sending, so keep this large enough to stay readable.
  ctx.textAlign = "right";
  ctx.fillStyle = dark ? "rgba(255,255,255,0.7)" : "#7D90A8";
  ctx.font = `500 26px ${FONT}`;
  ctx.fillText(CARD_FOOTER, W - 60, 556);

  const blob = await canvasToBlob(canvas, "image/png");
  if (!blob) throw new Error("Could not draw the card");
  return blob;
}

/** Re-draws any image the browser can open (GIF, HEIC converted by the OS, SVG...) as a PNG. */
export async function convertToPng(src: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(src);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bmp.width;
    canvas.height = bmp.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available");
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bmp, 0, 0);
    const blob = await canvasToBlob(canvas, "image/png");
    if (!blob) throw new Error("Could not convert the image");
    return blob;
  } finally {
    bmp.close();
  }
}

export interface Optimised {
  blob: Blob;
  mime: "image/webp" | "image/jpeg";
}

const MAX_SENDABLE_BYTES = 60 * 1024; // the protocol allows 80 KB in total, header included

/**
 * Shrinks a card image so it crosses in a few seconds. Tries WebP first, then JPEG,
 * lowering quality and then size until it is under the target.
 */
export async function optimiseImage(src: Blob, targetBytes = 8 * 1024, maxWidth = 480): Promise<Optimised> {
  const bmp = await createImageBitmap(src);
  try {
    let width = Math.min(maxWidth, bmp.width);
    let best: Optimised | null = null;

    for (let round = 0; round < 6; round++) {
      const height = Math.max(1, Math.round((bmp.height * width) / bmp.width));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas is not available");
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(bmp, 0, 0, width, height);

      for (const mime of ["image/webp", "image/jpeg"] as const) {
        for (let q = 0.85; q >= 0.35; q -= 0.1) {
          const blob = await canvasToBlob(canvas, mime, q);
          if (!blob || blob.type !== mime) break; // this browser cannot encode this type
          if (!best || blob.size < best.blob.size) best = { blob, mime };
          if (blob.size <= targetBytes) return { blob, mime };
        }
      }
      width = Math.round(width * 0.85);
    }

    if (best && best.blob.size <= MAX_SENDABLE_BYTES) return best;
    throw new Error("This image is too detailed to send. Try a simpler picture.");
  } finally {
    bmp.close();
  }
}
