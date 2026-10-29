import type { StoredCard } from "@/infrastructure/storage/card-store";

export type ExportResult = "shared" | "downloaded" | "cancelled";

/**
 * Sends a card to the phone's gallery. Phones open the share sheet (with "Save Image");
 * desktop browsers download the file.
 */
export async function exportToGallery(card: StoredCard): Promise<ExportResult> {
  const file = new File([card.blob], card.fileName, { type: card.mime });
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: card.name });
      return "shared";
    } catch (e) {
      if ((e as Error).name === "AbortError") return "cancelled";
      // fall through to a normal download
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = card.fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return "downloaded";
}
