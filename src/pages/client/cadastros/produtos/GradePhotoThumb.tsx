import { useEffect, useRef, useState } from "react";
import { api } from "../../../../services/api";

const cache = new Map<string, string>();

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
  const [src, setSrc] = useState(() => cache.get(productId) || "");
  const cellRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!photoFileId || cache.has(productId)) {
      if (cache.has(productId)) setSrc(cache.get(productId) || "");
      return;
    }
    const node = cellRef.current;
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
      { rootMargin: "80px" },
    );
    io.observe(node);
    return () => {
      cancelled = true;
      io.disconnect();
    };
  }, [photoFileId, productId]);

  if (!photoFileId) return <span className="pdv-prod-grade-nophoto">&nbsp;</span>;

  return (
    <button
      ref={cellRef}
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
