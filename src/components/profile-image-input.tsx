"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui";
import { prepareProfileImage } from "@/lib/image";

type Props = {
  file: File | null;
  preview: string | null;
  onChange: (file: File | null, preview: string | null) => void;
};

export function ProfileImageInput({ file, preview, onChange }: Props) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shown = preview;

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    event.target.value = "";
    if (!selected) return;

    setBusy(true);
    setError(null);

    try {
      const prepared = await prepareProfileImage(selected);
      onChange(prepared.file, prepared.preview);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "This photo could not be used.",
      );
    } finally {
      setBusy(false);
    }
  }

  function clear() {
    setError(null);
    onChange(null, null);
  }

  return (
    <div className="flex items-start gap-4">
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-canvas-2">
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shown}
            alt="Profile preview"
            className="h-full w-full object-cover"
          />
        ) : (
          <UserRound className="h-8 w-8 text-muted" strokeWidth={1.5} />
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => cameraInputRef.current?.click()}
            disabled={busy}
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Camera className="h-3.5 w-3.5" />
            )}
            {busy ? "Preparing…" : shown ? "Retake photo" : "Take photo"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => uploadInputRef.current?.click()}
            disabled={busy}
          >
            <ImagePlus className="h-3.5 w-3.5" />
            Upload
          </Button>
          {file ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clear}
              disabled={busy}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted">
          Use the camera or choose a JPG, PNG or WebP image from your device.
        </p>
        {error ? (
          <p className="text-xs font-medium text-warn">{error}</p>
        ) : null}
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="user"
        className="hidden"
        onChange={handleFile}
      />
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
