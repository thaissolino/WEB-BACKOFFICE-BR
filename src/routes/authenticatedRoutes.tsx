import { Navigate, Route, Routes } from "react-router-dom";
import { Layout as BackofficeLayout } from "../pages/backoffice/Layout/base";
import { SignIn as BackofficeSignIn } from "../pages/backoffice/SignIn";
import { SessionExpiredBackoffice } from "../pages/backoffice/SessionExpiredBackoffice";
import { useAuthBackoffice } from "../hooks/authBackoffice";
import { Logout } from "../pages/backoffice/Logout";
import GuardedRoute from "./GuardedRoute";
import { JSX, useEffect } from "react";
import Dashboard from "../pages/dashboard";
import Team from "../pages/team";
import Contacts from "../pages/contacts";
import Invoices from "../pages/invoices";
import FormGroup from "../pages/form-group";
import FormRoom from "../pages/form-room";
import FormUser from "../pages/form-user";
import { CambioPage } from "../pages/cambiobackoffice/CambioPage";
import InvocesManagement from "../pages/gestao-invoices/InvocesManagement";
import TokensManagement from "../pages/tokens-management/TokensManagement";
import OperatorsManagement from "../pages/form-operators/OperatorsManagement";
import OperatorManager2 from "../pages/form-operators-two/OperatorsManagement2";
import OperatorManager from "../pages/form-operators/OperatorsManagement";
import OperatorsManagementPerfilEdit from "../pages/form-operators-perfil-edit/OperatorsManagementPerfilEdit";
import AdmManagementPerfilEdit from "../pages/form-adm-perfil-edit/AdmManagementPerfilEdit";
import { useClientAuth } from "../hooks/clientAuth";
import { GestorVixHome } from "../pages/home/GestorVixHome";
import ClientLogin from "../pages/client/Login";
import ClientRegister from "../pages/client/Register";
import ClientForgotPassword from "../pages/client/ForgotPassword";
import ClientDashboard from "../pages/client/Dashboard";
import TrocarCaixa from "../pages/client/TrocarCaixa";
import ClientPdv from "../pages/client/Pdv";
import ClientLoja from "../pages/client/Loja";
import ClientesList from "../pages/client/cadastros/clientes/ClientesList";
import ChecarCliente from "../pages/client/cadastros/clientes/ChecarCliente";
import CadastrarFormStub from "../pages/client/cadastros/clientes/CadastrarFormStub";
import ClassificacaoClientes from "../pages/client/cadastros/clientes/ClassificacaoClientes";
import CarteiraClientes from "../pages/client/cadastros/clientes/CarteiraClientes";
import FornecedoresList from "../pages/client/cadastros/fornecedores/FornecedoresList";
import CadastrarFornecedor from "../pages/client/cadastros/fornecedores/CadastrarFornecedor";
import CompraAcessorio from "../pages/client/cadastros/fornecedores/CompraAcessorio";
import RelatorioAtividades from "../pages/client/cadastros/atividades/RelatorioAtividades";
import ListarProdutos from "../pages/client/cadastros/produtos/ListarProdutos";
import CadastrarProduto from "../pages/client/cadastros/produtos/CadastrarProduto";
import AlterarEstoque from "../pages/client/cadastros/produtos/AlterarEstoque";
import ListarCategorias from "../pages/client/cadastros/produtos/ListarCategorias";
import CadastrarCategoria from "../pages/client/cadastros/produtos/CadastrarCategoria";
import ReajusteCategoria from "../pages/client/cadastros/produtos/ReajusteCategoria";
import { ApoioForm, ApoioList } from "../pages/client/cadastros/produtos/ApoioCadastro";
import {
  EditorEtiquetasPage,
  LocalizacaoPage,
  LotePage,
  NcmList,
  PromocaoList,
  TabelaPrecoForm,
  TabelaPrecoList,
  TrayDownloadPage,
} from "../pages/client/cadastros/produtos/ProdutosExtras";
import PdvConfig from "../pages/backoffice/PdvConfig";
import { PdvModuleRoutes } from "../pages/client/PdvModuleRoutes";
import CreateStore from "../pages/stores/CreateStore";
import StoresList from "../pages/stores/StoresList";
import StoreDetail from "../pages/stores/StoreDetail";
import StoreLoja from "../pages/stores/StoreLoja";
import StoreParamStubPage from "../pages/stores/StoreParamStubPage";
import StockOverview from "../pages/stores/StockOverview";
import GestorCadastroProdutos from "../pages/stores/GestorCadastroProdutos";
import GestorCadastroFornecedores from "../pages/gestor/GestorCadastroFornecedores";
import GestorCadastroFreteiros from "../pages/gestor/GestorCadastroFreteiros";
import GestorCadastroLojistas from "../pages/gestor/GestorCadastroLojistas";
import TrocarSenhaCliente from "../pages/client/TrocarSenha";
import CreateCommercialClient from "../pages/commercial-clients/CreateCommercialClient";
import CommercialClientsList from "../pages/commercial-clients/CommercialClientsList";
import CommercialClientDetail from "../pages/commercial-clients/CommercialClientDetail";
const BACKOFFICE_ROUTE = "/backoffice";
const LOGIN_ROUTE = "/signin/backoffice";

