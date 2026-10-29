export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function timeAgo(ts: number, now = Date.now()): string {
  const secs = Math.max(0, Math.round((now - ts) / 1000));
  if (secs < 60) return "Just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr`;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  if (ts >= today.getTime() - 86_400_000) return "Yesterday";
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function mimeLabel(mime: string): string {
  if (mime === "image/png") return "PNG image";
  if (mime === "image/jpeg") return "JPEG image";
  if (mime === "image/webp") return "WebP image";
  return "Image";
}

export function extForMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  return "png";
}

export function mimeForFileName(fileName: string): string | null {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  return null;
}

export function baseName(fileName: string): string {
  const i = fileName.lastIndexOf(".");
  return i > 0 ? fileName.slice(0, i) : fileName;
}

/** Makes a person's name safe to use as a file name. */
export function sanitizeName(raw: string): string {
  const cleaned = raw
    // eslint-disable-next-line no-control-regex
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "")
    .slice(0, 80)
    .trim();
  return cleaned || "Card";
}

/** "Jane Smith.png" -> "Jane Smith (2).png" when the name is taken. Comparison ignores case. */
export function uniqueFileName(base: string, ext: string, taken: string[]): string {
  const used = new Set(taken.map((t) => t.toLowerCase()));
  let candidate = `${base}.${ext}`;
  let n = 2;
  while (used.has(candidate.toLowerCase())) {
    candidate = `${base} (${n}).${ext}`;
    n++;
  }
  return candidate;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return (first + last).toUpperCase();
}

export function bytesToBlob(bytes: Uint8Array, mime: string): Blob {
  return new Blob([bytes.slice().buffer as ArrayBuffer], { type: mime });
}
