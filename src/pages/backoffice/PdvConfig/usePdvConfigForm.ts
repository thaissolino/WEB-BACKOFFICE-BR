import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../../services/api";
import {
  normalizeSignupConfig,
  type PdvLoginIdentifier,
  type PdvSignupConfig,
  type PdvSignupFields,
} from "../../client/vitrine/signupConfig";
import {
  emptySupportChannels,
  normalizeSupportChannels,
  supportChannelsPayload,
  type PdvSupportChannels,
} from "../../client/dashboard/supportChannels";
import { EMPTY_PDV_UI_CONFIG, normalizePdvUiConfig, type PdvUiConfig } from "../../client/dashboard/pdvUiConfig";
import { formatPhoneBr } from "../../../utils/brMasks";

type Baseline = {
  signup: string;
  support: string;
  ui: string;
};

function signupSnapshot(loginIdentifier: PdvLoginIdentifier, fields: PdvSignupFields) {
  return JSON.stringify({ loginIdentifier, fields });
}

function supportSnapshot(support: PdvSupportChannels) {
  return JSON.stringify(supportChannelsPayload(support));
}

function uiSnapshot(uiConfig: PdvUiConfig) {
  const next = normalizePdvUiConfig(uiConfig);
  return JSON.stringify({
    nav: next.nav,
    menus: next.menus,
    dashboard: next.dashboard,
    configModal: next.configModal,
  });
}

function makeBaseline(
  loginIdentifier: PdvLoginIdentifier,
  fields: PdvSignupFields,
  support: PdvSupportChannels,
  uiConfig: PdvUiConfig,
): Baseline {
  return {
    signup: signupSnapshot(loginIdentifier, fields),
    support: supportSnapshot(support),
    ui: uiSnapshot(uiConfig),
  };
}

export function usePdvConfigForm() {
  const [fields, setFields] = useState<PdvSignupFields | null>(null);
  const [loginIdentifier, setLoginIdentifier] = useState<PdvLoginIdentifier>("EMAIL");
  const [support, setSupport] = useState<PdvSupportChannels>(() => emptySupportChannels());
  const [uiConfig, setUiConfig] = useState<PdvUiConfig>(() => normalizePdvUiConfig(EMPTY_PDV_UI_CONFIG));
  const [baseline, setBaseline] = useState<Baseline | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      api.get("/backoffice/pdv-signup-config"),
      api.get("/backoffice/pdv-support-config"),
      api.get("/backoffice/pdv-ui-config"),
    ])
      .then(([signup, supportResult, uiResult]) => {
        if (!active) return;

        let nextFields: PdvSignupFields | null = null;
        let nextLogin: PdvLoginIdentifier = "EMAIL";
        if (signup.status === "fulfilled") {
          const config = normalizeSignupConfig(signup.value.data as PdvSignupConfig);
          nextFields = config.fields;
          nextLogin = config.loginIdentifier;
          setFields(config.fields);
          setLoginIdentifier(config.loginIdentifier);
        } else {
          setError("Não foi possível carregar a configuração do PDV.");
        }

        const nextSupport =
          supportResult.status === "fulfilled"
            ? normalizeSupportChannels(supportResult.value.data)
            : emptySupportChannels();
        setSupport(nextSupport);

        const nextUi = normalizePdvUiConfig(
          uiResult.status === "fulfilled" ? uiResult.value.data : EMPTY_PDV_UI_CONFIG,
        );
        setUiConfig(nextUi);

        if (nextFields) {
          setBaseline(makeBaseline(nextLogin, nextFields, nextSupport, nextUi));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const current = useMemo(() => {
    if (!fields) return null;
    return makeBaseline(loginIdentifier, fields, support, uiConfig);
  }, [fields, loginIdentifier, support, uiConfig]);

  const dirtySignup = Boolean(current && baseline && current.signup !== baseline.signup);
  const dirtySupport = Boolean(current && baseline && current.support !== baseline.support);
  const dirtyUi = Boolean(current && baseline && current.ui !== baseline.ui);
  const dirty = dirtySignup || dirtySupport || dirtyUi;
  const canSave = Boolean(fields) && dirty && !saving;

  const setSupportField = useCallback(<K extends keyof PdvSupportChannels>(key: K, value: PdvSupportChannels[K]) => {
    setSupport((currentSupport) => ({ ...currentSupport, [key]: value }));
  }, []);

  const setContact = useCallback((index: number, key: "label" | "phone", value: string) => {
    const nextValue = key === "phone" ? formatPhoneBr(value) : value;
    setSupport((currentSupport) => ({
      ...currentSupport,
      contacts: currentSupport.contacts.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: nextValue } : item,
      ),
    }));
  }, []);

  const save = useCallback(async () => {
    if (!fields || !current || !baseline || saving) return false;
    if (!dirtySignup && !dirtySupport && !dirtyUi) return false;

    setSaving(true);
    setError("");
    setSuccess("");

    const uiPayload = normalizePdvUiConfig(uiConfig);

    try {
      const tasks: Promise<unknown>[] = [];
      if (dirtySignup) {
        tasks.push(
          api.put("/backoffice/pdv-signup-config", {
            loginIdentifier,
            showName: fields.name,
            showUsername: fields.username,
            showAge: fields.age,
            showSex: fields.sex,
          }),
        );
      }
      if (dirtySupport) {
        tasks.push(api.put("/backoffice/pdv-support-config", supportChannelsPayload(support)));
      }
      const uiRequest = dirtyUi
        ? api.put("/backoffice/pdv-ui-config", {
            nav: uiPayload.nav,
            menus: uiPayload.menus,
            dashboard: uiPayload.dashboard,
            configModal: uiPayload.configModal,
          })
        : null;
      if (uiRequest) tasks.push(uiRequest);

      await Promise.all(tasks);
      const savedUi = uiRequest
        ? normalizePdvUiConfig((await uiRequest).data)
        : uiPayload;

      if (dirtyUi) setUiConfig(savedUi);
      setBaseline(makeBaseline(loginIdentifier, fields, support, dirtyUi ? savedUi : uiConfig));
      setSuccess("Configuração salva. Cadastro, canais e visibilidade já estão publicados.");
      return true;
    } catch {
      setError("Não foi possível salvar. Tente de novo.");
      return false;
    } finally {
      setSaving(false);
    }
  }, [baseline, current, dirtySignup, dirtySupport, dirtyUi, fields, loginIdentifier, saving, support, uiConfig]);

  return {
    fields,
    setFields,
    loginIdentifier,
    setLoginIdentifier,
    support,
    setSupportField,
    setContact,
    uiConfig,
    setUiConfig,
    loading,
    saving,
    error,
    success,
    setError,
    setSuccess,
    dirty,
    canSave,
    save,
  };
}
