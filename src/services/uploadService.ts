export interface UploadResult {
  url: string;
  hash: string;
}

export interface UploadOptions {
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

/**
 * MOCK de la subida. Simula progreso y devuelve una URL/hash falsos.
 *
 * Fase D — reemplazar el cuerpo de esta función por la llamada real:
 *
 *   export async function uploadDelivery(file: File, token: string, opts?: UploadOptions) {
 *     const formData = new FormData();
 *     formData.append("file", file); // confirmar con Escobar el nombre exacto del campo
 *
 *     const res = await fetch(import.meta.env.VITE_UPLOAD_ENDPOINT, {
 *       method: "POST",
 *       headers: { Authorization: `Bearer ${token}` },
 *       body: formData,
 *       signal: opts?.signal,
 *     });
 *
 *     if (!res.ok) {
 *       const errBody = await res.json().catch(() => null);
 *       throw new Error(errBody?.message ?? "Error al subir el archivo");
 *     }
 *     return res.json() as Promise<UploadResult>; // confirmar forma exacta de la respuesta
 *   }
 */
export async function uploadDelivery(file: File, opts?: UploadOptions): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10 + Math.random() * 15;
      if (opts?.signal?.aborted) {
        clearInterval(interval);
        reject(new DOMException("Subida cancelada", "AbortError"));
        return;
      }
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        opts?.onProgress?.(100);
        resolve({
          url: `https://drive.google.com/file/d/mock-${file.name}`,
          hash: "MOCK_SHA256_HASH",
        });
        return;
      }
      opts?.onProgress?.(Math.round(progress));
    }, 200);
  });
}
