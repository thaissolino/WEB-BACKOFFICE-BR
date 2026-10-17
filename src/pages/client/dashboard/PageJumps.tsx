import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { ArrowDown, ArrowUp } from "lucide-react";

export function scrollPageToTop() {
  const node = scrollBox();
  if (node) node.scrollTop = 0;
  window.scrollTo(0, 0);
}

function scrollBox() {
  return (
    document.getElementById("pdv-main") ||
    document.querySelector<HTMLElement>(".pdv-chrome-main") ||
    document.querySelector<HTMLElement>(".app .content") ||
    (document.scrollingElement as HTMLElement | null)
  );
}

function arrowTop(node: HTMLElement) {
  const box = node.getBoundingClientRect();
  const header = node.querySelector<HTMLElement>(":scope > .pdv-chrome-header");
  if (header) return Math.max(8, box.top + header.getBoundingClientRect().height + 8);
  if (node.classList.contains("content") && node.scrollTop < 8 && node.firstElementChild) {
    return Math.max(8, box.top + node.firstElementChild.getBoundingClientRect().height + 8);
  }
  return Math.max(8, box.top + 8);
}

export function PageJumps() {
  const location = useLocation();
  const [edge, setEdge] = useState({ spot: "none" as "none" | "top" | "mid" | "bottom", top: 120 });

  useEffect(() => {
    const main = scrollBox();
    if (!main) return;
    function measure() {
      const node = scrollBox();
      if (!node) return;
      const flow = getComputedStyle(node).overflowY;
      const canScroll = node === document.scrollingElement || flow === "auto" || flow === "scroll" || flow === "overlay";
      const room = node.scrollHeight - node.clientHeight;
      const scrolled = node.scrollTop;
      const spot =
        !canScroll || room <= 48 ? "none" : scrolled <= 48 ? "top" : scrolled >= room - 48 ? "bottom" : "mid";
      const top = arrowTop(node);
      setEdge((current) =>
        current.spot === spot && Math.abs(current.top - top) < 1 ? current : { spot, top },
      );
    }
    measure();
    main.addEventListener("scroll", measure, { passive: true });
    const watch = new ResizeObserver(measure);
    watch.observe(main);
    const page = main.querySelector(".gestao-page") || main.firstElementChild;
    if (page) watch.observe(page);
    const changes = new MutationObserver(measure);
    changes.observe(main, { childList: true, subtree: true });
    window.addEventListener("resize", measure);
    return () => {
      main.removeEventListener("scroll", measure);
      watch.disconnect();
      changes.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [location.pathname, location.search]);

  function jump(where: "start" | "end") {
    const main = scrollBox();
    if (!main) return;
    main.scrollTo({ top: where === "start" ? 0 : main.scrollHeight, behavior: "smooth" });
  }

  return (
    <>
      <button
        className={`pdv-jump pdv-jump-down${edge.spot === "top" ? " is-on" : ""}${edge.spot === "mid" ? " is-soft" : ""}`}
        type="button"
        style={{ top: edge.top }}
        aria-label="Ir para o final da página"
        tabIndex={edge.spot === "top" || edge.spot === "mid" ? 0 : -1}
        onClick={() => jump("end")}
      >
        <ArrowDown size={18} strokeWidth={2.4} aria-hidden="true" />
      </button>
      <button
        className={`pdv-jump pdv-jump-up${edge.spot === "bottom" ? " is-on" : ""}${edge.spot === "mid" ? " is-soft" : ""}`}
        type="button"
        aria-label="Ir para o início da página"
        tabIndex={edge.spot === "bottom" || edge.spot === "mid" ? 0 : -1}
        onClick={() => jump("start")}
      >
        <ArrowUp size={18} strokeWidth={2.4} aria-hidden="true" />
      </button>
    </>
  );
}
