const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const products = [
  {
    filename: "digital-qr-reviews.jpg",
    title: "Google Review AI Booster",
    subtitle: "5-Star Rating Funnel &amp; Google Maps Local SEO Shield",
    badge: "REPUTATION MANAGEMENT",
    color1: "#064e3b",
    color2: "#0f172a",
    accent: "#f59e0b",
    iconPath: `<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="#f59e0b" stroke="#f59e0b" stroke-width="2"/>`,
    uiMock: `
      <rect x="180" y="240" width="920" height="380" rx="24" fill="#1e293b" fill-opacity="0.8" stroke="#334155" stroke-width="2"/>
      <circle cx="230" cy="285" r="7" fill="#ef4444"/>
      <circle cx="255" cy="285" r="7" fill="#f59e0b"/>
      <circle cx="280" cy="285" r="7" fill="#10b981"/>
      <rect x="320" y="272" width="600" height="26" rx="13" fill="#0f172a"/>
      <text x="340" y="289" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="12">https://app.fizmoh.cloud/reviews/google-maps-muscat</text>
      
      <!-- Stars Row -->
      <g transform="translate(320, 340) scale(1.6)">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="#f59e0b"/>
        <g transform="translate(30, 0)"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="#f59e0b"/></g>
        <g transform="translate(60, 0)"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="#f59e0b"/></g>
        <g transform="translate(90, 0)"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="#f59e0b"/></g>
        <g transform="translate(120, 0)"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="#f59e0b"/></g>
      </g>
      
      <!-- Feedback Card -->
      <rect x="230" y="400" width="400" height="170" rx="16" fill="#0f172a" stroke="#10b981" stroke-width="1.5"/>
      <text x="255" y="435" fill="#10b981" font-family="system-ui, sans-serif" font-weight="bold" font-size="16">5-Star Review to Google Maps</text>
      <text x="255" y="465" fill="#e2e8f0" font-family="system-ui, sans-serif" font-size="13">Automatic redirect to Google Business profile</text>
      <text x="255" y="490" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="12">+34% boost in Local Map pack search ranking</text>
      <rect x="255" y="515" width="180" height="32" rx="8" fill="#10b981"/>
      <text x="275" y="536" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="bold" font-size="12">Redirected Verified &#x2713;</text>
      
      <!-- Shield Card -->
      <rect x="660" y="400" width="400" height="170" rx="16" fill="#0f172a" stroke="#f59e0b" stroke-width="1.5"/>
      <text x="685" y="435" fill="#f59e0b" font-family="system-ui, sans-serif" font-weight="bold" font-size="16">1-3 Stars to Private Resolution</text>
      <text x="685" y="465" fill="#e2e8f0" font-family="system-ui, sans-serif" font-size="13">Routes to General Manager WhatsApp privately</text>
      <text x="685" y="490" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="12">Zero negative reviews posted publicly on Google</text>
      <rect x="685" y="515" width="180" height="32" rx="8" fill="#d97706"/>
      <text x="705" y="536" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="bold" font-size="12">Internal Shield Active &#x2713;</text>
    `,
  },
  {
    filename: "facebook-instagram-automation.jpg",
    title: "Meta Omnichannel Automation",
    subtitle: "Instagram DMs, Story Mentions, and Facebook Messenger",
    badge: "OFFICIAL META GRAPH API",
    color1: "#831843",
    color2: "#0f172a",
    accent: "#ec4899",
    iconPath: `<circle cx="12" cy="12" r="10" fill="none" stroke="#ec4899" stroke-width="2"/>`,
    uiMock: `
      <rect x="180" y="240" width="920" height="380" rx="24" fill="#1e293b" fill-opacity="0.8" stroke="#334155" stroke-width="2"/>
      <circle cx="230" cy="285" r="7" fill="#ef4444"/>
      <circle cx="255" cy="285" r="7" fill="#f59e0b"/>
      <circle cx="280" cy="285" r="7" fill="#10b981"/>
      <rect x="320" y="272" width="600" height="26" rx="13" fill="#0f172a"/>
      <text x="340" y="289" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="12">https://app.fizmoh.cloud/social/meta-unified-inbox</text>
      
      <!-- Instagram Channel Card -->
      <rect x="230" y="340" width="390" height="230" rx="16" fill="#0f172a" stroke="#ec4899" stroke-width="1.5"/>
      <rect x="250" y="360" width="140" height="26" rx="6" fill="#ec4899" fill-opacity="0.2"/>
      <text x="260" y="377" fill="#f472b6" font-family="system-ui, sans-serif" font-weight="bold" font-size="12">Instagram DMs &amp; Reels</text>
      <text x="250" y="415" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="bold" font-size="15">Story Mention Auto-Response</text>
      <text x="250" y="440" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="12">Replied in 2.4s with 15% VIP Coupon Code</text>
      <rect x="250" y="460" width="350" height="80" rx="10" fill="#1e293b"/>
      <text x="265" y="485" fill="#f472b6" font-family="system-ui, sans-serif" font-size="11">Follower: &quot;Where can I buy this?&quot;</text>
      <text x="265" y="515" fill="#10b981" font-family="system-ui, sans-serif" font-size="11">Fizmoh Bot: &quot;Here is your VIP link + free Oman delivery!&quot;</text>

      <!-- Facebook Messenger Card -->
      <rect x="660" y="340" width="390" height="230" rx="16" fill="#0f172a" stroke="#3b82f6" stroke-width="1.5"/>
      <rect x="680" y="360" width="160" height="26" rx="6" fill="#3b82f6" fill-opacity="0.2"/>
      <text x="690" y="377" fill="#60a5fa" font-family="system-ui, sans-serif" font-weight="bold" font-size="12">Click-to-WhatsApp Ads</text>
      <text x="680" y="415" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="bold" font-size="15">Instant Lead Capture Funnel</text>
      <text x="680" y="440" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="12">0-drop conversion directly from Facebook Sponsored Ads</text>
      <rect x="680" y="460" width="350" height="80" rx="10" fill="#1e293b"/>
      <text x="695" y="485" fill="#60a5fa" font-family="system-ui, sans-serif" font-size="11">Ad Campaign: Muscat Waterfront Real Estate</text>
      <text x="695" y="515" fill="#10b981" font-family="system-ui, sans-serif" font-size="11">WhatsApp Conversation Initiated &amp; CRM Synced &#x2713;</text>
    `,
  },
  {
    filename: "instagram-automation.jpg",
    title: "Instagram DM &amp; Story Automation",
    subtitle: "Turn Story Mentions and Reel Comments into High-Ticket Sales",
    badge: "INSTAGRAM API VERIFIED",
    color1: "#701a75",
    color2: "#0f172a",
    accent: "#d946ef",
    iconPath: `<rect x="2" y="2" width="20" height="20" rx="5" ry="5" fill="none" stroke="#d946ef" stroke-width="2"/>`,
    uiMock: `
      <rect x="180" y="240" width="920" height="380" rx="24" fill="#1e293b" fill-opacity="0.8" stroke="#334155" stroke-width="2"/>
      <circle cx="230" cy="285" r="7" fill="#ef4444"/>
      <circle cx="255" cy="285" r="7" fill="#f59e0b"/>
      <circle cx="280" cy="285" r="7" fill="#10b981"/>
      <rect x="320" y="272" width="600" height="26" rx="13" fill="#0f172a"/>
      <text x="340" y="289" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="12">https://app.fizmoh.cloud/instagram/dm-automation</text>
      
      <!-- Phone View inside -->
      <rect x="260" y="325" width="760" height="255" rx="16" fill="#0f172a" stroke="#d946ef" stroke-width="1.5"/>
      <text x="300" y="365" fill="#f472b6" font-family="system-ui, sans-serif" font-weight="bold" font-size="16">Live Trigger: Reel Comment 'LINK' Detected</text>
      <text x="300" y="390" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13">Customer @fatima_om commented on Reel #4910: "Can I get the price please?"</text>
      
      <rect x="300" y="415" width="680" height="120" rx="12" fill="#1e293b"/>
      <text x="320" y="445" fill="#10b981" font-family="system-ui, sans-serif" font-weight="bold" font-size="13">Automated DM Sent in 1.8s:</text>
      <text x="320" y="475" fill="#ffffff" font-family="system-ui, sans-serif" font-size="13">"Salam Fatima! Here is your exclusive 15% discount link with AmwalPay card checkout: https://app.fizmoh.cloud/checkout/OMR15"</text>
      <text x="320" y="505" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="11">Status: Delivered &amp; Read · Conversion Rate: 41.2%</text>
    `,
  },
  {
    filename: "facebook-automation.jpg",
    title: "Facebook Messenger &amp; Ad Bot",
    subtitle: "Direct-to-WhatsApp Paid Ad Capture with Zero Drop-Off",
    badge: "META MARKETING PARTNER",
    color1: "#1e3a8a",
    color2: "#0f172a",
    accent: "#3b82f6",
    iconPath: `<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" fill="none" stroke="#3b82f6" stroke-width="2"/>`,
    uiMock: `
      <rect x="180" y="240" width="920" height="380" rx="24" fill="#1e293b" fill-opacity="0.8" stroke="#334155" stroke-width="2"/>
      <circle cx="230" cy="285" r="7" fill="#ef4444"/>
      <circle cx="255" cy="285" r="7" fill="#f59e0b"/>
      <circle cx="280" cy="285" r="7" fill="#10b981"/>
      <rect x="320" y="272" width="600" height="26" rx="13" fill="#0f172a"/>
      <text x="340" y="289" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="12">https://app.fizmoh.cloud/facebook/ad-funnels</text>
      
      <rect x="250" y="330" width="780" height="250" rx="16" fill="#0f172a" stroke="#3b82f6" stroke-width="1.5"/>
      <text x="290" y="370" fill="#60a5fa" font-family="system-ui, sans-serif" font-weight="bold" font-size="16">Click-to-WhatsApp Ingestion Pipeline</text>
      <text x="290" y="395" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13">Bypass slow landing page forms — capture authenticated phone numbers instantly upon click</text>
      
      <g transform="translate(290, 420)">
        <rect x="0" y="0" width="220" height="120" rx="12" fill="#1e293b"/>
        <text x="15" y="30" fill="#60a5fa" font-weight="bold" font-family="system-ui, sans-serif" font-size="13">1. Facebook Ad Click</text>
        <text x="15" y="60" fill="#cbd5e1" font-family="system-ui, sans-serif" font-size="11">Target: Muscat &amp; Salalah</text>
        <text x="15" y="85" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="11">Real Estate &amp; Clinics</text>

        <rect x="245" y="0" width="220" height="120" rx="12" fill="#1e293b"/>
        <text x="260" y="30" fill="#10b981" font-weight="bold" font-family="system-ui, sans-serif" font-size="13">2. WhatsApp Opened</text>
        <text x="260" y="60" fill="#cbd5e1" font-family="system-ui, sans-serif" font-size="11">Real phone captured</text>
        <text x="260" y="85" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="11">Zero fake email leads</text>

        <rect x="490" y="0" width="210" height="120" rx="12" fill="#1e293b"/>
        <text x="505" y="30" fill="#a855f7" font-weight="bold" font-family="system-ui, sans-serif" font-size="13">3. CRM Qualified</text>
        <text x="505" y="60" fill="#cbd5e1" font-family="system-ui, sans-serif" font-size="11">Assigned to agent</text>
        <text x="505" y="85" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="11">Appointment booked</text>
      </g>
    `,
  },
  {
    filename: "smart-menu-ordering.jpg",
    title: "Smart QR Menu &amp; Live KDS",
    subtitle: "Dine-in Table QR Ordering, Cart Calculation, and Kitchen Display",
    badge: "HOSPITALITY SUITE",
    color1: "#78350f",
    color2: "#0f172a",
    accent: "#f59e0b",
    iconPath: `<path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" fill="none" stroke="#f59e0b" stroke-width="2"/>`,
    uiMock: `
      <rect x="180" y="240" width="920" height="380" rx="24" fill="#1e293b" fill-opacity="0.8" stroke="#334155" stroke-width="2"/>
      <circle cx="230" cy="285" r="7" fill="#ef4444"/>
      <circle cx="255" cy="285" r="7" fill="#f59e0b"/>
      <circle cx="280" cy="285" r="7" fill="#10b981"/>
      <rect x="320" y="272" width="600" height="26" rx="13" fill="#0f172a"/>
      <text x="340" y="289" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="12">https://app.fizmoh.cloud/menu/salalah-heritage/table-04</text>
      
      <!-- Dining Order on left -->
      <rect x="230" y="330" width="390" height="250" rx="16" fill="#0f172a" stroke="#f59e0b" stroke-width="1.5"/>
      <text x="255" y="365" fill="#f59e0b" font-family="system-ui, sans-serif" font-weight="bold" font-size="15">Table 04 · Guest WhatsApp Cart</text>
      <text x="255" y="395" fill="#e2e8f0" font-family="system-ui, sans-serif" font-size="13">1x Omani Shuwa (Lamb) — 6.500 OMR</text>
      <text x="255" y="425" fill="#e2e8f0" font-family="system-ui, sans-serif" font-size="13">2x Cardamom Karak Tea — 1.600 OMR</text>
      <text x="255" y="455" fill="#e2e8f0" font-family="system-ui, sans-serif" font-size="13">1x Saffron Halwa — 2.200 OMR</text>
      <rect x="255" y="485" width="340" height="40" rx="8" fill="#10b981"/>
      <text x="280" y="510" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="bold" font-size="13">Pay 10.300 OMR with Apple Pay</text>

      <!-- Live KDS on right -->
      <rect x="650" y="330" width="410" height="250" rx="16" fill="#020617" stroke="#10b981" stroke-width="1.5"/>
      <text x="675" y="365" fill="#10b981" font-family="system-ui, sans-serif" font-weight="bold" font-size="15">Live Kitchen Display (KDS)</text>
      <text x="675" y="395" fill="#facc15" font-family="system-ui, sans-serif" font-size="12">Ticket #1042 · Table 04 · 3 mins prep</text>
      <rect x="675" y="415" width="360" height="70" rx="8" fill="#0f172a"/>
      <text x="690" y="440" fill="#ffffff" font-family="system-ui, sans-serif" font-size="12">[GRILL LINE] Shuwa 1x · [BAR] Karak 2x</text>
      <text x="690" y="465" fill="#10b981" font-family="system-ui, sans-serif" font-size="11">AmwalPay Confirmed · Thermal Ticket Printed</text>
      <rect x="675" y="500" width="160" height="30" rx="6" fill="#10b981"/>
      <text x="695" y="520" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="bold" font-size="11">Mark Order Ready &#x2713;</text>
    `,
  },
  {
    filename: "digital-vcard.jpg",
    title: "NFC Smart Business Card",
    subtitle: "One-Tap Contact Save, Digital Wallet Pass &amp; WhatsApp Connect",
    badge: "DIGITAL IDENTITY",
    color1: "#065f46",
    color2: "#0f172a",
    accent: "#34d399",
    iconPath: `<rect x="5" y="2" width="14" height="20" rx="2" ry="2" fill="none" stroke="#34d399" stroke-width="2"/>`,
    uiMock: `
      <rect x="180" y="240" width="920" height="380" rx="24" fill="#1e293b" fill-opacity="0.8" stroke="#334155" stroke-width="2"/>
      <circle cx="230" cy="285" r="7" fill="#ef4444"/>
      <circle cx="255" cy="285" r="7" fill="#f59e0b"/>
      <circle cx="280" cy="285" r="7" fill="#10b981"/>
      <rect x="320" y="272" width="600" height="26" rx="13" fill="#0f172a"/>
      <text x="340" y="289" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="12">https://app.fizmoh.cloud/card/nick</text>
      
      <!-- 3D Card Mockup -->
      <rect x="250" y="330" width="370" height="230" rx="20" fill="url(#cardGrad)" stroke="#34d399" stroke-width="1.5"/>
      <text x="280" y="375" fill="#34d399" font-family="monospace" font-size="11" letter-spacing="2">FIZMOH CLOUD PASS</text>
      <text x="280" y="415" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="bold" font-size="22">Nick Sharma</text>
      <text x="280" y="440" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13">Co-Founder &amp; CEO · Fizmoh</text>
      <text x="280" y="520" fill="#cbd5e1" font-family="monospace" font-size="12">+968 9831 4456 · Muscat, Oman</text>
      
      <!-- Action buttons -->
      <rect x="660" y="340" width="390" height="210" rx="16" fill="#0f172a" stroke="#334155" stroke-width="1"/>
      <text x="685" y="375" fill="#34d399" font-family="system-ui, sans-serif" font-weight="bold" font-size="15">Smart Contact Actions</text>
      <rect x="685" y="395" width="340" height="38" rx="8" fill="#10b981"/>
      <text x="730" y="420" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="bold" font-size="13">Add to iPhone / Android Contacts (.vcf)</text>
      
      <rect x="685" y="445" width="340" height="38" rx="8" fill="#1e293b" stroke="#34d399" stroke-width="1"/>
      <text x="735" y="470" fill="#34d399" font-family="system-ui, sans-serif" font-weight="bold" font-size="13">Open Direct WhatsApp Chat</text>

      <rect x="685" y="495" width="340" height="38" rx="8" fill="#000000"/>
      <text x="745" y="520" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="bold" font-size="13">Save to Apple / Google Wallet</text>
    `,
  },
  {
    filename: "amwalpay.jpg",
    title: "AmwalPay WhatsApp Payments",
    subtitle: "Central Bank of Oman Compliant In-Chat Checkout with 0% Markup",
    badge: "OMAN PAYMENT GATEWAY",
    color1: "#064e3b",
    color2: "#0f172a",
    accent: "#10b981",
    iconPath: `<rect x="1" y="4" width="22" height="16" rx="2" ry="2" fill="none" stroke="#10b981" stroke-width="2"/>`,
    uiMock: `
      <rect x="180" y="240" width="920" height="380" rx="24" fill="#1e293b" fill-opacity="0.8" stroke="#334155" stroke-width="2"/>
      <circle cx="230" cy="285" r="7" fill="#ef4444"/>
      <circle cx="255" cy="285" r="7" fill="#f59e0b"/>
      <circle cx="280" cy="285" r="7" fill="#10b981"/>
      <rect x="320" y="272" width="600" height="26" rx="13" fill="#0f172a"/>
      <text x="340" y="289" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="12">https://app.fizmoh.cloud/payments/checkout/FZ-9821</text>
      
      <rect x="240" y="330" width="400" height="250" rx="16" fill="#0f172a" stroke="#10b981" stroke-width="1.5"/>
      <text x="265" y="365" fill="#10b981" font-family="system-ui, sans-serif" font-weight="bold" font-size="15">AmwalPay OMR Checkout</text>
      <text x="265" y="395" fill="#e2e8f0" font-family="system-ui, sans-serif" font-size="13">Enterprise Workspace Plan: 25.000 OMR</text>
      <text x="265" y="425" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="12">Direct OmanNet Debit / Credit Card</text>
      <rect x="265" y="450" width="350" height="40" rx="8" fill="#10b981"/>
      <text x="290" y="475" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="bold" font-size="13">Pay 25.000 OMR via AmwalPay &#x2713;</text>
      
      <rect x="670" y="330" width="380" height="250" rx="16" fill="#0f172a" stroke="#334155" stroke-width="1"/>
      <text x="695" y="365" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="bold" font-size="15">Instant PDF WhatsApp Stamp</text>
      <text x="695" y="395" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="12">Official Tax Invoice with Oman Tax QR Stamp</text>
      <rect x="695" y="420" width="330" height="110" rx="10" fill="#1e293b"/>
      <text x="715" y="450" fill="#10b981" font-family="monospace" font-size="12">TAX INVOICE #FZ-9821</text>
      <text x="715" y="475" fill="#ffffff" font-family="monospace" font-size="11">Total: 25.000 OMR (VAT Included)</text>
      <text x="715" y="500" fill="#34d399" font-family="monospace" font-size="11">Delivered to WhatsApp in 2s &#x2713;</text>
    `,
  },
];

