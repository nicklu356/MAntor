// Profile photos are shrunk in the browser to a 256 x 256 JPEG (about 20-40 KB) and stored in
// Firestore, so no file storage service (or paid plan) is needed.
export const AVATAR_SIZE = 256;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_AVATAR_CHARS = 150000; // the stored data URL (also checked by firestore.rules)

export function checkImageFile(file) {
  if (!file) return "Choose a photo.";
  if (!/^image\/(jpeg|png|webp|gif|heic|heif)$/.test(file.type)) return "Use a JPG, PNG or WebP photo.";
  if (file.size > MAX_UPLOAD_BYTES) return "That photo is over 10 MB. Choose a smaller one.";
  return "";
}

// Centre-crop to a square and shrink. Returns a "data:image/jpeg;base64,..." string.
export async function resizeToAvatar(file) {
  const problem = checkImageFile(file);
  if (problem) throw new Error(problem);
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("This photo could not be read. Try a JPG or PNG."));
      image.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff"; // transparent PNGs get a white background
    ctx.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
    ctx.drawImage(
      img,
      (img.naturalWidth - side) / 2,
      (img.naturalHeight - side) / 2,
      side,
      side,
      0,
      0,
      AVATAR_SIZE,
      AVATAR_SIZE
    );
    for (const quality of [0.85, 0.7, 0.5]) {
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      if (dataUrl.length <= MAX_AVATAR_CHARS) return dataUrl;
    }
    throw new Error("This photo is too detailed to store. Try another one.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const isAvatarDataUrl = (v) => typeof v === "string" && v.startsWith("data:image/jpeg;base64,") && v.length <= MAX_AVATAR_CHARS;
