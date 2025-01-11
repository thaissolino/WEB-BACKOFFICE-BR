import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Layout as BackofficeLayout} from "../pages/backoffice/Layout/base";
import { SignIn as BackofficeSignIn } from "../pages/backoffice/SignIn";
import { useAuthBackoffice } from "../hooks/authBackoffice";
import { Logout } from "../pages/backoffice/Logout";
import GuardedRoute from "./GuardedRoute";
import { JSX, useEffect } from "react";

const BACKOFFICE_ROUTE = "/backoffice";
const LOGIN_ROUTE = "/signin/backoffice";


function RequireAuthBackoffice({ children }: { children: JSX.Element }) {
  useEffect(() => {
    function clearStorage() {
      const session = sessionStorage.getItem("registerbackoffice");
      console.log("teste");
      if (session == null) {
        console.log("qwdqwe");
        localStorage.removeItem("@backoffice:token");
        localStorage.removeItem("@backoffice:user");
        localStorage.removeItem("@backofficev2:token");
      }
      sessionStorage.setItem("registerbackoffice", "2");
    }
    window.addEventListener("load", clearStorage);
  }, []);

  return children;
}

export function Router() {
  const { isAuthenticated, onLogout } = useAuthBackoffice();

  return (
      <Routes>
        {/* Rotas quando faz o login */}

        <Route
          element={
            <GuardedRoute
              isRouteAccessible={!isAuthenticated}
              redirectRoute={isAuthenticated ? BACKOFFICE_ROUTE : LOGIN_ROUTE}
            />
          }
        >
          <Route path="/" element={<BackofficeSignIn />} />
        </Route>

        <Route element={<GuardedRoute isRouteAccessible={isAuthenticated} redirectRoute={"/backoffice"} />}>
          <Route
            path="/backoffice"
            element={
              <RequireAuthBackoffice>
                <BackofficeLayout />
              </RequireAuthBackoffice>
            }
          >
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

            <Route path="/backoffice/logout" element={<Logout />} />
            {/* <Route path="/backoffice/tax" element={<TaxBackoffice />} />
            <Route path="/backoffice/support" element={<SupportBackoffice />} /> */}
          </Route>
        </Route>
        {/* <Route path="/logs/transactions/one" element={<LostTransactionsOneHour />} />
        <Route path="/logs/transactions/six" element={<LostTransactionsSixHours />} /> */}
      </Routes>
  );
}
