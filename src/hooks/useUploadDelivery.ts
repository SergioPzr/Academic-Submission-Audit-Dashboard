import { useCallback, useRef, useState } from "react";
import { uploadDelivery, type UploadResult } from "../services/uploadService";

export type UploadState = "idle" | "uploading" | "success" | "error";

const MAX_FILE_SIZE_MB = 50;
const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".zip", ".pptx", ".xlsx"]; // ajustar con el equipo

export function validateFile(file: File): string | null {
  const sizeMb = file.size / (1024 * 1024);
  if (sizeMb > MAX_FILE_SIZE_MB) return `El archivo supera el máximo de ${MAX_FILE_SIZE_MB}MB.`;
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return `Formato no permitido. Usa: ${ALLOWED_EXTENSIONS.join(", ")}.`;
  }
  return null;
}

export function useUploadDelivery() {
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const upload = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setState("error");
      setError(validationError);
      return;
    }

    setState("uploading");
    setError(null);
    setProgress(0);
    abortRef.current = new AbortController();

    try {
      const res = await uploadDelivery(file, {
        onProgress: setProgress,
        signal: abortRef.current.signal,
      });
      setResult(res);
      setState("success");
    } catch (err) {
      if ((err as DOMException).name === "AbortError") {
        setState("idle");
        return;
      }
      setState("error");
      setError(err instanceof Error ? err.message : "Error al subir el archivo.");
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    setState("idle");
    setProgress(0);
    setError(null);
    setResult(null);
  }, []);

  return { state, progress, error, result, upload, cancel, reset };
}
