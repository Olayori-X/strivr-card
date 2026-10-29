"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { baseName, extForMime, sanitizeName, uniqueFileName } from "@/lib/format";
import { convertToPng, DEFAULT_PROFILE, type Profile } from "@/lib/image";
import { kvDel, kvGet, kvSet } from "@/infrastructure/storage/idb";
import {
  FOLDER_NAME,
  FolderStore,
  PrivateStore,
  folderPermission,
  folderSupported,
  pickFolder,
  requestFolderPermission,
  type CardStore,
  type FsDirHandle,
  type StoreKind,
  type StoredCard,
} from "@/infrastructure/storage/card-store";

export type Access = "none" | "ok" | "needs-permission";
export interface CardItem extends StoredCard {
  url: string;
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    __strivrInstall?: Event | null;
  }
}

interface CardsContext {
  ready: boolean;
  mode: StoreKind | null;
  access: Access;
  cards: CardItem[];
  folderLabel: string;
  supportsFolder: boolean;
  profile: Profile;
  myCardImage: Blob | null;
  canInstall: boolean;
  isStandalone: boolean;
  chooseFolder(): Promise<void>;
  useBrowserStorage(kind: "private" | "gallery"): Promise<void>;
  reconnect(): Promise<boolean>;
  addImages(files: File[]): Promise<number>;
  resolveFileName(name: string, mime: string, ignoreId?: string): { fileName: string; duplicate: boolean };
  saveReceived(name: string, blob: Blob, mime: string): Promise<StoredCard>;
  renameCard(id: string, name: string): Promise<string>;
  removeCard(id: string): Promise<void>;
  setProfile(p: Profile): void;
  setMyCardImage(blob: Blob | null): Promise<void>;
  promptInstall(): Promise<boolean>;
  toast(message: string): void;
}

const Ctx = createContext<CardsContext | null>(null);

export function useCards(): CardsContext {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCards must be used inside CardsProvider");
  return c;
}

const PROFILE_KEY = "strivr.profile";
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

