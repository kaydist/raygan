import Link from 'next/link';
import { Logo, Heading, Paragraph } from '@/components/atoms';

interface AuthTemplateProps {
  children: React.ReactNode;
}

export function AuthTemplate({ children }: AuthTemplateProps) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Mobile header */}
      <header className="flex items-center justify-between border-b border-border bg-background p-4 lg:hidden">
        <Logo size="sm" />
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden w-[45%] flex-col justify-between bg-[#F5F3EF] p-6 lg:flex xl:p-10">
        <Logo />

        <div className="relative">
          <span className="pointer-events-none absolute -left-10 -top-32 select-none text-[280px] font-bold leading-none text-[#EBE9E4] xl:-left-20 xl:-top-40 xl:text-[400px]">
            S
          </span>
          <div className="relative z-10">
            <Heading level={1} className="text-3xl xl:text-4xl">
              Build native apps
              <br />
              with <span className="font-semibold">conversation</span>.
            </Heading>
            <Paragraph size="sm" variant="muted" className="mt-4">
              expo · react native · ai-powered
            </Paragraph>
          </div>
        </div>

        <footer>
          <Paragraph size="sm" variant="muted">
            <Link href="/terms" className="hover:underline">
              Terms
            </Link>
            {' · '}
            <Link href="/privacy" className="hover:underline">
              Privacy
            </Link>
            {' · '}© {new Date().getFullYear()}
          </Paragraph>
        </footer>
      </aside>

      {/* Main content */}
      <main className="flex flex-1 flex-col bg-background">
        <div className="flex flex-1 items-center justify-center p-4 sm:p-6 lg:p-8">
          <div className="w-full max-w-sm sm:max-w-md">{children}</div>
        </div>

        {/* Mobile footer */}
        <footer className="border-t border-border p-4 text-center lg:hidden">
          <Paragraph size="xs" variant="muted">
            <Link href="/terms" className="hover:underline">
              Terms
            </Link>
            {' · '}
            <Link href="/privacy" className="hover:underline">
              Privacy
            </Link>
            {' · '}© {new Date().getFullYear()}
          </Paragraph>
        </footer>
      </main>
    </div>
  );
}
