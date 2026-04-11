import amaraImage from "./profiles/amara.png";
import mateoImage from "./profiles/mateo.png";
import yukiImage from "./profiles/yuki.png";
import ariaImage from "./profiles/aria.png";
import arjunImage from "./profiles/arjun.png";
import sagaImage from "./profiles/saga.png";

const PROFILE_IMAGE_STORAGE_KEY = "scheduleAppProfileImages";

// Single mapping from username to avatar image asset.
export const profileImageByUsername: Record<string, string> = {
  amara: amaraImage,
  mateo: mateoImage,
  yuki: yukiImage,
  aria: ariaImage,
  arjun: arjunImage,
  saga: sagaImage,
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
  const custom = getStoredProfileImages()[username];
  return custom || profileImageByUsername[username];
}
