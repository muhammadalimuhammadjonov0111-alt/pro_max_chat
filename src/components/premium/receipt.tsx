"use client";

import { cn } from "@/lib/utils";

export type ReceiptProps = {
  receiptNo?: string;
  amount?: string;
  service?: string;
  tariffType?: string;
  customer?: string;
  telegramId?: string;
  method?: string;
  transaction?: string;
  date?: string;
  className?: string;
};

export function Receipt({
  receiptNo = "#GG-VI36YE",
  amount = "100 000.00 UZS",
  service = "Gidgram Premium Obuna",
  tariffType = "Yillik kirish",
  customer = "Admin (@admin)",
  telegramId = "185186202",
  method = "CLICK API (Avto)",
  transaction = "TXN-XO06VI36YE-UZ",
  date = "06.11.2026 | 10:27",
  className,
}: ReceiptProps) {
  return (
    <div
      className={cn(
        "w-full max-w-[360px] mx-auto bg-[#0d1117] text-[#c9d1d9] rounded-2xl p-5 border border-[#21262d] shadow-2xl relative overflow-hidden font-mono",
        className,
      )}
    >
      <div className="flex justify-between items-center text-[10px] text-[#8b949e] uppercase tracking-wider border-b border-[#21262d] pb-3 mb-5">
        <span className="font-bold text-[#58a6ff]">* GIDGRAM SYSTEMS *</span>
        <span>{receiptNo}</span>
      </div>

      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 mb-5 text-center">
        <div className="text-[11px] text-[#8b949e] uppercase tracking-widest mb-1">
          YAKUNIY TO&apos;LOV
        </div>
        <div className="text-2xl font-bold text-[#ff7b72] tracking-tight">
          {amount}
        </div>
      </div>

      <div className="border-b border-[#21262d] pb-4 mb-4 text-xs">
        <div className="flex justify-between items-start mb-2">
          <span className="text-[#8b949e]">Xizmat:</span>
          <span className="text-white font-medium text-right max-w-[200px]">
            {service}
          </span>
        </div>
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-[#8b949e]">Tarif turi:</span>
          <span className="text-[#58a6ff]">{tariffType}</span>
        </div>
      </div>

      <div className="space-y-3 text-xs border-b border-[#21262d] pb-5 mb-5">
        <div className="flex justify-between items-center">
          <span className="text-[#8b949e]">Mijoz:</span>
          <span className="text-white font-medium">{customer}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[#8b949e]">ID raqami:</span>
          <span className="text-white">{telegramId}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[#8b949e]">To&apos;lov usuli:</span>
          <span className="text-[#58a6ff] font-medium">{method}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[#8b949e]">Tranzaksiya:</span>
          <span className="text-white text-[11px]">{transaction}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[#8b949e]">Sana / Vaqt:</span>
          <span className="text-white">{date}</span>
        </div>
      </div>

      <div className="text-center">
        <div className="text-white text-xl tracking-[0.25em] font-bold opacity-40 select-none mb-1 leading-none">
          ||||| ||| | |||| || ||||| |||| ||
        </div>
        <p className="text-[9px] text-[#8b949e] uppercase tracking-wider">
          Raqamli billing tizimi tomonidan tasdiqlangan
        </p>
      </div>
    </div>
  );
}
