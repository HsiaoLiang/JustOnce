"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "../db";
import { createSession, destroySession, hashPassword, safeNext, verifyPassword } from "../auth";
import { setFlash } from "../flash";
import { isAreaSlug } from "@/lib/areas";
import { DEMO_ACCOUNTS, DEMO_MODE } from "@/lib/demo";
import { firstName } from "@/lib/cn";

export type AuthState = { error?: string; fieldErrors?: Record<string, string>; values?: Record<string, string> } | undefined;

const signupSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(60, "Keep your name under 60 characters."),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.")),
  password: z.string().min(8, "Use at least 8 characters.").max(100, "That password is too long."),
  area: z.string().optional(),
});

export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const raw = Object.fromEntries(["name", "email", "password", "area"].map((k) => [k, String(formData.get(k) ?? "")]));
  const next = safeNext(formData.get("next"), "/");
  const parsed = signupSchema.safeParse(raw);
  const values = { name: raw.name, email: raw.email, area: raw.area };
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { fieldErrors, values };
  }
  const { name, email, password, area } = parsed.data;
  if (await db.user.findUnique({ where: { email }, select: { id: true } })) {
    return { fieldErrors: { email: "There's already an account with this email. Log in instead." }, values };
  }
  const user = await db.user.create({
    data: { name, email, passwordHash: await hashPassword(password), area: area && isAreaSlug(area) ? area : null },
  });
  await createSession(user.id);
  await setFlash(`Welcome to Just Once, ${firstName(name)}.`);
  redirect(next);
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"), "/");
  if (!email || !password) return { error: "Enter your email and password.", values: { email } };
  const user = await db.user.findUnique({ where: { email }, select: { id: true, name: true, passwordHash: true } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "That email and password don't match an account.", values: { email } };
  }
  await createSession(user.id);
  await setFlash(`Welcome back, ${firstName(user.name)}.`, "info");
  redirect(next);
}

/** One-tap log-in for the published demo accounts. Disabled when NEXT_PUBLIC_DEMO_MODE=false. */
export async function demoLogin(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const next = safeNext(formData.get("next"), "/");
  if (!DEMO_MODE || !DEMO_ACCOUNTS.some((a) => a.email === email)) redirect("/login");
  const user = await db.user.findUnique({ where: { email }, select: { id: true, name: true } });
  if (!user) redirect("/login?missing=demo");
  await destroySession();
  await createSession(user.id);
  await setFlash(`You're now using the app as ${user.name}.`, "info");
  redirect(next);
}

export async function logout() {
  await destroySession();
  redirect("/");
}
