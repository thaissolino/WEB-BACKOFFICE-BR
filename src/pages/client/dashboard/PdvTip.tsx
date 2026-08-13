import { ReactNode } from "react";

export default function PdvTip({
  label,
  title,
  text,
  rich,
  children,
}: {
  label: string;
  title?: string;
  text?: string;
  rich?: boolean;
  children: ReactNode;
}) {
  const isRich = Boolean(rich || title);

  return (
    <span className="pdv-tip">
      {children}
      <span className="pdv-tip-bubble" data-rich={isRich ? "true" : undefined} role="tooltip">
        {title ? <strong className="pdv-tip-title">{title}</strong> : null}
        <span>{text ?? label}</span>
      </span>
    </span>
  );
}
