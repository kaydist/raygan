"use client";

import * as React from "react";
import type { StoreType } from "@raygan/shared";

import { Label, Input, Textarea } from "@/components/atoms";
import { useStoreListing, useUpsertStoreListing } from "../../hooks";

export interface StoreListingHandle {
  save: () => void;
  getTitle: () => string;
}

interface StepStoreListingProps {
  projectId: string;
  store: StoreType;
  projectName: string;
  onSaved: () => void;
}

export const StepStoreListing = React.forwardRef<StoreListingHandle, StepStoreListingProps>(
  function StepStoreListing({ projectId, store, projectName, onSaved }, ref) {
    const { data: existing } = useStoreListing(projectId, store);
    const upsertMutation = useUpsertStoreListing(projectId, store);

    const [title, setTitle] = React.useState("");
    const [shortDescription, setShortDescription] = React.useState("");
    const [fullDescription, setFullDescription] = React.useState("");
    const [category, setCategory] = React.useState("");
    const [privacyPolicyUrl, setPrivacyPolicyUrl] = React.useState("");
    const [supportEmail, setSupportEmail] = React.useState("");
    const hasInitialized = React.useRef(false);

    React.useEffect(() => {
      if (hasInitialized.current) return;
      if (existing) {
        setTitle(existing.title || "");
        setShortDescription(existing.short_description || "");
        setFullDescription(existing.full_description || "");
        setCategory(existing.category || "");
        setPrivacyPolicyUrl(existing.privacy_policy_url || "");
        setSupportEmail(existing.support_email || "");
        hasInitialized.current = true;
      } else if (projectName) {
        setTitle(projectName);
        hasInitialized.current = true;
      }
    }, [existing, projectName]);

    React.useImperativeHandle(ref, () => ({
      save() {
        if (!title.trim()) return;
        upsertMutation.mutate(
          {
            title,
            short_description: shortDescription || undefined,
            full_description: fullDescription || undefined,
            category: category || undefined,
            privacy_policy_url: privacyPolicyUrl || undefined,
            support_email: supportEmail || undefined,
          },
          { onSuccess: onSaved },
        );
      },
      getTitle() {
        return title;
      },
    }));

    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="listing-title" className="text-xs text-muted-foreground">
            App Title <span className="text-red-400">*</span>
            <span className="ml-1 text-[10px] text-muted-foreground/50">({title.length}/50)</span>
          </Label>
          <Input
            id="listing-title"
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 50))}
            placeholder="My App"
            className="h-8 text-[13px]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="listing-short" className="text-xs text-muted-foreground">
            Short Description
            <span className="ml-1 text-[10px] text-muted-foreground/50">({shortDescription.length}/80)</span>
          </Label>
          <Input
            id="listing-short"
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value.slice(0, 80))}
            placeholder="A brief tagline for your app"
            className="h-8 text-[13px]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="listing-full" className="text-xs text-muted-foreground">
            Full Description
          </Label>
          <Textarea
            id="listing-full"
            value={fullDescription}
            onChange={(e) => setFullDescription(e.target.value.slice(0, 4000))}
            placeholder="Describe what your app does..."
            className="min-h-[80px] text-[13px]"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="listing-category" className="text-xs text-muted-foreground">
              Category
            </Label>
            <Input
              id="listing-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Productivity"
              className="h-8 text-[13px]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="listing-email" className="text-xs text-muted-foreground">
              Support Email
            </Label>
            <Input
              id="listing-email"
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              placeholder="support@example.com"
              className="h-8 text-[13px]"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="listing-privacy" className="text-xs text-muted-foreground">
            Privacy Policy URL
          </Label>
          <Input
            id="listing-privacy"
            type="url"
            value={privacyPolicyUrl}
            onChange={(e) => setPrivacyPolicyUrl(e.target.value)}
            placeholder="https://example.com/privacy"
            className="h-8 text-[13px]"
          />
        </div>
      </div>
    );
  },
);
