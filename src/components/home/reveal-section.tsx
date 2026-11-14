"use client";

import { useRef, type ReactNode } from "react";
import { EASE_OUT, gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";

/**
 * Scroll reveal for a product section: the heading rises out of its line, then cards print in row by row,
 * each photo wiping up from the bottom edge (like a ticket leaving the machine) while it settles from a slight zoom.
 * Everything is set up after mount, below the fold, so there is nothing to flash; it runs once and then gets out of the way.
 */
export function RevealSection({ children, className, labelledBy }: { children: ReactNode; className?: string; labelledBy?: string }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const q = gsap.utils.selector(el);
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(q("[data-reveal-line]"), {
          yPercent: 115,
          duration: 0.9,
          stagger: 0.06,
          ease: EASE_OUT,
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
        });

        const cards = q("[data-card]") as HTMLElement[];
        const media = (card: Element) => card.querySelector("[data-card-media]");
        const image = (card: Element) => card.querySelector(".feature-img-a");
        const body = (card: Element) => card.querySelector("[data-card-body]");

        gsap.set(cards.map(media), { clipPath: "inset(100% 0% 0% 0% round 1rem)" });
        gsap.set(cards.map(image), { scale: 1.18 });
        gsap.set(cards.map(body), { y: 16, autoAlpha: 0 });

        const batches = ScrollTrigger.batch(cards, {
          start: "top 90%",
          once: true,
          onEnter: (batch) => {
            const tl = gsap.timeline({ defaults: { ease: EASE_OUT, stagger: 0.08 } });
            tl.to(batch.map(media), { clipPath: "inset(0% 0% 0% 0% round 1rem)", duration: 1.05 }, 0)
              .to(batch.map(image), { scale: 1, duration: 1.4, clearProps: "transform" }, 0)
              .to(batch.map(body), { y: 0, autoAlpha: 1, duration: 0.8 }, 0.15)
              // Hand the photos back to CSS so hover works normally afterwards.
              .set(batch.map(media), { clearProps: "clipPath" });
          },
        });

        return () => batches.forEach((t) => t.kill());
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={className} aria-labelledby={labelledBy}>
      {children}
    </section>
  );
}
