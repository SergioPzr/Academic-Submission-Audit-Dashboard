import { useRef, useState, type DragEvent } from "react";
import type { UploadState } from "../../hooks/useUploadDelivery";

interface UploadFormProps {
  disabled: boolean; // true cuando el countdown llegó a 0
  state: UploadState;
  progress: number;
  error: string | null;
  onFileSelected: (file: File) => void; // valida el archivo (lo hace el hook del padre)
  onSubmit: (file: File) => void;
  onCancel: () => void;
}

export function UploadForm({
  disabled,
  state,
  progress,
  error,
  onFileSelected,
  onSubmit,
  onCancel,
}: UploadFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File | undefined | null) {
    if (!file) return;
    setSelectedFile(file);
    onFileSelected(file);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    if (disabled) return;
    handleFile(e.dataTransfer.files?.[0]);
  }

  return (
    <div className="form-group">
      <label className="form-label">📎 Archivo de entrega *</label>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragActive ? "var(--indigo)" : "var(--border-mid)"}`,
          borderRadius: "var(--radius-lg)",
          padding: "24px 16px",
          textAlign: "center",
          cursor: disabled ? "not-allowed" : "pointer",
          background: dragActive ? "var(--indigo-light)" : "var(--surface-2)",
          opacity: disabled ? 0.6 : 1,
          transition: "all .15s",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          style={{ display: "none" }}
          disabled={disabled}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        {selectedFile ? (
          <div style={{ fontSize: 13.5, color: "var(--text-1)" }}>
            📄 {selectedFile.name}{" "}
            <span style={{ color: "var(--text-3)" }}>({(selectedFile.size / 1024 / 1024).toFixed(1)} MB)</span>
          </div>
        ) : (
          <div style={{ fontSize: 13.5, color: "var(--text-2)" }}>
            Arrastra tu archivo aquí o haz clic para seleccionarlo
          </div>
        )}
      </div>

      <div className="form-hint">Formatos permitidos: PDF, DOCX, PPTX, XLSX, ZIP. Máximo 50MB.</div>

      {error && <div className="form-error show">{error}</div>}

      {state === "uploading" && (
        <div style={{ marginTop: 10 }}>
          <div className="progress-bar-wrap">
            <div className="progress-bar" style={{ width: `${progress}%` }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ fontSize: 11.5, color: "var(--text-3)" }}>Subiendo… {progress}%</span>
            <button
              onClick={onCancel}
              style={{ fontSize: 11.5, color: "var(--red)", background: "none", border: "none", cursor: "pointer" }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <button
        className="btn-primary"
        style={{ marginTop: 14 }}
        disabled={disabled || !selectedFile || state === "uploading"}
        onClick={() => selectedFile && onSubmit(selectedFile)}
      >
        <span>📤</span> Enviar Entrega
      </button>
    </div>
  );
}
