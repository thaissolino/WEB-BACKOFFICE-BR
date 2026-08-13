import { useEffect, useState } from "react";
import { api } from "../../../services/api";
import { FALLBACK_SIGNUP_CONFIG, normalizeSignupConfig, type PdvSignupConfig } from "./signupConfig";

export function usePdvSignupConfig() {
  const [config, setConfig] = useState<PdvSignupConfig | null>(null);

  useEffect(() => {
    let active = true;
    api
      .get("/clients/signup-config")
      .then(({ data }) => {
        if (active) setConfig(normalizeSignupConfig(data));
      })
      .catch(() => {
        if (active) setConfig(FALLBACK_SIGNUP_CONFIG);
      });
    return () => {
      active = false;
    };
  }, []);

  return config;
}
