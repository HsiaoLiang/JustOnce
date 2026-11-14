"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { logout, demoLogin } from "@/server/actions/auth";
import { DEMO_ACCOUNTS, DEMO_MODE } from "@/lib/demo";
import { Avatar } from "./ui";
import { firstName } from "@/lib/cn";

export function UserMenu({ user }: { user: { id: string; name: string; avatarUrl: string | null; email: string } }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const others = DEMO_ACCOUNTS.filter((a) => a.email !== user.email);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-1.5 rounded-full border border-line-strong p-1 pr-2.5 transition-shadow hover:shadow-card"
      >
        <Avatar name={user.name} src={user.avatarUrl} size={30} />
        <span className="hidden text-sm font-semibold sm:inline">{firstName(user.name)}</span>
        <ChevronDown className="size-4 text-muted" aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 origin-top-right animate-fade-up overflow-hidden rounded-2xl border border-line bg-paper py-2 shadow-lift"
        >
          <div className="px-4 pt-1 pb-2">
            <p className="text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <MenuLink href="/dashboard/rentals" onClick={() => setOpen(false)}>My rentals</MenuLink>
          <MenuLink href="/dashboard/listings" onClick={() => setOpen(false)}>My listings</MenuLink>
          <MenuLink href="/listings/new" onClick={() => setOpen(false)}>List an item</MenuLink>
          <MenuLink href="/communities" onClick={() => setOpen(false)}>My communities</MenuLink>
          <MenuLink href={`/users/${user.id}`} onClick={() => setOpen(false)}>Public profile</MenuLink>
          <MenuLink href="/account" onClick={() => setOpen(false)}>Account settings</MenuLink>
          {DEMO_MODE && (
            <div className="mt-1 border-t border-line pt-2">
              <p className="px-4 pb-1 font-mono text-[0.7rem] tracking-[0.12em] text-muted uppercase">Switch demo account</p>
              {others.map((a) => (
                <form key={a.email} action={demoLogin}>
                  <input type="hidden" name="email" value={a.email} />
                  <input type="hidden" name="next" value="/dashboard/rentals" />
                  <button type="submit" role="menuitem" className="flex w-full items-center gap-2.5 px-4 py-1.5 text-left text-sm hover:bg-surface">
                    <Avatar name={a.name} src={a.avatar} size={22} />
                    <span className="font-medium">{firstName(a.name)}</span>
                    <span className="text-xs text-muted">{a.role}</span>
                  </button>
                </form>
              ))}
            </div>
          )}
          <div className="mt-1 border-t border-line pt-1">
            <form action={logout}>
              <button type="submit" role="menuitem" className="w-full px-4 py-2 text-left text-sm font-medium hover:bg-surface">
                Log out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({ href, children, onClick }: { href: string; children: React.ReactNode; onClick: () => void }) {
  return (
    <Link href={href} role="menuitem" onClick={onClick} className="block px-4 py-2 text-sm font-medium hover:bg-surface">
      {children}
    </Link>
  );
}
