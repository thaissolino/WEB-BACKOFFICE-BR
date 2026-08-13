import { usePremiumPage } from "../../components/premium/PremiumPageShell";
import AdmManagementPerfilEditClassic from "./AdmManagementPerfilEditClassic";
import PremiumProfile from "./PremiumProfile";

export default function AdmManagementPerfilEdit() {
  const premium = usePremiumPage("profile");
  return premium ? <PremiumProfile /> : <AdmManagementPerfilEditClassic />;
}
