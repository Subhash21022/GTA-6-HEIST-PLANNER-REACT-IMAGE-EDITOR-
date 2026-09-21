/**
 * Client-side video recording utility using HTML5 Canvas captureStream and MediaRecorder.
 */

export function isVideoRecordingSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof HTMLCanvasElement !== 'undefined' &&
    'captureStream' in HTMLCanvasElement.prototype &&
    typeof MediaRecorder !== 'undefined'
  );
}

export function getSupportedMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return 'video/webm';
  const types = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) {
      return t;
    }
  }
  return 'video/webm';
}

export interface RecordOptions {
  durationMs?: number;
  fps?: number;
  onProgress?: (progress01: number) => void;
}

/**
 * Records an animated canvas for `durationMs` and resolves with the resulting video Blob.
 */
export function recordCanvasVideo(
  canvas: HTMLCanvasElement,
  options: RecordOptions = {},
): Promise<{ blob: Blob; mimeType: string }> {
  const { durationMs = 6000, fps = 30, onProgress } = options;

  return new Promise((resolve, reject) => {
    if (!isVideoRecordingSupported()) {
      reject(new Error('Video recording is not supported in this browser.'));
      return;
    }

    try {
      const mimeType = getSupportedMimeType();
      const stream = canvas.captureStream(fps);
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 3_500_000, // 3.5 Mbps for crisp high-def surveillance
      });

      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        // Stop stream tracks
        stream.getTracks().forEach((track) => track.stop());
        const finalBlob = new Blob(chunks, { type: mimeType });
        resolve({ blob: finalBlob, mimeType });
      };

      recorder.onerror = (err) => {
        stream.getTracks().forEach((track) => track.stop());
        reject(err);
      };

      recorder.start(100); // collect 100ms chunks

      const startTime = performance.now();
      const progressInterval = setInterval(() => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(1, elapsed / durationMs);
        if (onProgress) onProgress(progress);

        if (elapsed >= durationMs) {
          clearInterval(progressInterval);
          if (recorder.state !== 'inactive') {
            recorder.stop();
          }
        }
      }, 100);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Triggers a native browser download for a video blob.
 */
export function downloadVideoBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
