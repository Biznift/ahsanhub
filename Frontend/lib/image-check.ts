"use client";

const MB = 1024 * 1024;

export type ImageRule = { maxBytes: number; check: (width: number, height: number) => string | null };

export const IMAGE_RULES = {
  logo: {
    maxBytes: 2 * MB,
    check: (width, height) =>
      Math.abs(width - height) > Math.max(width, height) * 0.02 ? `Logo must be square. This one is ${width} × ${height}.` : width < 128 ? "Logo must be at least 128 × 128." : null,
  },
  banner: {
    maxBytes: 5 * MB,
    check: (width, height) =>
      Math.abs(width / height - 16 / 9) > 0.03 ? `Banner must be 16:9 landscape, for example 1600 × 900. This one is ${width} × ${height}.` : width < 1280 ? "Banner must be at least 1280 px wide." : null,
  },
  founder: {
    maxBytes: 2 * MB,
    check: (width, height) => (Math.min(width, height) < 128 ? "Photo must be at least 128 px on each side." : null),
  },
} satisfies Record<string, ImageRule>;

/** Same checks the server runs, so people see the problem before uploading. */
export function checkImage(file: File, rule: ImageRule): Promise<string | null> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return Promise.resolve("Use a PNG, JPG or WebP image.");
  if (file.size > rule.maxBytes) return Promise.resolve(`Image must be under ${rule.maxBytes / MB} MB.`);
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      resolve(rule.check(image.naturalWidth, image.naturalHeight));
      URL.revokeObjectURL(url);
    };
    image.onerror = () => {
      resolve("That file could not be read as an image.");
      URL.revokeObjectURL(url);
    };
    image.src = url;
  });
}
