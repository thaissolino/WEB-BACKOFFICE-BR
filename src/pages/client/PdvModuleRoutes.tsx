import { Route } from "react-router-dom"
import UsuarioForm from "./cadastros/usuarios/UsuarioForm"
import GrupoForm from "./cadastros/usuarios/GrupoForm"
import { IdentificadorForm, RepresentanteForm, VincularIdentificador } from "./cadastros/usuarios/Representantes"
import ComissoesPage from "./cadastros/usuarios/ComissoesPage"
import RelatorioAtividades from "./cadastros/atividades/RelatorioAtividades"
import FormaPagamentoForm from "./cadastros/financeiro/FormaPagamentoForm"
import CaixaPage, { PlanoContaForm } from "./cadastros/financeiro/CaixaPage"
import { CertificadoDigital, ParametrosFiscais } from "./cadastros/fiscal/DocumentosFiscais"
import { SetorForm } from "./cadastros/produtos/ProdutosExtras"
import {
  GroupsList,
  IdsList,
  PayList,
  PlanList,
  RepsList,
  UsersList,
} from "./cadastros/catalogLists"
import {
  ArquivosContador,
  BoletosPage,
  CadastrarDespesa,
  ConciliacaoBancaria,
  ContagemEstoque,
  ContasPagar,
  ContasReceber,
  FluxoCaixa,
  GerenciadorArquivos,
  ListarDespesas,
  ManifestacaoDest,
  NfeList,
  NfseList,
  PainelEntregas,
  PreVendas,
  PrevisaoFluxo,
  RelatorioCaixa,
  RelatorioCaixaClientes,
  RelatorioCaixaDetalhado,
  RelatorioContaCorrente,
  TransferenciaLojas,
  TransferenciasList,
  VendasAbertas,
  VendasConcluidas,
} from "./movimentacoes/MovPages"
import { RELATORIOS, RelatorioScreen } from "./relatorios/relatorios"
import ClientPdv from "./Pdv"
import TrocarCaixa from "./TrocarCaixa"
import {
  CartaForm,
  CartaList,
  EstoqueCompartilhadoPage,
  GrupoLojaForm,
  GruposLojaList,
  MeuPlanoPage,
  ParametrosSimplificados,
  RoboColunasPage,
  SigepPacoteForm,
  SigepPacotesList,
  TipoAtividadePage,
  TransportadoraForm,
  TransportadoraList,
} from "./configuracao/ConfigPages"
import ImportacaoPage from "./configuracao/ImportPages"

