"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, Flag } from "lucide-react";

import { reportContent } from "@/actions/user";
import { useT } from "@/hooks/use-i18n";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const REASONS = [
  "Spam yoki chalg'ituvchi kontent",
  "Bezorilik yoki nafrat",
  "Nomaqbul kontent",
  "Yolg'on ma'lumot",
  "Mualliflik huquqi buzilishi",
  "Boshqa",
];

export function ReportDialog({
  targetType,
  targetId,
  targetConversationId,
  open,
  onOpenChange,
}: {
  targetType: "post" | "user" | "comment" | "message" | "conversation";
  targetId: string;
  targetConversationId?: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const t = useT();
  const [reason, setReason] = React.useState(REASONS[0]);
  const [sending, setSending] = React.useState(false);

  async function handleSubmit() {
    setSending(true);
    try {
      const res = await reportContent({ targetType, targetId, targetConversationId, reason });
      if (!res.ok) {
        void 0;
        return;
      }
      toast.success(t("Shikoyat yuborildi. Rahmat!"));
      onOpenChange(false);
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-6">
        <DialogHeader className="text-start">
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-destructive" /> {t("Shikoyat qilish")}
          </DialogTitle>
          <DialogDescription>
            {t("Nima uchun shikoyat qilmoqchisiz?")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          {REASONS.map((r) => (
            <button
              key={r}
              onClick={() => setReason(r)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-start text-sm transition-colors hover:bg-accent"
            >
              <span
                className={`h-4 w-4 shrink-0 rounded-full border-2 ${
                  reason === r ? "border-[#0095f6] bg-[#0095f6]" : "border-muted-foreground"
                }`}
              />
              {t(r)}
            </button>
          ))}
        </div>
        <Button
          variant="destructive"
          className="w-full"
          onClick={handleSubmit}
          disabled={sending}
        >
          {sending && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("Shikoyat yuborish")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
