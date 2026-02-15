"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";
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

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [frameworkVersion, setFrameworkVersion] = useState("expo-52");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const handleClose = () => {
    onClose();
    setName("");
    setSlug("");
    setDescription("");
    setFrameworkVersion("expo-52");
    setError(null);
    setSlugTouched(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Project name is required");
      return;
    }

    if (!slug.trim()) {
      setError("Project slug is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const project = await api.projects.create({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || null,
        framework_version: frameworkVersion,
      });

      handleClose();
      router.push(`/${project.uuid}`);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to create project. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
              />
            </FormField>

            <FormField id="framework" label="Framework Version">
              <ConfigurableSelect
                options={FRAMEWORK_VERSIONS}
                value={frameworkVersion}
                onValueChange={setFrameworkVersion}
                placeholder="Select framework version"
                disabled={isSubmitting}
              />
            </FormField>

            <FormField id="description" label="Description" optional>
              <Textarea
                id="description"
                placeholder="A brief description of your app..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
                rows={3}
              />
            </FormField>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={isSubmitting}
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
