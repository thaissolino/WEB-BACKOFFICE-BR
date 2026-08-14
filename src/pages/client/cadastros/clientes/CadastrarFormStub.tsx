import { useLocation, useNavigate, useParams } from "react-router-dom";
import CadastroShell from "../CadastroShell";

type ClienteTipo = "fisica" | "juridica" | "estrangeiro";

const TIPO_LABEL: Record<ClienteTipo, string> = {
  fisica: "Física",
  juridica: "Jurídica",
  estrangeiro: "Estrangeiro",
};

export default function CadastrarFormStub({ entity = "cliente" }: { entity?: "cliente" | "fornecedor" }) {
  const navigate = useNavigate();
  const { id, action } = useParams();
  const location = useLocation();
  const state = (location.state as {
    title?: string;
    name?: string;
    tipo?: ClienteTipo;
    documento?: string;
  } | null) ?? null;

  const isFornecedor = entity === "fornecedor";
  const backTo = isFornecedor ? "/client/fornecedores" : "/client/clientes/cadastrar";
  const listTo = isFornecedor ? "/client/fornecedores" : "/client/clientes";
  const title =
    state?.title ||
    (action ? action : isFornecedor ? "Cadastrar Fornecedor" : "Cadastrar Cliente");

  return (
    <CadastroShell>
      <section className="pdv-cad-page" aria-labelledby="pdv-cad-form-title">
        <div className="pdv-cad-sheet">
          <div className="pdv-cad-head">
            <h1 id="pdv-cad-form-title">{title}</h1>
            <button
              className="pdv-cad-btn pdv-cad-btn-back pdv-voltar"
              type="button"
              onClick={() => navigate(state?.tipo ? backTo : listTo, { state })}
            >
              Voltar
            </button>
          </div>
          {state?.name ? <p className="pdv-cad-kicker">{state.name}</p> : null}
          {state?.tipo ? (
            <ul className="pdv-cad-facts">
              <li>
                <span>Tipo</span>
                <strong>{TIPO_LABEL[state.tipo]}</strong>
              </li>
              <li>
                <span>Documento</span>
                <strong>{state.documento}</strong>
              </li>
            </ul>
          ) : null}
          {id ? <p className="pdv-cad-kicker">Código: {id}</p> : null}
        </div>
      </section>
    </CadastroShell>
  );
}
