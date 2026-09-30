import { db } from "@/lib/db"
import { indexSource } from "@/lib/knowledge"

const TENANT_ID = "cmujurq9w005ci36afzax588l"

async function main() {
  console.log("Seeding Tanfidh Corporate Profile, Trainer Bio, and Masterclass FAQ & Logistics...")

  const doc1Title = "Tanfidh_Corporate_Profile_&_Trainer_Bio.pdf"
  const doc1Text = `
# Tanfidh Management Consultants — Corporate Profile & Lead Trainer Biography

## Corporate Overview
Tanfidh Management Consultants is an executive strategy, performance management, and organizational transformation advisory firm headquartered in Muscat, Sultanate of Oman.
Tanfidh partners with government ministries, public authorities, state-owned enterprises (SOEs), and leading private corporations across the GCC and East Africa.
Website: www.tanfidh.com
Corporate Email: saidalharthy@tanfidh.com
Direct Executive Line & WhatsApp: +968 99 355 438
Location: Muscat, Sultanate of Oman

## Practice Areas & Core Capabilities
1. Strategy Formulation & Translation: Designing enterprise strategy maps, strategic themes, and strategic architecture aligned with national visions such as Oman Vision 2040.
2. Balanced Scorecard (BSC) Design & Implementation: Building comprehensive 4-perspective scorecards (Financial, Customer/Stakeholder, Internal Business Processes, and Learning & Growth / Organizational Capacity).
3. Key Performance Indicator (KPI) Architecture: Selecting high-impact leading and lagging indicators, establishing robust definition sheets, setting data-driven targets, and eliminating vanity metrics.
4. Strategy Management Office (SMO) & Governance: Institutionalizing quarterly executive review rhythms, risk monitoring, initiative prioritization, and executive dashboards.
5. Artificial Intelligence in Strategy & Performance: Integrating generative AI responsibly for predictive trend synthesis, automated performance commentary, KPI anomaly detection, and strategy review simulation.
6. Objectives & Key Results (OKRs): Implementing agile quarterly OKR frameworks for dynamic teams and rapid corporate transformation.

## Lead Trainer & Managing Consultant: Said bin Saif Al Harthi
Said bin Saif Al Harthi is the Executive Director, Senior Consultant, and Master Trainer at Tanfidh Management Consultants.
Said possesses over 20 years of hands-on advisory and executive leadership experience in the Sultanate of Oman, the GCC, and East Africa (including extensive public and private enterprise assignments in Tanzania).
He has personally guided C-suite leaders, undersecretaries, directors general, and performance teams through complex institutional transformations.

### Consulting Methodology
Said's signature methodology bridges the gap between academic management theory and real-world executive execution:
• Evidence-Based Measurement: Rooting every KPI in accessible operational data, verified baselines, and clear single-point ownership.
• Cause-and-Effect Logic: Ensuring that human capital and digital capability investments directly drive internal operational excellence, which in turn delivers stakeholder satisfaction and financial stewardship.
• Practical Facilitation: Executive workshops are highly interactive, utilizing real anonymized organizational case studies, customizable Excel/AI toolkits, and structured 30-day action roadmaps.
• Responsible AI Integration: Training leaders to leverage AI for rapid drafting while enforcing strict human oversight, data privacy, and mathematical validation.
`.trim()

  const doc2Title = "Masterclass_FAQ_&_Logistics.pdf"
  const doc2Text = `
# Tanfidh Executive Masterclasses — Logistics, Venue & Frequently Asked Questions (FAQ)

## Venue & Hotel Logistics
• Official Masterclass Venue: Sheraton Oman Hotel, Ruwi High Street, Financial District, Muscat, Sultanate of Oman.
• Hotel Rating: 5-Star Luxury International Business Hotel.
• Location Map: Conveniently located in the Ruwi business district with swift access from Sultan Qaboos Street.
• Parking Facilities: Complimentary valet parking is provided for all registered delegates at the hotel main lobby entrance. Spacious covered underground parking with high-speed elevator access directly to the meeting floor and ballroom is also available free of charge.
• Prayer Rooms & Facilities: Dedicated executive prayer rooms and ablution areas for ladies and gentlemen are located on the mezzanine meeting floor.
• Timing & Schedule: Masterclasses run daily from 08:30 to 16:30. Delegate check-in, registration desk opening, and welcome coffee begin at 08:00.
• Catering & Inclusions: Executive delegates enjoy 5-Star Sheraton gourmet buffet lunch, morning networking coffee breaks with fresh pastries, afternoon artisan tea breaks, and continuous refreshments throughout the day.

## Technical & Participation Requirements
• Laptop Requirement: Delegates are encouraged to bring their laptops (Windows or macOS) equipped with Microsoft Excel and a modern web browser to participate in practical hands-on exercises, AI prompt engineering labs on Day 1, and scorecard dashboard building on Day 2.
• Internet Access: Complimentary high-speed Wi-Fi is provided throughout the executive conference hall.
• Dress Code: Business formal, smart corporate attire, or National Omani dress (Dishdasha and Mussar).

## Certification & Professional Credentials
• Credential Awarded: Each masterclass culminates in an official Certified Professional Credential issued by Tanfidh Management Consultants (e.g., Certified Balanced Scorecard Professional, Certified KPI Professional, Certified Strategy Professional).
• Digital Verification: Credentials feature individual verifiable credential IDs and dynamic QR codes suitable for LinkedIn professional profile verification and institutional accreditation.
• Attendance Requirement: Delegates must complete all training modules and practical assessments across the scheduled days to receive certification.

## Executive Investment, BOGO Offer & Payment Terms
• 2-Day Masterclass Fee: OMR 500 per participant.
• 3-Day Masterclass Fee (KPI Pro & Strategy Execution Using BSC): OMR 750 per participant.
• Exclusive Executive Offer (Buy 1 Get 1 Free / BOGO): Pay for 1 seat and register a second colleague or team member 100% free of charge. Both participants receive full access, executive toolkits, 5-star Sheraton lunches, and individual verifiable credentials.
• Corporate Invoicing & Purchase Orders (LPO / PO): Tanfidh fully supports government entities, ministries, and corporate sponsors requiring official proforma invoices, commercial registration (CR) documentation, VAT tax invoices, or supplier registration. Net-30 payment terms are available upon receipt of an approved corporate Local Purchase Order (LPO).
• Bank Muscat Direct Wire / Transfer Details:
  - Account Name: Tanfidh Management Consultants
  - Bank: Bank Muscat
  - Branch: Sarooj
  - Account Number: 0322 027 665 4400 18
  - SWIFT Code: BMUSOMRXXXX
  - Reference: Please quote participant name and course title.
• In-Company Custom Masterclasses: Tailored, on-site organizational training packages for departments and leadership teams are available upon request.
`.trim()

  // 1. Upsert Doc 1
  let s1 = await db.knowledgeSource.findFirst({
    where: { tenantId: TENANT_ID, title: doc1Title }
  })
  if (!s1) {
    s1 = await db.knowledgeSource.create({
      data: {
        tenantId: TENANT_ID,
        title: doc1Title,
        type: "FILE",
        status: "INDEXING",
      }
    })
  }
  console.log("Indexing Doc 1:", s1.title)
  const idx1 = await indexSource({ sourceId: s1.id, text: doc1Text })
  console.log(`✓ Doc 1 indexed with ${idx1.chunks} chunks (embedded: ${idx1.embedded})`)

  // 2. Upsert Doc 2
  let s2 = await db.knowledgeSource.findFirst({
    where: { tenantId: TENANT_ID, title: doc2Title }
  })
  if (!s2) {
    s2 = await db.knowledgeSource.create({
      data: {
        tenantId: TENANT_ID,
        title: doc2Title,
        type: "FILE",
        status: "INDEXING",
      }
    })
  }
  console.log("Indexing Doc 2:", s2.title)
  const idx2 = await indexSource({ sourceId: s2.id, text: doc2Text })
  console.log(`✓ Doc 2 indexed with ${idx2.chunks} chunks (embedded: ${idx2.embedded})`)

  console.log("✓ All Tanfidh Knowledge Documents successfully embedded and ready for AI search!")
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("Error seeding knowledge:", err)
    process.exit(1)
  })
