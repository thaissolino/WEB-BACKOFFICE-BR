import { useNavigate } from "react-router-dom";
import CadastroShell from "./CadastroShell";

export default function CadastroStub({
  title,
  backTo = "/client/dashboard",
}: {
  title: string;
  backTo?: string;
}) {
  const navigate = useNavigate();

  return (
    <CadastroShell>
      <section className="pdv-cad-page" aria-labelledby="pdv-cad-stub-title">
        <div className="pdv-cad-sheet">
          <div className="pdv-cad-head">
            <h1 id="pdv-cad-stub-title">{title}</h1>
            <button className="pdv-cad-btn pdv-cad-btn-back pdv-voltar" type="button" onClick={() => navigate(backTo)}>
              Voltar
            </button>
          </div>
        </div>
      </section>
    </CadastroShell>
  );
}
