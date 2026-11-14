"use client";

import { useRef, type ReactNode } from "react";
import { EASE_OUT, EASE_ROLL, gsap, useGSAP } from "@/lib/gsap";

// The entrance is a first impression: play it on the first visit of a session, not on every
// client-side navigation back to the home page, and not if the page took too long to become
// interactive (by then the CSS failsafe has already shown everything).
let entrancePlayed = false;
const ENTRANCE_DEADLINE_MS = 3500;

const DEAL_ROTATION = [4, -1.5, -5]; // undoes the CSS fan, so the tickets start as one neat pile
const PARALLAX_DEPTH = [-36, -84, -18];
const ROLL = 0.6;
const PARK = 140; // % of a word's height: where words wait above or below the line

/**
 * Animates the server-rendered hero. Markup and content stay on the server; this only adds motion:
 * - an entrance where the headline rises word by word, the underline draws and the tickets are dealt;
 * - the headline's last word rolls to the occasion of whichever ticket you point at or focus;
 * - a gentle parallax on the tickets as the hero scrolls away (desktop only).
 */
export function HeroMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    (_, contextSafe) => {
      const el = root.current;
      if (!el || !contextSafe) return;
      const q = gsap.utils.selector(el);
      const words = q("[data-roller-word]") as HTMLElement[];
      const tickets = q("[data-ticket]") as HTMLElement[];
      const underline = q("[data-underline]")[0] as HTMLElement | undefined;
      const occasion = q("[data-occasion]")[0] as HTMLElement | undefined;
      const roller = q("[data-roller]")[0] as HTMLElement | undefined;

      // Underline length for each word, as a fraction of the widest ("one festival?").
      const ratio = (index: number) => {
        if (!occasion || !roller || !words[index]) return 1;
        const box = occasion.getBoundingClientRect();
        const word = words[index].getBoundingClientRect();
        return Math.min(1, (word.right - box.left) / box.width);
      };
      const fitUnderline = contextSafe(() => underline && gsap.set(underline, { scaleX: ratio(current) }));

      let current = 0;
      fitUnderline();
      document.fonts?.ready.then(fitUnderline);

      const mm = gsap.matchMedia();
      mm.add(
        { motion: "(prefers-reduced-motion: no-preference)", desktop: "(min-width: 1024px)" },
        (ctx) => {
          const { motion, desktop } = ctx.conditions as { motion: boolean; desktop: boolean };
          if (!motion) {
            el.dataset.motion = "ready";
            return;
          }

          // Parked words sit well outside the line and are hidden outright: a deep descender (the "g" in
          // "wedding") would otherwise peek into the roller's padding, just under the line above.
          gsap.set(words.slice(1), { yPercent: PARK, autoAlpha: 0 });

          const show = contextSafe((index: number) => {
            if (index === current || !words[index]) return;
            gsap.to(words[current], {
              yPercent: -PARK,
              duration: ROLL,
              ease: EASE_ROLL,
              overwrite: "auto",
              onComplete() {
                gsap.set(this.targets(), { autoAlpha: 0 });
              },
            });
            gsap.fromTo(words[index], { yPercent: PARK, autoAlpha: 1 }, { yPercent: 0, duration: ROLL, ease: EASE_ROLL, overwrite: "auto" });
            if (underline) gsap.to(underline, { scaleX: ratio(index), duration: ROLL, ease: EASE_ROLL, overwrite: "auto" });
            tickets.forEach((t, i) => t.toggleAttribute("data-active", i === index - 1));
            current = index;
          });

          // Entrance, once per session.
          let intro: gsap.core.Timeline | undefined;
          if (!entrancePlayed && performance.now() < ENTRANCE_DEADLINE_MS) {
            const path = underline?.querySelector("path");
            const tl = gsap.timeline({ defaults: { ease: EASE_OUT } });
            tl.from([...q("[data-word]"), words[0]], { yPercent: 118, duration: 0.95, stagger: 0.045 }, 0);
            if (path && underline) {
              // Hidden until it starts drawing, or the rounded line cap shows as a dot.
              tl.from(underline, { autoAlpha: 0, duration: 0.01 }, 0.45).from(path, { strokeDashoffset: 1, duration: 0.85, ease: "power3.inOut" }, 0.45);
            }
            tl.from(q("[data-hero-fade]"), { y: 18, autoAlpha: 0, duration: 0.9, stagger: 0.1 }, 0.35);
            if (desktop) {
              const pile = (q("[data-tickets]")[0] as HTMLElement).getBoundingClientRect();
              const centre = pile.left + pile.width / 2;
              tl.from(
                tickets,
                {
                  x: (_i: number, t: HTMLElement) => {
                    const r = t.getBoundingClientRect();
                    return centre - (r.left + r.width / 2);
                  },
                  y: 70,
                  rotation: (i: number) => DEAL_ROTATION[i] ?? 0,
                  autoAlpha: 0,
                  duration: 1.15,
                  stagger: { each: 0.08, from: "center" },
                },
                0.15,
              );
            } else {
              tl.from(tickets, { x: 56, autoAlpha: 0, duration: 0.9, stagger: 0.08 }, 0.3);
            }
            tl.from(q("[data-ticket-price]"), { scale: 1.4, rotation: -10, autoAlpha: 0, duration: 0.55, ease: "back.out(2.2)", stagger: 0.1 }, desktop ? 1 : 0.9);

            // Then run through the occasions once (under five seconds), and settle back on "weekend".
            intro = gsap.timeline({ paused: true, delay: 0.5 });
            [1, 2, 3, 0].forEach((index, step) => intro!.call(() => show(index), undefined, step === 0 ? 0 : `+=${ROLL + 0.65}`));
            tl.eventCallback("onComplete", () => intro?.play());
          }
          entrancePlayed = true;
          el.dataset.motion = "ready";

          // Point at (or tab to) a ticket and the headline names its occasion.
          let settle: gsap.core.Tween | undefined;
          const enter = contextSafe((i: number) => {
            intro?.kill();
            settle?.kill();
            show(i + 1);
          });
          const leave = contextSafe(() => {
            settle?.kill();
            settle = gsap.delayedCall(0.25, () => show(0));
          });
          const off = tickets.map((t, i) => {
            const on = () => enter(i);
            t.addEventListener("pointerenter", on);
            t.addEventListener("focusin", on);
            t.addEventListener("pointerleave", leave);
            t.addEventListener("focusout", leave);
            return () => {
              t.removeEventListener("pointerenter", on);
              t.removeEventListener("focusin", on);
              t.removeEventListener("pointerleave", leave);
              t.removeEventListener("focusout", leave);
            };
          });

          // Depth: the tickets drift apart at different speeds as the hero scrolls away.
          if (desktop) {
            gsap.to(q("[data-ticket-depth]"), {
              y: (i: number) => PARALLAX_DEPTH[i] ?? 0,
              ease: "none",
              scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: 0.6 },
            });
          }

          return () => {
            off.forEach((fn) => fn());
            tickets.forEach((t) => t.removeAttribute("data-active"));
            current = 0;
          };
        },
      );
    },
    { scope: root },
  );

  return (
    <section ref={root} data-hero className="relative overflow-hidden">
      {children}
    </section>
  );
}
