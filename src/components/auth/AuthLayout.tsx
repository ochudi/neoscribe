"use client";

import Image from "next/image";
import Link from "next/link";

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/plural-icon.png"
            alt="Plural Health"
            width={26}
            height={26}
            className="rounded-sm"
            priority
          />
          <span className="flex flex-col leading-none">
            <span className="text-[15px] font-semibold tracking-tight text-foreground">
              NeoScribe
            </span>
            <span className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
              Plural Health
            </span>
          </span>
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
              {title}
            </h1>
            <p className="text-[14px] text-muted-foreground">{subtitle}</p>
          </div>
          <div className="mt-6">{children}</div>
          <div className="mt-6 text-center text-[13px] text-muted-foreground">
            {footer}
          </div>
        </div>
      </main>
    </div>
  );
}
