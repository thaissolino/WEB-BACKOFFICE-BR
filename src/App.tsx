import { Hooks } from "./hooks";
import { Router } from "./routes/authenticatedRoutes";
import "./styles/index.css";
import { Notification } from "./components/notifications";

function App() {
  return (
    <>
      <Hooks>
        <Router />
        <Notification />
      </Hooks>
    </>
  );
}

export default App;

//teste git hub
