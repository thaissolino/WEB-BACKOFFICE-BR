import React from "react";
import ClassicDashboard from "./ClassicDashboard";
import PremiumDashboard from "./PremiumDashboard";
import { useUiModeStore } from "../../store/uiModeStore";

const Dashboard: React.FC = () => {
  const globalMode = useUiModeStore((state) => state.globalMode);
  const dashboardOn = useUiModeStore((state) => state.pages.dashboard);
  const premium = globalMode === "premium" && dashboardOn;

  return premium ? <PremiumDashboard /> : <ClassicDashboard />;
};

export default Dashboard;
