#!/usr/bin/env python3
"""
Fizmoh Platform PDF Document Generator (Pure Python Standard PDF 1.4)
Generates a multi-page, publication-grade PDF specification without external dependencies.
"""

import os
import sys

class PDFWriter:
    def __init__(self):
        self.objects = []
        self.pages = []
        self.font_regular_id = None
        self.font_bold_id = None
        self.font_mono_id = None
        self.font_italic_id = None

    def add_object(self, content):
        self.objects.append(content)
        return len(self.objects)

    def new_page(self):
        page = PDFPage(self)
        self.pages.append(page)
        return page

    def build(self, output_path):
        # Obj 1: Catalog (will be added)
        # Obj 2: Pages root
        # Obj 3: Helvetica
        # Obj 4: Helvetica-Bold
        # Obj 5: Courier
        # Obj 6: Helvetica-Oblique
        
        cat_id = 1
        pages_id = 2
        
        f1_id = self.add_object("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>")
        f2_id = self.add_object("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>")
        f3_id = self.add_object("<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>")
        f4_id = self.add_object("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>")
        
        page_obj_ids = []
        
        # Add page contents
        for page in self.pages:
            # Stream obj
            stream_data = page.get_stream()
            stream_len = len(stream_data.encode('latin1'))
            content_obj_content = f"<< /Length {stream_len} >>\nstream\n{stream_data}\nendstream"
            content_id = self.add_object(content_obj_content)
            
            # Page obj placeholder
            page_obj_ids.append(content_id) # temporary

        # Now build actual page objects
        actual_page_ids = []
        for i, page in enumerate(self.pages):
            content_id = page_obj_ids[i]
            page_dict = (
                f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] "
                f"/Resources << /Font << /F1 {f1_id} 0 R /F2 {f2_id} 0 R /F3 {f3_id} 0 R /F4 {f4_id} 0 R >> >> "
                f"/Contents {content_id} 0 R >>"
            )
            actual_page_ids.append(self.add_object(page_dict))

        # Build pages tree
        kids_str = " ".join([f"{pid} 0 R" for pid in actual_page_ids])
        pages_dict = f"<< /Type /Pages /Kids [{kids_str}] /Count {len(actual_page_ids)} >>"
        
        # Build catalog
        catalog_dict = "<< /Type /Catalog /Pages 2 0 R >>"
        
        # Final array of all objects:
        # 1: Catalog
        # 2: Pages
        # 3..: Fonts, Streams, Pages
        all_objs = [catalog_dict, pages_dict] + self.objects
        
        # Write PDF binary
        out = []
        out.append("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n")
        
        offsets = {}
        curr_offset = len(out[0].encode('latin1'))
        
        for i, obj in enumerate(all_objs):
            obj_num = i + 1
            offsets[obj_num] = curr_offset
            obj_str = f"{obj_num} 0 obj\n{obj}\nendobj\n"
            out.append(obj_str)
            curr_offset += len(obj_str.encode('latin1'))
            
        xref_offset = curr_offset
        xref_str = f"xref\n0 {len(all_objs) + 1}\n0000000000 65535 f \n"
        for i in range(1, len(all_objs) + 1):
            xref_str += f"{offsets[i]:010d} 00000 n \n"
            
        trailer_str = (
            f"trailer\n<< /Size {len(all_objs) + 1} /Root 1 0 R >>\n"
            f"startxref\n{xref_offset}\n%%EOF\n"
        )
        
        out.append(xref_str)
        out.append(trailer_str)
        
        with open(output_path, "wb") as f:
            for chunk in out:
                f.write(chunk.encode('latin1'))


class PDFPage:
    def __init__(self, writer):
        self.writer = writer
        self.commands = []

    def rgb(self, r, g, b):
        self.commands.append(f"{r:.3f} {g:.3f} {b:.3f} rg {r:.3f} {g:.3f} {b:.3f} RG")

    def rect(self, x, y, w, h, fill=True, stroke=False, line_width=1):
        self.commands.append(f"{line_width:.2f} w")
        op = "B" if fill and stroke else "f" if fill else "S"
        self.commands.append(f"{x:.2f} {y:.2f} {w:.2f} {h:.2f} re {op}")

    def roundrect(self, x, y, w, h, r=6, fill=True, stroke=False, line_width=1):
        self.commands.append(f"{line_width:.2f} w")
        # Approximate rounded rectangle with bezier curves
        k = 0.552284749831 * r
        c = []
        c.append(f"{x+r:.2f} {y:.2f} m")
        c.append(f"{x+w-r:.2f} {y:.2f} l")
        c.append(f"{x+w-r+k:.2f} {y:.2f} {x+w:.2f} {y+r-k:.2f} {x+w:.2f} {y+r:.2f} c")
        c.append(f"{x+w:.2f} {y+h-r:.2f} l")
        c.append(f"{x+w:.2f} {y+h-r+k:.2f} {x+w-r+k:.2f} {y+h:.2f} {x+w-r:.2f} {y+h:.2f} c")
        c.append(f"{x+r:.2f} {y+h:.2f} l")
        c.append(f"{x+r-k:.2f} {y+h:.2f} {x:.2f} {y+h-r+k:.2f} {x:.2f} {y+h-r:.2f} c")
        c.append(f"{x:.2f} {y+r:.2f} l")
        c.append(f"{x:.2f} {y+r-k:.2f} {x+r-k:.2f} {y:.2f} {x+r:.2f} {y:.2f} c")
        c.append("h")
        op = "B" if fill and stroke else "f" if fill else "S"
        c.append(op)
        self.commands.append(" ".join(c))

    def line(self, x1, y1, x2, y2, line_width=1):
        self.commands.append(f"{line_width:.2f} w {x1:.2f} {y1:.2f} m {x2:.2f} {y2:.2f} l S")

    def text(self, x, y, text_str, font="F1", size=10):
        # Escape parenthesis and backslashes
        clean_text = (
            text_str.replace("\\", "\\\\")
            .replace("(", "\\(")
            .replace(")", "\\)")
        )
        self.commands.append(f"BT /{font} {size:.2f} Tf {x:.2f} {y:.2f} Td ({clean_text}) Tj ET")

    def get_stream(self):
        return "\n".join(self.commands)


