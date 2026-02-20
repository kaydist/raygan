'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/organisms';
import { MobileHeader } from '@/components/molecules';
import { cn } from '@/lib/utils';
import { useLogout } from '@/lib/api/queries';

interface DashboardTemplateProps {
  children: React.ReactNode;
  className?: string;
}

const mockUser = {
  name: 'Kayode',
  email: 'kayode@example.com',
};

const mockCredits = {
  plan: 'Free plan',
  used: 847,
  total: 2000,
};

const mockTeams = [{ id: '1', name: "Kayode's Team", isExpanded: true }];

export function DashboardTemplate({
  children,
  className,
}: DashboardTemplateProps) {
  const router = useRouter();
  const logout = useLogout();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  const closeSidebar = () => setIsSidebarOpen(false);

  const handleLogout = async () => {
    await logout.mutateAsync();
    router.push('/login');
  };

  return (
    <div className="flex h-screen flex-col bg-background lg:flex-row">
      {/* Mobile header */}
      <MobileHeader
        isMenuOpen={isSidebarOpen}
        onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar - hidden on mobile, shown on desktop */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-60 transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <Sidebar
          user={mockUser}
          credits={mockCredits}
          teams={mockTeams}
          currentTeamId="1"
          onLogout={handleLogout}
        />
      </div>

      {/* Main content */}
      <main className={cn('flex-1 overflow-auto', className)}>{children}</main>
    </div>
  );
}
