import { FormEvent, ReactNode, useEffect, useId, useState } from "react";
import { Folder, Lightbulb, Minus, Pin, Plus, Users, X } from "lucide-react";

export function AtivoToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      className="pdv-prod-toggle"
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
    >
      {value ? "Sim" : "Não"}
    </button>
  );
}

function QuickWindow({
  title,
  icon,
  open,
  onClose,
  children,
}: {
  title: string;
  icon: ReactNode;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const [minimized, setMinimized] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (open) setMinimized(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="pdv-prod-modal-scrim" onClick={onClose}>
      <div
        className="pdv-prod-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-min={minimized ? "true" : undefined}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="pdv-prod-modal-head">
          <h2 id={titleId}>
            {icon}
            {title}
          </h2>
          <div className="pdv-prod-modal-win">
            <button
              type="button"
              className="pdv-prod-win-min"
              aria-label={minimized ? "Restaurar" : "Minimizar"}
              onClick={() => setMinimized((current) => !current)}
            >
              <Minus size={12} strokeWidth={3} aria-hidden="true" />
            </button>
            <button type="button" className="pdv-prod-win-close" aria-label="Fechar" onClick={onClose}>
              <X size={12} strokeWidth={3} aria-hidden="true" />
            </button>
          </div>
        </header>
        {minimized ? null : children}
      </div>
    </div>
  );
}

function ModalGo() {
  return (
    <div className="pdv-prod-modal-go">
      <button className="pdv-cad-btn pdv-cad-btn-green" type="submit">
        <Plus size={16} strokeWidth={2.6} aria-hidden="true" />
        Cadastrar
      </button>
    </div>
  );
}

export function CadastrarMarcaModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (name: string) => void;
}) {
  const [marca, setMarca] = useState("");
  const [descricao, setDescricao] = useState("");
  const [ativo, setAtivo] = useState(true);

  useEffect(() => {
    if (open) {
      setMarca("");
      setDescricao("");
      setAtivo(true);
    }
  }, [open]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const name = marca.trim();
    if (!name) return;
    onCreated(name);
    onClose();
  }

  return (
    <QuickWindow title="Cadastrar Marca" icon={<Lightbulb size={16} aria-hidden="true" />} open={open} onClose={onClose}>
      <form className="pdv-prod-modal-form" onSubmit={onSubmit}>
        <div className="pdv-prod-modal-row">
          <label htmlFor="pdv-prod-marca-nome">Marca</label>
          <input id="pdv-prod-marca-nome" value={marca} onChange={(event) => setMarca(event.target.value)} autoComplete="off" />
        </div>
        <div className="pdv-prod-modal-row pdv-prod-modal-row-top">
          <label htmlFor="pdv-prod-marca-desc">Descrição</label>
          <textarea id="pdv-prod-marca-desc" value={descricao} onChange={(event) => setDescricao(event.target.value)} rows={4} />
        </div>
        <div className="pdv-prod-modal-row">
          <span id="pdv-prod-marca-ativo">Ativo</span>
          <AtivoToggle value={ativo} onChange={setAtivo} />
        </div>
        <ModalGo />
      </form>
    </QuickWindow>
  );
}

export function CadastrarColecaoModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (name: string) => void;
}) {
  const [colecao, setColecao] = useState("");
  const [ativo, setAtivo] = useState(true);

  useEffect(() => {
    if (open) {
      setColecao("");
      setAtivo(true);
    }
  }, [open]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const name = colecao.trim();
    if (!name) return;
    onCreated(name);
    onClose();
  }

  return (
    <QuickWindow title="Cadastrar Coleção" icon={<Pin size={16} aria-hidden="true" />} open={open} onClose={onClose}>
      <form className="pdv-prod-modal-form" onSubmit={onSubmit}>
        <div className="pdv-prod-modal-row">
          <label htmlFor="pdv-prod-col-nome">Coleção</label>
          <input id="pdv-prod-col-nome" value={colecao} onChange={(event) => setColecao(event.target.value)} autoComplete="off" />
        </div>
        <div className="pdv-prod-modal-row">
          <span>Ativo</span>
          <AtivoToggle value={ativo} onChange={setAtivo} />
        </div>
        <ModalGo />
      </form>
    </QuickWindow>
  );
}

export function CadastrarUnidadeModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (name: string) => void;
}) {
  const [unidade, setUnidade] = useState("");
  const [siglaNfe, setSiglaNfe] = useState("");
  const [siglaEcf, setSiglaEcf] = useState("");

  useEffect(() => {
    if (open) {
      setUnidade("");
      setSiglaNfe("");
      setSiglaEcf("");
    }
  }, [open]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const name = unidade.trim();
    if (!name) return;
    const sigla = siglaNfe.trim();
    onCreated(sigla ? `${sigla.toUpperCase()} - ${name.toUpperCase()}` : name.toUpperCase());
    onClose();
  }

  return (
    <QuickWindow
      title="Cadastrar Unidade de Medida"
      icon={<Folder size={16} aria-hidden="true" />}
      open={open}
      onClose={onClose}
    >
      <form className="pdv-prod-modal-form" onSubmit={onSubmit}>
        <div className="pdv-prod-modal-row">
          <label htmlFor="pdv-prod-un-nome">Unidade</label>
          <input id="pdv-prod-un-nome" value={unidade} onChange={(event) => setUnidade(event.target.value)} autoComplete="off" />
        </div>
        <div className="pdv-prod-modal-row">
          <label htmlFor="pdv-prod-un-nfe">Sigla NF-e</label>
          <input id="pdv-prod-un-nfe" value={siglaNfe} onChange={(event) => setSiglaNfe(event.target.value)} autoComplete="off" />
        </div>
        <div className="pdv-prod-modal-row">
          <label htmlFor="pdv-prod-un-ecf">Sigla ECF</label>
          <input id="pdv-prod-un-ecf" value={siglaEcf} onChange={(event) => setSiglaEcf(event.target.value)} autoComplete="off" />
        </div>
        <ModalGo />
      </form>
    </QuickWindow>
  );
}

export function CadastrarGeneroModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (name: string) => void;
}) {
  const [genero, setGenero] = useState("");
  const [abreviacao, setAbreviacao] = useState("");
  const [ativo, setAtivo] = useState(true);

  useEffect(() => {
    if (open) {
      setGenero("");
      setAbreviacao("");
      setAtivo(true);
    }
  }, [open]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const name = genero.trim();
    if (!name) return;
    onCreated(name);
    onClose();
  }

  return (
    <QuickWindow title="Cadastrar Gênero" icon={<Users size={16} aria-hidden="true" />} open={open} onClose={onClose}>
      <form className="pdv-prod-modal-form" onSubmit={onSubmit}>
        <div className="pdv-prod-modal-row">
          <label htmlFor="pdv-prod-gen-nome">Gênero</label>
          <input id="pdv-prod-gen-nome" value={genero} onChange={(event) => setGenero(event.target.value)} autoComplete="off" />
        </div>
        <div className="pdv-prod-modal-row">
          <label htmlFor="pdv-prod-gen-abr">Abreviação</label>
          <input
            id="pdv-prod-gen-abr"
            value={abreviacao}
            onChange={(event) => setAbreviacao(event.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="pdv-prod-modal-row">
          <span>Ativo</span>
          <AtivoToggle value={ativo} onChange={setAtivo} />
        </div>
        <ModalGo />
      </form>
    </QuickWindow>
  );
}
