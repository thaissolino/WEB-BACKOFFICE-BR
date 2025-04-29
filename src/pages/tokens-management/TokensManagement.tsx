import React, { useState } from 'react';
import OperacoesTab from './components/OperacoesTab';
import RecolhedoresTab from './components/RecolhedoresTab';
import FornecedoresTab from './components/FornecedoresTab';
import LucrosTab from './components/LucrosTab';

const TokensManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'operacoes' | 'recolhedores' | 'fornecedores' | 'lucros'>('operacoes');

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Cabeçalho */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-blue-800">GESTÃO DE CAIXAS INDIVIDUAIS</h1>
        <p className="text-gray-600">CONTROLE COMPLETO POR RECOLHEDOR E FORNECEDOR</p>
      </header>

      {/* Abas */}
      <div className="mb-6 border-b border-gray-200">
        <ul className="flex flex-wrap -mb-px">
          <li className="mr-2">
            <button
              className={`inline-block p-4 rounded-t-lg border-b-2 ${
                activeTab === 'operacoes'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent hover:text-gray-600 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('operacoes')}
            >
              <i className="fas fa-exchange-alt mr-2"></i> OPERAÇÕES
            </button>
          </li>
          <li className="mr-2">
            <button
              className={`inline-block p-4 rounded-t-lg border-b-2 ${
                activeTab === 'recolhedores'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent hover:text-gray-600 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('recolhedores')}
            >
              <i className="fas fa-users mr-2"></i> RECOLHEDORES
            </button>
          </li>
          <li className="mr-2">
            <button
              className={`inline-block p-4 rounded-t-lg border-b-2 ${
                activeTab === 'fornecedores'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent hover:text-gray-600 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('fornecedores')}
            >
              <i className="fas fa-truck mr-2"></i> FORNECEDORES
            </button>
          </li>
          <li className="mr-2">
            <button
              className={`inline-block p-4 rounded-t-lg border-b-2 ${
                activeTab === 'lucros'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent hover:text-gray-600 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('lucros')}
            >
              <i className="fas fa-chart-line mr-2"></i> LUCROS
            </button>
          </li>
        </ul>
      </div>

      {/* Conteúdo das Abas */}
      <div className="fade-in">
        {activeTab === 'operacoes' && <OperacoesTab />}
        {activeTab === 'recolhedores' && <RecolhedoresTab />}
        {activeTab === 'fornecedores' && <FornecedoresTab />}
        {activeTab === 'lucros' && <LucrosTab />}
      </div>
    </div>
  );
};

export default TokensManagement;
