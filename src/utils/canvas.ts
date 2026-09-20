export function createCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  return [canvas, ctx];
}

export function canvasToDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png');
}

export function getImageData(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): ImageData {
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

export function dataUrlToImageData(
  dataUrl: string,
  targetWidth: number,
  targetHeight: number,
): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const [, ctx] = createCanvas(targetWidth, targetHeight);
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      resolve(ctx.getImageData(0, 0, targetWidth, targetHeight));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

export function normaliseImageToSize(
  dataUrl: string,
  targetWidth: number,
  targetHeight: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const [canvas, ctx] = createCanvas(targetWidth, targetHeight);
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      resolve(canvasToDataUrl(canvas));
    };
    img.onerror = () => reject(new Error('Failed to normalise image'));
    img.src = dataUrl;
  });
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function copyImageToClipboard(dataUrl: string): Promise<boolean> {
  if (!navigator.clipboard?.write) return false;
  try {
    const resp = await fetch(dataUrl);
    const blob = await resp.blob();
    await navigator.clipboard.write([
      new ClipboardItem({ [blob.type]: blob }),
    ]);
    return true;
  } catch {
    return false;
  }
}
