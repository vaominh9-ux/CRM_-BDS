import html
import io
import json
import os
import sys
import urllib.request

from reportlab.graphics import renderPDF
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Image, KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
)


def register_fonts():
    regular_candidates = [
        os.environ.get("CRM_PDF_FONT", ""),
        r"C:\Windows\Fonts\arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    bold_candidates = [
        os.environ.get("CRM_PDF_FONT_BOLD", ""),
        r"C:\Windows\Fonts\arialbd.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ]
    regular = next((item for item in regular_candidates if item and os.path.exists(item)), None)
    bold = next((item for item in bold_candidates if item and os.path.exists(item)), None)
    if regular:
        pdfmetrics.registerFont(TTFont("CRMFont", regular))
        pdfmetrics.registerFont(TTFont("CRMFontBold", bold or regular))
        return "CRMFont", "CRMFontBold"
    return "Helvetica", "Helvetica-Bold"


FONT, FONT_BOLD = register_fonts()
NAVY = colors.HexColor("#0B3D3A")
TEAL = colors.HexColor("#14B8A6")
INK = colors.HexColor("#17324D")
MUTED = colors.HexColor("#64748B")
PANEL = colors.HexColor("#F3F7FA")
LINE = colors.HexColor("#D9E3EA")


def safe(value):
    return html.escape(str(value or ""))


def fetch_cover(url):
    if not url or not str(url).lower().startswith(("http://", "https://")):
        return None
    try:
        request = urllib.request.Request(str(url), headers={"User-Agent": "RS-Estates-Brochure/1.0"})
        with urllib.request.urlopen(request, timeout=8) as response:
            data = response.read(8 * 1024 * 1024)
        image = Image(io.BytesIO(data))
        max_width, max_height = 174 * mm, 76 * mm
        ratio = min(max_width / image.imageWidth, max_height / image.imageHeight)
        image.drawWidth = image.imageWidth * ratio
        image.drawHeight = image.imageHeight * ratio
        image.hAlign = "CENTER"
        return image
    except Exception:
        return None


def qr_drawing(value):
    widget = QrCodeWidget(value or "http://localhost:3000/")
    bounds = widget.getBounds()
    width = bounds[2] - bounds[0]
    height = bounds[3] - bounds[1]
    size = 27 * mm
    drawing = Drawing(size, size, transform=[size / width, 0, 0, size / height, 0, 0])
    drawing.add(widget)
    return drawing


def money(value):
    try:
        return f"{int(round(float(value or 0))):,}".replace(",", ".") + " đ"
    except Exception:
        return "0 đ"


def build(payload):
    output = io.BytesIO()
    document = SimpleDocTemplate(
        output, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm,
        topMargin=16 * mm, bottomMargin=16 * mm,
        title=str(payload.get("title") or "Tờ giới thiệu bất động sản"),
        author="RS Estates",
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "TitleVN", parent=styles["Title"], fontName=FONT_BOLD, fontSize=21,
        leading=25, textColor=colors.white, alignment=TA_LEFT, spaceAfter=4,
    )
    header_meta = ParagraphStyle(
        "HeaderMeta", parent=styles["Normal"], fontName=FONT, fontSize=9.5,
        leading=13, textColor=colors.HexColor("#D7F4EF"),
    )
    heading = ParagraphStyle(
        "HeadingVN", parent=styles["Heading2"], fontName=FONT_BOLD, fontSize=12,
        leading=15, textColor=NAVY, spaceBefore=8, spaceAfter=6,
    )
    body = ParagraphStyle(
        "BodyVN", parent=styles["BodyText"], fontName=FONT, fontSize=9.5,
        leading=14, textColor=INK,
    )
    small = ParagraphStyle(
        "SmallVN", parent=styles["BodyText"], fontName=FONT, fontSize=8.2,
        leading=11, textColor=MUTED,
    )
    label = ParagraphStyle("Label", parent=small, fontName=FONT_BOLD, textColor=MUTED)
    value = ParagraphStyle("Value", parent=body, fontName=FONT_BOLD, fontSize=10.5)

    ref = safe(payload.get("referenceCode") or "BẤT ĐỘNG SẢN")
    location = safe(payload.get("location") or "Chưa cập nhật địa chỉ")
    header = Table([
        [Paragraph(safe(payload.get("title")), title_style)],
        [Paragraph(f"{ref} &nbsp;&nbsp;•&nbsp;&nbsp; {location}", header_meta)],
    ], colWidths=[174 * mm])
    header.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), NAVY),
        ("LEFTPADDING", (0, 0), (-1, -1), 10 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10 * mm),
        ("TOPPADDING", (0, 0), (-1, 0), 7 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 2 * mm),
        ("TOPPADDING", (0, 1), (-1, 1), 0),
        ("BOTTOMPADDING", (0, 1), (-1, 1), 6 * mm),
        ("ROUNDEDCORNERS", [5]),
    ]))

    story = [header, Spacer(1, 5 * mm)]
    cover = fetch_cover(payload.get("coverImage"))
    if cover:
        story.extend([cover, Spacer(1, 4 * mm)])

    rent_suffix = ""
    if payload.get("listingType") == "Thuê" and payload.get("rentFrequency"):
        rent_suffix = " / " + safe(payload.get("rentFrequency"))
    price_block = Table([
        [Paragraph("GIÁ CHÀO", label), Paragraph("HÌNH THỨC", label), Paragraph("TRẠNG THÁI", label)],
        [Paragraph(money(payload.get("price")) + rent_suffix, value),
         Paragraph(safe(payload.get("listingType")), value),
         Paragraph(safe(payload.get("status")), value)],
    ], colWidths=[78 * mm, 48 * mm, 48 * mm])
    price_block.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PANEL),
        ("BOX", (0, 0), (-1, -1), 0.7, LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 4 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4 * mm),
        ("TOPPADDING", (0, 0), (-1, 0), 3 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 1.5 * mm),
        ("TOPPADDING", (0, 1), (-1, 1), 1 * mm),
        ("BOTTOMPADDING", (0, 1), (-1, 1), 3.5 * mm),
    ]))
    story.extend([price_block, Spacer(1, 5 * mm)])

    specs = [
        ("Loại bất động sản", payload.get("propertyType") or "-"),
        ("Diện tích", f"{payload.get('areaSize') or '-'} {payload.get('areaUnit') or ''}".strip()),
        ("Phòng ngủ", payload.get("bedrooms") if payload.get("bedrooms") is not None else "-"),
        ("Phòng tắm", payload.get("bathrooms") if payload.get("bathrooms") is not None else "-"),
        ("Nhân viên phụ trách", payload.get("assignedAgent") or "-"),
        ("Mã tham chiếu", payload.get("referenceCode") or "-"),
    ]
    spec_rows = []
    for index in range(0, len(specs), 2):
        row = []
        for spec_label, spec_value in specs[index:index + 2]:
            row.append([
                Paragraph(safe(spec_label).upper(), label),
                Spacer(1, 1 * mm),
                Paragraph(safe(spec_value), value),
            ])
        spec_rows.append(row)
    spec_table = Table(spec_rows, colWidths=[87 * mm, 87 * mm])
    spec_table.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.7, LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 3 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3 * mm),
    ]))
    story.extend([spec_table])

    description = str(payload.get("description") or "").strip()
    if description:
        story.extend([Paragraph("Mô tả", heading), Paragraph(safe(description).replace("\n", "<br/>"), body)])
    amenities = [str(item).strip() for item in payload.get("amenities", []) if str(item).strip()]
    if amenities:
        chips = " &nbsp; • &nbsp; ".join(safe(item) for item in amenities)
        story.extend([Paragraph("Tiện ích", heading), Paragraph(chips, body)])

    portal_url = str(payload.get("portalUrl") or "http://localhost:3000/")
    contact = Table([
        [Paragraph("RS ESTATES", ParagraphStyle("Brand", parent=heading, fontSize=13, textColor=TEAL)), qr_drawing(portal_url)],
        [Paragraph("Quét mã QR để mở tin đăng trực tuyến.<br/>Thông tin được xuất trực tiếp từ hệ thống CRM.", small), ""],
    ], colWidths=[145 * mm, 29 * mm])
    contact.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("SPAN", (1, 0), (1, 1)),
        ("LINEABOVE", (0, 0), (-1, 0), 0.8, LINE),
        ("TOPPADDING", (0, 0), (-1, -1), 4 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.extend([Spacer(1, 6 * mm), contact])

    def footer(canvas, doc):
        canvas.saveState()
        canvas.setStrokeColor(LINE)
        canvas.line(18 * mm, 11 * mm, 192 * mm, 11 * mm)
        canvas.setFont(FONT, 7.5)
        canvas.setFillColor(MUTED)
        canvas.drawString(18 * mm, 7 * mm, "RS Estates - Tờ giới thiệu bất động sản")
        canvas.drawRightString(192 * mm, 7 * mm, f"Trang {doc.page}")
        canvas.restoreState()

    document.build(story, onFirstPage=footer, onLaterPages=footer)
    return output.getvalue()


if __name__ == "__main__":
    try:
        source = json.loads(sys.stdin.buffer.read().decode("utf-8"))
        sys.stdout.buffer.write(build(source))
    except Exception as exc:
        sys.stderr.write(str(exc))
        sys.exit(1)
