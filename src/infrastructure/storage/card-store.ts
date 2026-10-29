import { baseName, mimeForFileName } from "@/lib/format";
import { cardDelete, cardPut, cardsAll } from "./idb";

export type StoreKind = "folder" | "private" | "gallery";

export interface StoredCard {
  id: string; // the file name, unique inside the folder
  fileName: string;
  name: string; // file name without extension
  mime: string;
  size: number;
  savedAt: number;
  blob: Blob;
}

export interface CardStore {
  list(): Promise<StoredCard[]>;
  save(fileName: string, blob: Blob): Promise<StoredCard>;
  remove(id: string): Promise<void>;
}

export const FOLDER_NAME = "Strivr-card";

/* ------------------------------ private / gallery ------------------------------ */

/** Cards kept inside the browser's own storage. Works on every phone, including iPhone. */
export class PrivateStore implements CardStore {
  async list(): Promise<StoredCard[]> {
    const rows = await cardsAll();
    return rows.map((r) => ({
      id: r.id,
      fileName: r.fileName,
      name: baseName(r.fileName),
      mime: r.mime,
      size: r.size,
      savedAt: r.savedAt,
      blob: r.blob,
    }));
  }

  async save(fileName: string, blob: Blob): Promise<StoredCard> {
    const mime = blob.type || mimeForFileName(fileName) || "image/png";
    const rec = { id: fileName, fileName, mime, size: blob.size, savedAt: Date.now(), blob };
    await cardPut(rec);
    return { ...rec, name: baseName(fileName) };
  }

  async remove(id: string): Promise<void> {
    await cardDelete(id);
  }
}

/* ------------------------------------ folder ------------------------------------ */

// The File System Access API is not in every TypeScript DOM lib, so we describe the little we use.
interface FsFileHandle {
  kind: "file";
  name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<{ write(data: Blob): Promise<void>; close(): Promise<void> }>;
}
export interface FsDirHandle {
  kind: "directory";
  name: string;
  values(): AsyncIterable<FsFileHandle | FsDirHandle>;
  getFileHandle(name: string, opts?: { create?: boolean }): Promise<FsFileHandle>;
  getDirectoryHandle(name: string, opts?: { create?: boolean }): Promise<FsDirHandle>;
  removeEntry(name: string): Promise<void>;
  queryPermission?(d: { mode: "readwrite" }): Promise<PermissionState>;
  requestPermission?(d: { mode: "readwrite" }): Promise<PermissionState>;
}

export function folderSupported(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

/** Lets the person pick (or create) a folder. Cards live in a "Strivr-card" folder inside it. */
export async function pickFolder(): Promise<FsDirHandle> {
  const picker = (window as unknown as {
    showDirectoryPicker: (o: object) => Promise<FsDirHandle>;
  }).showDirectoryPicker;
  const chosen = await picker.call(window, { id: "strivr-cards", mode: "readwrite", startIn: "pictures" });
  if (chosen.name === FOLDER_NAME) return chosen;
  return chosen.getDirectoryHandle(FOLDER_NAME, { create: true });
}

export async function folderPermission(h: FsDirHandle): Promise<PermissionState> {
  if (!h.queryPermission) return "granted";
  return h.queryPermission({ mode: "readwrite" });
}

/** Must be called from a tap or click. */
export async function requestFolderPermission(h: FsDirHandle): Promise<PermissionState> {
  if (!h.requestPermission) return "granted";
  return h.requestPermission({ mode: "readwrite" });
}

export class FolderStore implements CardStore {
  constructor(private dir: FsDirHandle) {}

  async list(): Promise<StoredCard[]> {
    const out: StoredCard[] = [];
    for await (const entry of this.dir.values()) {
      if (entry.kind !== "file") continue;
      const mime = mimeForFileName(entry.name);
      if (!mime) continue;
      const file = await entry.getFile();
      out.push({
        id: entry.name,
        fileName: entry.name,
        name: baseName(entry.name),
        mime,
        size: file.size,
        savedAt: file.lastModified,
        blob: file,
      });
    }
    return out;
  }

  async save(fileName: string, blob: Blob): Promise<StoredCard> {
    const handle = await this.dir.getFileHandle(fileName, { create: true });
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
    const file = await handle.getFile();
    return {
      id: fileName,
      fileName,
      name: baseName(fileName),
      mime: mimeForFileName(fileName) ?? "image/png",
      size: file.size,
      savedAt: file.lastModified,
      blob: file,
    };
  }

  async remove(id: string): Promise<void> {
    await this.dir.removeEntry(id);
  }
}
