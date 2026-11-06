import os
from datetime import datetime
from PIL import Image, ImageDraw, ImageFont

def generate_premium_receipt(user_name, user_id, amount, txn_id, check_no):
    # 1. Ixcham vertikal o'lcham
    width, height = 400, 620
    image = Image.new("RGB", (width, height), "#0d1117")
    draw = ImageDraw.Draw(image)

    try:
        font_bold = ImageFont.truetype("arialbd.ttf", 16)
        font_large = ImageFont.truetype("arialbd.ttf", 28)
        font_regular = ImageFont.truetype("arial.ttf", 13)
        font_tiny = ImageFont.truetype("arial.ttf", 11)
    except (IOError, OSError):
        font_bold = font_large = font_regular = font_tiny = ImageFont.load_default()

    # 2. Header
    draw.text((30, 30), "* GIDGRAM SYSTEMS *", fill="#58a6ff", font=font_bold)
    draw.text((270, 32), f"#{check_no}", fill="#8b949e", font=font_tiny)
    draw.line([30, 65, 370, 65], fill="#21262d", width=1)

    # 3. Summa bloki
    draw.rectangle([30, 85, 370, 165], fill="#161b22", outline="#30363d", width=1)
    draw.text((50, 100), "YAKUNIY TO'LOV", fill="#8b949e", font=font_tiny)
    amount_str = f"{amount:,.2f} UZS".replace(",", " ")
    draw.text((50, 120), amount_str, fill="#ff7b72", font=font_large)

    # 4. Itemized
    draw.text((30, 195), "Xizmat:", fill="#8b949e", font=font_regular)
    draw.text((150, 195), "Gidgram Premium Obuna", fill="#ffffff", font=font_bold)

    draw.text((30, 225), "Tarif turi:", fill="#8b949e", font=font_regular)
    draw.text((150, 225), "Yillik kirish", fill="#58a6ff", font=font_regular)

    draw.line([30, 255, 370, 255], fill="#21262d", width=1)

    # 5. Metadata
    details = [
        ("Mijoz:", user_name),
        ("ID raqami:", str(user_id)),
        ("To'lov usuli:", "CLICK API (Avto)"),
        ("Tranzaksiya:", f"TXN-{txn_id}-UZ"),
        ("Sana / Vaqt:", datetime.now().strftime("%d.%m.%Y | %H:%M")),
    ]

    y_offset = 275
    for key, value in details:
        draw.text((30, y_offset), key, fill="#8b949e", font=font_regular)
        font = font_bold if key in ["Mijoz:", "Tranzaksiya:"] else font_regular
        draw.text((150, y_offset), value, fill="#ffffff", font=font)
        y_offset += 35

    draw.line([30, y_offset + 5, 370, y_offset + 5], fill="#21262d", width=1)

    # 6. Footer - barcode
    barcode_widths = [2, 4, 1, 3, 2, 5, 2, 1, 4, 2, 3, 1, 5, 2, 4, 1, 2, 3, 5, 2, 1, 4, 2, 3]
    barcode_x = 100
    for w in barcode_widths:
        draw.rectangle([barcode_x, y_offset + 25, barcode_x + w, y_offset + 55], fill="#ffffff")
        barcode_x += w + 3

    draw.text((95, y_offset + 65), "RAQAMLI BILLING TIZIMI TOMONIDAN TASDIQLANGAN", fill="#8b949e", font=font_tiny)

    os.makedirs("generated", exist_ok=True)
    file_path = f"generated/receipt_{check_no}.png"
    image.save(file_path)
    return file_path

if __name__ == "__main__":
    path = generate_premium_receipt("Admin (@admin)", 185186202, 100000, "XO06VI36YE", "GG-VI36YE")
    print(f"Tayyor: {path}")



