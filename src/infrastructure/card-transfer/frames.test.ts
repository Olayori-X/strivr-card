import assert from "node:assert";
import { FrameAssembler, buildPacket, parsePacket, makeFrames, crc32, CHUNK_BYTES, CardHeader } from "./frames";

function randomBytes(n: number) { const b = new Uint8Array(n); for (let i = 0; i < n; i++) b[i] = (i * 131 + 7) % 256; return b; }
function header(image: Uint8Array, name = "Jane Smith"): CardHeader { return { v: 1, name, mime: "image/webp", size: image.length, crc32: crc32(image) }; }
function shuffle<T>(a: T[]) { for (let i = a.length - 1; i > 0; i--) { const j = (i * 7919 + 13) % (i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// 1. round trip in order
{
  const image = randomBytes(20_000);
  const frames = makeFrames(buildPacket(header(image), image), "k7Qp2m");
  const asm = new FrameAssembler();
  let done: Uint8Array | null = null;
  for (const f of frames) { const r = asm.accept(f); if (r.status === "complete") done = r.packet; }
  assert(done);
  const { header: h, image: got } = parsePacket(done!);
  assert.strictEqual(h.name, "Jane Smith"); assert.deepStrictEqual(got, image);
  console.log("round trip ok:", frames.length, "frames, longest frame", Math.max(...frames.map((f) => f.length)), "chars");
}
// 2. shuffled, duplicated, with garbage and a frame from another transfer mixed in
{
  const image = randomBytes(15_000);
  const frames = makeFrames(buildPacket(header(image), image), "abcDEF");
  const noise = ["hello", "https://example.com", "S1~bad", "S1~abcDEF~99~3~AAAA", "S1~abcDEF~0~0~AAAA"];
  const mixed = shuffle([...frames, ...frames.slice(0, 5), ...noise]);
  const asm = new FrameAssembler(); let done: Uint8Array | null = null;
  for (const f of mixed) { const r = asm.accept(f); if (r.status === "complete") done = r.packet; }
  assert(done); assert.deepStrictEqual(parsePacket(done!).image, image);
  console.log("shuffled, duplicated and noisy stream ok");
}
// 3. damage is detected
{
  const image = randomBytes(5_000);
  const bad = buildPacket({ ...header(image), crc32: 123 }, image);
  assert.throws(() => parsePacket(bad), /damaged/);
  const wrongType = buildPacket({ ...header(image), mime: "image/svg+xml" as any }, image);
  assert.throws(() => parsePacket(wrongType), /Unsupported/);
  console.log("damage and wrong type rejected");
}
// 4. a new transfer replaces an unfinished one
{
  const a = randomBytes(6_000), b = randomBytes(7_000);
  const fa = makeFrames(buildPacket(header(a, "A"), a), "aaaaaa"), fb = makeFrames(buildPacket(header(b, "B"), b), "bbbbbb");
  const asm = new FrameAssembler(); asm.accept(fa[0]); asm.accept(fa[1]);
  let done: Uint8Array | null = null;
  for (const f of fb) { const r = asm.accept(f); if (r.status === "complete") done = r.packet; }
  assert(done); assert.strictEqual(parsePacket(done!).header.name, "B");
  console.log("new transfer replaces an unfinished one");
}
// 5. frame counts and transfer time at 8 and 4 frames per second
for (const kb of [8, 12, 20, 30, 45]) {
  const image = randomBytes(kb * 1024), packet = buildPacket(header(image), image), n = makeFrames(packet, "xxxxxx").length;
  console.log(`size ${kb} KB -> ${n} frames; one pass ${(n / 8).toFixed(1)} s at 8/s, ${(n / 4).toFixed(1)} s at 4/s`);
}
console.log("chunk bytes", CHUNK_BYTES);
