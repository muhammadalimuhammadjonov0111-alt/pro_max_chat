"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, MapPin } from "lucide-react";

import { editPost } from "@/actions/post";
import { useT } from "@/hooks/use-i18n";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function EditPostDialog({
  post,
  open,
  onOpenChange,
}: {
  post: { id: string; caption: string | null; location: string | null };
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const t = useT();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="border-b p-4">
          <DialogTitle className="text-center">{t("Postni tahrirlash")}</DialogTitle>
        </DialogHeader>
        {/* keyed so the form re-initialises from the post each time it opens */}
        <EditPostForm
          key={`${post.id}-${open}`}
          post={post}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function EditPostForm({
  post,
  onDone,
}: {
  post: { id: string; caption: string | null; location: string | null };
  onDone: () => void;
}) {
  const router = useRouter();
  const t = useT();
  const [caption, setCaption] = React.useState(post.caption ?? "");
  const [location, setLocation] = React.useState(post.location ?? "");
  const [saving, setSaving] = React.useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await editPost(post.id, { caption, location });
      if (!res.ok) {
        void 0;
        return;
      }
      toast.success(t("Post yangilandi"));
      onDone();
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 p-5 pt-3">
      <Textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder={t("Izoh...")}
        className="min-h-[120px] resize-none"
        maxLength={2200}
      />
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <Input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder={t("Joylashuv")}
        />
      </div>
      <Button
        variant="blue"
        className="w-full"
        onClick={handleSave}
        disabled={saving}
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        {t("Saqlash")}
      </Button>
    </div>
  );
}
