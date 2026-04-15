import adminImage from "./profiles/admin.jpg";
import { getStore } from "../lib/store-core";

const PROFILE_IMAGE_STORAGE_KEY = "scheduleAppProfileImages";

// Single mapping from username to avatar image asset.
export const profileImageByUsername: Record<string, string> = {
  admin: adminImage,
};

function normalizeProfileKey(value: string): string {
  return value.trim().toLowerCase();
}

function slugifyProfileKey(value: string): string {
  return normalizeProfileKey(value).replace(/[^a-z0-9]+/g, "");
}

function expandProfileKeys(value: string): string[] {
  const normalized = normalizeProfileKey(value);
  if (!normalized) return [];

  const keys = new Set<string>();
  const addKey = (candidate: string): void => {
    const key = normalizeProfileKey(candidate);
    if (!key) return;
    keys.add(key);
    if (key.includes("@")) {
      keys.add(key.split("@")[0]);
    }
    const slug = slugifyProfileKey(key);
    if (slug) keys.add(slug);
  };

  addKey(normalized);
  if (normalized.includes("@")) {
    addKey(normalized.split("@")[0]);
  }

  const store = getStore();
  const storeEntries = [...store.users, ...store.employees];
  for (const entry of storeEntries) {
    const aliases = [entry.username, entry.email, entry.name];
    const matches = aliases.some((alias) => {
      const aliasKey = normalizeProfileKey(alias || "");
      if (!aliasKey) return false;
      const aliasLocal = aliasKey.includes("@")
        ? aliasKey.split("@")[0]
        : aliasKey;
      const aliasSlug = slugifyProfileKey(aliasLocal);
      return (
        aliasKey === normalized ||
        aliasLocal === normalized ||
        aliasSlug === normalized ||
        aliasKey === slugifyProfileKey(normalized)
      );
    });

    if (matches) {
      addKey(entry.username);
      addKey(entry.email);
      addKey(entry.name);
    }
  }

  return [...keys];
}

function getStoredProfileImages(): Record<string, string> {
  const raw = localStorage.getItem(PROFILE_IMAGE_STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, string] => {
        return typeof entry[1] === "string";
      }),
    );
  } catch {
    return {};
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === "string" ? reader.result : "");
    };
    reader.onerror = () => {
      reject(new Error("Could not read image file"));
    };
    reader.readAsDataURL(file);
  });
}

function downscaleImageDataUrl(
  dataUrl: string,
  maxSize = 256,
  quality = 0.82,
): Promise<string> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const longestSide = Math.max(image.width, image.height) || 1;
      const scale = Math.min(1, maxSize / longestSide);
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");
      if (!context) {
        resolve(dataUrl);
        return;
      }

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    image.onerror = () => resolve(dataUrl);
    image.src = dataUrl;
  });
}

export async function prepareProfileImage(file: File): Promise<string> {
  const dataUrl = await readFileAsDataUrl(file);
  return downscaleImageDataUrl(dataUrl);
}

export function setProfileImage(username: string, imageDataUrl: string): void {
  const current = getStoredProfileImages();

  for (const key of expandProfileKeys(username)) {
    current[key] = imageDataUrl;
  }

  try {
    localStorage.setItem(PROFILE_IMAGE_STORAGE_KEY, JSON.stringify(current));
  } catch (error) {
    console.warn("Could not store profile image in localStorage:", error);
  }
}

// Resolve profile image path for a given username.
export function getProfileImage(username: string): string | undefined {
  const keys = expandProfileKeys(username);

  const stored = getStoredProfileImages();
  for (const key of keys) {
    const custom = stored[key];
    if (custom) return custom;

    const asset = profileImageByUsername[key];
    if (asset) return asset;
  }

  return undefined;
}
