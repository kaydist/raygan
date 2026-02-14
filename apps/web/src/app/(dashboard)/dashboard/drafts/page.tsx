'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, ChevronDown } from 'lucide-react';
import { Button, Paragraph } from '@/components/atoms';
import {
  ProjectCard,
  NewProjectCard,
  ViewToggle,
  Breadcrumb,
} from '@/components/molecules';

type ViewMode = 'grid' | 'list';

interface Project {
  id: string;
  name: string;
  status: 'draft' | 'deployed';
  editedAt: string;
  screenCount: number;
  color: string;
  thumbnail?: string;
}

const mockProjects: Project[] = [
  {
    id: '1',
    name: 'FitTracker Pro',
    status: 'deployed',
    editedAt: 'Edited 2 hours ago',
    screenCount: 5,
    color: '#EF4444',
  },
  {
    id: '2',
    name: 'Recipe App',
    status: 'draft',
    editedAt: 'Edited yesterday',
    screenCount: 4,
    color: '#22C55E',
  },
  {
    id: '3',
    name: 'Budget Planner',
    status: 'deployed',
    editedAt: 'Edited 3 days ago',
    screenCount: 6,
    color: '#F59E0B',
  },
  {
    id: '4',
    name: 'Chat App',
    status: 'draft',
    editedAt: 'Edited 1 week ago',
    screenCount: 3,
    color: '#3B82F6',
  },
  {
    id: '5',
    name: 'PumP Pay',
    status: 'draft',
    editedAt: 'Edited 2 weeks ago',
    screenCount: 7,
    color: '#EF4444',
  },
];

export default function DraftsPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = React.useState<ViewMode>('grid');

  const handleProjectClick = (projectId: string) => {
    router.push(`/workspace/${projectId}`);
  };

  const handleNewProject = () => {
    console.log('Create new project');
  };

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Breadcrumb
          items={[
            { label: "Kayode's Team", href: '/dashboard' },
            { label: 'Drafts' },
          ]}
        />

        <div className="flex items-center gap-2 sm:gap-3">
          {/* View toggle - hidden on smallest screens */}
          <div className="hidden sm:block">
            <ViewToggle value={viewMode} onChange={setViewMode} />
          </div>

          {/* Sort button - text hidden on mobile */}
          <Button variant="outline" size="sm" className="gap-2 sm:h-10">
            <span className="hidden sm:inline">Sort: Recent</span>
            <span className="sm:hidden">Sort</span>
            <ChevronDown className="h-4 w-4" />
          </Button>

          {/* New button - icon only on mobile */}
          <Button size="sm" className="gap-2 sm:h-10" onClick={handleNewProject}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New</span>
          </Button>
        </div>
      </div>

      {/* Project count */}
      <div className="mb-4">
        <Paragraph variant="muted">
          All projects <span className="ml-1">{mockProjects.length}</span>
        </Paragraph>
      </div>

      {/* Project grid */}
      <div
        className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 gap-3 xs:grid-cols-2 sm:gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            : 'flex flex-col gap-2'
        }
      >
        <NewProjectCard onClick={handleNewProject} />

        {mockProjects.map((project) => (
          <ProjectCard
            key={project.id}
            id={project.id}
            name={project.name}
            status={project.status}
            editedAt={project.editedAt}
            screenCount={project.screenCount}
            color={project.color}
            thumbnail={project.thumbnail}
            onClick={() => handleProjectClick(project.id)}
          />
        ))}
      </div>
    </div>
  );
}
