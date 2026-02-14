import Link from "next/link";
import { Logo, Heading, Paragraph } from "@/components/atoms";

interface AuthTemplateProps {
  children: React.ReactNode;
}

export function AuthTemplate({ children }: AuthTemplateProps) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-[45%] flex-col justify-between bg-[#F5F3EF] p-10 lg:flex">
        <Logo />

        <div className="relative">
          <span className="pointer-events-none absolute -left-20 -top-40 select-none text-[400px] font-bold leading-none text-[#EBE9E4]">
            S
          </span>
          <div className="relative z-10">
            <Heading level={1}>
              Build native apps
              <br />
              with <span className="font-semibold">conversation</span>.
            </Heading>
          </div>
        </div>

        <footer>
          <Paragraph size="sm" variant="muted">
            <Link href="/terms" className="hover:underline">
              Terms
            </Link>
            {" · "}
            <Link href="/privacy" className="hover:underline">
              Privacy
            </Link>
            {" · "}© {new Date().getFullYear()}
          </Paragraph>
        </footer>
      </aside>

      <main className="flex flex-1 items-center justify-center bg-background p-8">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
