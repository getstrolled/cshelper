import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col gap-10">
      <div className="max-w-prose border-l-2 border-stone-500 pl-6">
        <p className="text-xs uppercase tracking-[0.2em] text-stone-500">cshelper</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-100">
            
        </h1>
        <p className="mt-5 whitespace-pre-wrap text-[15px] leading-relaxed text-stone-400">
          <span>{`cheat sheet for cs2, made by strolled for my amazingly talented friends and teammates.  
Not intened to look good, just useful and calm :3

Like the project? feel free to leave a nice comment on my profile `}</span>
          <a
            href="https://steamcommunity.com/id/getstrolled/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-stone-200 underline decoration-stone-600 underline-offset-2 hover:text-stone-100 hover:decoration-stone-400"
          >
            https://steamcommunity.com/id/getstrolled/
          </a>
          <span>{`
Donations are welcome aswell, helps me pay for server and domain. 
BTC: bc1qxaw7dgpnkq6f4thgjkt20up7f3yuztme6cwt02
LTC: ltc1qceueyf3x4zqkureu00acz9d4zr6zy8dp5hfk3h`}</span>
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/maps"
            className="rounded-sm bg-stone-200 px-4 py-2 text-sm font-medium text-stone-950 hover:bg-stone-100"
          >
            maps + calls
          </Link>
          <Link
            href="/lineups"
            className="rounded-sm border border-stone-600 px-4 py-2 text-sm font-medium text-stone-200 hover:border-stone-500 hover:bg-stone-900/80"
          >
            lineups
          </Link>
        </div>
      </div>
    </main>
  );
}
