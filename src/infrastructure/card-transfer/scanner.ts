import jsQR from "jsqr";

/**
 * Opens the back camera and reads QR codes from it as fast as it can.
 * Calls onText with the text of every code it sees (repeats included).
 * Returns a function that stops the camera.
 */
export async function startScanner(video: HTMLVideoElement, onText: (text: string) => void): Promise<() => void> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("This browser cannot open the camera.");
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  });

  let stopped = false;
  let timer: number | undefined;
  const stop = () => {
    stopped = true;
    if (timer !== undefined) window.clearTimeout(timer);
    stream.getTracks().forEach((t) => t.stop());
    if (video.srcObject === stream) video.srcObject = null;
  };

  video.srcObject = stream;
  video.setAttribute("playsinline", "true");
  video.muted = true;
  await video.play();
  if (stopped) return stop;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    stop();
    throw new Error("Canvas is not available");
  }

  const Detector = (window as unknown as { BarcodeDetector?: new (o: object) => { detect(v: HTMLVideoElement): Promise<{ rawValue: string }[]> } }).BarcodeDetector;
  const detector = Detector ? new Detector({ formats: ["qr_code"] }) : null;
  let busy = false;

  const tick = async () => {
    if (stopped) return;
    if (video.readyState >= 2 && video.videoWidth > 0 && !busy) {
      busy = true;
      try {
        if (detector) {
          const codes = await detector.detect(video);
          for (const c of codes) if (c.rawValue) onText(c.rawValue);
        } else {
          const scale = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight));
          const w = Math.round(video.videoWidth * scale);
          const h = Math.round(video.videoHeight * scale);
          if (canvas.width !== w) canvas.width = w;
          if (canvas.height !== h) canvas.height = h;
          ctx.drawImage(video, 0, 0, w, h);
          const img = ctx.getImageData(0, 0, w, h);
          const code = jsQR(img.data, w, h, { inversionAttempts: "dontInvert" });
          if (code && code.data) onText(code.data);
        }
      } catch {
        /* skip this frame */
      } finally {
        busy = false;
      }
    }
    if (!stopped) timer = window.setTimeout(tick, 30);
  };
  tick();
  return stop;
}
