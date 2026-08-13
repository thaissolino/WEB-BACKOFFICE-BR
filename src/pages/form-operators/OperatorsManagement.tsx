import { usePremiumPage } from "../../components/premium/PremiumPageShell";
import OperatorsManagementClassic from "./OperatorsManagementClassic";
import PremiumOperators from "./PremiumOperators";

export default function OperatorManager() {
  const premium = usePremiumPage("operators");
  return premium ? <PremiumOperators /> : <OperatorsManagementClassic />;
}
