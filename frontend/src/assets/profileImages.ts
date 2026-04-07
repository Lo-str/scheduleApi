import amaraImage from "./profiles/amara.png";
import mateoImage from "./profiles/mateo.png";
import yukiImage from "./profiles/yuki.png";
import ariaImage from "./profiles/aria.png";
import arjunImage from "./profiles/arjun.png";
import sagaImage from "./profiles/saga.png";

// Single mapping from username to avatar image asset.
export const profileImageByUsername: Record<string, string> = {
  amara: amaraImage,
  mateo: mateoImage,
  yuki: yukiImage,
  aria: ariaImage,
  arjun: arjunImage,
  saga: sagaImage,
};

// Resolve profile image path for a given username.
export function getProfileImage(username: string): string | undefined {
  return profileImageByUsername[username];
}
