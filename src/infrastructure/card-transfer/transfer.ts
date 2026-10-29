import { bytesToBlob, sanitizeName } from "@/lib/format";
import { buildPacket, crc32, makeFrames, parsePacket, type CardHeader } from "./frames";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";

function randomId(length = 6): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export interface PreparedTransfer {
  frames: string[];
  fileName: string;
}

/** Turns an optimised card image into the list of QR frame texts to show in a loop. */
export async function prepareTransfer(
  image: Blob,
  mime: CardHeader["mime"],
  ownerName: string
): Promise<PreparedTransfer> {
  const bytes = new Uint8Array(await image.arrayBuffer());
  const name = sanitizeName(ownerName).slice(0, 120);
  const header: CardHeader = { v: 1, name, mime, size: bytes.length, crc32: crc32(bytes) };
  const frames = makeFrames(buildPacket(header, bytes), randomId());
  const ext = mime === "image/webp" ? "webp" : mime === "image/jpeg" ? "jpg" : "png";
  return { frames, fileName: `${name}.${ext}` };
}

export function frameCountFor(imageBytes: number): number {
  return Math.ceil((imageBytes + 160) / 520);
}

export interface ReceivedCard {
  name: string;
  mime: string;
  blob: Blob;
}

/** Validates a finished packet (size, type and checksum) and returns the card. Throws if damaged. */
export function openPacket(packet: Uint8Array): ReceivedCard {
  const { header, image } = parsePacket(packet);
  return { name: header.name, mime: header.mime, blob: bytesToBlob(image, header.mime) };
}
