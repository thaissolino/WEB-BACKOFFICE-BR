export const LOGO_STYLES = [
  { id: "selo", label: "Selo comercial" },
  { id: "wordmark", label: "Nome em linha" },
  { id: "monograma", label: "Monograma" },
  { id: "faixa", label: "Faixa de loja" },
  { id: "placa", label: "Placa de fachada" },
  { id: "marca", label: "Marca ao lado" },
] as const

export type LogoStyleId = (typeof LOGO_STYLES)[number]["id"]

export const LOGO_STYLE_IDS = LOGO_STYLES.map((item) => item.id) as [LogoStyleId, ...LogoStyleId[]]

function esc(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function clampName(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 42)
}

function initialsOf(name: string) {
  const parts = clampName(name)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
  if (parts.length === 0) return "LJ"
  return parts.map((part) => part[0]!.toUpperCase()).join("")
}

function nameSize(name: string) {
  if (name.length <= 10) return 52
  if (name.length <= 18) return 38
  if (name.length <= 28) return 30
  return 24
}

function hexOk(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value.toLowerCase() : "#1e3a5f"
}

function mix(hex: string, toward: string, amount: number) {
  const parse = (value: string) => [
    parseInt(value.slice(1, 3), 16),
    parseInt(value.slice(3, 5), 16),
    parseInt(value.slice(5, 7), 16),
  ]
  const a = parse(hex)
  const b = parse(toward)
  const ch = (i: number) => Math.round(a[i]! + (b[i]! - a[i]!) * amount)
  return `#${[ch(0), ch(1), ch(2)].map((n) => n.toString(16).padStart(2, "0")).join("")}`
}

function inkOn(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const luma = (r * 299 + g * 587 + b * 114) / 1000
  return luma > 150 ? "#1a1511" : "#f4f1ea"
}

export function generateStoreLogoSvg(input: {
  name: string
  slogan?: string
  color: string
  style: LogoStyleId
}) {
  const name = clampName(input.name) || "Minha loja"
  const slogan = clampName(input.slogan ?? "")
  const color = hexOk(input.color)
  const paper = "#f4f1ea"
  const ink = "#1a1511"
  const dark = mix(color, "#0b1220", 0.35)
  const onColor = inkOn(color)
  const letters = initialsOf(name)
  const title = esc(name)
  const tag = esc(slogan)
  const init = esc(letters)
  const nSize = nameSize(name)

  if (input.style === "selo") {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 360" width="320" height="360" role="img" aria-label="${title}">
  <rect width="320" height="360" fill="${paper}"/>
  <circle cx="160" cy="150" r="118" fill="${dark}"/>
  <circle cx="160" cy="150" r="104" fill="${color}"/>
  <circle cx="160" cy="150" r="92" fill="none" stroke="${paper}" stroke-width="3"/>
  <text x="160" y="168" text-anchor="middle" fill="${onColor}" font-family="Verdana, Geneva, sans-serif" font-size="72" font-weight="700" letter-spacing="2">${init}</text>
  <text x="160" y="292" text-anchor="middle" fill="${ink}" font-family="Arial, Helvetica, sans-serif" font-size="${Math.min(nSize, 28)}" font-weight="700">${title}</text>
  ${slogan ? `<text x="160" y="322" text-anchor="middle" fill="${dark}" font-family="Arial, Helvetica, sans-serif" font-size="14">${tag}</text>` : ""}
</svg>`
  }

  if (input.style === "monograma") {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 280" width="280" height="280" role="img" aria-label="${title}">
  <rect width="280" height="280" fill="${paper}"/>
  <rect x="24" y="24" width="232" height="232" rx="18" fill="${color}"/>
  <rect x="40" y="40" width="200" height="200" rx="8" fill="none" stroke="${paper}" stroke-width="2"/>
  <text x="140" y="162" text-anchor="middle" fill="${onColor}" font-family="Georgia, 'Times New Roman', serif" font-size="92" font-weight="700">${init}</text>
</svg>`
  }

  if (input.style === "faixa") {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 180" width="720" height="180" role="img" aria-label="${title}">
  <rect width="720" height="180" fill="${color}"/>
  <rect x="0" y="10" width="720" height="4" fill="${paper}" opacity="0.85"/>
  <rect x="0" y="166" width="720" height="4" fill="${paper}" opacity="0.85"/>
  <text x="360" y="${slogan ? 88 : 104}" text-anchor="middle" fill="${onColor}" font-family="Arial, Helvetica, sans-serif" font-size="${nSize}" font-weight="700" letter-spacing="1">${title}</text>
  ${slogan ? `<text x="360" y="126" text-anchor="middle" fill="${onColor}" font-family="Arial, Helvetica, sans-serif" font-size="16" opacity="0.9">${tag}</text>` : ""}
</svg>`
  }

  if (input.style === "placa") {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 220" width="560" height="220" role="img" aria-label="${title}">
  <rect width="560" height="220" fill="${paper}"/>
  <rect x="16" y="16" width="528" height="188" rx="6" fill="${dark}"/>
  <rect x="28" y="28" width="504" height="164" rx="3" fill="${color}"/>
  <text x="280" y="${slogan ? 108 : 124}" text-anchor="middle" fill="${onColor}" font-family="Verdana, Geneva, sans-serif" font-size="${nSize}" font-weight="700">${title}</text>
  ${slogan ? `<rect x="28" y="148" width="504" height="44" fill="${dark}"/><text x="280" y="176" text-anchor="middle" fill="${paper}" font-family="Arial, Helvetica, sans-serif" font-size="16">${tag}</text>` : ""}
</svg>`
  }

  if (input.style === "marca") {
    const hex = "140,40 200,74 200,146 140,180 80,146 80,74"
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 220" width="720" height="220" role="img" aria-label="${title}">
  <rect width="720" height="220" fill="${paper}"/>
  <polygon points="${hex}" fill="${color}"/>
  <text x="140" y="128" text-anchor="middle" fill="${onColor}" font-family="Verdana, Geneva, sans-serif" font-size="36" font-weight="700">${init}</text>
  <text x="236" y="${slogan ? 108 : 122}" fill="${ink}" font-family="Arial, Helvetica, sans-serif" font-size="${Math.min(nSize, 42)}" font-weight="700">${title}</text>
  ${slogan ? `<text x="236" y="142" fill="${dark}" font-family="Arial, Helvetica, sans-serif" font-size="16">${tag}</text>` : ""}
  <rect x="236" y="158" width="72" height="4" fill="${color}"/>
</svg>`
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 180" width="720" height="180" role="img" aria-label="${title}">
  <rect width="720" height="180" fill="${paper}"/>
  <rect x="24" y="36" width="108" height="108" fill="${color}"/>
  <text x="78" y="106" text-anchor="middle" fill="${onColor}" font-family="Verdana, Geneva, sans-serif" font-size="36" font-weight="700">${init}</text>
  <text x="152" y="${slogan ? 92 : 108}" fill="${ink}" font-family="Arial, Helvetica, sans-serif" font-size="${Math.min(nSize, 40)}" font-weight="700">${title}</text>
  ${slogan ? `<text x="152" y="124" fill="${dark}" font-family="Arial, Helvetica, sans-serif" font-size="16">${tag}</text>` : ""}
  <rect x="152" y="140" width="88" height="5" fill="${color}"/>
</svg>`
}
