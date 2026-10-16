export type NotinhaLine = {
  code: string;
  name: string;
  detail?: string;
  qty: string;
  amount: string;
};

export type Notinha = {
  code: string;
  issuedAt: string;
  seller?: string;
  clientName: string;
  clientMeta?: string;
  lines: NotinhaLine[];
  payment?: string;
  paymentMeta?: string;
  total: string;
  printedAt: string;
};

const CODE128_PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112",
];

function escapeHtml(value: string) {
  return String(value || "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch] || ch));
}

function barcodePng(value: string) {
  const codes = [104];
  for (const char of value) {
    const symbol = char.charCodeAt(0) - 32;
    if (symbol >= 0 && symbol <= 94) codes.push(symbol);
  }
  let checksum = codes[0];
  for (let index = 1; index < codes.length; index += 1) checksum += codes[index] * index;
  codes.push(checksum % 103, 106);

  const bars: { x: number; width: number }[] = [];
  let cursor = 0;
  codes.forEach((code) => {
    const pattern = CODE128_PATTERNS[code] || "";
    let ink = true;
    for (const part of pattern) {
      const width = Number(part);
      if (ink) bars.push({ x: cursor, width });
      cursor += width;
      ink = !ink;
    }
  });

  const scale = 3;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, cursor * scale);
  canvas.height = 46 * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#111111";
  bars.forEach((bar) => {
    ctx.fillRect(bar.x * scale, 0, Math.max(1, bar.width * scale), canvas.height);
  });
  return canvas.toDataURL("image/png");
}

function notinhaHtml(receipt: Notinha) {
  const code = String(receipt.code || "");
  const barcode = barcodePng(code);
  const items = (receipt.lines || [])
    .map((line) => {
      const name = [line.name, line.detail].filter(Boolean).join(" ");
      return `<tr><td class='c'>${escapeHtml(line.code)}</td><td class='q'>${escapeHtml(line.qty)}</td><td class='n'>${escapeHtml(name)}</td></tr>`;
    })
    .join("");
  return (
    `<!DOCTYPE html><html lang='pt-BR'><head><meta charset='utf-8'><title>Notinha ${escapeHtml(code)}</title>` +
      `<style>@page{size:80mm auto;margin:2mm 0}body{margin:0;font-family:Segoe UI,Arial,sans-serif;color:#141414;text-align:center}` +
      `.slip{width:72mm;margin:0 auto}.kicker{margin:0;font-size:10px;letter-spacing:.16em;text-transform:uppercase;text-align:center}` +
      `.barcode{display:block;width:60mm;height:14mm;margin:2mm auto 0;object-fit:fill;-webkit-print-color-adjust:exact;print-color-adjust:exact}` +
      `.code{margin:1mm 0 0;font-size:22px;font-weight:750;letter-spacing:.06em;text-align:center}.when{text-align:center;font-size:11px}` +
      `hr{border:0;border-top:1px solid #141414;margin:3mm 0}.label{margin:0;font-size:10px;letter-spacing:.16em;text-transform:uppercase;text-align:center}` +
      `.client{margin:1.5mm 0 0;font-size:13px;font-weight:700;text-align:center}` +
      `table.items{width:100%;border-collapse:collapse;text-align:left;margin:0}` +
      `table.items td{vertical-align:top;padding:0 0 2.5mm;font-size:12px;line-height:1.35}` +
      `table.items td.c{width:14mm;font-size:13px;font-weight:750;white-space:nowrap}` +
      `table.items td.q{width:14mm;white-space:nowrap}` +
      `table.items td.n{font-weight:700}</style></head><body>` +
      `<article class='slip'><p class='kicker'>Pedido</p>` +
      (barcode ? `<img class='barcode' alt='' src='${barcode}'>` : "") +
      `<p class='code'>${escapeHtml(code)}</p>` +
      `<p class='when'>${escapeHtml(receipt.issuedAt)}</p><hr>` +
      `<p class='label'>Cliente</p><p class='client'>${escapeHtml(receipt.clientName)}</p><hr>` +
      `<table class='items'>${items}</table>` +
      `</article></body></html>`
  );
}

function writeAndPrint(page: Window, html: string) {
  return new Promise<void>((resolve) => {
    let sent = false;
    const go = () => {
      if (sent || page.closed) return;
      sent = true;
      page.focus();
      page.print();
    };
    page.document.open();
    page.document.write(html);
    page.document.close();
    page.addEventListener("afterprint", () => resolve(), { once: true });
    window.setTimeout(resolve, 20000);
    const img = page.document.querySelector("img.barcode");
    if (img) {
      img.addEventListener("load", go);
      img.addEventListener("error", go);
    }
    window.setTimeout(go, 500);
  });
}

export function printNotinha(receipt: Notinha, mode: "popup" | "auto" = "popup") {
  const html = notinhaHtml(receipt);
  if (mode === "auto") {
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText = "position:fixed;left:-120mm;top:0;width:80mm;height:120mm;border:0";
    document.body.appendChild(frame);
    const page = frame.contentWindow;
    if (!page) {
      frame.remove();
      return Promise.reject(new Error("Não foi para a impressora."));
    }
    return writeAndPrint(page, html).finally(() => {
      window.setTimeout(() => frame.remove(), 1500);
    });
  }
  const page = window.open("", "notinha");
  if (!page) return Promise.reject(new Error("O navegador bloqueou a janela da notinha."));
  return writeAndPrint(page, html);
}
