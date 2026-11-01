"use client";

import { useEffect, useRef, useState } from "react";
import {
  Camera,
  CameraOff,
  ImagePlus,
  Loader2,
  RefreshCw,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui";
import { prepareProfileImage } from "@/lib/image";

type Props = {
  file: File | null;
  preview: string | null;
  onChange: (file: File | null, preview: string | null) => void;
};

function cameraErrorMessage(error: unknown) {
  if (error instanceof DOMException) {
    switch (error.name) {
      case "NotAllowedError":
      case "SecurityError":
        return "Camera access was blocked. Allow camera permission for this site, or use your device camera instead.";
      case "NotFoundError":
      case "OverconstrainedError":
        return "No camera was found. You can still upload a photo from your device.";
      case "NotReadableError":
        return "The camera is already being used by another app. Close it and try again.";
      default:
        break;
    }
  }
  return "The camera could not be started. You can still use your device camera instead.";
}

export function ProfileImageInput({ file, preview, onChange }: Props) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const shown = preview;

  useEffect(() => {
    if (!cameraOpen) return;

    const video = videoRef.current;
    let cancelled = false;

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError(
          "This browser cannot open a live camera. Use your device camera or upload a photo instead.",
        );
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 960 },
          },
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (video) {
          video.srcObject = stream;
          try {
            await video.play();
          } catch {
            // The autoplay attributes will retry once metadata is available.
          }
        }
        if (!cancelled) setCameraReady(true);
      } catch (err) {
        if (!cancelled) setCameraError(cameraErrorMessage(err));
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      const stream = streamRef.current;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (video) video.srcObject = null;
    };
  }, [cameraOpen, retryToken]);

  useEffect(() => {
    if (!cameraOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setCameraOpen(false);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [cameraOpen]);

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

  function openCamera() {
    setError(null);
    setCameraReady(false);
    setCameraError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      cameraInputRef.current?.click();
      return;
    }

    setCameraOpen(true);
  }

  function closeCamera() {
    setCameraOpen(false);
    setCameraReady(false);
    setCameraError(null);
  }

  function retryCamera() {
    setCameraReady(false);
    setCameraError(null);
    setRetryToken((token) => token + 1);
  }

  function useDeviceCamera() {
    closeCamera();
    cameraInputRef.current?.click();
  }

  async function capturePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraError("The camera is still starting. Try again in a moment.");
      return;
    }

    setBusy(true);
    setCameraError(null);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("This browser cannot capture photos.");

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      // The preview is mirrored like a mirror, so mirror the capture to match.
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", 0.9);
      });
      if (!blob) throw new Error("This photo could not be captured.");

      const captured = new File([blob], "camera-photo.jpg", {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
      const prepared = await prepareProfileImage(captured);
      onChange(prepared.file, prepared.preview);
      closeCamera();
    } catch (err) {
      setCameraError(
        err instanceof Error ? err.message : "This photo could not be captured.",
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
            onClick={openCamera}
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

      {cameraOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Take a profile photo"
          onClick={closeCamera}
        >
          <div
            className="w-full max-w-md rounded-xl border border-line bg-card p-4 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                  Profile photo
                </p>
                <h3 className="mt-0.5 text-lg font-bold text-navy">
                  Take a photo
                </h3>
              </div>
              <button
                type="button"
                onClick={closeCamera}
                aria-label="Close camera"
                className="rounded-md p-1 text-muted transition hover:bg-canvas-2 hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative overflow-hidden rounded-lg border border-line bg-navy">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="aspect-[4/3] w-full -scale-x-100 object-cover"
              />
              {!cameraReady && !cameraError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-navy/80 text-white">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <p className="text-sm font-medium">Starting camera…</p>
                </div>
              ) : null}
              {cameraError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-navy/90 px-6 text-center text-white">
                  <CameraOff className="h-7 w-7 text-white/70" />
                  <p className="text-sm font-medium">{cameraError}</p>
                </div>
              ) : null}
            </div>

            <p className="mt-2 text-xs text-muted">
              Position your face in the frame, then capture the photo.
            </p>

            {cameraError ? (
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={useDeviceCamera}
                >
                  Use device camera
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={retryCamera}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Try again
                </Button>
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={closeCamera}
                  disabled={busy}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={capturePhoto}
                  disabled={!cameraReady || busy}
                >
                  {busy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Camera className="h-3.5 w-3.5" />
                  )}
                  {busy ? "Saving…" : "Capture photo"}
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : null}

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
