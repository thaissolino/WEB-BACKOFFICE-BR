import { Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PdvOverlayModal from "./PdvOverlayModal";
import { PDV_CONFIG_MODAL_COLUMNS, isConfigModalItemVisible, type PdvUiConfig } from "./pdvUiConfig";

const CONFIG_ITEM_ROUTES: Record<string, string> = {
  "Tipo de Atividade": "/client/configuracao/tipo-atividade",
  Caixa: "/client/financeiro/caixa",
  "Comissão e Meta": "/client/usuarios/comissoes",
  "Impressão/Carta/E-mail": "/client/configuracao/impressao",
  "Pacotes SIGEP": "/client/configuracao/pacotes-sigep",
  "Gerenciar colunas no Robô de Impressão LV": "/client/configuracao/robo-colunas",
  Listar: "/client/financeiro/formas-pagamento",
  Cadastrar: "/client/financeiro/formas-pagamento/cadastrar",
  Inativos: "/client/financeiro/formas-pagamento/inativos",
  "Configurações da Loja": "/client/loja",
  Integrações: "/client/loja?tab=integracoes",
  "Grupos de Loja": "/client/grupos-de-loja",
  "Estoque Compartilhado": "/client/estoque-compartilhado",
  "Meu Plano, Mensalidades e Contrato": "/client/plano",
  "Parâmetros Avançados": "/client/configuracao/nfe-avancado",
  "Parâmetros Simplificados": "/client/configuracao/nfe-simplificado",
  Transportadora: "/client/configuracao/transportadora",
  Cliente: "/client/configuracao/importacao/cliente",
  Fornecedor: "/client/configuracao/importacao/fornecedor",
  Produto: "/client/configuracao/importacao/produto",
  "Grade x Categoria": "/client/configuracao/importacao/grade-categoria",
  Crediário: "/client/configuracao/importacao/crediario",
  "Contas a Pagar": "/client/configuracao/importacao/contas-pagar",
  "Atualizar Estoque": "/client/configuracao/importacao/atualizar-estoque",
  "Atualizar Estoque Fornecedor": "/client/configuracao/importacao/atualizar-estoque-fornecedor",
  "Atualizar Produto": "/client/configuracao/importacao/atualizar-produto",
};

export default function ConfigModal({
  open,
  onClose,
  uiConfig,
}: {
  open: boolean;
  onClose: () => void;
  uiConfig: PdvUiConfig;
}) {
  const navigate = useNavigate();
  const columns = PDV_CONFIG_MODAL_COLUMNS.map((column) =>
    column
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (item) => !item.mvpHidden && isConfigModalItemVisible(uiConfig, item.id),
        ),
      }))
      .filter((section) => section.items.length > 0),
  ).filter((column) => column.length > 0);

  function onItem(label: string) {
    const to = CONFIG_ITEM_ROUTES[label];
    if (!to) return;
    onClose();
    navigate(to);
  }

  return (
    <PdvOverlayModal
      open={open}
      title="Configuração"
      titleId="pdv-config-title"
      size="wide"
      icon={<Settings size={18} strokeWidth={2.2} />}
      onClose={onClose}
    >
      {columns.length === 0 ? (
        <p className="pdv-empty">Nenhum parâmetro disponível.</p>
      ) : (
        <div className="pdv-cfg-grid">
          {columns.map((column, columnIndex) => (
            <div className="pdv-cfg-col" key={column.map((section) => section.id).join("-")}>
              {column.map((section) => (
                <section
                  className="pdv-cfg-section"
                  key={section.id}
                  aria-labelledby={`pdv-cfg-${columnIndex}-${section.id}`}
                >
                  <h3 className="pdv-cfg-heading" id={`pdv-cfg-${columnIndex}-${section.id}`}>
                    {section.title}
                  </h3>
                  <ul className="pdv-cfg-list">
                    {section.items.map((item) => (
                      <li key={item.id}>
                        <button className="pdv-cfg-item" type="button" onClick={() => onItem(item.label)}>
                          {item.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          ))}
        </div>
      )}
    </PdvOverlayModal>
  );
}
