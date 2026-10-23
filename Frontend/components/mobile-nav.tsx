"use client";

import Link from "next/link";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import { NAV_LINKS } from "@/components/nav-links";
import { AccountLink } from "@/components/account-link";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className="grid h-9 w-9 place-items-center rounded-lg text-ink hover:bg-band lg:hidden" aria-label="Open menu">
        <Menu size={19} />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed inset-x-0 top-0 z-50 border-b border-line bg-bg px-5 pb-6 pt-4">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-[15px] font-semibold">Menu</Dialog.Title>
            <Dialog.Close className="grid h-9 w-9 place-items-center rounded-lg hover:bg-band" aria-label="Close menu">
              <X size={19} />
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">Site navigation</Dialog.Description>
          <nav className="mt-4 grid gap-1" onClick={() => setOpen(false)}>
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="rounded-lg px-3 py-2.5 text-[15px] font-medium text-ink hover:bg-band">
                {link.label}
              </Link>
            ))}
            <AccountLink className="rounded-lg px-3 py-2.5 text-[15px] font-medium text-ink hover:bg-band" />
            <Link href="/submit" className="mt-3 rounded-lg bg-brand px-4 py-3 text-center text-[15px] font-semibold text-white">
              Submit a listing
            </Link>
          </nav>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
