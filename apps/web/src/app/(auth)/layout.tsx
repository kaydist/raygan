import { AuthTemplate } from '@/components/templates';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthTemplate>{children}</AuthTemplate>;
}
