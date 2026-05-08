import Image from "next/image";
import Link from "next/link";

export function SiteNav() {
  return (
    <header className="border-b border-stone-800 bg-stone-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-lg font-semibold text-stone-100"
        >
          <Image
            src="/icon.png"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 shrink-0"
            unoptimized
          />
          cshelper
        </Link>
        <nav className="flex flex-wrap gap-4 text-sm text-stone-400">
          <Link href="/maps" className="hover:text-stone-100">
            maps
          </Link>
          <Link href="/lineups" className="hover:text-stone-100">
            lineups
          </Link>
          <Link href="/edit" className="hover:text-stone-100">
            edit
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-stone-800 bg-stone-950 px-4 py-10 text-center text-sm text-stone-500">
      <p className="mx-auto max-w-xl leading-relaxed">
        project for friends, add/dm{" "}
        <span className="font-medium text-stone-300">@get_strolled</span> on discord to contribute or similar.
      </p>
    </footer>
  );
}