function RequireAuthBackoffice({ children }: { children: JSX.Element }) {
  useEffect(() => {
    if (!sessionStorage.getItem("registerbackoffice")) {
      sessionStorage.setItem("registerbackoffice", "2");
    }
  }, []);

  return children;
}

export function Router() {
  const { isAuthenticated } = useAuthBackoffice();
  const { isClientAuthenticated } = useClientAuth();

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/adm" element={<Navigate to="/signin/backoffice" replace />} />
      <Route path="/signin/backoffice/adm" element={<Navigate to="/signin/backoffice" replace />} />

      {/* Funil público GestorVix — sem formulário de senha */}
      <Route path="home" element={<GestorVixHome />} />

      {/* Rota pública: sessão expirada (sem proteção de auth) */}
      <Route path="session-expired/backoffice" element={<SessionExpiredBackoffice />} />

      <Route
        element={
          <GuardedRoute
            isRouteAccessible={!isClientAuthenticated}
            redirectRoute="/client/dashboard"
          />
        }
      >
        <Route path="signin/client" element={<ClientLogin />} />
        <Route path="signup/client" element={<ClientRegister />} />
        <Route path="forgot-password" element={<ClientForgotPassword />} />
      </Route>

      <Route
        element={
          <GuardedRoute
            isRouteAccessible={isClientAuthenticated}
            redirectRoute="/signin/client"
          />
        }
      >
        <Route path="client/dashboard" element={<ClientDashboard />} />
        <Route path="client/trocar-senha" element={<TrocarSenhaCliente />} />
        <Route path="client/caixa" element={<TrocarCaixa />} />
        <Route path="client/pdv" element={<ClientPdv />} />
        <Route path="client/loja" element={<ClientLoja />} />
        <Route path="client/clientes" element={<ClientesList />} />
        <Route path="client/clientes/inativos" element={<ClientesList inactive />} />
        <Route path="client/clientes/cadastrar" element={<ChecarCliente />} />
        <Route path="client/clientes/cadastrar/form" element={<CadastrarFormStub />} />
        <Route path="client/atividades" element={<RelatorioAtividades />} />
        <Route path="client/clientes/atividade" element={<RelatorioAtividades />} />
        <Route path="client/clientes/classificacao" element={<ClassificacaoClientes />} />
        <Route path="client/clientes/carteira/:code" element={<CadastrarFormStub />} />
        <Route path="client/clientes/carteira" element={<CarteiraClientes />} />
        <Route path="client/clientes/:id/:action" element={<CadastrarFormStub />} />
        <Route path="client/fornecedores" element={<FornecedoresList />} />
        <Route path="client/fornecedores/inativos" element={<FornecedoresList inactive />} />
        <Route path="client/fornecedores/cadastrar" element={<CadastrarFornecedor />} />
        <Route path="client/fornecedores/atividade" element={<RelatorioAtividades />} />
        <Route path="client/fornecedores/:id/compra" element={<CompraAcessorio />} />
        <Route path="client/fornecedores/:id/:action" element={<CadastrarFormStub entity="fornecedor" />} />
        <Route path="client/produtos" element={<ListarProdutos />} />
        <Route path="client/produtos/pesquisa-preco" element={<ListarProdutos />} />
        <Route path="client/produtos/cadastrar" element={<CadastrarProduto />} />
        <Route path="client/produtos/estoque/:categoryId" element={<AlterarEstoque />} />
        <Route path="client/produtos/estoque" element={<AlterarEstoque />} />
        <Route path="client/produtos/categorias/inativas" element={<ListarCategorias inactive />} />
        <Route path="client/produtos/categorias/cadastrar" element={<CadastrarCategoria />} />
        <Route path="client/produtos/categorias/reajuste" element={<ReajusteCategoria />} />
        <Route path="client/produtos/categorias" element={<ListarCategorias />} />
        <Route path="client/produtos/variacoes/tamanho/inativas" element={<ApoioList kind="tamanho" inactive />} />
        <Route path="client/produtos/variacoes/tamanho/cadastrar" element={<ApoioForm kind="tamanho" />} />
        <Route path="client/produtos/variacoes/tamanho" element={<ApoioList kind="tamanho" />} />
        <Route path="client/produtos/variacoes/cor/inativas" element={<ApoioList kind="cor" inactive />} />
        <Route path="client/produtos/variacoes/cor/cadastrar" element={<ApoioForm kind="cor" />} />
        <Route path="client/produtos/variacoes/cor" element={<ApoioList kind="cor" />} />
        <Route path="client/produtos/ncm/desatualizados" element={<NcmList outdated />} />
        <Route path="client/produtos/ncm" element={<NcmList />} />
        <Route path="client/produtos/marcas/inativas" element={<ApoioList kind="marca" inactive />} />
        <Route path="client/produtos/marcas/cadastrar" element={<ApoioForm kind="marca" />} />
        <Route path="client/produtos/marcas" element={<ApoioList kind="marca" />} />
        <Route path="client/produtos/promocoes/cadastrar" element={<PromocaoList mode="cadastrar" />} />
        <Route path="client/produtos/promocoes/aplicar" element={<PromocaoList mode="aplicar" />} />
        <Route path="client/produtos/promocoes/produtos" element={<PromocaoList mode="produtos" />} />
        <Route path="client/produtos/promocoes/finalizadas" element={<PromocaoList mode="finalizadas" />} />
        <Route path="client/produtos/promocoes" element={<PromocaoList />} />
        <Route path="client/produtos/localizacao/produtos" element={<LocalizacaoPage variant="produto" />} />
        <Route path="client/produtos/localizacao/setores" element={<LocalizacaoPage variant="setor" />} />
        <Route path="client/produtos/localizacao" element={<LocalizacaoPage />} />
        <Route path="client/produtos/colecoes/inativas" element={<ApoioList kind="colecao" inactive />} />
        <Route path="client/produtos/colecoes/cadastrar" element={<ApoioForm kind="colecao" />} />
        <Route path="client/produtos/colecoes" element={<ApoioList kind="colecao" />} />
        <Route path="client/produtos/generos/inativos" element={<ApoioList kind="genero" inactive />} />
        <Route path="client/produtos/generos/cadastrar" element={<ApoioForm kind="genero" />} />
        <Route path="client/produtos/generos" element={<ApoioList kind="genero" />} />
        <Route path="client/produtos/tabela-preco/cadastrar" element={<TabelaPrecoForm />} />
        <Route path="client/produtos/tabela-preco/inativas" element={<TabelaPrecoList inactive />} />
        <Route path="client/produtos/tabela-preco/lote" element={<TabelaPrecoList />} />
        <Route path="client/produtos/tabela-preco" element={<TabelaPrecoList />} />
        <Route path="client/produtos/unidades/cadastrar" element={<ApoioForm kind="unidade" />} />
        <Route path="client/produtos/unidades" element={<ApoioList kind="unidade" />} />
        <Route path="client/produtos/lotes" element={<LotePage />} />
        <Route path="client/produtos/tray" element={<TrayDownloadPage />} />
        <Route path="client/produtos/etiquetas" element={<EditorEtiquetasPage />} />
        {PdvModuleRoutes()}
      </Route>

      <Route
        element={
          <GuardedRoute
            isRouteAccessible={!isAuthenticated}
            redirectRoute={BACKOFFICE_ROUTE}
          />
        }
      >
        <Route path="signin/backoffice" element={<BackofficeSignIn />} />
      </Route>

      <Route
        element={
          <GuardedRoute
            isRouteAccessible={isAuthenticated}
            redirectRoute={LOGIN_ROUTE}
          />
        }
      >
        <Route
          path="/*"
          element={
            <RequireAuthBackoffice>
              <BackofficeLayout />
            </RequireAuthBackoffice>
          }
        >
          <Route path="backoffice" element={<Dashboard />} />
          <Route path="cadastro-lojistas" element={<GestorCadastroLojistas />} />
          <Route path="cadastro-produtos" element={<GestorCadastroProdutos />} />
          <Route path="cadastro-fornecedores" element={<GestorCadastroFornecedores />} />
          <Route path="cadastro-freteiros" element={<GestorCadastroFreteiros />} />
          <Route path="gerenciar-lojistas" element={<StoresList />} />
          <Route path="pdv-config" element={<PdvConfig />} />
          <Route path="clientes-comerciais/cadastrar" element={<CreateCommercialClient />} />
          <Route path="clientes-comerciais" element={<CommercialClientsList />} />
          <Route path="clientes-comerciais/:id" element={<CommercialClientDetail />} />
          <Route path="lojas/cadastrar" element={<CreateStore />} />
          <Route path="lojas" element={<StoresList />} />
          <Route path="lojas/:id/estoque" element={<StoreDetail />} />
          <Route path="lojas/:id/grupos-de-loja" element={<StoreParamStubPage kind="grupos" />} />
          <Route path="lojas/:id/estoque-compartilhado" element={<StoreParamStubPage kind="estoque" />} />
          <Route path="lojas/:id/plano" element={<StoreParamStubPage kind="plano" />} />
          <Route path="lojas/:id" element={<StoreLoja />} />
          <Route path="estoque" element={<StockOverview />} />
          <Route path="team" element={<Team />} />
          <Route path="users" element={<Contacts />} />
          <Route path="operators-management" element={<OperatorManager />} />
          {/* <Route path="operators-management2" element={<OperatorManager2 />} /> */}
          <Route path="invoices" element={<Invoices />} />
          <Route path="create-form-group" element={<FormGroup />} />
          <Route path="create-form-room" element={<FormRoom />} />
          <Route path="create-form-user" element={<FormUser />} />
          <Route path="cambioPage" element={<CambioPage />} />
          <Route path="invoices-management" element={<InvocesManagement />} />
          <Route path="tokens-management" element={<TokensManagement />} />
          <Route path="meu-perfil-operator" element={<OperatorsManagementPerfilEdit />} />
          <Route path="meu-perfil-master" element={<AdmManagementPerfilEdit />} />
          {/* <Route path="/backoffice/plans" element={<Plans />} />
            <Route path="/backoffice/transactions-pagbank" element={<TransactionsPagbank />} />
            <Route path="/backoffice/extracts-pagbank" element={<ExtractsPagbank />} />
            <Route path="/backoffice/signup-pf" element={<SignUpPfForBackoffice />} /> */}

          {/* <Route path="/backoffice/signup-pj" element={<SignUpPjForBackoffice />} /> */}

          {/* <Route path="/backoffice/forward-invoice-pagbank" element={<ForwardInvoicePagbank />} />
            <Route path="/backoffice/request-limits-users" element={<RequestLimitsWalllet />} />
            <Route path="/backoffice/transactions-pagbank/:id" element={<TransactionsPagbankDetails />} />
             */}
          {/* <Route index element={<HomeDash />} /> */}

          {/* <Route path="/backoffice/accounts" element={<Accounts />} />
            <Route path="/backoffice/get-transaction-delbank" element={<GetTrasactionsMaster />} />
            <Route path="/backoffice/accounts/wallet" element={<AccountsWallet />} />
            <Route path="/backoffice/accounts/ca" element={<AccountsCA />} />
            <Route path="/backoffice/accounts/:id" element={<Member />} />
            <Route path="/backoffice/upload/delbank/:id" element={<UploadDocumentsDelbank />} />
            <Route path="/backoffice/accounts/wallet/:id" element={<Wallet />} />
            <Route path="/backoffice/accounts/wallet/:id/extract" element={<WalletTransactions />} /> */}

          {/* <Route path="/backoffice/accounts/graphic/:id" element={<Graphic />} /> */}

          {/* <Route path="/backoffice/accounts/:id/tax" element={<AccountsDetailsTax />} />
            <Route path="/backoffice/accounts/wallet/:id/tax" element={<WalletDetailsTax />} /> */}

          {/* <Route path="/backoffice/transfers" element={<Transfers />} />

            <Route path="/backoffice/financial" element={<AccountsDetailsTransactions />} />

            <Route path="/backoffice/control-account" element={<ControlAccountsTransactions />} />
            <Route path="/backoffice/wallet/transactions" element={<TransactionsWallet />} />

            <Route path="/backoffice/accounts/:id/extract" element={<ContaAccounts />} />

            <Route path="/backoffice/config/persons" element={<ConfigPersons />} />
            <Route path="/backoffice/config/tax" element={<ConfigTax />} />
            <Route path="/backoffice/get-count-transactions" element={<CountTransactions />} />
            <Route path="/backoffice/config/tax/form" element={<FormConfigTax />} />
            <Route path="/backoffice/config/tax/form/:id" element={<FormConfigTax />} />
            <Route path="/backoffice/config/operators/form" element={<FormOperators />} />
            <Route path="/backoffice/config/operators/list" element={<ListOperators />} /> */}

          <Route path="logout" element={<Logout />} />
          {/* <Route path="/backoffice/tax" element={<TaxBackoffice />} />
            <Route path="/backoffice/support" element={<SupportBackoffice />} /> */}
        </Route>
      </Route>
      {/* <Route path="/logs/transactions/one" element={<LostTransactionsOneHour />} />
        <Route path="/logs/transactions/six" element={<LostTransactionsSixHours />} /> */}
    </Routes>
  );
}
