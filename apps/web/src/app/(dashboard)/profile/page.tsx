"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, ArrowLeft, Check, X } from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Input,
  Label,
  Separator,
  Card,
  CardContent,
  CardHeader,
  Heading,
  Paragraph,
} from "@/components/atoms";
import { useCurrentUser, useUpdateUser, useOrganizations } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  const router = useRouter();
  const { data: user, isLoading } = useCurrentUser();
  const { data: organizations = [], isLoading: isLoadingOrgs } = useOrganizations();
  const updateUser = useUpdateUser();

  const [isEditing, setIsEditing] = React.useState(false);
  const [formData, setFormData] = React.useState({
    first_name: "",
    last_name: "",
    display_name: "",
  });

  React.useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name,
        last_name: user.last_name,
        display_name: user.display_name,
      });
    }
  }, [user]);

  const handleSave = async () => {
    await updateUser.mutateAsync(formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        first_name: user.first_name,
        last_name: user.last_name,
        display_name: user.display_name,
      });
    }
    setIsEditing(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <Paragraph variant="muted">Unable to load profile</Paragraph>
        <Button variant="outline" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <div className="mb-6 flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      <div className="mb-8">
        <Heading as="h1" level={2}>
          Profile Settings
        </Heading>
        <Paragraph variant="muted" className="mt-1">
          Manage your account information and preferences
        </Paragraph>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={user.avatar_url ?? undefined} />
                  <AvatarFallback className="text-lg">
                    {getInitials(user.display_name || user.email)}
                  </AvatarFallback>
                </Avatar>
                <button
                  className={cn(
                    "absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center",
                    "rounded-full border-2 border-background bg-muted",
                    "hover:bg-muted/80 transition-colors"
                  )}
                  onClick={() => {
                    // TODO: Implement avatar upload
                  }}
                >
                  <Camera className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              <div>
                <Heading as="h2" level={4}>
                  {user.display_name}
                </Heading>
                <Paragraph variant="muted" size="sm">
                  {user.email}
                </Paragraph>
              </div>
            </div>
            {!isEditing && (
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
            )}
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="pt-6">
          <div className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first_name">First name</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      first_name: e.target.value,
                    }))
                  }
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last name</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      last_name: e.target.value,
                    }))
                  }
                  disabled={!isEditing}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_name">Display name</Label>
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    display_name: e.target.value,
                  }))
                }
                disabled={!isEditing}
              />
              <Paragraph size="xs" variant="muted">
                This is how your name will appear across the platform
              </Paragraph>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user.email} disabled />
              <Paragraph size="xs" variant="muted">
                Email cannot be changed
              </Paragraph>
            </div>

            {isEditing && (
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={updateUser.isPending}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={updateUser.isPending}
                >
                  {updateUser.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  Save changes
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <Heading as="h3" level={5}>
            Organizations
          </Heading>
          <Paragraph variant="muted" size="sm">
            Teams and workspaces you belong to
          </Paragraph>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4">
          {isLoadingOrgs ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : organizations.length === 0 ? (
            <Paragraph variant="muted" className="text-center py-4">
              You don&apos;t belong to any organizations yet
            </Paragraph>
          ) : (
            <div className="space-y-3">
              {organizations.map((org) => (
                <div
                  key={org.uuid}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={org.logo_url ?? undefined} />
                      <AvatarFallback>
                        {getInitials(org.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <Paragraph weight="medium">{org.name}</Paragraph>
                      <Paragraph size="xs" variant="muted">
                        {org.is_personal ? "Personal" : org.role}
                      </Paragraph>
                    </div>
                  </div>
                  {org.is_personal && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      Personal
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