async function generate() {
  const outDir = path.join(__dirname, "../public/marketing/products");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  for (const p of products) {
    const svg = `
      <svg width="1280" height="714" viewBox="0 0 1280 714" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${p.color1}"/>
            <stop offset="60%" stop-color="${p.color2}"/>
            <stop offset="100%" stop-color="#020617"/>
          </linearGradient>
          <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0f172a"/>
            <stop offset="100%" stop-color="#064e3b"/>
          </linearGradient>
          <radialGradient id="glow" cx="50%" cy="20%" r="50%">
            <stop offset="0%" stop-color="${p.accent}" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="${p.accent}" stop-opacity="0"/>
          </radialGradient>
        </defs>

        <rect width="1280" height="714" fill="url(#bg)"/>
        <rect width="1280" height="714" fill="url(#glow)"/>

        <!-- Grid Lines -->
        <g stroke="#ffffff" stroke-opacity="0.04" stroke-width="1">
          <line x1="0" y1="120" x2="1280" y2="120"/>
          <line x1="0" y1="240" x2="1280" y2="240"/>
          <line x1="0" y1="360" x2="1280" y2="360"/>
          <line x1="0" y1="480" x2="1280" y2="480"/>
          <line x1="0" y1="600" x2="1280" y2="600"/>
          <line x1="200" y1="0" x2="200" y2="714"/>
          <line x1="400" y1="0" x2="400" y2="714"/>
          <line x1="600" y1="0" x2="600" y2="714"/>
          <line x1="800" y1="0" x2="800" y2="714"/>
          <line x1="1000" y1="0" x2="1000" y2="714"/>
        </g>

        <!-- Header Eyebrow -->
        <rect x="180" y="55" width="220" height="28" rx="14" fill="${p.accent}" fill-opacity="0.15" stroke="${p.accent}" stroke-opacity="0.3"/>
        <text x="200" y="73" fill="${p.accent}" font-family="system-ui, sans-serif" font-weight="bold" font-size="11" letter-spacing="1">${p.badge}</text>

        <!-- Title &amp; Subtitle -->
        <text x="180" y="130" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="38" letter-spacing="-0.5">${p.title}</text>
        <text x="180" y="168" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-size="18">${p.subtitle}</text>

        <!-- UI Mockup Canvas -->
        ${p.uiMock}
      </svg>
    `;

    const targetFile = path.join(outDir, p.filename);
    await sharp(Buffer.from(svg))
      .jpeg({ quality: 90 })
      .toFile(targetFile);

    console.log("Generated:", targetFile);

    // Also copy smart-menu.jpg alias if applicable
    if (p.filename === "smart-menu-ordering.jpg") {
      fs.copyFileSync(targetFile, path.join(outDir, "smart-menu.jpg"));
      console.log("Copied alias: smart-menu.jpg");
    }
  }

  // Create signature.png placeholder
  const sigDir = path.join(__dirname, "../public/invoice");
  if (!fs.existsSync(sigDir)) fs.mkdirSync(sigDir, { recursive: true });
  const sigSvg = `
    <svg width="300" height="100" viewBox="0 0 300 100" xmlns="http://www.w3.org/2000/svg">
      <path d="M 20 60 Q 60 20 100 50 T 160 40 T 220 70 T 280 30" fill="none" stroke="#059669" stroke-width="3" stroke-linecap="round"/>
      <text x="30" y="85" font-family="cursive, sans-serif" font-size="16" fill="#1e293b">Fizmoh Authorized Signature</text>
    </svg>
  `;
  await sharp(Buffer.from(sigSvg)).png().toFile(path.join(sigDir, "signature.png"));
  console.log("Generated signature.png");
}

generate().catch(console.error);
