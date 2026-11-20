const maxImageWidth = 768;
const jpegQuality = 0.70;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not decode the selected image."));
    };
    image.src = objectUrl;
  });
}

function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Could not compress the selected image."));
        return;
      }
      resolve(blob);
    }, "image/jpeg", jpegQuality);
  });
}

export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  const image = await loadImage(file);
  if (image.naturalWidth === 0 || image.naturalHeight === 0) {
    throw new Error("The selected image has invalid dimensions.");
  }

  // If already a small JPEG with width <= 768 and size under 120 KB, return as is
  if (file.type === "image/jpeg" && image.naturalWidth <= maxImageWidth && file.size <= 120 * 1024) {
    return file;
  }

  const scale = Math.min(1, maxImageWidth / image.naturalWidth);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare the image for compression.");
  context.drawImage(image, 0, 0, width, height);

  const blob = await canvasToJpeg(canvas);
  const name = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${name}.jpg`, { type: "image/jpeg", lastModified: file.lastModified });
}
