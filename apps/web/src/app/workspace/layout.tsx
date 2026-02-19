import { TooltipProvider } from "@/components/atoms";

export default function WorkspaceRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider delayDuration={200}>
      {children}
    </TooltipProvider>
  );
}
