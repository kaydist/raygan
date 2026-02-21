"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useCreateProject } from "@/lib/api";
import {
  Button,
  ConfigurableSelect,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormField,
  Input,
  Textarea,
} from "@/components/atoms";

const FRAMEWORK_VERSIONS = [
  { value: "expo-52", label: "Expo SDK 52 (Latest)" },
  { value: "expo-51", label: "Expo SDK 51" },
  { value: "expo-50", label: "Expo SDK 50" },
] as const;

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateProjectModal({ isOpen, onClose }: CreateProjectModalProps) {
  const router = useRouter();
  const createProject = useCreateProject();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [frameworkVersion, setFrameworkVersion] = useState("expo-52");
  const [slugTouched, setSlugTouched] = useState(false);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugTouched) {
      setSlug(generateSlug(value));
    }
  };

  const handleSlugChange = (value: string) => {
    setSlugTouched(true);
    setSlug(generateSlug(value));
  };

  const resetForm = () => {
    setName("");
    setSlug("");
    setDescription("");
    setFrameworkVersion("expo-52");
    setSlugTouched(false);
    createProject.reset();
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !slug.trim()) return;

    createProject.mutate(
      {
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || null,
        framework_version: frameworkVersion,
      },
      {
        onSuccess: (project) => {
          handleClose();
          router.push(`/workspace/${project.id}`);
        },
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Start building your mobile app with Staq. Fill in the details below to create your project.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <FormField id="name" label="Project Name" required>
              <Input
                id="name"
                placeholder="My Awesome App"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                disabled={createProject.isPending}
                autoFocus
              />
            </FormField>

            <FormField
              id="slug"
              label="Project Slug"
              required
              description="Used in URLs and file paths. Only lowercase letters, numbers, and hyphens."
            >
              <Input
                id="slug"
                placeholder="my-awesome-app"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                disabled={createProject.isPending}
              />
            </FormField>

            <FormField id="framework" label="Framework Version">
              <ConfigurableSelect
                options={FRAMEWORK_VERSIONS}
                value={frameworkVersion}
                onValueChange={setFrameworkVersion}
                placeholder="Select framework version"
                disabled={createProject.isPending}
              />
            </FormField>

            <FormField id="description" label="Description" optional>
              <Textarea
                id="description"
                placeholder="A brief description of your app..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={createProject.isPending}
                rows={3}
              />
            </FormField>

            {createProject.error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {createProject.error.message}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createProject.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createProject.isPending}
              disabled={!name.trim() || !slug.trim()}
            >
              Create Project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
