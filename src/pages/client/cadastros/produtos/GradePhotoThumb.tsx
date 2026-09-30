import { useEffect, useState } from "react";
import { api } from "../../../../services/api";

const cache = new Map<string, string>();

function useProductPhoto(productId: string, photoFileId: string | null, node: HTMLElement | null) {
  const [src, setSrc] = useState(() => cache.get(productId) || "");

  useEffect(() => {
    if (!photoFileId || cache.has(productId)) {
      if (cache.has(productId)) setSrc(cache.get(productId) || "");
      return;
    }
    if (!node) return;

    let cancelled = false;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        io.disconnect();
        api
          .get(`/clients/products/${productId}/photo`, { responseType: "blob" })
          .then(({ data }) => {
            if (cancelled || !(data instanceof Blob) || data.size === 0) return;
            const url = URL.createObjectURL(data);
            cache.set(productId, url);
            setSrc(url);
          })
          .catch(() => {});
      },
      { rootMargin: "120px" },
    );
    io.observe(node);
    return () => {
      cancelled = true;
      io.disconnect();
    };
  }, [photoFileId, productId, node]);

  return src;
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
  const [node, setNode] = useState<HTMLSpanElement | null>(null);
  const src = useProductPhoto(productId, photoFileId, node);

  return (
    <span className="loja-photo" ref={setNode}>
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
  const [node, setNode] = useState<HTMLButtonElement | null>(null);
  const src = useProductPhoto(productId, photoFileId, node);

  if (!photoFileId) return <span className="pdv-prod-grade-nophoto">&nbsp;</span>;

  return (
    <button
      ref={setNode}
      className="pdv-prod-grade-photo"
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onOpen();
      }}
      aria-label={`Foto ${name}`}
    >
      {src ? <img src={src} alt="" width={64} height={48} /> : <span className="pdv-prod-grade-ph" />}
    </button>
  );
}
