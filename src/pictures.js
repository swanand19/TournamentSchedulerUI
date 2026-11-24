import { API_BASE } from "./api/apiBase";

// Pictures (HLD P-26): profile photos, a tournament's logo and banner.
//
// Putting one in: the browser crops the chosen file to its shape (the middle of it), shrinks it (a
// photo 512 px square, a banner 1280 × 720) and re-saves it as JPEG on a canvas — which also drops
// the photo's location data — before it goes, sealed like every request, through api.call.
//
// Showing one: answers carry a signed link that lasts a day or two, relative to the API
// ("pictures/<id>?e=…&s=…"); an <img> loads it straight from the server, outside the gateway.

const SHAPES = {
  square: { ratio: 1, width: 512 },
  banner: { ratio: 16 / 9, width: 1280 },
};

/** The address an <img> loads a picture link from, or null when there's no picture. */
export function pictureSrc(link) {
  return link ? `${API_BASE}/${link}` : null;
}

/** Reads a chosen file and answers it cropped, shrunk and re-saved as base64 JPEG (no "data:" prefix). */
export async function preparePicture(file, shape) {
  if (!file || !file.type.startsWith("image/")) throw new Error("That file isn't a picture. Choose a JPEG or PNG photo.");
  const { ratio, width: maxWidth } = SHAPES[shape];
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("That picture couldn't be opened. Choose a JPEG or PNG photo.");
  });
  // The largest centred rectangle of the right shape, never enlarged.
  const cropWidth = Math.min(bitmap.width, Math.round(bitmap.height * ratio));
  const cropHeight = Math.round(cropWidth / ratio);
  const width = Math.min(maxWidth, cropWidth);
  const height = Math.round(width / ratio);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").drawImage(
    bitmap,
    Math.floor((bitmap.width - cropWidth) / 2), Math.floor((bitmap.height - cropHeight) / 2), cropWidth, cropHeight,
    0, 0, width, height,
  );
  bitmap.close?.();
  const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
  return dataUrl.slice(dataUrl.indexOf(",") + 1);
}
