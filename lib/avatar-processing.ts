// Server-only: sharp is a native module and cannot be bundled for the browser.
import sharp from "sharp";

const AVATAR_DIMENSION = 512;
const AVATAR_QUALITY = 82;

/**
 * Re-encodes an uploaded image to a fixed-size WebP. Decoding doubles as the
 * content check: the browser-supplied MIME type is only a claim, while sharp
 * throws on anything that is not actually a decodable image.
 */
export async function normalizeAvatar(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize(AVATAR_DIMENSION, AVATAR_DIMENSION, {
      fit: "cover",
      position: "attention",
    })
    .webp({ quality: AVATAR_QUALITY })
    .toBuffer();
}
