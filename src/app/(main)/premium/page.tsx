import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/lib/session";
import { premiumActive } from "@/lib/types";
import { PremiumClient } from "@/components/premium/premium-client";
import { getMyPayments } from "@/actions/premium";
import { isPaymentsConfigured, maskedCard } from "@/lib/payment-links";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Premium") };
}

export default async function PremiumPage() {
  const user = await requireUser();
  const payments = await getMyPayments();

  return (
    <PremiumClient
      isActive={premiumActive(user)}
      premiumUntil={user.premiumUntil ? user.premiumUntil.toISOString() : null}
      payments={payments.map((p) => ({
        id: p.id,
        plan: p.plan,
        amount: p.amount,
        method: p.method,
        status: p.status,
        comment: p.comment,
        createdAt: p.createdAt.toISOString(),
        receiptUrl: p.receiptUrl,
        receiptTelegramSentAt: p.receiptTelegramSentAt
          ? p.receiptTelegramSentAt.toISOString()
          : null,
      }))}
      paymentsConfigured={isPaymentsConfigured()}
      cardMasked={maskedCard(process.env.PAYMENT_CARD_NUMBER ?? "")}
    />
  );
}
