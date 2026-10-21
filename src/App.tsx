import { Hooks } from "./hooks";
import { Router } from "./routes/authenticatedRoutes";
import "./styles/index.css";
import { Notification } from "./components/notifications";
import { AvisoSalvo } from "./pages/client/avisoSalvo";

function App() {
  return (
    <>
      <Hooks>
        <Router />
        <Notification />
        <AvisoSalvo />
      </Hooks>
    </>
  );
}

export default App;

//teste git hub
