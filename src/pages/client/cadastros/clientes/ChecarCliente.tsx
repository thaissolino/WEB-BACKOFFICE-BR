import { FormEvent, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Tag } from "lucide-react";
import { formatCnpj, formatCpf } from "../../../../utils/brMasks";
import CadastroShell from "../CadastroShell";

type ClienteTipo = "fisica" | "juridica" | "estrangeiro";

const TIPO_LABEL: Record<ClienteTipo, string> = {
  fisica: "Física",
  juridica: "Jurídica",
  estrangeiro: "Estrangeiro",
};

export default function ChecarCliente({
  entity = "cliente",
}: {
  entity?: "cliente" | "fornecedor";
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const isFornecedor = entity === "fornecedor";
  const listPath = isFornecedor ? "/client/fornecedores" : "/client/clientes";
  const formPath = isFornecedor ? "/client/fornecedores/cadastrar/form" : "/client/clientes/cadastrar/form";
  const title = isFornecedor ? "CHECAR INFORMAÇÕES DO FORNECEDOR" : "CHECAR INFORMAÇÕES DO CLIENTE";
  const boxTitle = isFornecedor ? "Checar Informações do Fornecedor" : "Checar Informações do Cliente";
  const tipoLabel = isFornecedor ? "Tipo do Fornecedor:" : "Tipo do Cliente:";
  const stubTitle = isFornecedor ? "Cadastrar Fornecedor" : "Cadastrar Cliente";

  const prefill = (location.state as { tipo?: ClienteTipo; documento?: string; name?: string } | null) ?? null;
  const [tipo, setTipo] = useState<ClienteTipo>(prefill?.tipo ?? "fisica");
  const [nome, setNome] = useState(prefill?.name ?? "");
  const [documento, setDocumento] = useState(prefill?.documento ?? "");
  const [error, setError] = useState("");
  const isEstrangeiro = tipo === "estrangeiro";

  const idLabel = useMemo(() => {
    if (tipo === "juridica") return "CNPJ:";
    return "CPF:";
  }, [tipo]);

  function onTipo(next: ClienteTipo) {
    setTipo(next);
    setNome("");
    setDocumento("");
    setError("");
  }

  function onDocumentChange(value: string) {
    if (tipo === "fisica") setDocumento(formatCpf(value));
    else if (tipo === "juridica") setDocumento(formatCnpj(value));
    else setDocumento(value);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (isEstrangeiro && !nome.trim()) {
      setError("Informe o nome.");
      return;
    }
    if (!documento.trim()) {
      setError(isEstrangeiro ? "Informe o documento." : `Informe o ${idLabel.replace(":", "")}.`);
      return;
    }
    setError("");
    navigate(formPath, { state: { tipo, documento, name: nome.trim(), title: stubTitle } });
  }

  return (
    <CadastroShell>
      <section className="pdv-cad-page" aria-labelledby="pdv-cad-check-title">
        <div className="pdv-cad-sheet">
          <h1 id="pdv-cad-check-title">{title}</h1>
          <button className="pdv-cad-btn pdv-cad-btn-back pdv-voltar" type="button" onClick={() => navigate(listPath)}>
            Voltar
          </button>

          <form className="pdv-cad-check" onSubmit={onSubmit}>
            <div className="pdv-cad-check-head">
              <Tag size={16} aria-hidden="true" />
              <h2>{boxTitle}</h2>
            </div>
            <div className="pdv-cad-check-body">
              <div className="pdv-cad-check-row">
                <span className="pdv-cad-check-label">{tipoLabel}</span>
                <fieldset className="pdv-cad-radios">
                  <legend className="pdv-sr">{tipoLabel}</legend>
                  {(Object.keys(TIPO_LABEL) as ClienteTipo[]).map((item) => (
                    <label key={item}>
                      <input
                        type="radio"
                        name="tipo-pessoa"
                        checked={tipo === item}
                        onChange={() => onTipo(item)}
                      />
                      {TIPO_LABEL[item]}
                    </label>
                  ))}
                </fieldset>
              </div>
              {isEstrangeiro ? (
                <>
                  <div className="pdv-cad-check-row">
                    <label className="pdv-cad-check-label" htmlFor="pdv-cad-nome">
                      Nome:
                    </label>
                    <input
                      id="pdv-cad-nome"
                      className="pdv-cad-check-input"
                      value={nome}
                      onChange={(event) => setNome(event.target.value)}
                      autoComplete="off"
                      autoFocus
                    />
                  </div>
                  <div className="pdv-cad-check-row">
                    <label className="pdv-cad-check-label" htmlFor="pdv-cad-doc">
                      Documento Estrangeiro:
                    </label>
                    <input
                      id="pdv-cad-doc"
                      className="pdv-cad-check-input"
                      value={documento}
                      onChange={(event) => onDocumentChange(event.target.value)}
                      autoComplete="off"
                    />
                  </div>
                </>
              ) : (
                <div className="pdv-cad-check-row">
                  <label className="pdv-cad-check-label" htmlFor="pdv-cad-doc">
                    {idLabel}
                  </label>
                  <input
                    id="pdv-cad-doc"
                    className="pdv-cad-check-input"
                    value={documento}
                    onChange={(event) => onDocumentChange(event.target.value)}
                    placeholder={tipo === "fisica" ? "___.___.___-__" : "__.___.___/____-__"}
                    maxLength={tipo === "juridica" ? 18 : 14}
                    autoComplete="off"
                  />
                </div>
              )}
              {error ? (
                <p className="pdv-cad-error" role="alert">
                  {error}
                </p>
              ) : null}
              <button className="pdv-cad-btn pdv-cad-btn-verify" type="submit">
                Verificar
              </button>
            </div>
          </form>
        </div>
      </section>
    </CadastroShell>
  );
}
