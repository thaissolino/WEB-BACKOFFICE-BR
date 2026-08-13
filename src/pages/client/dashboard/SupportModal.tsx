import { Headphones, Youtube } from "lucide-react";
import { MouseEvent, ReactNode } from "react";
import PdvOverlayModal from "./PdvOverlayModal";
import { phoneToWhatsAppHref } from "./supportChannels";
import { usePdvSupportChannels } from "./usePdvSupportChannels";

function WhatsAppMark() {
  return (
    <span className="pdv-wa" aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        <path
          fill="currentColor"
          d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
        />
      </svg>
    </span>
  );
}

function SupportLink({ href, children }: { href: string; children: ReactNode }) {
  const url = href.trim();

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!url) event.preventDefault();
  }

  return (
    <a
      className="pdv-sup-link"
      href={url || "#"}
      target={url ? "_blank" : undefined}
      rel={url ? "noopener noreferrer" : undefined}
      onClick={onClick}
    >
      {children}
    </a>
  );
}

const PORTAL_TOKEN_RE = /(\{PORTAL\}|\{AQUI\}|PORTAL|AQUI)/g;

function PortalSentence({
  text,
  portalUrl,
  ticketUrl,
}: {
  text: string;
  portalUrl: string;
  ticketUrl: string;
}) {
  const parts = text.split(PORTAL_TOKEN_RE);
  return (
    <p className="pdv-sup-ticket">
      {parts.map((part, index) => {
        if (part === "{PORTAL}" || part === "PORTAL") {
          return (
            <SupportLink key={`portal-${index}`} href={portalUrl}>
              PORTAL
            </SupportLink>
          );
        }
        if (part === "{AQUI}" || part === "AQUI") {
          return (
            <SupportLink key={`aqui-${index}`} href={ticketUrl}>
              AQUI
            </SupportLink>
          );
        }
        return <span key={`text-${index}`}>{part}</span>;
      })}
    </p>
  );
}

function YoutubeSentence({ text }: { text: string }) {
  const parts = text.split(/(YOUTUBE)/g);
  return (
    <>
      {parts.map((part, index) =>
        part === "YOUTUBE" ? <strong key={`yt-${index}`}>YOUTUBE</strong> : <span key={`yt-text-${index}`}>{part}</span>,
      )}
    </>
  );
}

export default function SupportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const config = usePdvSupportChannels(open);

  return (
    <PdvOverlayModal
      open={open}
      title={config.title}
      titleId="pdv-support-title"
      size="support"
      icon={<Headphones size={18} strokeWidth={2.2} />}
      onClose={onClose}
    >
      <div className="pdv-sup-block">
        <p className="pdv-sup-kicker">Telefones:</p>
        <div className="pdv-sup-phones">
          {config.contacts.map((phone) => {
            const href = phoneToWhatsAppHref(phone.phone);
            return (
              <a
                className="pdv-sup-phone"
                key={`${phone.label}-${phone.phone}`}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${phone.label}: ${phone.phone}. Abrir WhatsApp`}
              >
                <span className="pdv-sup-role">{phone.label}:</span>
                <span className="pdv-sup-num">{phone.phone}</span>
                <WhatsAppMark />
              </a>
            );
          })}
        </div>
        <p className="pdv-sup-hours">{config.weekdayHours}</p>
        <p className="pdv-sup-hours">{config.weekendHours}</p>
        <PortalSentence text={config.portalText} portalUrl={config.portalUrl} ticketUrl={config.ticketUrl} />
        {config.youtubeUrl ? (
          <a
            className="pdv-sup-tube"
            href={config.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Abrir canal no YouTube"
          >
            <span className="pdv-yt" aria-hidden="true">
              <Youtube size={22} strokeWidth={2.1} />
            </span>
            <span>
              <YoutubeSentence text={config.youtubeText} />
            </span>
          </a>
        ) : (
          <p className="pdv-sup-tube">
            <span className="pdv-yt" aria-hidden="true">
              <Youtube size={22} strokeWidth={2.1} />
            </span>
            <span>
              <YoutubeSentence text={config.youtubeText} />
            </span>
          </p>
        )}
      </div>
    </PdvOverlayModal>
  );
}
