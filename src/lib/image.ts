const MAX_INPUT_BYTES = 20 * 1024 * 1024;
const MAX_DIMENSION = 900;
const JPEG_QUALITY = 0.85;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("This image could not be read."));
    image.src = source;
  });
}

/**
 * Resize and re-encode a visitor photo before upload. This keeps mobile camera
 * photos small and gives every visitor record a consistent JPEG thumbnail.
 */
export async function prepareProfileImage(
  file: File,
): Promise<{ file: File; preview: string }> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Choose a JPG, PNG or WebP image.");
  }

  if (file.size > MAX_INPUT_BYTES) {
    throw new Error("Choose an image smaller than 20 MB.");
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);
    const scale = Math.min(
      1,
      MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight),
    );
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser cannot prepare images.");

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const preview = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY);
    });
    if (!blob) throw new Error("This image could not be prepared.");

    const baseName = file.name.replace(/\.[^.]+$/, "") || "visitor-photo";

    return {
      file: new File([blob], `${baseName}.jpg`, {
        type: "image/jpeg",
        lastModified: Date.now(),
      }),
      preview,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
