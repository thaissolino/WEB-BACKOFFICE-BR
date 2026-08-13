export type PdvLoginIdentifier = "EMAIL" | "DOCUMENT";

export type PdvSignupFields = {
  name: boolean;
  username: boolean;
  age: boolean;
  sex: boolean;
};

export type PdvSignupConfig = {
  loginIdentifier: PdvLoginIdentifier;
  alwaysRequired: ["password"];
  fields: PdvSignupFields;
  identifier: {
    email: boolean;
    document: boolean;
  };
  usernameFallback: "derived_from_email" | "derived_from_document";
  hiddenFieldDefaults: {
    name: string;
    username: string;
    email: string;
    document: string;
    age: number;
    sex: string;
  };
};

export const FALLBACK_SIGNUP_CONFIG: PdvSignupConfig = {
  loginIdentifier: "EMAIL",
  alwaysRequired: ["password"],
  fields: {
    name: true,
    username: true,
    age: false,
    sex: false,
  },
  identifier: {
    email: true,
    document: false,
  },
  usernameFallback: "derived_from_email",
  hiddenFieldDefaults: {
    name: "parte local do e-mail",
    username: "gerado a partir do e-mail",
    email: "informado pelo lojista",
    document: "placeholder único PDV-...",
    age: 0,
    sex: "OUTRO",
  },
};

export function normalizeSignupConfig(data: Partial<PdvSignupConfig> | null | undefined): PdvSignupConfig {
  const loginIdentifier = data?.loginIdentifier === "DOCUMENT" ? "DOCUMENT" : "EMAIL";
  return {
    ...FALLBACK_SIGNUP_CONFIG,
    ...data,
    loginIdentifier,
    fields: {
      ...FALLBACK_SIGNUP_CONFIG.fields,
      ...(data?.fields || {}),
    },
    identifier: {
      email: loginIdentifier === "EMAIL",
      document: loginIdentifier === "DOCUMENT",
    },
  };
}

export const SIGNUP_FIELD_META: Array<{
  key: keyof PdvSignupFields;
  label: string;
  description: string;
}> = [
  { key: "name", label: "Nome", description: "Nome do lojista ou responsável." },
  { key: "username", label: "Usuário", description: "Se desligado, o usuário é gerado a partir do identificador de login." },
  { key: "age", label: "Idade", description: "Pouco usual em PDV de loja. Desligado por padrão." },
  { key: "sex", label: "Sexo", description: "Pouco usual em PDV de loja. Desligado por padrão." },
];

export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}
