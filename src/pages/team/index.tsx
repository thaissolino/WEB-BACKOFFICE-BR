import { usePremiumPage } from "../../components/premium/PremiumPageShell";
import TeamClassic from "./TeamClassic";
import PremiumTeam from "./PremiumTeam";

export default function Team() {
  const premium = usePremiumPage("team");
  return premium ? <PremiumTeam /> : <TeamClassic />;
}