def draw_header_and_footer(page, page_num, total_pages=6):
    # Top Emerald Banner Line
    page.rgb(0.059, 0.463, 0.431)
    page.rect(0, 836, 595.28, 6, fill=True, stroke=False)
    
    # Header Card
    page.rgb(0.96, 0.97, 0.98)
    page.roundrect(40, 770, 515, 52, r=6, fill=True, stroke=False)
    page.rgb(0.88, 0.90, 0.92)
    page.roundrect(40, 770, 515, 52, r=6, fill=False, stroke=True, line_width=1)
    
    page.rgb(0.059, 0.463, 0.431)
    page.text(55, 800, "FIZMOH", font="F2", size=18)
    
    page.rgb(0.12, 0.15, 0.20)
    page.text(140, 800, "Enterprise Cloud SaaS Platform Specification", font="F2", size=11)
    
    page.rgb(0.45, 0.50, 0.55)
    page.text(55, 782, "Multi-Tenant WhatsApp Commerce, Operations & Conversational AI Engine", font="F1", size=9)
    page.text(395, 782, "Version 3.0 | Production Release", font="F1", size=9)
    
    # Footer Divider
    page.rgb(0.88, 0.90, 0.92)
    page.line(40, 45, 555, 45, line_width=1)
    
    page.rgb(0.50, 0.55, 0.60)
    page.text(40, 32, "Confidential - Fizmoh Cloud Platform Architecture Documentation", font="F1", size=8)
    page.text(495, 32, f"Page {page_num} of {total_pages}", font="F2", size=8)


