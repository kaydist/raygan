'use client';

import { MoreHorizontal, Settings, LogOut, User } from 'lucide-react';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconButton,
  Paragraph,
} from '@/components/atoms';
import { cn } from '@/lib/utils';

interface UserMenuProps {
  name: string;
  email?: string;
  avatarUrl?: string;
  onSettings?: () => void;
  onProfile?: () => void;
  onLogout?: () => void;
  className?: string;
}

export function UserMenu({
  name,
  email: _email,
  avatarUrl,
  onSettings,
  onProfile,
  onLogout,
  className,
}: UserMenuProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <Avatar className="h-8 w-8">
        <AvatarImage src={avatarUrl} alt={name} />
        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
          {initials}
        </AvatarFallback>
      </Avatar>
      <Paragraph size="sm" className="flex-1 truncate">
        {name}
      </Paragraph>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton size="sm" variant="ghost">
            <MoreHorizontal className="h-4 w-4" />
          </IconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={onProfile}>
            <User className="mr-2 h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onSettings}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onLogout} className="text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
