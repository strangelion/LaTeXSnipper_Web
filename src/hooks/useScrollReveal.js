import { useEffect } from "react";

// Reveals `.reveal` blocks and [data-reveal] scenes the first time they enter the
// viewport. One document-level observer keeps every section in sync and is cheap
// enough that the scenes do not each need their own.
export default function useScrollReveal() {
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      return undefined;
    }

    const targets = document.querySelectorAll(
      ".reveal, [data-reveal], .hero-copy",
    );
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }
          entry.target.classList.add("in-view");
          entry.target.dataset.revealed = "true";
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );

    targets.forEach((target) => observer.observe(target));

    // Safety net: if an observation is ever missed (a node replaced during a
    // re-render, a jump straight to an anchor), nothing should stay invisible.
    let raf = 0;
    const revealVisible = () => {
      for (const el of document.querySelectorAll("[data-reveal]:not([data-revealed])")) {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.94 && rect.bottom > 0) {
          el.dataset.revealed = "true";
          el.classList.add("in-view");
        }
      }
    };
    const scheduleReveal = () => {
      if (raf !== 0) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        revealVisible();
      });
    };

    revealVisible();
    window.addEventListener("scroll", scheduleReveal, { passive: true });
    window.addEventListener("resize", scheduleReveal, { passive: true });
    window.addEventListener("load", scheduleReveal, { once: true });
    const safety = window.setTimeout(revealVisible, 2400);

    return () => {
      observer.disconnect();
      window.clearTimeout(safety);
      window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", scheduleReveal);
      window.removeEventListener("resize", scheduleReveal);
      window.removeEventListener("load", scheduleReveal);
    };
  }, []);
}
