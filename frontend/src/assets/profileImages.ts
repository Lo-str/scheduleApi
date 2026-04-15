import adminImage from "./profiles/admin.jpg";

const PROFILE_IMAGE_STORAGE_KEY = "scheduleAppProfileImages";

// Single mapping from username to avatar image asset.
export const profileImageByUsername: Record<string, string> = {
  admin: adminImage,
};

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

export function setProfileImage(username: string, imageDataUrl: string): void {
  const current = getStoredProfileImages();
  current[username] = imageDataUrl;
  localStorage.setItem(PROFILE_IMAGE_STORAGE_KEY, JSON.stringify(current));
}

// Resolve profile image path for a given username.
export function getProfileImage(username: string): string | undefined {
  const normalized = username.toLowerCase();
  const localPart = normalized.includes("@")
    ? normalized.split("@")[0]
    : normalized;

  const stored = getStoredProfileImages();
  const custom = stored[normalized] || stored[localPart];
  return (
    custom ||
    profileImageByUsername[normalized] ||
    profileImageByUsername[localPart]
  );
}
