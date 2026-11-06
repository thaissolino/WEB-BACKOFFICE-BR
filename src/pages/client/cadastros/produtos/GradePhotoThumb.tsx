import { useEffect, useState } from "react";
import { api } from "../../../../services/api";

const cache = new Map<string, string>();
const pending = new Set<string>();
const listeners = new Set<() => void>();
let flushTimer = 0;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Endereço direto da foto, para a imagem já estar no lugar quando a lista abre. */
export function urlFotoProduto(productId?: string | null, photoFileId?: string | null) {
  if (!productId || !photoFileId || !UUID.test(productId)) return "";
  const base = String(process.env.REACT_APP_API_URL || "").replace(/\/$/, "");
  if (!base) return "";
  return `${base}/public/produto-foto/${productId}?v=${encodeURIComponent(photoFileId)}`;
}

function notify() {
  listeners.forEach((listener) => listener());
}

function flushPhotoUrls() {
  flushTimer = 0;
  const fileIds = [...pending];
  pending.clear();
  if (!fileIds.length) return;
  const lotes: string[][] = [];
  for (let i = 0; i < fileIds.length; i += 80) lotes.push(fileIds.slice(i, i + 80));
  Promise.all(
    lotes.map((lote) =>
      api
        .post("/clients/products/photo-urls", { fileIds: lote })
        .then(({ data }) => {
          const urls = (data?.urls || {}) as Record<string, string>;
          for (const fileId of lote) {
            if (urls[fileId]) cache.set(fileId, urls[fileId]);
          }
        })
        .catch(() => undefined),
    ),
  ).finally(notify);
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
  productId,
  photoFileId,
  name,
}: {
  productId: string;
  photoFileId: string | null;
  name: string;
}) {
  const direta = urlFotoProduto(productId, photoFileId);
  const assinada = useProductPhotoUrl(direta ? null : photoFileId);
  const src = direta || assinada;

  return (
    <span className="loja-photo">
      {src ? <img src={src} alt={name} /> : <span className="loja-photo-empty" aria-hidden="true" />}
    </span>
  );
}

export default function GradePhotoThumb({
  productId,
  photoFileId,
  name,
  onOpen,
}: {
  productId: string;
  photoFileId: string | null;
  name: string;
  onOpen: () => void;
}) {
  const direta = urlFotoProduto(productId, photoFileId);
  const assinada = useProductPhotoUrl(direta ? null : photoFileId);
  const src = direta || assinada;

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
      {src ? <img src={src} alt="" /> : <span className="pdv-prod-grade-ph" />}
    </button>
  );
}
