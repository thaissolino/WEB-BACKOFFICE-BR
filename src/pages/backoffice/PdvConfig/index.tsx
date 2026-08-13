import { usePremiumPage } from "../../../components/premium/PremiumPageShell";
import PdvConfigClassic from "./PdvConfigClassic";
import PremiumPdvConfig from "./PremiumPdvConfig";

export default function PdvConfig() {
  const premium = usePremiumPage("pdvConfig");
  return premium ? <PremiumPdvConfig /> : <PdvConfigClassic />;
}
