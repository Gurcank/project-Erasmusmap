// Server-only: sharp is a native module and cannot be bundled for the browser.
import sharp from "sharp";

const AVATAR_DIMENSION = 512;
const AVATAR_QUALITY = 82;

/**
 * Decoded-pixel ceiling. A compression bomb is small on the wire and enormous
 * in memory — a couple of hundred kilobytes of PNG can expand past a gigabyte,
 * which sharp's default limit (~268 megapixels) is far too generous to stop.
 * Nothing that becomes a 512px square needs more than this.
 */
const MAX_INPUT_PIXELS = 40_000_000;

/**
 * Re-encodes an uploaded image to a fixed-size WebP. Decoding doubles as the
 * content check: the browser-supplied MIME type is only a claim, while sharp
 * throws on anything that is not actually a decodable image.
 */
export async function normalizeAvatar(input: Buffer): Promise<Buffer> {
  return sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
    .rotate()
    .resize(AVATAR_DIMENSION, AVATAR_DIMENSION, {
      fit: "cover",
      position: "attention",
    })
    .webp({ quality: AVATAR_QUALITY })
    .toBuffer();
}
