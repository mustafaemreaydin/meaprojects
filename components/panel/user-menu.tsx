"use client";

import { signOut } from "next-auth/react";
import { LogOut, UserRound, KeyRound } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function UserMenu({ name, email }: { name: string; email: string }) {
  const initials = (name || email).slice(0, 1).toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Account menu" className="rounded-full">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-100 text-ink-600 text-[13px] font-medium dark:bg-ink-700 dark:text-ink-300">
            {initials}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[220px]">
        <DropdownMenuLabel className="flex flex-col">
          <span className="text-[13px] font-medium normal-case tracking-normal text-text">{name}</span>
          <span className="text-[12px] normal-case tracking-normal text-text-muted">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings/account">
            <UserRound size={14} /> Account
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings/api-keys">
            <KeyRound size={14} /> API keys
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => signOut({ callbackUrl: "/login" })} danger>
          <LogOut size={14} /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
