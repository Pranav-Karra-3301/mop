import Link from "next/link"
import Image from "next/image"
import { Patrick_Hand } from "next/font/google"

const patrickHand = Patrick_Hand({ subsets: ["latin"], weight: "400" })

export const metadata = {
  title: "Our Story | MOP",
  description: "Why MOP exists and how it works",
}

export default function StoryPage() {
  return (
    <main className="min-h-screen px-6 py-16 flex items-center justify-center">
      <div className="w-full max-w-2xl space-y-8 text-center">
        <div className="text-center">
          <Link href="/" className="text-sm underline underline-offset-4 text-muted-foreground hover:text-foreground">
            ← Back to home
          </Link>
        </div>

        <div className="flex justify-center">
          <Image
            src="/chore.svg"
            alt="Chore icon"
            width={160}
            height={160}
            className="w-36 h-auto md:w-40"
            priority
          />
        </div>

        <section className={`${patrickHand.className} text-xl leading-relaxed`}>
          <p>
            Why MOP? It stands for <strong>Manit or Pranav</strong> — and, honestly, the URL is just easier to type.
            But we call it <strong>Squable</strong> because, well, it helps settle squabbles. We&apos;re roommates who often
            settle chores with rock–paper–scissors, so we built this to play completely random rounds over and over to
            keep it as fair as possible. Yep, we&apos;re that lazy — and that committed to fairness.
          </p>
        </section>

        <hr className="my-2 border-border" />

        <section className="text-sm text-muted-foreground leading-relaxed text-left space-y-3">
          <p>
            <strong>How we ensure randomness:</strong> results are driven by cryptographically secure randomness. We use a
            master seed per session and derive per-game values so outcomes are independent and reproducible when seeded.
          </p>
          <p>
            <strong>Technical bits:</strong> the app runs on Next.js (App Router), React, TypeScript, and Tailwind. We
            leverage the Web Crypto API for seeds and clean UI components to visualize large batches of rounds.
          </p>
        </section>

        <hr className="my-2 border-border" />

        <div className="text-xs text-muted-foreground">
          <p className="underline underline-offset-4">
            <a
              href="https://github.com/Pranav-Karra-3301/mop"
              target="_blank"
              rel="noopener noreferrer"
            >
              Source code: github.com/Pranav-Karra-3301/mop
            </a>
          </p>
          <p className="mt-2">
            Site design and functions by <span className="font-medium">Pranav Karra</span>. Vibe coded with
            {" "}
            <a className="underline underline-offset-4" href="https://www.anthropic.com/claude-code" target="_blank" rel="noopener noreferrer">Claude Code</a>
            {" "}and{" "}
            <a className="underline underline-offset-4" href="https://cursor.com" target="_blank" rel="noopener noreferrer">Cursor</a>.
          </p>
          <p className="mt-2">
            <a
              className="underline underline-offset-4"
              href="https://pranaavkarra.me"
              target="_blank"
              rel="noopener noreferrer"
            >
              pranaavkarra.me
            </a>
            <span className="mx-2">·</span>
            <a
              className="underline underline-offset-4"
              href="https://manitgarg.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              manitgarg.com
            </a>
          </p>
        </div>
      </div>
    </main>
  )
}
