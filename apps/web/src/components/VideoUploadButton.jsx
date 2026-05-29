import { useEffect, useRef, useState } from 'react';
import { Film, Upload, X } from 'lucide-react';
import { VIDEO_MIME_ALLOWLIST_DEFAULT } from '@gospelviral/shared';
import { uploadVideo } from '../lib/upload.js';

const ACCEPT = [...VIDEO_MIME_ALLOWLIST_DEFAULT].join(',');
const GIB = 1024 * 1024 * 1024;
const STUCK_AFTER_MS = 4000;

/** Adaptive size: >= 1 GiB → GB, else MB, 1 decimal. */
function formatSize(bytes) {
  if (bytes >= GIB) return `${(bytes / GIB).toFixed(1)} GB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Compose the PT-BR error copy from the typed code + the attempted filename. */
function formatUploadError(code, filename) {
  switch (code) {
    case 'invalid_mime_type':
      return `${filename} não é suportado. Use MP4, MOV ou WebM.`;
    case 'file_too_large':
      return `${filename} é grande demais. Limite 2 GB.`;
    case 'network':
      return 'Falha de conexão com o servidor.';
    default:
      return 'Erro ao enviar o vídeo.';
  }
}

function PendingSurface({ progress, stuck }) {
  return (
    <div
      className="border-2 border-dashed border-stone-300 rounded-sm min-h-[160px] flex flex-col items-center justify-center gap-3 px-4 text-center"
      data-upload-state="pending"
    >
      {stuck ? (
        <p
          className="text-sm text-stone-600"
          style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
        >
          Enviando vídeo, pode levar alguns minutos…
        </p>
      ) : (
        <>
          <p
            className="text-sm text-stone-700"
            style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
          >
            Enviando… {Math.round(progress * 100)}%
          </p>
          <div className="w-full max-w-xs h-1.5 bg-stone-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-stone-900 transition-[width] duration-150"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        </>
      )}
    </div>
  );
}

function FilledLine({ videoSource, onChange }) {
  return (
    <div
      className="flex items-center gap-2 text-xs text-stone-700 py-1"
      data-upload-state="filled"
      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
    >
      <Film size={13} className="text-stone-500 shrink-0" />
      <span className="truncate" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
        {videoSource.filename}
      </span>
      <span className="text-stone-400">·</span>
      <span className="tabular-nums text-stone-500 shrink-0">
        {formatSize(videoSource.sizeBytes)}
      </span>
      <button
        onClick={() => onChange(null)}
        className="ml-auto inline-flex items-center gap-1 text-[11px] uppercase tracking-wide underline underline-offset-2 text-stone-500 hover:text-stone-900 shrink-0"
      >
        <X size={11} /> Remover
      </button>
    </div>
  );
}

function EmptyZone({ accept, error, inputRef, onPick, onDrop }) {
  return (
    <div>
      <label
        data-upload-state="empty"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className="cursor-pointer border-2 border-dashed border-stone-300 hover:border-stone-900 hover:bg-stone-50 rounded-sm min-h-[160px] flex flex-col items-center justify-center gap-2 px-4 text-center transition-colors"
      >
        <Upload size={28} className="text-stone-400" />
        <span
          className="text-base font-medium text-stone-900"
          style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
        >
          Subir vídeo do trecho
        </span>
        <span
          className="text-xs text-stone-400"
          style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
        >
          ou arraste MP4 / MOV / WebM aqui · até 2 GB
        </span>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={onPick}
          className="hidden"
        />
      </label>
      {error && (
        <p
          className="mt-2 text-xs text-red-700"
          style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Controlled video-upload affordance with two visually distinct states:
 * EMPTY (action-first drop zone + CTA) and FILLED (one discrete line).
 *
 * @param {{
 *   videoSource: import('@gospelviral/shared').VideoSource | null,
 *   onChange: (vs: import('@gospelviral/shared').VideoSource | null) => void,
 *   uploadImpl?: typeof uploadVideo,
 * }} props
 */
export default function VideoUploadButton({ videoSource, onChange, uploadImpl = uploadVideo }) {
  const [progress, setProgress] = useState(null); // null = idle | 0..1 = pending
  const [error, setError] = useState(null);
  const [stuck, setStuck] = useState(false);
  const inputRef = useRef(null);
  const pending = progress !== null;

  // Stuck-progress fallback: if no progress advances past 0 within a few
  // seconds (lengthComputable false), swap the bar for reassuring text.
  useEffect(() => {
    if (!pending || progress > 0) {
      setStuck(false);
      return undefined;
    }
    const id = setTimeout(() => setStuck(true), STUCK_AFTER_MS);
    return () => clearTimeout(id);
  }, [pending, progress]);

  async function handleFile(file) {
    if (!file) return;
    setError(null);
    setProgress(0);
    try {
      const vs = await uploadImpl(file, { onProgress: setProgress });
      setProgress(null);
      onChange(vs);
    } catch (e) {
      setProgress(null);
      if (e?.name === 'AbortError') return;
      setError(formatUploadError(e?.code, file.name));
    }
  }

  function handlePick(e) {
    handleFile(e.target.files?.[0]);
  }

  function handleDrop(e) {
    e.preventDefault();
    handleFile(e.dataTransfer?.files?.[0]);
  }

  if (videoSource) {
    return <FilledLine videoSource={videoSource} onChange={onChange} />;
  }
  if (pending) {
    return <PendingSurface progress={progress} stuck={stuck} />;
  }
  return (
    <EmptyZone
      accept={ACCEPT}
      error={error}
      inputRef={inputRef}
      onPick={handlePick}
      onDrop={handleDrop}
    />
  );
}
