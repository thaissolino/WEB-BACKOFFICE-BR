import { formatPhoneBr, normalizeUrlInput } from "../../../utils/brMasks";

export type PdvSupportContact = {
  label: string;
  phone: string;
};

export type PdvSupportChannels = {
  title: string;
  contacts: PdvSupportContact[];
  weekdayHours: string;
  weekendHours: string;
  portalUrl: string;
  ticketUrl: string;
  portalText: string;
  youtubeUrl: string;
  youtubeText: string;
};

export const FALLBACK_SUPPORT_CHANNELS: PdvSupportChannels = {
  title: "CANAIS DE ATENDIMENTO",
  contacts: [
    { label: "SUPORTE", phone: "(18) 98106-3553" },
    { label: "ADMINISTRATIVO", phone: "(18) 99689-2316" },
    { label: "COMERCIAL", phone: "(18) 99683-5870" },
  ],
  weekdayHours:
    "Atendimento comercial, administrativo e suporte de Segunda a Sexta-Feira das 8h às 18h.",
  weekendHours:
    "Plantão de suporte somente aos finais de semana e feriados das 8h às 22h (Atendimento apenas pelo celular 18 98106-3553).",
  portalUrl: "",
  ticketUrl: "",
  portalText:
    "Acesse o nosso {PORTAL} para acompanhar suas requisições ou clique {AQUI} para abrir um novo Ticket (Requisição) de atendimento!",
  youtubeUrl: "",
  youtubeText:
    "Não deixe de acompanhar o nosso canal no YOUTUBE, a maneira mais fácil de ficar por dentro de todas as funcionalidades do GestorVix! Conteúdo novo toda semana!",
};

function asString(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function rebrandProductName(text: string) {
  return text.replace(/\bWM10\b/g, "GestorVix");
}

function cloneContacts(contacts: PdvSupportContact[]) {
  return contacts.map((item) => ({ ...item }));
}

export function normalizeSupportChannels(
  data: Partial<PdvSupportChannels> | null | undefined,
): PdvSupportChannels {
  const incoming = Array.isArray(data?.contacts) ? data.contacts : [];
  const contacts = FALLBACK_SUPPORT_CHANNELS.contacts.map((item, index) => {
    const row = incoming[index];
    return {
      label: asString(row?.label, item.label).trim() || item.label,
      phone: formatPhoneBr(asString(row?.phone, item.phone).trim()) || item.phone,
    };
  });

  return {
    title: asString(data?.title, FALLBACK_SUPPORT_CHANNELS.title).trim() || FALLBACK_SUPPORT_CHANNELS.title,
    contacts,
    weekdayHours:
      asString(data?.weekdayHours, FALLBACK_SUPPORT_CHANNELS.weekdayHours).trim() ||
      FALLBACK_SUPPORT_CHANNELS.weekdayHours,
    weekendHours:
      asString(data?.weekendHours, FALLBACK_SUPPORT_CHANNELS.weekendHours).trim() ||
      FALLBACK_SUPPORT_CHANNELS.weekendHours,
    portalUrl: asString(data?.portalUrl, FALLBACK_SUPPORT_CHANNELS.portalUrl).trim(),
    ticketUrl: asString(data?.ticketUrl, FALLBACK_SUPPORT_CHANNELS.ticketUrl).trim(),
    portalText:
      asString(data?.portalText, FALLBACK_SUPPORT_CHANNELS.portalText).trim() ||
      FALLBACK_SUPPORT_CHANNELS.portalText,
    youtubeUrl: asString(data?.youtubeUrl, FALLBACK_SUPPORT_CHANNELS.youtubeUrl).trim(),
    youtubeText:
      rebrandProductName(
        asString(data?.youtubeText, FALLBACK_SUPPORT_CHANNELS.youtubeText).trim() ||
          FALLBACK_SUPPORT_CHANNELS.youtubeText,
      ),
  };
}

export function emptySupportChannels(): PdvSupportChannels {
  return {
    ...FALLBACK_SUPPORT_CHANNELS,
    contacts: cloneContacts(FALLBACK_SUPPORT_CHANNELS.contacts),
  };
}

export function phoneToWhatsAppHref(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "#";
  if (digits.startsWith("55") && digits.length >= 12) return `https://wa.me/${digits}`;
  if (digits.length >= 10 && digits.length <= 11) return `https://wa.me/55${digits}`;
  return `https://wa.me/${digits}`;
}

export function supportChannelsPayload(config: PdvSupportChannels) {
  return {
    title: config.title.trim(),
    contacts: config.contacts.map((item) => ({
      label: item.label.trim(),
      phone: formatPhoneBr(item.phone),
    })),
    weekdayHours: config.weekdayHours.trim(),
    weekendHours: config.weekendHours.trim(),
    portalUrl: normalizeUrlInput(config.portalUrl),
    ticketUrl: normalizeUrlInput(config.ticketUrl),
    portalText: config.portalText.trim(),
    youtubeUrl: normalizeUrlInput(config.youtubeUrl),
    youtubeText: config.youtubeText.trim(),
  };
}