def generate_specification_pdf(output_path):
    doc = PDFWriter()
    
    # =========================================================================
    # PAGE 1: Executive Summary & Architecture Topology
    # =========================================================================
    p1 = doc.new_page()
    draw_header_and_footer(p1, 1)
    
    p1.rgb(0.059, 0.463, 0.431)
    p1.text(40, 740, "1. Executive Summary & Architecture Topology", font="F2", size=13)
    p1.line(40, 732, 555, 732, line_width=1.5)
    
    p1.rgb(0.15, 0.18, 0.22)
    p1.text(40, 715, "Fizmoh is an enterprise multi-tenant WhatsApp Commerce, Operational Automation, and Conversational", font="F1", size=9.5)
    p1.text(40, 702, "AI SaaS platform. It enables specialized vertical businesses to operate end-to-end customer commerce", font="F1", size=9.5)
    p1.text(40, 689, "and support over WhatsApp, while providing platform administrators with a centralized control plane.", font="F1", size=9.5)
    
    # Dual Surface Architecture Cards
    # Left Card: Platform Operator Console
    p1.rgb(0.95, 0.98, 0.96)
    p1.roundrect(40, 545, 245, 130, r=6, fill=True, stroke=False)
    p1.rgb(0.059, 0.463, 0.431)
    p1.roundrect(40, 545, 245, 130, r=6, fill=False, stroke=True, line_width=1)
    
    p1.rgb(0.059, 0.463, 0.431)
    p1.text(52, 655, "Platform Operator Console", font="F2", size=11)
    p1.rgb(0.20, 0.25, 0.30)
    p1.text(52, 640, "Endpoint: /platform/*", font="F2", size=9)
    
    p1.rgb(0.25, 0.30, 0.35)
    p1.text(52, 622, "- Command Center & Global KPI Analytics", font="F1", size=8.5)
    p1.text(52, 608, "- Multi-Tenant Lifecycle & Impersonation", font="F1", size=8.5)
    p1.text(52, 594, "- SaaS Subscriptions, Invoicing & Dunning", font="F1", size=8.5)
    p1.text(52, 580, "- Meta WhatsApp Number Fleet Management", font="F1", size=8.5)
    p1.text(52, 566, "- Resource Quotas, Support & Audit Logs", font="F1", size=8.5)
    
    # Right Card: Tenant Workspace Surface
    p1.rgb(0.96, 0.97, 0.99)
    p1.roundrect(310, 545, 245, 130, r=6, fill=True, stroke=False)
    p1.rgb(0.25, 0.40, 0.70)
    p1.roundrect(310, 545, 245, 130, r=6, fill=False, stroke=True, line_width=1)
    
    p1.rgb(0.20, 0.35, 0.65)
    p1.text(322, 655, "Tenant Workspace SaaS Surface", font="F2", size=11)
    p1.rgb(0.20, 0.25, 0.30)
    p1.text(322, 640, "Endpoint: /:tenant-slug/*", font="F2", size=9)
    
    p1.rgb(0.25, 0.30, 0.35)
    p1.text(322, 622, "- 2-Way Omnichannel WhatsApp Live Inbox", font="F1", size=8.5)
    p1.text(322, 608, "- AI Assistant Grounded in Knowledge Base", font="F1", size=8.5)
    p1.text(322, 594, "- Tour Bookings, Hospital & Restaurant POS", font="F1", size=8.5)
    p1.text(322, 580, "- Broadcast Campaigns & Meta Templates", font="F1", size=8.5)
    p1.text(322, 566, "- AmwalPay Gateway & WooCommerce Sync", font="F1", size=8.5)
    
    # Tech Stack Table
    p1.rgb(0.12, 0.15, 0.20)
    p1.text(40, 515, "Core Technical Specifications", font="F2", size=11)
    p1.rgb(0.85, 0.88, 0.90)
    p1.line(40, 508, 555, 508, line_width=1)
    
    p1.rgb(0.98, 0.98, 0.98)
    p1.roundrect(40, 330, 515, 165, r=4, fill=True, stroke=False)
    p1.rgb(0.88, 0.90, 0.92)
    p1.roundrect(40, 330, 515, 165, r=4, fill=False, stroke=True, line_width=1)
    
    p1.rgb(0.92, 0.94, 0.96)
    p1.roundrect(40, 465, 515, 30, r=4, fill=True, stroke=False)
    
    p1.rgb(0.15, 0.20, 0.25)
    p1.text(55, 476, "Architecture Layer", font="F2", size=9.5)
    p1.text(200, 476, "Technology / Library", font="F2", size=9.5)
    p1.text(370, 476, "Architectural Role & Function", font="F2", size=9.5)
    
    layers = [
        ("Frontend Framework", "Next.js 16 (Turbopack)", "App Router, React 19, Server Components", 448),
        ("Backend & APIs", "Next.js Edge / Node APIs", "Dynamic Route Handlers & Middlewares", 423),
        ("Database & ORM", "PostgreSQL + Prisma 6.x", "Multi-tenant relational persistence & indexes", 398),
        ("UI & Visualization", "Tailwind CSS + Recharts", "Radix UI / shadcn, Lucide, Interactive Charts", 373),
        ("Integrations", "Meta Cloud API, AmwalPay", "WABA Webhooks, Google Meet, WooCommerce", 348)
    ]
    
    for l_name, l_tech, l_role, y_pos in layers:
        p1.rgb(0.15, 0.18, 0.22)
        p1.text(55, y_pos, l_name, font="F2", size=8.5)
        p1.text(200, y_pos, l_tech, font="F1", size=8.5)
        p1.text(370, y_pos, l_role, font="F1", size=8.5)
        
    # Highlights Box
    p1.rgb(0.95, 0.98, 0.96)
    p1.roundrect(40, 205, 515, 105, r=6, fill=True, stroke=False)
    p1.rgb(0.059, 0.463, 0.431)
    p1.roundrect(40, 205, 515, 105, r=6, fill=False, stroke=True, line_width=1)
    
    p1.rgb(0.059, 0.463, 0.431)
    p1.text(55, 292, "Security & Isolation Highlights", font="F2", size=10)
    
    p1.rgb(0.20, 0.25, 0.30)
    p1.text(55, 275, "- Complete Multi-Tenant Data Isolation enforced at database query & API middleware levels.", font="F1", size=8.5)
    p1.text(55, 260, "- Zero-Knowledge Operator Impersonation with mandatory audit logging and reason capture.", font="F1", size=8.5)
    p1.text(55, 245, "- Type-Safe Endpoints & Dynamic Routing without legacy URL hash fragments.", font="F1", size=8.5)
    p1.text(55, 230, "- Automated Dunning Engine with payment gateway webhook reconciliation.", font="F1", size=8.5)
    p1.text(55, 215, "- Immutable Audit Trail logging all administrative actions with 1-click CSV export.", font="F1", size=8.5)

    # =========================================================================
    # PAGE 2: Platform Operator Console In-Depth
    # =========================================================================
    p2 = doc.new_page()
    draw_header_and_footer(p2, 2)
    
    p2.rgb(0.059, 0.463, 0.431)
    p2.text(40, 740, "2. Platform Operator Console Features (/platform/*)", font="F2", size=13)
    p2.line(40, 732, 555, 732, line_width=1.5)
    
    p2.rgb(0.15, 0.18, 0.22)
    p2.text(40, 715, "The Platform Operator Console is a standalone command surface built for Fizmoh global administrators.", font="F1", size=9.5)
    p2.text(40, 702, "Every section is accessible via clean, direct URL paths with full-width responsive layouts and CRUD controls.", font="F1", size=9.5)
    
    # Block 1
    p2.rgb(0.98, 0.98, 0.98)
    p2.roundrect(40, 550, 515, 135, r=6, fill=True, stroke=False)
    p2.rgb(0.88, 0.90, 0.92)
    p2.roundrect(40, 550, 515, 135, r=6, fill=False, stroke=True, line_width=1)
    
    p2.rgb(0.059, 0.463, 0.431)
    p2.text(55, 665, "Command Center & Tenant Workspace Governance", font="F2", size=11)
    p2.rgb(0.45, 0.50, 0.55)
    p2.text(55, 650, "Routes: /platform/command-center, /platform/tenants", font="F2", size=8.5)
    
    p2.rgb(0.18, 0.22, 0.28)
    p2.text(55, 632, "- Real-time Platform KPIs: Active business counts, platform MRR, WhatsApp messages, orders & leads.", font="F1", size=8.5)
    p2.text(55, 618, "- Interactive Trend Visualizations: Recharts area & bar charts illustrating message & revenue velocity.", font="F1", size=8.5)
    p2.text(55, 604, "- Tenant Lifecycle Management: Provision new workspaces, suspend delinquent accounts, resume services.", font="F1", size=8.5)
    p2.text(55, 590, "- Impersonation Gateway: Open and inspect tenant workspace sessions with audit trail tracking.", font="F1", size=8.5)
    p2.text(55, 576, "- Unrouted Number Detector: Captures inbound messages from unregistered WhatsApp numbers.", font="F1", size=8.5)
    p2.text(55, 562, "- Custom Domain Configuration: Bind dedicated domains (e.g., booking.agency.com) to workspaces.", font="F1", size=8.5)
    
    # Block 2
    p2.rgb(0.98, 0.98, 0.98)
    p2.roundrect(40, 395, 515, 140, r=6, fill=True, stroke=False)
    p2.rgb(0.88, 0.90, 0.92)
    p2.roundrect(40, 395, 515, 140, r=6, fill=False, stroke=True, line_width=1)
    
    p2.rgb(0.059, 0.463, 0.431)
    p2.text(55, 515, "Subscriptions, Invoicing & Automated Dunning Engine", font="F2", size=11)
    p2.rgb(0.45, 0.50, 0.55)
    p2.text(55, 500, "Routes: /platform/billing, /platform/invoices, /platform/revenue", font="F2", size=8.5)
    
    p2.rgb(0.18, 0.22, 0.28)
    p2.text(55, 482, "- Plan Assignment & Modification: Switch tenant plans (Starter, Growth, Enterprise) with instant quota adjustments.", font="F1", size=8.5)
    p2.text(55, 468, "- 1-Click Trial Extensions: Extend trial periods by configurable day increments with automatic date recalculation.", font="F1", size=8.5)
    p2.text(55, 454, "- Automated Dunning Escalation: Multi-step dunning reminders (1st Reminder -> 2nd Notice -> Final Warning).", font="F1", size=8.5)
    p2.text(55, 440, "- Invoice Lifecycle: Track OMR amounts, issue dates, payment gateway IDs, and 1-click 'Mark as Paid' actions.", font="F1", size=8.5)
    p2.text(55, 426, "- Financial Intelligence: Live calculation of MRR, ARPU (Average Revenue Per User), and 30-day collections.", font="F1", size=8.5)
    p2.text(55, 412, "- Status Badges: Clear visual indicators for ACTIVE, TRIALING, PAST_DUE, CANCELLED subscriptions.", font="F1", size=8.5)
    
    # Block 3
    p2.rgb(0.98, 0.98, 0.98)
    p2.roundrect(40, 240, 515, 140, r=6, fill=True, stroke=False)
    p2.rgb(0.88, 0.90, 0.92)
    p2.roundrect(40, 240, 515, 140, r=6, fill=False, stroke=True, line_width=1)
    
    p2.rgb(0.059, 0.463, 0.431)
    p2.text(55, 360, "WhatsApp Number Pool & Resource Quotas", font="F2", size=11)
    p2.rgb(0.45, 0.50, 0.55)
    p2.text(55, 345, "Routes: /platform/whatsapp-numbers, /platform/usage", font="F2", size=8.5)
    
    p2.rgb(0.18, 0.22, 0.28)
    p2.text(55, 327, "- Meta Cloud API Health Monitor: Real-time quality rating indicators (Green Normal, Yellow Warning, Red Restricted).", font="F1", size=8.5)
    p2.text(55, 313, "- Messaging Tier Allocation: Displays tier throughput limits (Tier 1K, Tier 10K, Tier 100K, Unlimited/day).", font="F1", size=8.5)
    p2.text(55, 299, "- Number Pool Allocation: Assign phone numbers to dedicated workspaces or hold in unassigned pool.", font="F1", size=8.5)
    p2.text(55, 285, "- Resource Quota Matrix: Visual progress bar monitoring per workspace for messages, campaigns, AI tokens & staff.", font="F1", size=8.5)
    p2.text(55, 271, "- High-Usage Detection: Workspaces exceeding 90% quota are automatically highlighted with alert badges.", font="F1", size=8.5)
    p2.text(55, 257, "- Manual Re-Sync & Diagnostics: Trigger instant health checks against Meta Graph API endpoints.", font="F1", size=8.5)

    # =========================================================================
    # PAGE 3: Helpdesk, Announcements & Governance
    # =========================================================================
    p3 = doc.new_page()
    draw_header_and_footer(p3, 3)
    
    p3.rgb(0.059, 0.463, 0.431)
    p3.text(40, 740, "3. Platform Operations, Helpdesk & Governance", font="F2", size=13)
    p3.line(40, 732, 555, 732, line_width=1.5)
    
    p3.rgb(0.15, 0.18, 0.22)
    p3.text(40, 715, "Advanced operational tools ensuring high customer satisfaction, compliance, and growth automation.", font="F1", size=9.5)
    
    # Block 1: Support Tickets
    p3.rgb(0.98, 0.98, 0.98)
    p3.roundrect(40, 560, 515, 135, r=6, fill=True, stroke=False)
    p3.rgb(0.88, 0.90, 0.92)
    p3.roundrect(40, 560, 515, 135, r=6, fill=False, stroke=True, line_width=1)
    
    p3.rgb(0.059, 0.463, 0.431)
    p3.text(55, 675, "Global Multi-Tenant Support Tickets Helpdesk", font="F2", size=11)
    p3.rgb(0.45, 0.50, 0.55)
    p3.text(55, 660, "Route: /platform/support-tickets", font="F2", size=8.5)
    
    p3.rgb(0.18, 0.22, 0.28)
    p3.text(55, 642, "- Dual Ticket Ingestion: Tickets created by tenant workspace staff or initiated by platform operators.", font="F1", size=8.5)
    p3.text(55, 628, "- Threaded Communication View: Complete chronological timeline of customer inquiries and responses.", font="F1", size=8.5)
    p3.text(55, 614, "- Private Operator Internal Notes: Internal team notes highlighted in yellow, hidden from tenant view.", font="F1", size=8.5)
    p3.text(55, 600, "- Priority & Status Management: Filter and update priority (Low, Medium, High, Urgent) and status.", font="F1", size=8.5)
    p3.text(55, 586, "- Staff Assignment: Route tickets to specialized support staff members for rapid SLA resolution.", font="F1", size=8.5)
    p3.text(55, 572, "- SLA Metrics: Live count of open, in-progress, waiting, and resolved tickets.", font="F1", size=8.5)
    
    # Block 2: Announcements
    p3.rgb(0.98, 0.98, 0.98)
    p3.roundrect(40, 405, 515, 140, r=6, fill=True, stroke=False)
    p3.rgb(0.88, 0.90, 0.92)
    p3.roundrect(40, 405, 515, 140, r=6, fill=False, stroke=True, line_width=1)
    
    p3.rgb(0.059, 0.463, 0.431)
    p3.text(55, 525, "Platform Announcements & In-App Broadcast Banners", font="F2", size=11)
    p3.rgb(0.45, 0.50, 0.55)
    p3.text(55, 510, "Route: /platform/announcements", font="F2", size=8.5)
    
    p3.rgb(0.18, 0.22, 0.28)
    p3.text(55, 492, "- In-App Announcement Banners: Displays top banner alerts across tenant workspace dashboards.", font="F1", size=8.5)
    p3.text(55, 478, "- Audience Targeting: Broadcast globally to ALL workspaces or target specific plan tiers (Enterprise/Growth).", font="F1", size=8.5)
    p3.text(55, 464, "- Type Classification: Information (Blue), New Feature (Green), Alert (Amber), Maintenance (Dark).", font="F1", size=8.5)
    p3.text(55, 450, "- Scheduled Expiry: Automatically schedule start dates and expiry dates for notices.", font="F1", size=8.5)
    p3.text(55, 436, "- Full CRUD Suite: Create, edit message text, delete, and 1-click toggle between Published and Draft.", font="F1", size=8.5)
    p3.text(55, 422, "- Dynamic Tenant Polling: Tenant workspaces poll /api/announcements/active to render active banners.", font="F1", size=8.5)
    
    # Block 3: Audit & Leads
    p3.rgb(0.98, 0.98, 0.98)
    p3.roundrect(40, 250, 515, 140, r=6, fill=True, stroke=False)
    p3.rgb(0.88, 0.90, 0.92)
    p3.roundrect(40, 250, 515, 140, r=6, fill=False, stroke=True, line_width=1)
    
    p3.rgb(0.059, 0.463, 0.431)
    p3.text(55, 370, "Immutable Audit Log & Website Demo Lead Engine", font="F2", size=11)
    p3.rgb(0.45, 0.50, 0.55)
    p3.text(55, 355, "Routes: /platform/audit, /platform/leads", font="F2", size=8.5)
    
    p3.rgb(0.18, 0.22, 0.28)
    p3.text(55, 337, "- Full Audit Trail: Immutable logging of staff actions, impersonations, plan edits, suspensions, and logins.", font="F1", size=8.5)
    p3.text(55, 323, "- Multi-Filter & Search: Filter audit history by action type, target entity, or full-text reason search.", font="F1", size=8.5)
    p3.text(55, 309, "- Inspect Record Modal: Detailed modal revealing full actor metadata, target scope, and justification.", font="F1", size=8.5)
    p3.text(55, 295, "- 1-Click CSV Export: Export filtered audit logs for compliance reviews and SOC2/ISO readiness.", font="F1", size=8.5)
    p3.text(55, 281, "- Website Demo & Lead Capture: Ingests inbound leads from /book-demo and /contact pages.", font="F1", size=8.5)
    p3.text(55, 267, "- Google Meet Scheduling: Automatically captures scheduled demo dates, company size, and meeting links.", font="F1", size=8.5)

    # =========================================================================
    # PAGE 4: Tenant Workspace Solutions & Verticals
    # =========================================================================
    p4 = doc.new_page()
    draw_header_and_footer(p4, 4)
    
    p4.rgb(0.059, 0.463, 0.431)
    p4.text(40, 740, "4. Tenant Workspace Capabilities & Industry Verticals", font="F2", size=13)
    p4.line(40, 732, 555, 732, line_width=1.5)
    
    p4.rgb(0.15, 0.18, 0.22)
    p4.text(40, 715, "Each business workspace runs on an isolated SaaS boundary with specialized tools for WhatsApp Commerce.", font="F1", size=9.5)
    
    # Left Column
    p4.rgb(0.98, 0.98, 0.98)
    p4.roundrect(40, 450, 245, 245, r=6, fill=True, stroke=False)
    p4.rgb(0.88, 0.90, 0.92)
    p4.roundrect(40, 450, 245, 245, r=6, fill=False, stroke=True, line_width=1)
    
    p4.rgb(0.059, 0.463, 0.431)
    p4.text(52, 675, "WhatsApp Inbox & AI Engine", font="F2", size=10.5)
    
    p4.rgb(0.18, 0.22, 0.28)
    p4.text(52, 655, "- 2-Way Omnichannel Live Chat", font="F1", size=8.5)
    p4.text(52, 641, "- Real-time message streaming", font="F1", size=8.5)
    p4.text(52, 627, "- Media support: PDF, Images, Audio", font="F1", size=8.5)
    p4.text(52, 613, "- Canned replies & fast responses", font="F1", size=8.5)
    p4.text(52, 599, "- Staff conversation assignment", font="F1", size=8.5)
    p4.text(52, 585, "- AI Conversational Responder", font="F1", size=8.5)
    p4.text(52, 571, "- Grounded in Knowledge Base docs", font="F1", size=8.5)
    p4.text(52, 557, "- Automated FAQs & intent routing", font="F1", size=8.5)
    p4.text(52, 543, "- Human-agent handoff trigger", font="F1", size=8.5)
    p4.text(52, 529, "- Multi-language translation", font="F1", size=8.5)
    p4.text(52, 515, "- Contact tagging & VIP profiling", font="F1", size=8.5)
    p4.text(52, 501, "- WhatsApp Catalog product cards", font="F1", size=8.5)
    p4.text(52, 487, "- Interactive buttons & list menus", font="F1", size=8.5)
    p4.text(52, 473, "- Meta Cloud Webhook delivery", font="F1", size=8.5)
    p4.text(52, 459, "- Audit trail of customer interactions", font="F1", size=8.5)
    
    # Right Column
    p4.rgb(0.98, 0.98, 0.98)
    p4.roundrect(310, 450, 245, 245, r=6, fill=True, stroke=False)
    p4.rgb(0.88, 0.90, 0.92)
    p4.roundrect(310, 450, 245, 245, r=6, fill=False, stroke=True, line_width=1)
    
    p4.rgb(0.059, 0.463, 0.431)
    p4.text(322, 675, "Broadcast Campaigns & CRM", font="F2", size=10.5)
    
    p4.rgb(0.18, 0.22, 0.28)
    p4.text(322, 655, "- Meta Approved Template Broadcasts", font="F1", size=8.5)
    p4.text(322, 641, "- Dynamic audience segmentation", font="F1", size=8.5)
    p4.text(322, 627, "- Variable placeholders ({1}, {2})", font="F1", size=8.5)
    p4.text(322, 613, "- Delivery & read rate analytics", font="F1", size=8.5)
    p4.text(322, 599, "- Link click conversion tracking", font="F1", size=8.5)
    p4.text(322, 585, "- Rate-limited burst dispatching", font="F1", size=8.5)
    p4.text(322, 571, "- Automated opt-out compliance", font="F1", size=8.5)
    p4.text(322, 557, "- Subscriber list CSV import/export", font="F1", size=8.5)
    p4.text(322, 543, "- Customer CRM lifecycle profiles", font="F1", size=8.5)
    p4.text(322, 529, "- Full order and booking history", font="F1", size=8.5)
    p4.text(322, 515, "- Coupons & promotional discount codes", font="F1", size=8.5)
    p4.text(322, 501, "- Automated birthday/anniversary triggers", font="F1", size=8.5)
    p4.text(322, 487, "- WhatsApp signup diagnostic tool", font="F1", size=8.5)
    p4.text(322, 473, "- Consent management records", font="F1", size=8.5)
    p4.text(322, 459, "- Staff role permissions & RBAC", font="F1", size=8.5)
    
    # Verticals Table
    p4.rgb(0.12, 0.15, 0.20)
    p4.text(40, 420, "Specialized Vertical Modules", font="F2", size=11)
    p4.rgb(0.85, 0.88, 0.90)
    p4.line(40, 412, 555, 412, line_width=1)
    
    p4.rgb(0.98, 0.98, 0.98)
    p4.roundrect(40, 220, 515, 180, r=4, fill=True, stroke=False)
    p4.rgb(0.88, 0.90, 0.92)
    p4.roundrect(40, 220, 515, 180, r=4, fill=False, stroke=True, line_width=1)
    
    p4.rgb(0.92, 0.94, 0.96)
    p4.roundrect(40, 370, 515, 30, r=4, fill=True, stroke=False)
    
    p4.rgb(0.15, 0.20, 0.25)
    p4.text(55, 381, "Vertical Industry", font="F2", size=9.5)
    p4.text(170, 381, "Dedicated Module Features", font="F2", size=9.5)
    p4.text(390, 381, "Customer Outcome", font="F2", size=9.5)
    
    verts = [
        ("Tours & Adventures", "Slot inventory, capacity locks, e-vouchers", "Zero overbooking, instant PDF tickets", 352),
        ("Clinics & Healthcare", "Doctor slots, chemo sessions, bed maps", "Reduced no-shows, automated reminders", 324),
        ("Restaurants & POS", "QR menu, table bookings, POS kitchen feed", "Direct WhatsApp ordering, table turnover", 296),
        ("Retail & E-Commerce", "2-Way WooCommerce sync, product catalog", "Automated order tracking on WhatsApp", 268),
        ("Payments & Billing", "AmwalPay gateway, bank receipt verify", "Instant verified payment confirmations", 240)
    ]
    
    for v_name, v_feat, v_out, y_pos in verts:
        p4.rgb(0.15, 0.18, 0.22)
        p4.text(55, y_pos, v_name, font="F2", size=8.5)
        p4.text(170, y_pos, v_feat, font="F1", size=8.5)
        p4.text(390, y_pos, v_out, font="F1", size=8.5)

    # =========================================================================
    # PAGE 5: Database Models & REST API Matrix
    # =========================================================================
    p5 = doc.new_page()
    draw_header_and_footer(p5, 5)
    
    p5.rgb(0.059, 0.463, 0.431)
    p5.text(40, 740, "5. Database Models & REST API Matrix", font="F2", size=13)
    p5.line(40, 732, 555, 732, line_width=1.5)
    
    p5.rgb(0.15, 0.18, 0.22)
    p5.text(40, 715, "Overview of core relational models in PostgreSQL (via Prisma) and Platform API endpoints.", font="F1", size=9.5)
    
    p5.rgb(0.059, 0.463, 0.431)
    p5.text(40, 685, "Primary Prisma Database Models", font="F2", size=11)
    
    p5.rgb(0.98, 0.98, 0.98)
    p5.roundrect(40, 450, 515, 225, r=4, fill=True, stroke=False)
    p5.rgb(0.88, 0.90, 0.92)
    p5.roundrect(40, 450, 515, 225, r=4, fill=False, stroke=True, line_width=1)
    
    p5.rgb(0.059, 0.463, 0.431)
    p5.text(55, 655, "Model: Tenant", font="F2", size=9)
    p5.text(160, 655, "Model: SubscriptionInvoice", font="F2", size=9)
    p5.text(340, 655, "Model: SupportTicket & Reply", font="F2", size=9)
    
    p5.rgb(0.20, 0.25, 0.30)
    p5.text(55, 640, "id, slug, name, status", font="F1", size=8)
    p5.text(55, 628, "plan, subscriptionStatus", font="F1", size=8)
    p5.text(55, 616, "trialEndsAt, currentPeriodEnd", font="F1", size=8)
    p5.text(55, 604, "customDomain, timezone", font="F1", size=8)
    
    p5.text(160, 640, "id, reference, tenantId", font="F1", size=8)
    p5.text(160, 628, "amount, currency, status", font="F1", size=8)
    p5.text(160, 616, "dunningStep, lastDunnedAt", font="F1", size=8)
    p5.text(160, 604, "gatewayReference, paidAt", font="F1", size=8)
    
    p5.text(340, 640, "id, reference, subject, priority", font="F1", size=8)
    p5.text(340, 628, "status, channel, tenantId", font="F1", size=8)
    p5.text(340, 616, "assignedStaffId, replies[]", font="F1", size=8)
    p5.text(340, 604, "isInternal, staffId, body", font="F1", size=8)
    
    p5.rgb(0.059, 0.463, 0.431)
    p5.text(55, 575, "Model: PlatformAnnouncement", font="F2", size=9)
    p5.text(200, 575, "Model: PlatformAuditEvent", font="F2", size=9)
    p5.text(370, 575, "Model: WebsiteLead", font="F2", size=9)
    
    p5.rgb(0.20, 0.25, 0.30)
    p5.text(55, 560, "id, title, body, type", font="F1", size=8)
    p5.text(55, 548, "targetAudience, publishedAt", font="F1", size=8)
    p5.text(55, 536, "expiresAt, createdById", font="F1", size=8)
    
    p5.text(200, 560, "id, tenantId, actorStaffId", font="F1", size=8)
    p5.text(200, 548, "action, entity, entityId", font="F1", size=8)
    p5.text(200, 536, "reason, metadata, createdAt", font="F1", size=8)
    
    p5.text(370, 560, "id, name, email, phone", font="F1", size=8)
    p5.text(370, 548, "company, source, status", font="F1", size=8)
    p5.text(370, 536, "demoScheduledAt, meetUrl", font="F1", size=8)
    
    p5.rgb(0.059, 0.463, 0.431)
    p5.text(55, 505, "Model: WhatsAppAccount", font="F2", size=9)
    p5.text(200, 505, "Model: Order & Voucher", font="F2", size=9)
    p5.text(370, 505, "Model: HospitalAppointment", font="F2", size=9)
    
    p5.rgb(0.20, 0.25, 0.30)
    p5.text(55, 490, "id, phoneNumberId, wabaId", font="F1", size=8)
    p5.text(55, 478, "displayPhone, qualityRating", font="F1", size=8)
    p5.text(55, 466, "messagingLimit, tenantId", font="F1", size=8)
    
    p5.text(200, 490, "id, orderNumber, totalAmount", font="F1", size=8)
    p5.text(200, 478, "status, tourId, slotId", font="F1", size=8)
    p5.text(200, 466, "vouchers[], customerId", font="F1", size=8)
    
    p5.text(370, 490, "id, patientId, doctorId", font="F1", size=8)
    p5.text(370, 478, "serviceId, appointmentDate", font="F1", size=8)
    p5.text(370, 466, "status, notes, holdExpiresAt", font="F1", size=8)
    
    # API Table
    p5.rgb(0.059, 0.463, 0.431)
    p5.text(40, 425, "Core Platform API Route Matrix", font="F2", size=11)
    
    p5.rgb(0.98, 0.98, 0.98)
    p5.roundrect(40, 215, 515, 200, r=4, fill=True, stroke=False)
    p5.rgb(0.88, 0.90, 0.92)
    p5.roundrect(40, 215, 515, 200, r=4, fill=False, stroke=True, line_width=1)
    
    p5.rgb(0.92, 0.94, 0.96)
    p5.roundrect(40, 385, 515, 30, r=4, fill=True, stroke=False)
    
    p5.rgb(0.15, 0.20, 0.25)
    p5.text(55, 396, "HTTP Method & Endpoint", font="F2", size=9.5)
    p5.text(230, 396, "Auth Guard", font="F2", size=9.5)
    p5.text(340, 396, "Functionality", font="F2", size=9.5)
    
    apis = [
        ("GET  /api/platform/analytics", "Platform Super Admin", "Aggregated KPIs, MRR & charts", 368),
        ("GET/PATCH /api/platform/tenants/:id", "Platform Super Admin", "Workspace plan, status, trial extend", 348),
        ("GET/PATCH /api/platform/invoices/:id", "Platform Super Admin", "Invoice status, dunning step increment", 328),
        ("GET/POST /api/platform/support/tickets", "Platform Super Admin", "Global ticket helpdesk & operator notes", 308),
        ("GET/POST /api/platform/announcements", "Platform Super Admin", "Global in-app broadcast alerts CRUD", 288),
        ("GET  /api/platform/usage", "Platform Super Admin", "Live resource consumption matrix", 268),
        ("GET  /api/platform/audit", "Platform Super Admin", "Filterable immutable audit trail", 248),
        ("POST /api/demo/book, /api/contact", "Public (Rate Limited)", "Lead ingestion into Platform Leads", 228)
    ]
    
    for a_ep, a_guard, a_func, y_pos in apis:
        p5.rgb(0.15, 0.18, 0.22)
        p5.text(55, y_pos, a_ep, font="F1", size=8.5)
        p5.text(230, y_pos, a_guard, font="F1", size=8.5)
        p5.text(340, y_pos, a_func, font="F1", size=8.5)

    # =========================================================================
    # PAGE 6: Security, Compliance & Production Readiness
    # =========================================================================
    p6 = doc.new_page()
    draw_header_and_footer(p6, 6)
    
    p6.rgb(0.059, 0.463, 0.431)
    p6.text(40, 740, "6. Security, Compliance & Production Readiness", font="F2", size=13)
    p6.line(40, 732, 555, 732, line_width=1.5)
    
    p6.rgb(0.15, 0.18, 0.22)
    p6.text(40, 715, "Enterprise-grade security controls, automated testing, and production deployment standards.", font="F1", size=9.5)
    
    # Security Block
    p6.rgb(0.98, 0.98, 0.98)
    p6.roundrect(40, 540, 515, 155, r=6, fill=True, stroke=False)
    p6.rgb(0.88, 0.90, 0.92)
    p6.roundrect(40, 540, 515, 155, r=6, fill=False, stroke=True, line_width=1)
    
    p6.rgb(0.059, 0.463, 0.431)
    p6.text(55, 675, "Security Controls & Compliance Architecture", font="F2", size=11)
    
    p6.rgb(0.18, 0.22, 0.28)
    p6.text(55, 655, "- Role-Based Access Control (RBAC): Strict segregation between Global Platform Super Admin and", font="F1", size=8.5)
    p6.text(55, 641, "  Tenant Staff (Admin, Manager, Agent) enforced via server-side session tokens.", font="F1", size=8.5)
    p6.text(55, 627, "- Zero-Knowledge Tenant Impersonation: All operator tenant inspections require explicit reasons", font="F1", size=8.5)
    p6.text(55, 613, "  and are immutably logged to the PlatformAuditEvent table.", font="F1", size=8.5)
    p6.text(55, 599, "- Webhook Signature Verification: Meta Cloud API and AmwalPay webhooks validated with HMAC-SHA256.", font="F1", size=8.5)
    p6.text(55, 585, "- Edge Security & Rate Limiting: Public lead and booking endpoints protected against automated abuse.", font="F1", size=8.5)
    p6.text(55, 571, "- Clean Path URL Routing: Modern Next.js dynamic routing (/platform/[section]) replacing legacy hash states.", font="F1", size=8.5)
    p6.text(55, 557, "- Defensive Runtime Parsing: Strict Array.isArray guards across all client panels preventing UI crashes.", font="F1", size=8.5)
    
    # Release QA Block
    p6.rgb(0.98, 0.98, 0.98)
    p6.roundrect(40, 360, 515, 165, r=6, fill=True, stroke=False)
    p6.rgb(0.88, 0.90, 0.92)
    p6.roundrect(40, 360, 515, 165, r=6, fill=False, stroke=True, line_width=1)
    
    p6.rgb(0.059, 0.463, 0.431)
    p6.text(55, 505, "Automated Verification & Release Quality Assurance", font="F2", size=11)
    
    p6.rgb(0.18, 0.22, 0.28)
    p6.text(55, 485, "- Comprehensive Unit Test Suite: 74 / 74 unit tests passing (222 test expectations) across 9 test suites.", font="F1", size=8.5)
    p6.text(55, 471, "- Full Route Coverage: 185 Next.js application routes compiled and optimized via Turbopack engine.", font="F1", size=8.5)
    p6.text(55, 457, "- Automated Service Health Checks: /admin (200 OK), /api/health (200 OK), /api/tours (200 OK).", font="F1", size=8.5)
    p6.text(55, 443, "- Live PostgreSQL Migration: Prisma schema synchronized with automated column migrations.", font="F1", size=8.5)
    p6.text(55, 429, "- Continuous Deployment Workflow: Production-grade zero-downtime releases with instant rollback support.", font="F1", size=8.5)
    p6.text(55, 415, "- Observability: Error boundary monitoring, live delivery webhook retry queues, and latency tracking.", font="F1", size=8.5)
    p6.text(55, 401, "- Client-Side State: Zustand persistence store synchronizing theme, active workspace, and staff context.", font="F1", size=8.5)
    p6.text(55, 387, "- Cross-Platform Compatibility: Optimized for desktop ultra-wide displays down to mobile viewports.", font="F1", size=8.5)
    
    # Sign-off
    p6.rgb(0.95, 0.98, 0.96)
    p6.roundrect(40, 200, 515, 140, r=6, fill=True, stroke=False)
    p6.rgb(0.059, 0.463, 0.431)
    p6.roundrect(40, 200, 515, 140, r=6, fill=False, stroke=True, line_width=1)
    
    p6.rgb(0.059, 0.463, 0.431)
    p6.text(55, 320, "Platform Engineering Summary", font="F2", size=11)
    
    p6.rgb(0.18, 0.22, 0.28)
    p6.text(55, 300, "Fizmoh is fully deployed and operational at app.fizmoh.cloud.", font="F1", size=9)
    p6.text(55, 285, "Every requested platform capability-from the unified Operator Console and clean /platform/[section] paths", font="F1", size=9)
    p6.text(55, 270, "to Support Tickets, Invoicing, Announcements, and Google Meet Demo booking-is live in production.", font="F1", size=9)
    
    p6.rgb(0.059, 0.463, 0.431)
    p6.text(55, 240, "Document Ref: FIZMOH-SPEC-2026-V3 | Status: Production Active | Fizmoh Engineering", font="F2", size=9)
    
    doc.build(output_path)
    print(f"Generated PDF: {output_path} ({os.path.getsize(output_path)} bytes)")

if __name__ == "__main__":
    os.makedirs("docs", exist_ok=True)
    out_pdf = "docs/Fizmoh_Platform_Complete_Specification.pdf"
    generate_specification_pdf(out_pdf)
