(function () {
  function plain(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[\^~\\]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"]/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch];
    });
  }

  function print(receipt) {
    const items = (receipt.lines || []).map(function (line) {
      return (
        "<p class='sku'>" + escapeHtml(line.code) + "</p>" +
        "<p class='name'>" + escapeHtml(line.name) + "</p>" +
        (line.detail ? "<p class='detail'>" + escapeHtml(line.detail) + "</p>" : "") +
        "<p class='qty'>" + escapeHtml(line.qty) + "</p>"
      );
    }).join("");
    const page = window.open("", "notinha");
    if (!page) throw new Error("O navegador bloqueou a janela da notinha.");
    page.document.open();
    page.document.write(
      "<!DOCTYPE html><html lang='pt-BR'><head><meta charset='utf-8'><title>Notinha " + escapeHtml(receipt.code) + "</title>" +
      "<style>@page{size:80mm auto;margin:4mm}body{margin:0;font-family:Segoe UI,Arial,sans-serif;color:#141414}" +
      ".slip{width:72mm}.kicker{margin:0;font-size:10px;letter-spacing:.16em;text-transform:uppercase;text-align:center}" +
      ".code{margin:1mm 0 0;font-size:28px;font-weight:750;text-align:center}.when{text-align:center;font-size:11px}" +
      "hr{border:0;border-top:1px solid #141414;margin:3mm 0}.label{margin:0;font-size:10px;letter-spacing:.16em;text-transform:uppercase}" +
      ".client{margin:1.5mm 0 0;font-size:13px;font-weight:700}.meta,.detail{margin:.5mm 0 0;font-size:11px;color:#4a4a4a}" +
      ".sku{margin:0;font-weight:700}.name{margin:1mm 0 0;font-size:13px;font-weight:650}.qty{margin:1mm 0 0;font-size:12px}</style></head><body>" +
      "<article class='slip'><p class='kicker'>Pedido</p><p class='code'>" + escapeHtml(receipt.code) + "</p>" +
      "<p class='when'>" + escapeHtml(receipt.issuedAt) + "</p><hr>" +
      "<p class='label'>Cliente</p><p class='client'>" + escapeHtml(receipt.clientName) + "</p>" +
      "<p class='meta'>" + escapeHtml(receipt.clientMeta || "") + "</p><hr>" + items +
      "</article></body></html>"
    );
    page.document.close();
    page.focus();
    page.print();
  }

  function sample() {
    return {
      code: "549961",
      issuedAt: "01/10/2026 · 22:38",
      seller: "Ateletronicos",
      clientName: "AT Eletronicos",
      clientMeta: "176824 · Rio de Janeiro",
      lines: [
        {
          code: "34129",
          name: "iPhone 18 Pro Max 256GB",
          detail: "Bordo / vinho",
          qty: "1 un",
          amount: "",
        },
      ],
      payment: "",
      paymentMeta: "",
      total: "",
      printedAt: "",
    };
  }

  window.NotinhaZebra = { print: print, sample: sample };
})();
