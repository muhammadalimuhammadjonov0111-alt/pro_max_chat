/**
 * To'lov cheki (termal kvitansiya) — qora / oq / kul rang (qizil yo'q).
 * Iconlar: SVG path (emoji emas). QR: qrcode bilan generatsiya (skaner ishlaydi).
 * sharp orqali SVG -> PNG.
 */

import sharp from "sharp";
import QRCode from "qrcode";

export interface PaymentImageInput {
  paymentId: string;
  username: string | null;
  userName: string;
  userId?: string;
  email?: string | null;
  amount: number;
  method: string;
  comment: string;
  planLabel: string;
  createdAt?: string | null;
  status?: string;
  isReceipt?: boolean;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function fmtSom(n: number): string {
  return n.toLocaleString("ru-RU").replace(/,/g, " ");
}

function fmtSomDot(n: number): string {
  return n.toLocaleString("ru-RU").replace(/,/g, " ").replace(/\s/g, " ") + ".00";
}

function fmtDateParts(iso: string | null | undefined): { date: string; time: string } {
  const d = iso ? new Date(iso) : new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return { date: `${dd}.${mm}.${yyyy}`, time: `${hh}:${mi}:${ss}` };
}

function receiptNo(paymentId: string): string {
  const hex = paymentId.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const tail = hex.slice(-6).padStart(6, "0");
  return `#GG-${tail}`;
}

function txnId(paymentId: string): string {
  const hex = paymentId.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const tail = hex.slice(-10).padStart(10, "0");
  return `TXN-${tail}-UZ`;
}

function numericId(input: string): string {
  let n = 0;
  for (let i = 0; i < input.length; i++) {
    n = (n * 31 + input.charCodeAt(i)) >>> 0;
  }
  return String(n).slice(0, 9).padStart(9, "0");
}

// Icon (Lucide-style, 24x24) — stroke black, fill none
function icon(name: "check" | "x" | "clock" | "card" | "user" | "hash" | "receipt" | "scan" | "shield" | "arrow", x: number, y: number, size: number, color = "#000"): string {
  const s = size / 24;
  const paths: Record<string, string> = {
    check: '<circle cx="12" cy="12" r="10" fill="none" stroke="{c}" stroke-width="2.3"/><path d="M8.5 12.5l2.5 2.5 4.5-5" fill="none" stroke="{c}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>',
    x: '<circle cx="12" cy="12" r="10" fill="none" stroke="{c}" stroke-width="2.3"/><path d="M9 9l6 6M15 9l-6 6" fill="none" stroke="{c}" stroke-width="2.3" stroke-linecap="round"/>',
    clock: '<circle cx="12" cy="12" r="10" fill="none" stroke="{c}" stroke-width="2.3"/><path d="M12 7v5l3 2" fill="none" stroke="{c}" stroke-width="2.3" stroke-linecap="round"/>',
    card: '<rect x="2.5" y="5" width="19" height="14" rx="2.5" fill="none" stroke="{c}" stroke-width="2.3"/><path d="M2.5 10h19" fill="none" stroke="{c}" stroke-width="2.3"/>',
    user: '<circle cx="12" cy="8" r="3.6" fill="none" stroke="{c}" stroke-width="2.3"/><path d="M5 20c1.2-3.2 3.8-5 7-5s5.8 1.8 7 5" fill="none" stroke="{c}" stroke-width="2.3" stroke-linecap="round"/>',
    hash: '<path d="M5 9l14 6M5 15l14-6M9 4L7 20M17 4l-2 16" fill="none" stroke="{c}" stroke-width="2.3" stroke-linecap="round"/>',
    receipt: '<path d="M6 3h12v18l-2-1.4L14 21l-2-1.4L10 21l-2-1.4L6 21z" fill="none" stroke="{c}" stroke-width="2.3" stroke-linejoin="round"/><path d="M9 8h6M9 12h6" fill="none" stroke="{c}" stroke-width="2.3" stroke-linecap="round"/>',
    scan: '<path d="M4 8V5.5A1.5 1.5 0 015.5 4H8M16 4h2.5A1.5 1.5 0 0120 5.5V8M20 16v2.5a1.5 1.5 0 01-1.5 1.5H16M8 20H5.5A1.5 1.5 0 014 18.5V16" fill="none" stroke="{c}" stroke-width="2.3" stroke-linecap="round"/><path d="M7 12h10" fill="none" stroke="{c}" stroke-width="2.3" stroke-linecap="round"/>',
    shield: '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" fill="none" stroke="{c}" stroke-width="2.3" stroke-linejoin="round"/><path d="M9 12l2 2 4-4" fill="none" stroke="{c}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="{c}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>',
  };
  const inner = paths[name].replaceAll("{c}", color);
  return `<g transform="translate(${x},${y}) scale(${s})">${inner}</g>`;
}

async function qrSvg(text: string, size: number): Promise<string> {
  const qr = await QRCode.toString(text, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
  return qr
    .replace(/<\?xml[^>]*\?>/, "")
    .replace('<svg xmlns="http://www.w3.org/2000/svg"', `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"`);
}

function barcodeSvgText(data: string): string {
  const widths = [2, 1, 3, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2, 1, 4, 2, 3, 1, 2, 4, 1, 3, 2, 1, 2, 4, 3, 1, 2, 4, 1, 2, 3];
  let x = 0;
  const bars: string[] = [];
  const clean = data.replace(/\s/g, "");
  for (let i = 0; i < Math.min(clean.length, 48); i++) {
    const code = clean.charCodeAt(i);
    const w = widths[code % widths.length];
    const h = 38;
    const y = 0;
    bars.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#000"/>`);
    x += w + 1.5;
    if (code % 2 === 0) {
      bars.push(`<rect x="${x}" y="${y}" width="1.5" height="${h}" fill="#000"/>`);
      x += 3;
    }
  }
  return bars.join("");
}

async function buildReceiptSvg(d: PaymentImageInput): Promise<string> {
  const sumWithSpace = `${fmtSom(d.amount)}.00`;
  const method = d.method === "click" ? "CLICK" : "PAYME";
  const methodLabel = d.method === "click" ? "CLICK / PAYME (Avtomatik)" : "CLICK / PAYME (Avtomatik)";
  const { date, time } = fmtDateParts(d.createdAt);
  const no = receiptNo(d.paymentId);
  const txn = txnId(d.paymentId);
  const uidNum = numericId(d.userId ?? d.paymentId);
  const user = `${d.userName} (@${d.username ?? "—"})`;
  const statusText = d.isReceipt ? "YAKUNLANDI (PAID)" : "QABUL QILINDI (PENDING)";
  const qrData = `GIDGRAM|PAYMENT|ID:${d.paymentId}|NO:${no}|SUM:${d.amount}|METHOD:${method}|COMMENT:${d.comment}|USER:${d.username ?? "-"}|TXN:${txn}`;
  const qr = await qrSvg(qrData, 140);
  const barcode = barcodeSvgText(`${d.comment}${uidNum}${d.paymentId.slice(0, 8)}`);

  const W = 880;
  const H = 1100;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <pattern id="holes" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="12" cy="12" r="1" fill="#000" opacity="0.04"/></pattern>
  </defs>

  <!-- Orqa: qora -->
  <rect width="${W}" height="${H}" fill="#000000"/>
  <rect x="0" y="0" width="8" height="${H}" fill="#000000"/>
  <rect x="${W - 8}" y="0" width="8" height="${H}" fill="#000000"/>
  <circle cx="760" cy="90" r="340" fill="#ffffff" opacity="0.06"/>

  <!-- Qog'oz ichida (yanada baland, soya bilan) -->
  <rect x="118" y="38" width="660" height="${H - 76}" fill="#000" opacity="0.25"/>
  <rect x="110" y="32" width="660" height="${H - 64}" fill="#ffffff"/>
  <rect x="110" y="32" width="660" height="${H - 64}" fill="url(#holes)"/>

  <!-- === header === -->
  <text x="440" y="82" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="16" fill="#000">============================================</text>
  <text x="440" y="112" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-weight="bold" font-size="22" fill="#000">* GIDGRAM SYSTEMS *</text>
  <text x="440" y="140" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-weight="bold" font-size="16" fill="#000">TO'LOV MUVAFFAQIYATLI QABUL QILINDI</text>
  <text x="440" y="166" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="16" fill="#000">============================================</text>

  <!-- meta: icon + label (icon - qora, 20px, chiziq bilan) -->
  <g font-family="DejaVu Sans Mono, monospace" font-size="15" fill="#000">
    <rect x="146" y="184" width="26" height="26" rx="6" fill="#000"/>
    <g transform="translate(150,188)">${icon("receipt", 0, 0, 18, "#fff")}</g>
    <text x="182" y="203">Kassa: KM-04</text>
    <text x="500" y="203">Chek No: <tspan font-weight="bold">${esc(no)}</tspan></text>

    <rect x="146" y="212" width="26" height="26" rx="6" fill="#000"/>
    <g transform="translate(150,216)">${icon("shield", 0, 0, 18, "#fff")}</g>
    <text x="182" y="231">Operator: AUTO-BOT</text>
    <text x="500" y="231">Sana: ${esc(date)}</text>

    <rect x="146" y="240" width="26" height="26" rx="6" fill="#000"/>
    <g transform="translate(150,244)">${icon("card", 0, 0, 18, "#fff")}</g>
    <text x="182" y="259">Turi: Elektron Savdo</text>
    <text x="500" y="259">Vaqt: ${esc(time)}</text>
  </g>

  <text x="440" y="292" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="15" fill="#000">────────────────────────────────────────────</text>
  <text x="150" y="318" font-family="DejaVu Sans Mono, monospace" font-size="15" fill="#000">MAHSULOT / XIZMAT</text>
  <text x="730" y="318" text-anchor="end" font-family="DejaVu Sans Mono, monospace" font-size="15" fill="#000">SUMMA</text>
  <text x="440" y="342" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="15" fill="#000">────────────────────────────────────────────</text>

  <text x="150" y="374" font-family="DejaVu Sans Mono, monospace" font-size="16" font-weight="bold" fill="#000">Gidgram Premium Obuna</text>
  <text x="730" y="374" text-anchor="end" font-family="DejaVu Sans Mono, monospace" font-size="16" font-weight="bold" fill="#000">${esc(sumWithSpace)}</text>
  <text x="150" y="396" font-family="DejaVu Sans Mono, monospace" font-size="14" fill="#525252">[ Tarif: ${esc(d.planLabel)} ]</text>
  <text x="150" y="414" font-family="DejaVu Sans Mono, monospace" font-size="14" fill="#525252">Izoh: ${esc(d.comment)}</text>

  <text x="440" y="448" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="15" fill="#000">--------------------------------------------</text>
  <text x="150" y="476" font-family="DejaVu Sans Mono, monospace" font-size="15" fill="#000">ORALIQ JAMI:</text>
  <text x="730" y="476" text-anchor="end" font-family="DejaVu Sans Mono, monospace" font-size="15" fill="#000">${esc(sumWithSpace)}</text>
  <text x="150" y="500" font-family="DejaVu Sans Mono, monospace" font-size="15" fill="#000">KOMISSIYA (0%):</text>
  <text x="730" y="500" text-anchor="end" font-family="DejaVu Sans Mono, monospace" font-size="15" fill="#000">0.00</text>
  <text x="440" y="528" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="15" fill="#000">────────────────────────────────────────────</text>

  <!-- Yakuniy: qora fonli qator (qizil yo'q, qoniqarli) -->
  <rect x="140" y="536" width="600" height="44" fill="#000"/>
  <text x="150" y="565" font-family="DejaVu Sans Mono, monospace" font-size="18" font-weight="bold" fill="#fff">YAKUNIY TO'LOV:</text>
  <text x="730" y="565" text-anchor="end" font-family="DejaVu Sans Mono, monospace" font-size="18" font-weight="bold" fill="#fff">${esc(sumWithSpace)} UZS</text>

  <text x="440" y="604" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="15" fill="#000">────────────────────────────────────────────</text>

  <g font-family="DejaVu Sans Mono, monospace" font-size="15" fill="#000">
    <rect x="146" y="618" width="26" height="26" rx="6" fill="#000"/>
    <g transform="translate(150,622)">${icon("card", 0, 0, 18, "#fff")}</g>
    <text x="182" y="637">To'lov usuli:  ${esc(methodLabel)}</text>

    <rect x="146" y="646" width="26" height="26" rx="6" fill="#000"/>
    <g transform="translate(150,650)">${icon("hash", 0, 0, 18, "#fff")}</g>
    <text x="182" y="665">Tranzaksiya:   ${esc(txn)}</text>

    <rect x="146" y="674" width="26" height="26" rx="6" fill="#000"/>
    <g transform="translate(150,678)">${icon("user", 0, 0, 18, "#fff")}</g>
    <text x="182" y="693">Mijoz:         ${esc(user).slice(0, 34)}</text>

    <rect x="146" y="702" width="26" height="26" rx="6" fill="#000"/>
    <g transform="translate(150,706)">${icon("hash", 0, 0, 18, "#fff")}</g>
    <text x="182" y="721">ID:            ${esc(uidNum)}</text>

    <rect x="146" y="730" width="26" height="26" rx="6" fill="#000"/>
    <g transform="translate(150,734)">${icon("check", 0, 0, 18, "#fff")}</g>
    <text x="182" y="749">Holati:        <tspan font-weight="bold">${esc(statusText)}</tspan></text>
  </g>

  <text x="440" y="780" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="15" fill="#000">────────────────────────────────────────────</text>

  <!-- QR kod (skaner ishlaydi) + shtrix -->
  <g transform="translate(370,802)"><rect x="-8" y="-8" width="156" height="156" fill="#fff" stroke="#000" stroke-opacity="0.15"/>${qr}</g>
  <rect x="280" y="964" width="320" height="32" rx="16" fill="#000"/>
  <g transform="translate(290,970)">${icon("scan", 0, 0, 18, "#fff")}</g>
  <text x="318" y="986" font-family="DejaVu Sans Mono, monospace" font-size="13" fill="#fff">QR ni skanerlang (phone kamera)</text>

  <g transform="translate(300,1012)">${barcode}</g>
  <text x="440" y="1070" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="13" fill="#000">* ${esc(uidNum)}${esc(d.comment.replace(/\s/g, ""))} *</text>
</svg>`;
}

export interface ResultImageInput extends PaymentImageInput {
  approved: boolean;
}

function buildResultSvg(d: ResultImageInput): string {
  const amount = fmtSomDot(d.amount);
  const method = d.method === "click" ? "CLICK" : "PAYME";
  const state = d.approved ? "YAKUNLANDI (PAID)" : "RAD ETILDI";
  const no = receiptNo(d.paymentId);
  const txn = txnId(d.paymentId);
  const uidNum = numericId(d.userId ?? d.paymentId);
  const { date, time } = fmtDateParts(d.createdAt);
  const user = `${d.userName} (@${d.username ?? "—"})`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="880" height="1080" viewBox="0 0 880 1080">
  <rect width="880" height="1080" fill="#000"/>
  <rect x="110" y="32" width="660" height="1016" fill="#fff"/>
  <text x="440" y="82" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="16" fill="#000">============================================</text>
  <text x="440" y="112" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-weight="bold" font-size="22" fill="#000">* GIDGRAM SYSTEMS *</text>
  <text x="440" y="140" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-weight="bold" font-size="16" fill="#000">${d.approved ? "TO'LOV TASDIQLANDI" : "TO'LOV RAD ETILDI"}</text>
  <text x="440" y="166" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="16" fill="#000">============================================</text>

  <g font-family="DejaVu Sans Mono, monospace" font-size="15" fill="#000">
    <text x="150" y="203">Kassa: KM-04</text>
    <text x="500" y="203">Chek No: <tspan font-weight="bold">${esc(no)}</tspan></text>
    <text x="150" y="231">Operator: ADMIN</text>
    <text x="500" y="231">Sana: ${esc(date)}</text>
    <text x="150" y="259">Turi: Elektron Savdo</text>
    <text x="500" y="259">Vaqt: ${esc(time)}</text>
  </g>
  <text x="440" y="292" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="15" fill="#000">────────────────────────────────────────────</text>
  <text x="150" y="320" font-family="DejaVu Sans Mono, monospace" font-size="15" fill="#000">MAHSULOT / XIZMAT</text>
  <text x="730" y="320" text-anchor="end" font-family="DejaVu Sans Mono, monospace" font-size="15" fill="#000">SUMMA</text>
  <text x="440" y="344" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="15" fill="#000">────────────────────────────────────────────</text>
  <text x="150" y="376" font-family="DejaVu Sans Mono, monospace" font-size="16" font-weight="bold" fill="#000">Gidgram Premium Obuna</text>
  <text x="730" y="376" text-anchor="end" font-family="DejaVu Sans Mono, monospace" font-size="16" font-weight="bold" fill="#000">${esc(amount)}</text>
  <text x="150" y="398" font-family="DejaVu Sans Mono, monospace" font-size="14" fill="#525252">[ Tarif: ${esc(d.planLabel)} ]</text>
  <text x="440" y="448" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="15" fill="#000">--------------------------------------------</text>
  <text x="150" y="476" font-family="DejaVu Sans Mono, monospace" font-size="15" fill="#000">ORALIQ JAMI:</text>
  <text x="730" y="476" text-anchor="end" font-family="DejaVu Sans Mono, monospace" font-size="15" fill="#000">${esc(amount)}</text>
  <text x="150" y="500" font-family="DejaVu Sans Mono, monospace" font-size="15" fill="#000">KOMISSIYA (0%):</text>
  <text x="730" y="500" text-anchor="end" font-family="DejaVu Sans Mono, monospace" font-size="15" fill="#000">0.00</text>
  <text x="440" y="528" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="15" fill="#000">────────────────────────────────────────────</text>
  <rect x="140" y="536" width="600" height="44" fill="#000"/>
  <text x="150" y="565" font-family="DejaVu Sans Mono, monospace" font-size="18" font-weight="bold" fill="#fff">YAKUNIY TO'LOV:</text>
  <text x="730" y="565" text-anchor="end" font-family="DejaVu Sans Mono, monospace" font-size="18" font-weight="bold" fill="#fff">${esc(amount)} UZS</text>
  <text x="440" y="604" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="15" fill="#000">────────────────────────────────────────────</text>
  <g font-family="DejaVu Sans Mono, monospace" font-size="15" fill="#000">
    <text x="150" y="637">To'lov usuli:  ${esc(method)} (Avtomatik)</text>
    <text x="150" y="665">Tranzaksiya:   ${esc(txn)}</text>
    <text x="150" y="693">Mijoz:         ${esc(user).slice(0, 34)}</text>
    <text x="150" y="721">ID:            ${esc(uidNum)}</text>
    <text x="150" y="749">Holati:        <tspan font-weight="bold">${esc(state)}</tspan></text>
  </g>
  <text x="440" y="780" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="15" fill="#000">────────────────────────────────────────────</text>
  <text x="440" y="832" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="16" font-weight="bold" fill="#000">${d.approved ? "PREMIUM YOQILDI" : "BUYURTMA YOPILDI"}</text>
  <text x="440" y="866" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="14" fill="#000">${d.approved ? "Foydalanuvchiga bildirishnoma ketdi." : "Foydalanuvchiga xabar ketdi."}</text>
  <text x="440" y="900" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="14" fill="#000">Rasm sifatida avtomatik yuborildi.</text>
</svg>`;
}

export interface StatsImageInput {
  users: number;
  premium: number;
  pending: number;
  paid: number;
  revenue: number;
  botUsername?: string;
  recent: Array<{ name: string; username: string | null; amount: number; status: string; comment: string | null }>;
}

function buildStatsSvg(d: StatsImageInput): string {
  const time = new Date().toLocaleString("uz-UZ");
  const recentText = (d.recent.length ? d.recent : [{ name: "—", username: null, amount: 0, status: "—", comment: null }])
    .slice(0, 5)
    .map((p) => `» ${p.name} (@${p.username ?? "—"}) — ${fmtSom(p.amount)} so'm — ${p.status}`)
    .join("\n") || "» Hali to'lov yo'q";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="880" height="1080" viewBox="0 0 880 1080">
  <rect width="880" height="1080" fill="#000"/>
  <rect x="110" y="32" width="660" height="1016" fill="#fff"/>
  <text x="440" y="82" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="16" fill="#000">============================================</text>
  <text x="440" y="112" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-weight="bold" font-size="22" fill="#000">* GIDGRAM SYSTEMS *</text>
  <text x="440" y="140" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-weight="bold" font-size="16" fill="#000">SAYT STATISTIKASI</text>
  <text x="440" y="166" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="16" fill="#000">============================================</text>

  <g font-family="DejaVu Sans Mono, monospace" font-size="15" fill="#000">
    <text x="150" y="203">Foydalanuvchilar : ${d.users}</text>
    <text x="150" y="231">Premium faol    : ${d.premium}</text>
    <text x="150" y="259">Kutilmoqda      : ${d.pending}</text>
    <text x="150" y="287">Tasdiqlangan     : ${d.paid}</text>
    <text x="150" y="315">Umumiy tushum   : ${fmtSom(d.revenue)} so'm</text>
    <text x="150" y="343">Bot             : @${esc(d.botUsername ?? "bot")}</text>
    <text x="150" y="371">Vaqt            : ${esc(time)}</text>
  </g>
  <text x="440" y="408" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="15" fill="#000">────────────────────────────────────────────</text>
  <text x="150" y="448" font-family="DejaVu Sans Mono, monospace" font-size="14" fill="#000">[ LOG :: OXIRGI TO'LOVLAR ]</text>
  ${Array.from({ length: 5 }, (_, i) => `<text x="150" y="${482 + i * 28}" font-family="DejaVu Sans Mono, monospace" font-size="14" fill="#000">${esc((recentText.split("\n")[i] ?? "").slice(0, 52))}</text>`).join("")}
  <text x="440" y="660" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="14" fill="#000">Rasm sifatida avtomatik yuborildi.</text>
</svg>`;
}

export async function buildPaymentPng(d: PaymentImageInput): Promise<Buffer> {
  const svg = await buildReceiptSvg(d);
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export async function buildResultPng(d: ResultImageInput): Promise<Buffer> {
  const svg = buildResultSvg(d);
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export async function buildStatsPng(d: StatsImageInput): Promise<Buffer> {
  const svg = buildStatsSvg(d);
  return sharp(Buffer.from(svg)).png().toBuffer();
}
