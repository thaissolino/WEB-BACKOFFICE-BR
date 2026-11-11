import { useEffect, useState } from "react";
import { api } from "../../../../services/api";

const cache = new Map<string, string>();

export function useCategoryCover(code: number, coverFileId: string | null) {
  const key = coverFileId ? `${code}:${coverFileId}` : "";
  const [src, setSrc] = useState(() => (key ? cache.get(key) || "" : ""));

  useEffect(() => {
    if (!key || !coverFileId) {
      setSrc("");
      return;
    }
    const saved = cache.get(key);
    if (saved) {
      setSrc(saved);
      return;
    }
    let cancelled = false;
    api
      .get(`/clients/catalog/product_category/${code}/cover`, { responseType: "blob" })
      .then(({ data }) => {
        if (cancelled || !(data instanceof Blob) || data.size === 0) return;
        const url = URL.createObjectURL(data);
        cache.set(key, url);
        setSrc(url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [code, coverFileId, key]);

  return src;
}

export function CategoryCoverThumb({
  code,
  coverFileId,
  empty = "Foto",
}: {
  code: number;
  coverFileId: string | null;
  empty?: string;
}) {
  const src = useCategoryCover(code, coverFileId);
  return (
    <span className="pdv-cat-cover-preview">
      {src ? <img src={src} alt="" /> : <span>{empty}</span>}
    </span>
  );
}

export function CategoryCoverImage({
  code,
  coverFileId,
  name,
}: {
  code: number;
  coverFileId: string | null;
  name: string;
}) {
  const src = useCategoryCover(code, coverFileId);
  return src ? <img src={src} alt={name} /> : <span className="loja-photo-empty" aria-hidden="true" />;
}
