export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function validateProjectName(name: string): string | null {
  if (!name.trim()) {
    return "Project name is required";
  }
  if (name.length < 2) {
    return "Project name must be at least 2 characters";
  }
  if (name.length > 100) {
    return "Project name must be less than 100 characters";
  }
  return null;
}

export function getDefaultProjectName(): string {
  const date = new Date();
  return `Untitled Project ${date.toLocaleDateString()}`;
}

export function getProjectInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
