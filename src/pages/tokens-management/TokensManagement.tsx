import React, { useEffect, useState } from "react";
import RecolhedoresTab from "./components/RecolhedoresTab";
import OperacoesTab from "./components/OperacoesTab";
import FornecedoresTab from "./components/FornecedoresTab";
import LucrosTab from "./components/LucrosTab";
import ModalRecolhedor from "./components/ModalRecolhedor";
import ModalFornecedor from "./components/ModalFornecedor";
import { TabsX, TabX } from "./components/tabs";


const TokensManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState("operacoes");
  const [modalRecolhedorOpen, setModalRecolhedorOpen] = useState(false);
  const [modalFornecedorOpen, setModalFornecedorOpen] = useState(false);

  useEffect(() => {
    // Aqui você pode carregar dados do LocalStorage ou API se necessário
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-blue-800">
          GESTÃO DE CAIXAS INDIVIDUAIS
        </h1>
        <p className="text-gray-600">
          CONTROLE COMPLETO POR RECOLHEDOR E FORNECEDOR
        </p>
      </header>

      <TabsX value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabX value="operacoes" label="OPERAÇÕES" icon="exchange-alt" />
        <TabX value="recolhedores" label="RECOLHEDORES" icon="users" />
        <TabX value="fornecedores" label="FORNECEDORES" icon="truck" />
        <TabX value="lucros" label="LUCROS" icon="chart-line" />
      </TabsX>

      <div>
        {activeTab === "operacoes" && <OperacoesTab />}
        {activeTab === "recolhedores" && (
          <RecolhedoresTab onOpenModal={() => setModalRecolhedorOpen(true)} />
        )}
        {activeTab === "fornecedores" && (
          <FornecedoresTab onOpenModal={() => setModalFornecedorOpen(true)} />
        )}
        {activeTab === "lucros" && <LucrosTab />}
      </div>

      <ModalRecolhedor
        open={modalRecolhedorOpen}
        onClose={() => setModalRecolhedorOpen(false)}
      />
      <ModalFornecedor
        open={modalFornecedorOpen}
        onClose={() => setModalFornecedorOpen(false)}
      />
    </div>
  );
};

export default TokensManagement;
