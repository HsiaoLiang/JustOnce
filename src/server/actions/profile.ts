"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "../db";
import { requireUser } from "../auth";
import { setFlash } from "../flash";
import { isAreaSlug } from "@/lib/areas";
import { isAllowedPhotoUrl } from "@/lib/photos";

export type ProfileState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean } | undefined;

const schema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(60, "Keep your name under 60 characters."),
  bio: z.string().trim().max(400, "Keep your bio under 400 characters."),
  area: z.string(),
});

export async function updateProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireUser("/account");
  const parsed = schema.safeParse({
    name: String(formData.get("name") ?? ""),
    bio: String(formData.get("bio") ?? ""),
    area: String(formData.get("area") ?? ""),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { fieldErrors };
  }

  let avatar: string | null = null;
  try {
    const list = JSON.parse(String(formData.get("avatar") ?? "[]"));
    avatar = Array.isArray(list) && list.length ? list[0] : null;
  } catch {
    avatar = null;
  }
  if (avatar && avatar !== user.avatarUrl) {
    const id = avatar.startsWith("/api/images/") ? avatar.slice("/api/images/".length) : null;
    const owned = id && isAllowedPhotoUrl(avatar) ? await db.imageBlob.count({ where: { id, ownerId: user.id } }) : 0;
    if (!owned) return { fieldErrors: { avatar: "Upload your photo again." } };
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name,
      bio: parsed.data.bio || null,
      area: isAreaSlug(parsed.data.area) ? parsed.data.area : null,
      avatarUrl: avatar,
    },
  });
  await setFlash("Profile saved.");
  revalidatePath("/account");
  revalidatePath(`/users/${user.id}`);
  return { ok: true };
}

/** Simulated identity check: in production this would hand off to an ID-verification provider. */
export async function verifyIdentity() {
  const user = await requireUser("/account");
  if (!user.verifiedAt) {
    await db.user.update({ where: { id: user.id }, data: { verifiedAt: new Date() } });
    await setFlash("You're verified. The badge now shows on your profile and listings.");
  }
  revalidatePath("/account");
  revalidatePath(`/users/${user.id}`);
}
