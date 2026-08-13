import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { ImagePlus } from "lucide-react";
import { api, parseError } from "../../../services/api";
import PdvOverlayModal from "./PdvOverlayModal";
import { generateStoreLogoSvg, LOGO_STYLES, type LogoStyleId } from "./logoSvg";

const COLORS = [
  { hex: "#1e3a5f", label: "Azul loja" },
  { hex: "#1f4d3a", label: "Verde estoque" },
  { hex: "#8b3d12", label: "Tijolo" },
  { hex: "#1a1511", label: "Carvão" },
  { hex: "#0f4c5c", label: "Petróleo" },
  { hex: "#8a6d2b", label: "Ouro velho" },
] as const;

type Tab = "upload" | "gerar";

function svgToDataUrl(markup: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
}

export default function LogoModal({
  open,
  storeKey,
  storeName,
  onClose,
  onSaved,
}: {
  open: boolean;
  storeKey: string;
  storeName: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [tab, setTab] = useState<Tab>("gerar");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState("");
  const [name, setName] = useState(storeName);
  const [slogan, setSlogan] = useState("");
  const [color, setColor] = useState("#1e3a5f");
  const [style, setStyle] = useState<LogoStyleId>("wordmark");

  useEffect(() => {
    if (!open) return;
    setTab("gerar");
    setBusy(false);
    setError("");
    setOk("");
    setFile(null);
    setFilePreview("");
    setName(storeName);
    setSlogan("");
    setColor("#1e3a5f");
    setStyle("wordmark");
  }, [open, storeName]);

  useEffect(() => {
    if (!file) {
      setFilePreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setFilePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const svgMarkup = useMemo(
    () => generateStoreLogoSvg({ name: name.trim() || storeName, slogan, color, style }),
    [name, slogan, color, style, storeName],
  );
  const svgPreviewSrc = useMemo(() => svgToDataUrl(svgMarkup), [svgMarkup]);

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

  async function saveSvg() {
    if (!name.trim()) {
      setError("Informe o nome da loja.");
      return;
    }
    setBusy(true);
    setError("");
    setOk("");
    try {
      await api.post("/clients/store-logo/svg", {
        storeKey,
        name: name.trim(),
        slogan: slogan.trim() || undefined,
        color,
        style,
      });
      setOk("Logo SVG gravada no armazenamento da loja.");
      onSaved();
      onClose();
    } catch (err) {
      const parsed = parseError(err);
      setError(parsed.friend || parsed.message || "Não foi possível gravar a logo SVG.");
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
            onClick={tab === "gerar" ? saveSvg : saveUpload}
          >
            {tab === "gerar"
              ? busy
                ? "Gravando…"
                : "Salvar no GestorVix"
              : busy
                ? "Enviando…"
                : "Salvar"}
          </button>
        </>
      }
    >
      <div className="pdv-logo">
        <p className="pdv-logo-lede">
          A prévia do desenho vetorial atualiza na hora. O arquivo vai para o armazenamento do
          GestorVix.
        </p>

        <div className="pdv-logo-tabs" role="tablist" aria-label="Como definir a logo">
          <button
            className="pdv-logo-tab"
            type="button"
            role="tab"
            aria-selected={tab === "gerar"}
            onClick={() => {
              setTab("gerar");
              setError("");
              setOk("");
            }}
          >
            Gerar SVG
          </button>
          <button
            className="pdv-logo-tab"
            type="button"
            role="tab"
            aria-selected={tab === "upload"}
            onClick={() => {
              setTab("upload");
              setError("");
              setOk("");
            }}
          >
            Enviar arquivo
          </button>
        </div>

        {tab === "upload" ? (
          <div className="pdv-logo-pane" role="tabpanel">
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
        ) : (
          <div className="pdv-logo-pane" role="tabpanel">
            <div className="pdv-logo-preview" aria-live="polite">
              <img className="pdv-logo-svg" src={svgPreviewSrc} alt="Prévia da logo gerada" />
            </div>
            <p className="pdv-logo-hint">
              Mude nome, slogan, cor ou estilo — o desenho aparece aqui na hora.
            </p>
            <label className="pdv-logo-field">
              <span>Nome da loja</span>
              <input
                value={name}
                maxLength={42}
                onChange={(event) => setName(event.target.value)}
                autoComplete="organization"
              />
            </label>
            <label className="pdv-logo-field">
              <span>Slogan (opcional)</span>
              <input
                value={slogan}
                maxLength={42}
                onChange={(event) => setSlogan(event.target.value)}
                placeholder="Ex.: Há 20 anos no varejo"
              />
            </label>
            <fieldset className="pdv-logo-fieldset">
              <legend>Cor</legend>
              <div className="pdv-logo-swatches">
                {COLORS.map((item) => (
                  <button
                    key={item.hex}
                    className="pdv-logo-swatch"
                    type="button"
                    aria-pressed={color === item.hex}
                    aria-label={item.label}
                    title={item.label}
                    style={{ background: item.hex }}
                    onClick={() => setColor(item.hex)}
                  />
                ))}
                <label className="pdv-logo-custom">
                  <span>Outra cor</span>
                  <input
                    type="color"
                    value={color}
                    onChange={(event) => setColor(event.target.value)}
                    aria-label="Escolher outra cor"
                  />
                </label>
              </div>
            </fieldset>
            <fieldset className="pdv-logo-fieldset">
              <legend>Estilo</legend>
              <div className="pdv-logo-styles">
                {LOGO_STYLES.map((item) => (
                  <label key={item.id} className="pdv-logo-style" data-on={style === item.id ? "true" : undefined}>
                    <input
                      type="radio"
                      name="pdv-logo-style"
                      value={item.id}
                      checked={style === item.id}
                      onChange={() => setStyle(item.id)}
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        )}
      </div>
    </PdvOverlayModal>
  );
}
