"use client";

// One place to register GSAP plugins, so every animated component shares the same instance.
// Only client components on the home page import this, so the library stays out of every other route's bundle.
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** Motion language: things slide out like a ticket from a machine, fast then settling. */
export const EASE_OUT = "expo.out";
export const EASE_ROLL = "expo.inOut";

export { gsap, ScrollTrigger, useGSAP };
