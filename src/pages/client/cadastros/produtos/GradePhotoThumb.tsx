import { useEffect, useState } from "react";
import { api } from "../../../../services/api";

const cache = new Map<string, string>();
const pending = new Set<string>();
const listeners = new Set<() => void>();
let flushTimer = 0;

function notify() {
  listeners.forEach((listener) => listener());
}

function flushPhotoUrls() {
  flushTimer = 0;
  const fileIds = [...pending];
  pending.clear();
  if (!fileIds.length) return;
  api
    .post("/clients/products/photo-urls", { fileIds })
    .then(({ data }) => {
      const urls = (data?.urls || {}) as Record<string, string>;
      for (const fileId of fileIds) {
        if (urls[fileId]) cache.set(fileId, urls[fileId]);
      }
      notify();
    })
    .catch(() => {
      notify();
    });
}

export function useProductPhotoUrl(photoFileId?: string | null) {
  const fileId = photoFileId || "";
  const [, bump] = useState(0);

  useEffect(() => {
    const listener = () => bump((value) => value + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (!fileId || cache.has(fileId)) return;
    pending.add(fileId);
    if (!flushTimer) flushTimer = window.setTimeout(flushPhotoUrls, 30);
  }, [fileId]);

  return fileId ? cache.get(fileId) || "" : "";
}

export function cachedProductPhoto(productId: string, photoFileId?: string | null) {
  if (photoFileId && cache.has(photoFileId)) return cache.get(photoFileId) || "";
  return cache.get(productId) || "";
}

export function ProductPhoto({
  photoFileId,
  name,
}: {
  productId: string;
  photoFileId: string | null;
  name: string;
}) {
  const src = useProductPhotoUrl(photoFileId);

  return (
    <span className="loja-photo">
      {src ? <img src={src} alt={name} decoding="async" /> : <span className="loja-photo-empty" aria-hidden="true" />}
    </span>
  );
}

export default function GradePhotoThumb({
  photoFileId,
  name,
  onOpen,
}: {
  productId: string;
  photoFileId: string | null;
  name: string;
  onOpen: () => void;
}) {
  const src = useProductPhotoUrl(photoFileId);

  if (!photoFileId) return <span className="pdv-prod-grade-nophoto">&nbsp;</span>;

  return (
    <button
      className="pdv-prod-grade-photo"
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onOpen();
      }}
      aria-label={`Foto ${name}`}
    >
      {src ? <img src={src} alt="" width={64} height={48} decoding="async" /> : <span className="pdv-prod-grade-ph" />}
    </button>
  );
}
