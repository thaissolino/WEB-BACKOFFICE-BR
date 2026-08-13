import { Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PdvOverlayModal from "./PdvOverlayModal";
import { PDV_CONFIG_MODAL_COLUMNS, isConfigModalItemVisible, type PdvUiConfig } from "./pdvUiConfig";

const PARAM_LOJA_ROUTES: Record<string, string> = {
  "Configurações da Loja": "/client/loja",
  Integrações: "/client/loja?tab=integracoes",
  "Grupos de Loja": "/client/grupos-de-loja",
  "Estoque Compartilhado": "/client/estoque-compartilhado",
  "Meu Plano, Mensalidades e Contrato": "/client/plano",
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
    const to = PARAM_LOJA_ROUTES[label];
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
