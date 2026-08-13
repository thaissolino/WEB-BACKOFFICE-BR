import { usePremiumPage } from "../../components/premium/PremiumPageShell";
import FormUserClassic from "./FormUserClassic";
import PremiumFormUser from "./PremiumFormUser";

export default function FormUser() {
  const premium = usePremiumPage("createUser");
  return premium ? <PremiumFormUser /> : <FormUserClassic />;
}
