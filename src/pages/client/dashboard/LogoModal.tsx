import { ChangeEvent, useEffect, useState } from "react";
import { ImagePlus } from "lucide-react";
import { api, parseError } from "../../../services/api";
import PdvOverlayModal from "./PdvOverlayModal";

export default function LogoModal({
  open,
  storeKey,
  onClose,
  onSaved,
}: {
  open: boolean;
  storeKey: string;
  storeName?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState("");

  useEffect(() => {
    if (!open) return;
    setBusy(false);
    setError("");
    setOk("");
    setFile(null);
    setFilePreview("");
  }, [open]);

  useEffect(() => {
    if (!file) {
      setFilePreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setFilePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function onPick(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] ?? null;
    setError("");
    setOk("");
    setFile(next);
  }

  async function saveUpload() {
    if (!file) {
      setError("Selecione um arquivo PNG, JPG, WEBP, GIF ou SVG.");
      return;
    }
    setBusy(true);
    setError("");
    setOk("");
    try {
      const body = new FormData();
      body.append("file", file);
      await api.post("/clients/store-logo", body, { params: { storeKey } });
      setOk("Logo enviada para o armazenamento da loja.");
      onSaved();
      onClose();
    } catch (err) {
      const parsed = parseError(err);
      setError(parsed.friend || parsed.message || "Não foi possível enviar a logo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PdvOverlayModal
      open={open}
      title="Logo da loja"
      titleId="pdv-logo-title"
      size="form"
      icon={<ImagePlus size={18} strokeWidth={2.2} />}
      onClose={onClose}
      footer={
        <>
          {error ? (
            <p className="pdv-logo-msg" role="alert">
              {error}
            </p>
          ) : null}
          {ok ? (
            <p className="pdv-logo-msg" data-ok="true" role="status">
              {ok}
            </p>
          ) : null}
          <button
            className="pdv-logo-save"
            type="button"
            disabled={busy}
            style={{
              background: "#2e86c1",
              backgroundColor: "#2e86c1",
              color: "#fff",
              WebkitTextFillColor: "#fff",
            }}
            onClick={saveUpload}
          >
            {busy ? "Enviando…" : "Salvar"}
          </button>
        </>
      }
    >
      <div className="pdv-logo">
        <p className="pdv-logo-lede">Escolha a imagem da logo (PNG, JPG, WEBP, GIF ou SVG) e salve.</p>
        <div className="pdv-logo-pane">
          <label className="pdv-logo-file">
            <span>Arquivo da logo</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,.svg,.png,.jpg,.jpeg,.webp,.gif"
              onChange={onPick}
            />
          </label>
          <div className="pdv-logo-preview" aria-live="polite">
            {filePreview ? (
              <img src={filePreview} alt="Prévia da logo enviada" />
            ) : (
              <p>Nenhum arquivo selecionado.</p>
            )}
          </div>
        </div>
      </div>
    </PdvOverlayModal>
  );
}