export function CardsProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<StoreKind | null>(null);
  const [access, setAccess] = useState<Access>("none");
  const [cards, setCards] = useState<CardItem[]>([]);
  const [profile, setProfileState] = useState<Profile>(DEFAULT_PROFILE);
  const [myCardImage, setMyCardImageState] = useState<Blob | null>(null);
  const [deferredInstall, setDeferredInstall] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const storeRef = useRef<CardStore | null>(null);
  const handleRef = useRef<FsDirHandle | null>(null);
  const urlsRef = useRef<string[]>([]);
  const toastTimer = useRef<number | undefined>(undefined);
  const modeRef = useRef<StoreKind | null>(null);
  const accessRef = useRef<Access>("none");
  const cardsRef = useRef<CardItem[]>([]);
  const [supportsFolder, setSupportsFolder] = useState(false);

  // Actions read these refs so they stay correct right after a storage switch, before React re-renders.
  const applyMode = useCallback((m: StoreKind | null) => {
    modeRef.current = m;
    setMode(m);
  }, []);
  const applyAccess = useCallback((a: Access) => {
    accessRef.current = a;
    setAccess(a);
  }, []);

  const toast = useCallback((message: string) => {
    setToastMessage(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMessage(null), 2600);
  }, []);

  const loadFrom = useCallback(async (store: CardStore) => {
    const list = await store.list();
    list.sort((a, b) => b.savedAt - a.savedAt);
    urlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    const items = list.map((c) => ({ ...c, url: URL.createObjectURL(c.blob) }));
    urlsRef.current = items.map((i) => i.url);
    cardsRef.current = items;
    setCards(items);
  }, []);

  /* ------------------------------ first load ------------------------------ */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const saved = localStorage.getItem(PROFILE_KEY);
        if (saved) setProfileState({ ...DEFAULT_PROFILE, ...JSON.parse(saved) });
      } catch {
        /* ignore a bad saved profile */
      }
      try {
        const img = await kvGet<Blob>("myCard");
        if (alive && img) setMyCardImageState(img);
      } catch {
        /* ignore */
      }
      try {
        const saved = await kvGet<StoreKind>("mode");
        if (saved === "folder") {
          const handle = await kvGet<FsDirHandle>("dirHandle");
          if (handle) {
            handleRef.current = handle;
            applyMode("folder");
            const perm = await folderPermission(handle);
            if (perm === "granted") {
              storeRef.current = new FolderStore(handle);
              try {
                await loadFrom(storeRef.current);
                applyAccess("ok");
              } catch {
                applyAccess("needs-permission"); // the folder moved or was deleted
              }
            } else {
              applyAccess("needs-permission");
            }
          }
        } else if (saved === "private" || saved === "gallery") {
          applyMode(saved);
          storeRef.current = new PrivateStore();
          await loadFrom(storeRef.current);
          applyAccess("ok");
        }
      } catch {
        /* storage unavailable: the folder screen will explain */
      }
      if (alive) setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [loadFrom, applyMode, applyAccess]);

  /* ------------------------------ install prompt ------------------------------ */
  useEffect(() => {
    setSupportsFolder(folderSupported());
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);
    if (window.__strivrInstall) setDeferredInstall(window.__strivrInstall as BeforeInstallPromptEvent);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredInstall(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferredInstall(null);
      setIsStandalone(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  /* ------------------------------ storage actions ------------------------------ */
  const chooseFolder = useCallback(async () => {
    const handle = await pickFolder(); // throws AbortError if the person cancels
    handleRef.current = handle;
    await kvSet("dirHandle", handle);
    await kvSet("mode", "folder");
    storeRef.current = new FolderStore(handle);
    applyMode("folder");
    applyAccess("ok");
    await loadFrom(storeRef.current);
  }, [loadFrom, applyMode, applyAccess]);

  const useBrowserStorage = useCallback(
    async (kind: "private" | "gallery") => {
      await kvSet("mode", kind);
      storeRef.current = new PrivateStore();
      applyMode(kind);
      applyAccess("ok");
      await loadFrom(storeRef.current);
    },
    [loadFrom, applyMode, applyAccess]
  );

  const reconnect = useCallback(async (): Promise<boolean> => {
    const handle = handleRef.current;
    if (!handle) return false;
    try {
      const perm = await requestFolderPermission(handle);
      if (perm !== "granted") return false;
      storeRef.current = new FolderStore(handle);
      await loadFrom(storeRef.current);
      applyAccess("ok");
      return true;
    } catch {
      return false;
    }
  }, [loadFrom, applyAccess]);

  const ensureStore = useCallback(async (): Promise<CardStore> => {
    if (storeRef.current && accessRef.current === "ok") return storeRef.current;
    if (modeRef.current === "folder" && (await reconnect()) && storeRef.current) return storeRef.current;
    throw new Error("Your card folder is not connected.");
  }, [reconnect]);

  /* ------------------------------ card actions ------------------------------ */
  const resolveIn = useCallback((list: CardItem[], name: string, mime: string, ignoreId?: string) => {
    const base = sanitizeName(name);
    const ext = extForMime(mime);
    // Any card with the same name counts as taken, whatever its image type.
    const taken = list.filter((c) => c.id !== ignoreId).map((c) => `${c.name}.${ext}`);
    const fileName = uniqueFileName(base, ext, taken);
    return { fileName, duplicate: fileName !== `${base}.${ext}` };
  }, []);

  const resolveFileName = useCallback(
    (name: string, mime: string, ignoreId?: string) => resolveIn(cards, name, mime, ignoreId),
    [cards, resolveIn]
  );

  const saveReceived = useCallback(
    async (name: string, blob: Blob, mime: string) => {
      const store = await ensureStore();
      const { fileName } = resolveIn(cardsRef.current, name, mime);
      const saved = await store.save(fileName, blob);
      await loadFrom(store);
      return saved;
    },
    [ensureStore, resolveIn, loadFrom]
  );

  const addImages = useCallback(
    async (files: File[]): Promise<number> => {
      const store = await ensureStore();
      const taken = cardsRef.current.map((c) => c.name);
      let added = 0;
      for (const file of files) {
        if (!file.type.startsWith("image/")) continue;
        let blob: Blob = file;
        let mime = file.type;
        if (!IMAGE_TYPES.includes(mime)) {
          blob = await convertToPng(file);
          mime = "image/png";
        }
        const base = sanitizeName(baseName(file.name));
        const ext = extForMime(mime);
        const fileName = uniqueFileName(base, ext, taken.map((n) => `${n}.${ext}`));
        await store.save(fileName, blob.type === mime ? blob : new Blob([blob], { type: mime }));
        taken.push(baseName(fileName));
        added++;
      }
      if (added > 0) await loadFrom(store);
      return added;
    },
    [ensureStore, loadFrom]
  );

  const renameCard = useCallback(
    async (id: string, name: string): Promise<string> => {
      const card = cardsRef.current.find((c) => c.id === id);
      if (!card) throw new Error("Card not found");
      const base = sanitizeName(name);
      if (base.toLowerCase() === card.name.toLowerCase()) return id;
      const store = await ensureStore();
      const { fileName } = resolveIn(cardsRef.current, base, card.mime, id);
      await store.save(fileName, card.blob);
      await store.remove(id);
      await loadFrom(store);
      return fileName;
    },
    [ensureStore, resolveIn, loadFrom]
  );

  const removeCard = useCallback(
    async (id: string) => {
      const store = await ensureStore();
      await store.remove(id);
      await loadFrom(store);
    },
    [ensureStore, loadFrom]
  );

  /* ------------------------------ profile and my card ------------------------------ */
  const setProfile = useCallback((p: Profile) => {
    setProfileState(p);
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    } catch {
      /* storage full or blocked: keep it in memory */
    }
  }, []);

  const setMyCardImage = useCallback(async (blob: Blob | null) => {
    setMyCardImageState(blob);
    if (blob) await kvSet("myCard", blob);
    else await kvDel("myCard");
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredInstall) return false;
    await deferredInstall.prompt();
    const choice = await deferredInstall.userChoice;
    setDeferredInstall(null);
    return choice.outcome === "accepted";
  }, [deferredInstall]);

  const value = useMemo<CardsContext>(
    () => ({
      ready,
      mode,
      access,
      cards,
      folderLabel: FOLDER_NAME,
      supportsFolder,
      profile,
      myCardImage,
      canInstall: deferredInstall !== null,
      isStandalone,
      chooseFolder,
      useBrowserStorage,
      reconnect,
      addImages,
      resolveFileName,
      saveReceived,
      renameCard,
      removeCard,
      setProfile,
      setMyCardImage,
      promptInstall,
      toast,
    }),
    [
      ready, mode, access, cards, profile, myCardImage, deferredInstall, isStandalone, supportsFolder,
      chooseFolder, useBrowserStorage, reconnect, addImages, resolveFileName, saveReceived,
      renameCard, removeCard, setProfile, setMyCardImage, promptInstall, toast,
    ]
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {toastMessage && (
        <div className="toast" role="status">
          {toastMessage}
        </div>
      )}
    </Ctx.Provider>
  );
}