export function PdvModuleRoutes() {
  return (
    <>
      <Route path="client/usuarios/cadastrar" element={<UsuarioForm />} />
      <Route path="client/usuarios/inativos" element={<UsersList inactive />} />
      <Route path="client/usuarios/grupos/cadastrar" element={<GrupoForm />} />
      <Route path="client/usuarios/grupos" element={<GroupsList />} />
      <Route path="client/usuarios/representantes/identificadores/cadastrar" element={<IdentificadorForm />} />
      <Route path="client/usuarios/representantes/identificadores/inativos" element={<IdsList inactive />} />
      <Route path="client/usuarios/representantes/identificadores/vincular" element={<VincularIdentificador />} />
      <Route path="client/usuarios/representantes/identificadores" element={<IdsList />} />
      <Route path="client/usuarios/representantes/cadastrar" element={<RepresentanteForm />} />
      <Route path="client/usuarios/representantes/inativos" element={<RepsList inactive />} />
      <Route path="client/usuarios/representantes" element={<RepsList />} />
      <Route path="client/usuarios/comissoes" element={<ComissoesPage />} />
      <Route path="client/usuarios/atividade" element={<RelatorioAtividades />} />
      <Route path="client/usuarios" element={<UsersList />} />

      <Route path="client/financeiro/formas-pagamento/cadastrar" element={<FormaPagamentoForm />} />
      <Route path="client/financeiro/formas-pagamento/inativos" element={<PayList inactive />} />
      <Route path="client/financeiro/formas-pagamento" element={<PayList />} />
      <Route path="client/financeiro/plano-conta/cadastrar" element={<PlanoContaForm />} />
      <Route path="client/financeiro/plano-conta/inativos" element={<PlanList inactive />} />
      <Route path="client/financeiro/plano-conta" element={<PlanList />} />
      <Route path="client/financeiro/caixa" element={<CaixaPage />} />

      <Route path="client/documentos-fiscais/parametros" element={<ParametrosFiscais />} />
      <Route path="client/documentos-fiscais/certificado" element={<CertificadoDigital />} />
      <Route path="client/produtos/localizacao/setores/cadastrar" element={<SetorForm />} />

      <Route path="client/movimentacoes/vendas/pdv" element={<ClientPdv />} />
      <Route path="client/movimentacoes/vendas/pre" element={<PreVendas />} />
      <Route path="client/movimentacoes/vendas/entregas" element={<PainelEntregas />} />
      <Route path="client/movimentacoes/vendas/abertas" element={<VendasAbertas />} />
      <Route path="client/movimentacoes/vendas/concluidas" element={<VendasConcluidas />} />
      <Route path="client/movimentacoes/caixa/selecionar" element={<TrocarCaixa />} />
      <Route path="client/movimentacoes/caixa/relatorio" element={<RelatorioCaixa />} />
      <Route path="client/movimentacoes/caixa/conta-corrente" element={<RelatorioContaCorrente />} />
      <Route path="client/movimentacoes/caixa/detalhado" element={<RelatorioCaixaDetalhado />} />
      <Route path="client/movimentacoes/caixa/conciliacao" element={<ConciliacaoBancaria />} />
      <Route path="client/movimentacoes/financeiro/plano-conta" element={<PlanList />} />
      <Route path="client/movimentacoes/financeiro/receber" element={<ContasReceber />} />
      <Route path="client/movimentacoes/financeiro/pagar" element={<ContasPagar />} />
      <Route path="client/movimentacoes/financeiro/fluxo" element={<FluxoCaixa />} />
      <Route path="client/movimentacoes/financeiro/previsao" element={<PrevisaoFluxo />} />
      <Route path="client/movimentacoes/financeiro/despesas/cadastrar" element={<CadastrarDespesa />} />
      <Route path="client/movimentacoes/financeiro/receitas/cadastrar" element={<CadastrarDespesa receita />} />
      <Route path="client/movimentacoes/financeiro/despesas" element={<ListarDespesas />} />
      <Route path="client/movimentacoes/financeiro/caixa-clientes" element={<RelatorioCaixaClientes />} />
      <Route path="client/movimentacoes/financeiro/boletos/recorrentes" element={<BoletosPage title="BOLETOS RECORRENTES" />} />
      <Route path="client/movimentacoes/financeiro/boletos/contas" element={<BoletosPage title="CONTAS BANCÁRIAS" />} />
      <Route path="client/movimentacoes/financeiro/boletos/gerenciar" element={<BoletosPage title="GERENCIAR BOLETOS" />} />
      <Route path="client/movimentacoes/financeiro/boletos/arquivos" element={<BoletosPage title="GERENCIAR ARQUIVOS" />} />
      <Route path="client/movimentacoes/transferencias/lojas" element={<TransferenciaLojas />} />
      <Route path="client/movimentacoes/transferencias/enviadas/abertas" element={<TransferenciasList title="TRANSFERÊNCIAS ENVIADAS ABERTAS" />} />
      <Route path="client/movimentacoes/transferencias/enviadas/concluidas" element={<TransferenciasList title="TRANSFERÊNCIAS ENVIADAS CONCLUÍDAS" />} />
      <Route path="client/movimentacoes/transferencias/enviadas/estornadas" element={<TransferenciasList title="TRANSFERÊNCIAS ENVIADAS ESTORNADAS" />} />
      <Route path="client/movimentacoes/transferencias/enviadas/excluidas" element={<TransferenciasList title="TRANSFERÊNCIAS ENVIADAS EXCLUÍDAS" />} />
      <Route path="client/movimentacoes/transferencias/recebidas/abertas" element={<TransferenciasList title="TRANSFERÊNCIAS RECEBIDAS ABERTAS" />} />
      <Route path="client/movimentacoes/transferencias/recebidas/concluidas" element={<TransferenciasList title="TRANSFERÊNCIAS RECEBIDAS CONCLUÍDAS" />} />
      <Route path="client/movimentacoes/transferencias/recebidas/estornadas" element={<TransferenciasList title="TRANSFERÊNCIAS RECEBIDAS ESTORNADAS" />} />
      <Route path="client/movimentacoes/transferencias/recebidas/excluidas" element={<TransferenciasList title="TRANSFERÊNCIAS RECEBIDAS EXCLUÍDAS" />} />
      <Route path="client/movimentacoes/transferencias/buscar" element={<TransferenciasList title="BUSCAR TRANSFERÊNCIA" />} />
      <Route path="client/movimentacoes/contagem" element={<ContagemEstoque />} />
      <Route path="client/movimentacoes/documentos-fiscais/nfe" element={<NfeList />} />
      <Route path="client/movimentacoes/documentos-fiscais/nfse" element={<NfseList />} />
      <Route path="client/movimentacoes/documentos-fiscais/manifestacao" element={<ManifestacaoDest />} />
      <Route path="client/movimentacoes/documentos-fiscais/param-nfe" element={<ParametrosFiscais />} />
      <Route path="client/movimentacoes/documentos-fiscais/param-nfse" element={<ParametrosFiscais />} />
      <Route path="client/movimentacoes/documentos-fiscais/arquivos-contador" element={<ArquivosContador />} />
      <Route path="client/movimentacoes/documentos-fiscais/gerenciador" element={<GerenciadorArquivos />} />

      {RELATORIOS.map((def) => (
        <Route
          key={def.path}
          path={`client/relatorios/${def.path}`}
          element={<RelatorioScreen def={def} />}
        />
      ))}

      <Route path="client/configuracao/tipo-atividade" element={<TipoAtividadePage />} />
      <Route path="client/configuracao/impressao/cadastrar" element={<CartaForm />} />
      <Route path="client/configuracao/impressao" element={<CartaList />} />
      <Route path="client/configuracao/pacotes-sigep/cadastrar" element={<SigepPacoteForm />} />
      <Route path="client/configuracao/pacotes-sigep/inativos" element={<SigepPacotesList inactive />} />
      <Route path="client/configuracao/pacotes-sigep" element={<SigepPacotesList />} />
      <Route path="client/configuracao/robo-colunas" element={<RoboColunasPage />} />
      <Route path="client/configuracao/nfe-avancado" element={<ParametrosFiscais />} />
      <Route path="client/configuracao/nfe-simplificado" element={<ParametrosSimplificados />} />
      <Route path="client/configuracao/transportadora/cadastrar" element={<TransportadoraForm />} />
      <Route path="client/configuracao/transportadora" element={<TransportadoraList />} />
      <Route path="client/configuracao/importacao/:kind" element={<ImportacaoPage />} />
      <Route path="client/grupos-de-loja/cadastrar" element={<GrupoLojaForm />} />
      <Route path="client/grupos-de-loja/inativos" element={<GruposLojaList inactive />} />
      <Route path="client/grupos-de-loja" element={<GruposLojaList />} />
      <Route path="client/estoque-compartilhado" element={<EstoqueCompartilhadoPage />} />
      <Route path="client/plano" element={<MeuPlanoPage />} />
    </>
  )
}
