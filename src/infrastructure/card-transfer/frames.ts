// Strivr card transfer over a stream of QR codes. Pure functions, no browser APIs except btoa/atob.

export const FRAME_PREFIX = "S1";
export const CHUNK_BYTES = 520; // image bytes per frame, about 700 characters per QR code
export const MAX_PACKET_BYTES = 80 * 1024;
export const ALLOWED_MIME = ["image/webp", "image/jpeg", "image/png"] as const;

export interface CardHeader {
  v: 1;
  name: string; // the owner name the sender typed; becomes the file name
  mime: (typeof ALLOWED_MIME)[number];
  size: number; // image bytes
  crc32: number; // checksum of the image bytes
}

export function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64Url(text: string): Uint8Array {
  const padded = text.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((text.length + 3) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** packet = 2-byte header length (big endian) | UTF-8 JSON header | image bytes */
export function buildPacket(header: CardHeader, image: Uint8Array): Uint8Array {
  const head = new TextEncoder().encode(JSON.stringify(header));
  const out = new Uint8Array(2 + head.length + image.length);
  out[0] = head.length >> 8;
  out[1] = head.length & 0xff;
  out.set(head, 2);
  out.set(image, 2 + head.length);
  return out;
}

export function parsePacket(packet: Uint8Array): { header: CardHeader; image: Uint8Array } {
  if (packet.length < 3 || packet.length > MAX_PACKET_BYTES) throw new Error("Packet has an unexpected size");
  const headLen = (packet[0] << 8) | packet[1];
  if (headLen < 2 || 2 + headLen >= packet.length) throw new Error("Bad header length");
  const header = JSON.parse(new TextDecoder().decode(packet.subarray(2, 2 + headLen))) as CardHeader;
  const image = packet.subarray(2 + headLen);
  if (header.v !== 1 || typeof header.name !== "string" || header.name.length > 120) throw new Error("Bad header");
  if (!ALLOWED_MIME.includes(header.mime)) throw new Error("Unsupported image type");
  if (header.size !== image.length) throw new Error("Size does not match");
  if (header.crc32 !== crc32(image)) throw new Error("The card was damaged in transfer");
  return { header, image };
}

/** One text per QR code: S1~<id>~<index>~<total>~<base64url chunk> */
export function makeFrames(packet: Uint8Array, id: string): string[] {
  const total = Math.ceil(packet.length / CHUNK_BYTES);
  return Array.from({ length: total }, (_, i) =>
    [FRAME_PREFIX, id, i, total, toBase64Url(packet.subarray(i * CHUNK_BYTES, (i + 1) * CHUNK_BYTES))].join("~"));
}

export type AcceptResult =
  | { status: "ignored" }
  | { status: "progress"; received: number; total: number }
  | { status: "complete"; packet: Uint8Array };

const FRAME_RE = /^S1~([A-Za-z0-9_-]{6})~(\d{1,3})~(\d{1,3})~([A-Za-z0-9_-]*)$/;

/** Collects frames in any order, ignoring repeats and anything that is not a Strivr frame. */
export class FrameAssembler {
  private id = "";
  private total = 0;
  private parts = new Map<number, Uint8Array>();

  reset() {
    this.id = "";
    this.total = 0;
    this.parts.clear();
  }

  accept(text: string): AcceptResult {
    const m = FRAME_RE.exec(text);
    if (!m) return { status: "ignored" };
    const [, id, i, n, data] = m;
    const index = Number(i);
    const total = Number(n);
    if (total < 1 || total > Math.ceil(MAX_PACKET_BYTES / CHUNK_BYTES) || index >= total) return { status: "ignored" };
    if (id !== this.id) {
      this.reset();
      this.id = id;
      this.total = total;
    } else if (total !== this.total) {
      return { status: "ignored" };
    }
    if (!this.parts.has(index)) this.parts.set(index, fromBase64Url(data));
    if (this.parts.size < this.total) return { status: "progress", received: this.parts.size, total: this.total };

    const size = [...this.parts.values()].reduce((s, p) => s + p.length, 0);
    const packet = new Uint8Array(size);
    let offset = 0;
    for (let k = 0; k < this.total; k++) {
      const part = this.parts.get(k)!;
      packet.set(part, offset);
      offset += part.length;
    }
    return { status: "complete", packet };
  }
}
