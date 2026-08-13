import { useEffect, useState } from "react";
import { api } from "../../../services/api";
import {
  FALLBACK_SUPPORT_CHANNELS,
  emptySupportChannels,
  normalizeSupportChannels,
  type PdvSupportChannels,
} from "./supportChannels";

export function usePdvSupportChannels(enabled = true) {
  const [config, setConfig] = useState<PdvSupportChannels>(() => emptySupportChannels());

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    api
      .get("/clients/support-channels")
      .then(({ data }) => {
        if (active) setConfig(normalizeSupportChannels(data));
      })
      .catch(() => {
        if (active) setConfig(normalizeSupportChannels(FALLBACK_SUPPORT_CHANNELS));
      });
    return () => {
      active = false;
    };
  }, [enabled]);

  return config;
}
