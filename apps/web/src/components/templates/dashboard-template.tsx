'use client';

import { Sidebar } from '@/components/organisms';
import { cn } from '@/lib/utils';

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

const mockTeams = [
  { id: '1', name: "Kayode's Team", isExpanded: true },
];

export function DashboardTemplate({ children, className }: DashboardTemplateProps) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        user={mockUser}
        credits={mockCredits}
        teams={mockTeams}
        currentTeamId="1"
      />
      <main className={cn('flex-1 overflow-auto', className)}>
        {children}
      </main>
    </div>
  );
}
