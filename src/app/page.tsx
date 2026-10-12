import Image from "next/image";
import { GetStartedLink } from "../../components/GetStartedLink";
import { robotoFlex } from "../../fonts";

const DISCORD_URL = "https://discord.gg/ESymdPMhCD";
const INSTAGRAM_URL = "https://instagram.com/mawuli.xyz";
const HERO_BG = "#00A6F3";

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <path d="M17.5 6.5h.01" />
    </svg>
  );
}

const socialLinkClass =
  "inline-flex items-center justify-center text-white transition-opacity hover:opacity-80 active:opacity-70";

export default function Home() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <div
        className="relative z-0 h-[45vh] min-h-[180px] w-full shrink-0 overflow-hidden md:h-[58.5vh] md:min-h-[198px]"
        style={{ backgroundColor: HERO_BG }}
      >
        <Image
          src="/Rectangle%201069.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-1/3 min-h-[80px]"
          style={{
            background: `linear-gradient(to bottom, transparent 0%, ${HERO_BG} 100%)`,
          }}
          aria-hidden
        />
      </div>

      <main
        className="relative z-10 m-0 flex min-h-0 flex-1 flex-col text-white md:justify-start"
        style={{ backgroundColor: HERO_BG }}
      >
        <div className="mx-4 flex max-w-full flex-col items-center px-0 pb-8 pt-4 text-center max-md:pb-6 max-md:pt-6 sm:mx-[20px] md:pb-12 md:pt-7">
          <div className="mx-auto flex w-full max-w-7xl flex-col items-center">
            <h1
              className={`${robotoFlex.className} wrap-break-word text-3xl font-semibold leading-[1.08] tracking-[-0.03em] text-white sm:text-4xl sm:leading-[1.06] md:text-5xl md:leading-[1.05] lg:text-6xl`}
            >
              A community for eco-tech builders, <br /> founders & organizers.
            </h1>
            <p
              className={`${robotoFlex.className} mx-auto mt-2 max-w-2xl text-base leading-relaxed text-white/90 sm:mt-3 sm:text-lg md:mt-3 md:text-xl`}
            >
              Join over 800+ eco-tech builders to gather & build a brighter future for all.
            </p>
            <div className="mt-3 flex w-full max-w-xl justify-center sm:mt-4">
              <GetStartedLink />
            </div>
          </div>
        </div>
      </main>

      <div className="fixed right-[max(1rem,env(safe-area-inset-right))] bottom-[max(1rem,env(safe-area-inset-bottom))] z-20 flex items-center gap-4 sm:gap-5">
        <a
          href={DISCORD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={socialLinkClass}
          aria-label="Discord"
        >
          <DiscordIcon className="size-6 sm:size-7" />
        </a>
        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={socialLinkClass}
          aria-label="Instagram"
        >
          <InstagramIcon className="size-6 sm:size-7" />
        </a>
      </div>
    </div>
  );
}
