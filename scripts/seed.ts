import { PrismaClient } from "@prisma/client"
import { BUSINESS_CONFIG, SAMPLE_WA_TEMPLATES } from "../src/lib/constants"

const db = new PrismaClient()

async function main() {
  console.log("🌱 Seeding database...")

  const superAdmin = await db.staff.upsert({
    where: { email: "admin@omanadventures.om" },
    update: {},
    create: {
      email: "admin@omanadventures.om",
      name: "Ahmed Al-Balushi",
      phone: "+96890000001",
      passwordHash: "$2a$10$demo.hash.superadmin",
      role: "SUPER_ADMIN",
      isActive: true,
    },
  })

  const finance = await db.staff.upsert({
    where: { email: "finance@omanadventures.om" },
    update: {},
    create: {
      email: "finance@omanadventures.om",
      name: "Fatima Al-Hinai",
      phone: "+96890000002",
      passwordHash: "$2a$10$demo.hash.finance",
      role: "FINANCE",
    },
  })

  const chatAgent = await db.staff.upsert({
    where: { email: "agent@omanadventures.om" },
    update: {},
    create: {
      email: "agent@omanadventures.om",
      name: "Said Al-Maawali",
      phone: "+96890000003",
      passwordHash: "$2a$10$demo.hash.agent",
      role: "CHAT_AGENT",
    },
  })

  const marketing = await db.staff.upsert({
    where: { email: "marketing@omanadventures.om" },
    update: {},
    create: {
      email: "marketing@omanadventures.om",
      name: "Mona Al-Rashidi",
      phone: "+96890000004",
      passwordHash: "$2a$10$demo.hash.marketing",
      role: "MARKETING",
    },
  })

  const guide = await db.staff.upsert({
    where: { email: "guide@omanadventures.om" },
    update: {},
    create: {
      email: "guide@omanadventures.om",
      name: "Khalid Al-Hashimi",
      phone: "+96890000005",
      passwordHash: "$2a$10$demo.hash.guide",
      role: "GUIDE",
    },
  })

  const bank1 = await db.bankAccount.upsert({
    where: { id: "bank-bankmuscat" },
    update: {},
    create: {
      id: "bank-bankmuscat",
      bankName: "Bank Muscat",
      accountName: "Oman Adventures LLC",
      accountNumber: "0301-0290-1234-5678",
      iban: "OM18 0030 0010 2901 2345 678",
      branch: "Ruwi Main Branch",
      swiftCode: "BMUSOMRX",
      isDefault: true,
    },
  })

  const bank2 = await db.bankAccount.upsert({
    where: { id: "bank-nbo" },
    update: {},
    create: {
      id: "bank-nbo",
      bankName: "National Bank of Oman",
      accountName: "Oman Adventures LLC",
      accountNumber: "0400-1234-5678-9012",
      iban: "OM45 0040 0012 3456 7890 12",
      branch: "Qurum Branch",
      swiftCode: "NBOMOMRX",
    },
  })

  const tours = [
    {
      slug: "wahiba-sands-desert-safari",
      name: "Wahiba Sands Desert Safari",
      nameAr: "سفاري رمال الشرقية",
      description: "Experience the golden dunes of Wahiba Sands on this thrilling 4x4 desert adventure. Includes dune bashing, camel riding, sandboarding, and a traditional Omani BBQ dinner under the stars at a Bedouin-style camp.",
      category: "Desert",
      city: "Wahiba Sands",
      location: "Wahiba Sands, Ash Sharqiyah",
      latitude: 21.7539,
      longitude: 58.8256,
      basePrice: 45,
      childPrice: 25,
      groupPrice: 40,
      durationHours: 6,
      difficulty: "MODERATE",
      capacityPerSlot: 15,
      media: [{ type: "image", url: "/tours/desert-1.jpg", alt: "Golden dunes at sunset" }, { type: "image", url: "/tours/desert-2.jpg", alt: "Camel caravan" }, { type: "image", url: "/tours/desert-3.jpg", alt: "Bedouin camp dinner" }],
      itinerary: [
        { time: "14:00", title: "Pickup from hotel", description: "Air-conditioned 4x4 pickup" },
        { time: "15:30", title: "Dune bashing", description: "Thrilling 4x4 ride over golden dunes" },
        { time: "16:30", title: "Camel riding & sandboarding", description: "Traditional camel ride and sandboarding" },
        { time: "18:00", title: "Sunset at dunes", description: "Watch the spectacular desert sunset" },
        { time: "19:00", title: "Bedouin camp dinner", description: "Traditional Omani BBQ with entertainment" },
        { time: "21:00", title: "Return to hotel", description: "Drop-off at your accommodation" },
      ],
      inclusions: ["Hotel pickup & drop-off", "4x4 transport", "Camel ride", "Sandboarding", "BBQ dinner", "Bottled water & soft drinks"],
      exclusions: ["Personal expenses", "Travel insurance", "Tips"],
      whatToBring: ["Sunscreen", "Sunglasses", "Comfortable clothes", "Camera", "Light jacket for evening"],
      meetingPoint: "Hotel lobby - Muscat city hotels",
      meetingLat: 23.5880,
      meetingLng: 58.3829,
      featured: true,
      rating: 4.8,
      reviewCount: 127,
      cancellationPolicy: "Free cancellation up to 24 hours before. 50% refund within 24 hours. No refund for no-shows.",
      seoTitle: "Wahiba Sands Desert Safari | Oman Adventures",
      seoDescription: "Book the best desert safari in Wahiba Sands. Dune bashing, camel riding, sandboarding & Bedouin dinner.",
    },
    {
      slug: "musandam-dhow-cruise",
      name: "Musandam Dhow Cruise & Dolphin Watching",
      nameAr: "جولة الداو في مسندم ومشاهدة الدلافين",
      description: "Sail aboard a traditional Omani dhow through the spectacular fjords of Musandam. Spot dolphins, snorkel in crystal waters, and enjoy a buffet lunch on board.",
      category: "Water Sports",
      city: "Musandam",
      location: "Khasab, Musandam",
      latitude: 26.1717,
      longitude: 56.2405,
      basePrice: 65,
      childPrice: 35,
      groupPrice: 58,
      durationHours: 8,
      difficulty: "EASY",
      capacityPerSlot: 30,
      media: [{ type: "image", url: "/tours/dhow-1.jpg", alt: "Traditional dhow in fjords" }, { type: "image", url: "/tours/dhow-2.jpg", alt: "Dolphins jumping" }, { type: "image", url: "/tours/dhow-3.jpg", alt: "Snorkeling in clear water" }],
      itinerary: [
        { time: "08:00", title: "Pickup from Khasab", description: "Transfer to dhow port" },
        { time: "09:00", title: "Dhow cruise begins", description: "Sail through Musandam fjords" },
        { time: "10:00", title: "Dolphin watching", description: "Spot wild dolphins in their habitat" },
        { time: "12:00", title: "Snorkeling stop", description: "Snorkel at Telegraph Island" },
        { time: "13:00", title: "Buffet lunch", description: "Fresh seafood and Omani dishes" },
        { time: "16:00", title: "Return to port", description: "Disembark and transfer back" },
      ],
      inclusions: ["Dhow cruise", "Buffet lunch", "Snorkeling equipment", "Dolphin watching", "Tea & refreshments", "Transfer from Khasab"],
      exclusions: ["Transport to Khasab", "Personal expenses", "Travel insurance"],
      whatToBring: ["Swimwear", "Towel", "Sunscreen", "Hat", "Underwater camera"],
      meetingPoint: "Khasab Port - Musandam",
      meetingLat: 26.1717,
      meetingLng: 56.2405,
      featured: true,
      rating: 4.9,
      reviewCount: 203,
      cancellationPolicy: "Free cancellation up to 48 hours before. 25% refund within 48 hours. No refund for no-shows.",
      seoTitle: "Musandam Dhow Cruise | Dolphin Watching Oman",
      seoDescription: "Sail the fjords of Musandam on a traditional dhow. Dolphin watching, snorkeling & buffet lunch included.",
    },
    {
      slug: "jebel-shams-mountain-trek",
      name: "Jebel Shams Rim Walk Trek",
      nameAr: "مسير حافة جبل شمس",
      description: "Hike the famous 'Grand Canyon of Arabia' on Jebel Shams, Oman's highest peak. This moderate trek along the rim offers breathtaking views of the Wadi Ghul canyon.",
      category: "Mountain",
      city: "Jebel Shams",
      location: "Jebel Shams, Ad Dakhiliyah",
      latitude: 23.3667,
      longitude: 57.6167,
      basePrice: 55,
      childPrice: 30,
      groupPrice: 48,
      durationHours: 7,
      difficulty: "HARD",
      capacityPerSlot: 12,
      media: [{ type: "image", url: "/tours/mountain-1.jpg", alt: "Jebel Shams canyon view" }, { type: "image", url: "/tours/mountain-2.jpg", alt: "Hiking trail" }],
      itinerary: [
        { time: "07:00", title: "Pickup from Muscat/Nizwa", description: "Early morning departure" },
        { time: "09:30", title: "Arrive at Jebel Shams", description: "Briefing and safety instructions" },
        { time: "10:00", title: "Rim Walk trek", description: "3-4 hour guided hike along the canyon rim" },
        { time: "13:00", title: "Picnic lunch", description: "Lunch with panoramic views" },
        { time: "14:00", title: "Return trek", description: "Hike back to starting point" },
        { time: "18:00", title: "Return drop-off", description: "Transfer back to Muscat/Nizwa" },
      ],
      inclusions: ["Professional guide", "Transport", "Picnic lunch", "Hiking poles", "First aid kit", "Bottled water"],
      exclusions: ["Hiking boots", "Personal gear", "Travel insurance"],
      whatToBring: ["Hiking boots", "Warm jacket", "Sun protection", "Backpack", "Energy snacks"],
      meetingPoint: "Muscat Grand Mall parking - 07:00 AM",
      meetingLat: 23.5859,
      meetingLng: 58.4055,
      featured: true,
      rating: 4.7,
      reviewCount: 89,
      cancellationPolicy: "Free cancellation up to 24 hours before. No refund within 24 hours due to guide commitment.",
      seoTitle: "Jebel Shams Rim Walk Trek | Oman Hiking",
      seoDescription: "Hike the Grand Canyon of Arabia. Guided trek on Oman's highest peak with stunning canyon views.",
    },
    {
      slug: "muscat-city-highlights",
      name: "Muscat City Highlights Tour",
      nameAr: "جولة معالم مسقط",
      description: "Discover the best of Muscat in half a day. Visit the Grand Mosque, Royal Opera House, Mutrah Souq, and Al Alam Palace with an expert local guide.",
      category: "City Tour",
      city: "Muscat",
      location: "Muscat",
      latitude: 23.5880,
      longitude: 58.3829,
      basePrice: 35,
      childPrice: 20,
      groupPrice: 30,
      durationHours: 4,
      difficulty: "EASY",
      capacityPerSlot: 20,
      media: [{ type: "image", url: "/tours/city-1.jpg", alt: "Sultan Qaboos Grand Mosque" }, { type: "image", url: "/tours/city-2.jpg", alt: "Mutrah Souq" }, { type: "image", url: "/tours/city-3.jpg", alt: "Al Alam Palace" }],
      itinerary: [
        { time: "08:30", title: "Hotel pickup", description: "Air-conditioned transport" },
        { time: "09:00", title: "Sultan Qaboos Grand Mosque", description: "Visit one of the world's most beautiful mosques" },
        { time: "10:30", title: "Mutrah Souq", description: "Explore the traditional Arabian market" },
        { time: "11:30", title: "Al Alam Palace", description: "Photo stop at the Sultan's ceremonial palace" },
        { time: "12:00", title: "Royal Opera House", description: "Exterior visit of the architectural marvel" },
        { time: "13:00", title: "Return to hotel", description: "Drop-off" },
      ],
      inclusions: ["Transport", "Guide", "Bottled water", "Mosque entry"],
      exclusions: ["Lunch", "Personal shopping", "Tips"],
      whatToBring: ["Modest clothing (cover arms & knees)", "Camera", "Sunscreen"],
      meetingPoint: "Hotel lobby - Muscat",
      meetingLat: 23.5880,
      meetingLng: 58.3829,
      featured: true,
      rating: 4.6,
      reviewCount: 312,
      cancellationPolicy: "Free cancellation up to 12 hours before. 50% refund within 12 hours.",
      seoTitle: "Muscat City Tour | Grand Mosque & Souq",
      seoDescription: "Half-day Muscat city tour. Grand Mosque, Mutrah Souq, Al Alam Palace & Royal Opera House.",
    },
    {
      slug: "ras-al-jinz-turtle-watching",
      name: "Ras Al Jinz Turtle Watching",
      nameAr: "مشاهدة السلاحف في رأس الجينز",
      description: "Witness the magical sight of green turtles nesting on Ras Al Jinz beach, a protected nature reserve. Guided night tour with expert rangers.",
      category: "Family",
      city: "Ras Al Jinz",
      location: "Ras Al Jinz Turtle Reserve",
      latitude: 22.4167,
      longitude: 59.8000,
      basePrice: 50,
      childPrice: 25,
      groupPrice: 45,
      durationHours: 5,
      difficulty: "EASY",
      capacityPerSlot: 25,
      media: [{ type: "image", url: "/tours/turtle-1.jpg", alt: "Turtle nesting at night" }, { type: "image", url: "/tours/turtle-2.jpg", alt: "Ras Al Jinz beach" }],
      itinerary: [
        { time: "19:00", title: "Pickup from Sur", description: "Transfer to Ras Al Jinz reserve" },
        { time: "20:00", title: "Visitor center briefing", description: "Conservation rules and turtle biology" },
        { time: "20:30", title: "Guided beach walk", description: "Ranger-led turtle watching session" },
        { time: "22:30", title: "Return transfer", description: "Drop-off at Sur hotels" },
      ],
      inclusions: ["Reserve entry", "Ranger guide", "Transport from Sur", "Visitor center access"],
      exclusions: ["Dinner", "Transport to Sur", "Personal expenses"],
      whatToBring: ["Dark clothing", "Insect repellent", "Comfortable shoes"],
      meetingPoint: "Sur city center hotels",
      meetingLat: 22.5667,
      meetingLng: 59.5289,
      featured: false,
      rating: 4.8,
      reviewCount: 156,
      cancellationPolicy: "Free cancellation up to 24 hours before. No refund on the day of the tour.",
      seoTitle: "Ras Al Jinz Turtle Watching | Oman Nature Tour",
      seoDescription: "Watch green turtles nest at Ras Al Jinz reserve. Guided night tour with expert rangers.",
    },
    {
      slug: "wadi-shab-boat-adventure",
      name: "Wadi Shab Swimming & Cliff Jumping",
      nameAr: "مغامرة وادي شاب",
      description: "Trek and swim through the stunning Wadi Shab. Hike through palm groves, swim in turquoise pools, and discover a hidden waterfall cave.",
      category: "Adventure",
      city: "Sur",
      location: "Wadi Shab, Ash Sharqiyah",
      latitude: 22.7833,
      longitude: 59.2167,
      basePrice: 40,
      childPrice: 22,
      groupPrice: 35,
      durationHours: 6,
      difficulty: "MODERATE",
      capacityPerSlot: 16,
      media: [{ type: "image", url: "/tours/wadi-1.jpg", alt: "Turquoise wadi pools" }, { type: "image", url: "/tours/wadi-2.jpg", alt: "Hidden waterfall cave" }],
      itinerary: [
        { time: "08:00", title: "Pickup from Muscat", description: "Drive to Wadi Shab" },
        { time: "09:30", title: "Arrive at Wadi Shab", description: "Briefing and boat crossing" },
        { time: "10:00", title: "Trek through wadi", description: "Hike through palm groves and canyon" },
        { time: "11:00", title: "Swimming & cliff jumping", description: "Swim in crystal pools" },
        { time: "12:00", title: "Hidden cave waterfall", description: "Swim into the secret cave" },
        { time: "14:00", title: "Lunch & return", description: "Local lunch and transfer back" },
      ],
      inclusions: ["Transport", "Guide", "Boat crossing", "Lunch", "Bottled water"],
      exclusions: ["Swimwear", "Water shoes", "Personal expenses"],
      whatToBring: ["Swimwear", "Water shoes", "Towel", "Waterproof phone case", "Snacks"],
      meetingPoint: "Muscat - Qurm City Center parking",
      meetingLat: 23.6113,
      meetingLng: 58.2428,
      featured: true,
      rating: 4.7,
      reviewCount: 178,
      cancellationPolicy: "Free cancellation up to 24 hours before. Weather-dependent - full refund if cancelled due to bad weather.",
      seoTitle: "Wadi Shab Adventure | Swimming & Cliff Jumping Oman",
      seoDescription: "Trek and swim through stunning Wadi Shab. Hidden caves, turquoise pools, and cliff jumping.",
    },
  ]

  const createdTours: string[] = []
  for (const t of tours) {
    const tour = await db.tour.upsert({
      where: { slug: t.slug },
      update: {},
      create: {
        slug: t.slug,
        name: t.name,
        nameAr: t.nameAr,
        description: t.description,
        category: t.category,
        city: t.city,
        location: t.location,
        latitude: t.latitude,
        longitude: t.longitude,
        basePrice: t.basePrice,
        childPrice: t.childPrice,
        groupPrice: t.groupPrice,
        durationHours: t.durationHours,
        difficulty: t.difficulty,
        capacityPerSlot: t.capacityPerSlot,
        media: JSON.stringify(t.media),
        itinerary: JSON.stringify(t.itinerary),
        inclusions: JSON.stringify(t.inclusions),
        exclusions: JSON.stringify(t.exclusions),
        whatToBring: JSON.stringify(t.whatToBring),
        meetingPoint: t.meetingPoint,
        meetingLat: t.meetingLat,
        meetingLng: t.meetingLng,
        featured: t.featured,
        rating: t.rating,
        reviewCount: t.reviewCount,
        cancellationPolicy: t.cancellationPolicy,
        seoTitle: t.seoTitle,
        seoDescription: t.seoDescription,
      },
    })
    createdTours.push(tour.id)

    await db.addOn.createMany({
      data: [
        { tourId: tour.id, name: "Private Guide", price: 30, type: "FLAT" },
        { tourId: tour.id, name: "GoPro Photos & Video", price: 15, type: "PER_PAX" },
        { tourId: tour.id, name: "Hotel Pickup Upgrade", price: 10, type: "PER_PAX" },
      ],
    })
  }

  const now = new Date()
  for (const tourId of createdTours) {
    const tour = await db.tour.findUnique({ where: { id: tourId } })
    if (!tour) continue
    for (let day = 0; day < 30; day++) {
      const date = new Date(now)
      date.setDate(date.getDate() + day)
      date.setHours(0, 0, 0, 0)

      const slots = tour.category === "Desert" ? ["14:00"] : tour.category === "Family" ? ["20:00"] : ["08:00", "14:00"]

      for (const startTime of slots) {
        const existing = await db.slot.findUnique({
          where: { tourId_date_startTime: { tourId, date, startTime } },
        })
        if (existing) continue

        const isWeekend = date.getDay() === 4 || date.getDay() === 5
        const priceOverride = isWeekend ? tour.basePrice * 1.15 : null

        const seatsBooked = Math.floor(Math.random() * Math.min(tour.capacityPerSlot, tour.capacityPerSlot - 2))
        const status = seatsBooked >= tour.capacityPerSlot ? "FULL" : "OPEN"

        await db.slot.create({
          data: {
            tourId,
            date,
            startTime,
            capacity: tour.capacityPerSlot,
            seatsBooked,
            status,
            priceOverride,
          },
        })
      }
    }
  }

  const customers = [
    { name: "John Smith", phone: "+447700900123", email: "john.smith@email.com", whatsappOptIn: true, emailOptIn: true, preferredLang: "en", totalBookings: 3, totalSpent: 195, loyaltyTier: "SILVER", loyaltyPoints: 650 },
    { name: "Aisha Al-Mansouri", phone: "+971501234567", email: "aisha@email.com", whatsappOptIn: true, emailOptIn: true, preferredLang: "ar", totalBookings: 5, totalSpent: 340, loyaltyTier: "SILVER", loyaltyPoints: 1200 },
    { name: "Mohammed Al-Farsi", phone: "+96891234567", email: "m.alfarsi@email.com", whatsappOptIn: true, emailOptIn: false, preferredLang: "ar", totalBookings: 8, totalSpent: 520, loyaltyTier: "GOLD", loyaltyPoints: 2400 },
    { name: "Emily Johnson", phone: "+12025550100", email: "emily.j@email.com", whatsappOptIn: true, emailOptIn: true, preferredLang: "en", totalBookings: 1, totalSpent: 65, loyaltyTier: "BRONZE", loyaltyPoints: 65 },
    { name: "Raj Patel", phone: "+919876543210", email: "raj.patel@email.com", whatsappOptIn: true, emailOptIn: true, preferredLang: "en", totalBookings: 2, totalSpent: 110, loyaltyTier: "BRONZE", loyaltyPoints: 220 },
    { name: "Sara Al-Balushi", phone: "+96892345678", email: "sara.b@email.com", whatsappOptIn: true, emailOptIn: true, preferredLang: "ar", totalBookings: 4, totalSpent: 280, loyaltyTier: "SILVER", loyaltyPoints: 890 },
  ]
  const createdCustomers: string[] = []
  for (const c of customers) {
    const customer = await db.customer.upsert({
      where: { phone: c.phone },
      update: {},
      create: { ...c, tags: JSON.stringify(c.totalBookings > 3 ? ["VIP", "Repeat"] : ["New"]) },
    })
    createdCustomers.push(customer.id)
  }

  const allSlots = await db.slot.findMany({ where: { status: "OPEN" }, include: { tour: true } })

  const orderStatuses = [
    { order: "PENDING_PAYMENT", payment: "PENDING" },
    { order: "PAYMENT_SUBMITTED", payment: "SUBMITTED" },
    { order: "CONFIRMED", payment: "APPROVED" },
    { order: "CONFIRMED", payment: "APPROVED" },
    { order: "COMPLETED", payment: "PAID" },
    { order: "CANCELLED", payment: "REFUNDED" },
    { order: "PAYMENT_SUBMITTED", payment: "SUBMITTED" },
    { order: "CONFIRMED", payment: "APPROVED" },
    { order: "PENDING_PAYMENT", payment: "PENDING" },
    { order: "COMPLETED", payment: "PAID" },
    { order: "CONFIRMED", payment: "APPROVED" },
    { order: "PAYMENT_SUBMITTED", payment: "SUBMITTED" },
  ]

  for (let i = 0; i < 12; i++) {
    const slot = allSlots[i % allSlots.length]
    const customer = await db.customer.findUnique({ where: { id: createdCustomers[i % createdCustomers.length] } })
    if (!slot || !customer) continue

    const statusCombo = orderStatuses[i]
    const paxAdult = 1 + (i % 4)
    const paxChild = i % 2
    const pricePerAdult = slot.priceOverride ?? slot.tour.basePrice
    const pricePerChild = slot.tour.childPrice ?? 0
    const subtotal = pricePerAdult * paxAdult + pricePerChild * paxChild
    const taxAmount = subtotal * 0.05
    const total = subtotal + taxAmount
    const method = i % 2 === 0 ? "BANK_TRANSFER" : "AMWALPAY"
    const channel = i % 3 === 0 ? "WHATSAPP" : i % 3 === 1 ? "WEB" : "ADMIN"

    const orderDate = new Date(now)
    orderDate.setDate(orderDate.getDate() - (i % 10))
    orderDate.setHours(orderDate.getHours() - i)

    const order = await db.order.create({
      data: {
        orderNumber: `ORD-${String(1000 + i)}`,
        customerId: customer.id,
        tourId: slot.tourId,
        slotId: slot.id,
        paxAdult,
        paxChild,
        customerName: customer.name || "Guest",
        customerPhone: customer.phone,
        customerEmail: customer.email,
        subtotal,
        taxAmount,
        totalAmount: total,
        paymentMethod: method,
        paymentStatus: statusCombo.payment,
        orderStatus: statusCombo.order,
        channel,
        confirmedAt: statusCombo.order === "CONFIRMED" || statusCombo.order === "COMPLETED" ? orderDate : null,
        completedAt: statusCombo.order === "COMPLETED" ? orderDate : null,
        cancelledAt: statusCombo.order === "CANCELLED" ? orderDate : null,
        createdAt: orderDate,
      },
    })

    const payment = await db.payment.create({
      data: {
        orderId: order.id,
        customerId: customer.id,
        method,
        amount: total,
        status: statusCombo.payment,
        bankReference: method === "BANK_TRANSFER" ? `TRX${100000 + i}` : null,
        bankName: method === "BANK_TRANSFER" ? "Bank Muscat" : null,
        transferDate: method === "BANK_TRANSFER" ? orderDate : null,
        screenshotUrl: method === "BANK_TRANSFER" && statusCombo.payment === "SUBMITTED" ? "/payments/proof-sample.jpg" : null,
        verifiedById: statusCombo.payment === "APPROVED" ? finance.id : null,
        verifiedAt: statusCombo.payment === "APPROVED" ? orderDate : null,
        gatewayReference: method === "AMWALPAY" ? `AMW${200000 + i}` : null,
        createdAt: orderDate,
      },
    })

    if (statusCombo.order === "CONFIRMED" || statusCombo.order === "COMPLETED") {
      await db.voucher.create({
        data: {
          voucherCode: `VCH-${String(2000 + i)}`,
          orderId: order.id,
          customerId: customer.id,
          qrData: JSON.stringify({ orderId: order.id, orderNumber: order.orderNumber, customer: customer.name }),
          status: statusCombo.order === "COMPLETED" ? "USED" : "VALID",
          checkedInAt: statusCombo.order === "COMPLETED" ? orderDate : null,
        },
      })
    }

    if (statusCombo.payment === "APPROVED") {
      await db.auditLog.create({
        data: {
          staffId: finance.id,
          orderId: order.id,
          action: "APPROVE_PAYMENT",
          entity: "PAYMENT",
          entityId: payment.id,
          details: JSON.stringify({ amount: total, method }),
        },
      })
    }
  }

  for (const t of SAMPLE_WA_TEMPLATES) {
    const existing = await db.template.findFirst({ where: { name: t.name, channel: "WHATSAPP" } })
    if (existing) continue
    await db.template.create({
      data: {
        channel: "WHATSAPP",
        name: t.name,
        category: t.category,
        language: "en_US",
        type: "TEXT",
        bodyContent: t.body,
        variables: JSON.stringify(t.variables),
        status: "APPROVED",
      },
    })
  }

  const existingEmail = await db.template.findFirst({ where: { name: "order_confirmation_email", channel: "EMAIL" } })
  if (!existingEmail) {
    await db.template.create({
      data: {
        channel: "EMAIL",
        name: "order_confirmation_email",
        category: "UTILITY",
        language: "en",
        type: "TEXT",
        emailSubject: "Booking Confirmed - {{order_number}} | Oman Adventures",
        emailHtml: "<div><h1>Your booking is confirmed!</h1><p>Order: {{order_number}}</p><p>Tour: {{tour_name}}</p></div>",
        bodyContent: "Your booking is confirmed. Order: {{order_number}}, Tour: {{tour_name}}",
        variables: JSON.stringify(["order_number", "tour_name", "date", "time", "pax", "amount"]),
        status: "APPROVED",
      },
    })
  }

  await db.coupon.upsert({
    where: { code: "WELCOME15" },
    update: {},
    create: { code: "WELCOME15", type: "PERCENTAGE", value: 15, maxUses: 1000, usedCount: 42, validFrom: new Date("2024-01-01"), validTo: new Date("2026-12-31") },
  })

  await db.coupon.upsert({
    where: { code: "EARLYBIRD20" },
    update: {},
    create: { code: "EARLYBIRD20", type: "PERCENTAGE", value: 20, maxUses: 200, usedCount: 15, validFrom: new Date("2024-01-01"), validTo: new Date("2026-12-31") },
  })

  const canned = [
    { title: "Greeting", content: "Hello! Welcome to Oman Adventures. How can I help you today?", shortcut: "/greeting", category: "General" },
    { title: "Availability Check", content: "Let me check availability for you. Which tour and date are you interested in?", shortcut: "/avail", category: "Booking" },
    { title: "Payment Instructions", content: "To complete your booking, please transfer to:\nBank Muscat\nIBAN: OM18 0030 0010 2901 2345 678\nThen send a screenshot of the transfer receipt here.", shortcut: "/payment", category: "Payment" },
    { title: "Order Status", content: "I'll check your order status right away. Could you share your order number?", shortcut: "/status", category: "Orders" },
    { title: "Cancellation Policy", content: "Free cancellation up to 24 hours before the tour. Within 24 hours, a 50% refund applies. No refund for no-shows.", shortcut: "/cancel", category: "Policy" },
    { title: "Transfer to Human", content: "I'll connect you with one of our team members who can assist you further. Please hold for a moment.", shortcut: "/human", category: "Support" },
  ]
  for (const c of canned) {
    await db.cannedResponse.upsert({ where: { shortcut: c.shortcut }, update: {}, create: c }).catch(() => {})
  }

  await db.botFlow.create({
    data: {
      name: "Welcome & Main Menu",
      description: "Triggered on first message - shows main menu",
      trigger: "NEW_CONVERSATION",
      triggerConfig: JSON.stringify({}),
      nodes: JSON.stringify([
        { id: "start", type: "message", text: "Welcome to Oman Adventures! 🐪\n\nHow can I help you today?" },
        { id: "menu", type: "buttons", text: "Choose an option:", buttons: [
          { id: "browse", text: "🗺️ Browse Tours" },
          { id: "availability", text: "📅 Check Availability" },
          { id: "mybookings", text: "🎫 My Bookings" },
          { id: "support", text: "💬 Talk to Us" },
        ]},
      ]),
      edges: JSON.stringify([{ from: "start", to: "menu" }]),
    },
  }).catch(() => {})

  await db.botFlow.create({
    data: { name: "Availability Check", description: "When user asks about availability", trigger: "KEYWORD", triggerConfig: JSON.stringify({ keywords: ["availability", "available", "slots", "seats", "مواعيد", "متاح"] }), priority: 1 },
  }).catch(() => {})

  const labels = [
    { name: "New Lead", color: "emerald" },
    { name: "Payment Pending", color: "amber" },
    { name: "VIP", color: "rose" },
    { name: "Complaint", color: "red" },
    { name: "Repeat Customer", color: "purple" },
    { name: "Arabic Speaker", color: "blue" },
  ]
  for (const l of labels) {
    await db.label.upsert({ where: { name: l.name }, update: {}, create: l }).catch(() => {})
  }

  const convos = [
    { phone: "+96891234567", name: "Mohammed Al-Farsi", status: "OPEN", botActive: false, assignedStaffId: chatAgent.id, labels: JSON.stringify(["VIP", "Arabic Speaker"]), intent: "BOOKING" },
    { phone: "+447700900123", name: "John Smith", status: "OPEN", botActive: true, labels: JSON.stringify(["Repeat Customer"]), intent: "AVAILABILITY" },
    { phone: "+971501234567", name: "Aisha Al-Mansouri", status: "PENDING", botActive: false, assignedStaffId: chatAgent.id, labels: JSON.stringify(["Payment Pending", "VIP"]), intent: "PAYMENT" },
    { phone: "+12025550100", name: "Emily Johnson", status: "OPEN", botActive: true, labels: JSON.stringify(["New Lead"]), intent: "INQUIRY" },
    { phone: "+919876543210", name: "Raj Patel", status: "RESOLVED", botActive: false, assignedStaffId: chatAgent.id, labels: JSON.stringify(["Repeat Customer"]), intent: "BOOKING" },
  ]

  for (const c of convos) {
    const customer = await db.customer.findUnique({ where: { phone: c.phone } })
    const convo = await db.conversation.create({
      data: {
        customerId: customer?.id,
        customerPhone: c.phone,
        customerName: c.name,
        status: c.status,
        botActive: c.botActive,
        assignedStaffId: c.assignedStaffId,
        labels: c.labels,
        intent: c.intent,
        lastMessageAt: new Date(Date.now() - Math.random() * 86400000),
        lastMessageText: "Thanks! I'll send the screenshot now.",
      },
    })

    const messages = [
      { direction: "INBOUND", type: "TEXT", content: "Hi, I'd like to book the desert safari" },
      { direction: "BOT", type: "TEXT", content: "Hello! Great choice! The Wahiba Sands Desert Safari is one of our most popular tours. Let me show you available slots.", isAiGenerated: true },
      { direction: "BOT", type: "INTERACTIVE", content: "Available slots:", interactiveData: JSON.stringify({ type: "list", items: [{ id: "s1", title: "Tomorrow 2:00 PM", description: "12 seats left - OMR 45" }, { id: "s2", title: "Day after 2:00 PM", description: "15 seats left - OMR 45" }] }), isAiGenerated: true },
      { direction: "INBOUND", type: "TEXT", content: "Tomorrow 2 PM for 2 adults" },
      { direction: "BOT", type: "TEXT", content: "Perfect! I've selected:\n\n📍 Wahiba Sands Desert Safari\n📅 Tomorrow, 2:00 PM\n👥 2 Adults\n💰 OMR 90 (incl. 5% VAT)\n\nHow would you like to pay?", isAiGenerated: true },
      { direction: "INBOUND", type: "TEXT", content: "Bank transfer" },
      { direction: "BOT", type: "TEXT", content: "Please transfer to:\n\n🏦 Bank Muscat\nAccount: Oman Adventures LLC\nIBAN: OM18 0030 0010 2901 2345 678\n\nThen send a screenshot of the receipt here 📎", isAiGenerated: true },
    ]

    for (const m of messages) {
      await db.message.create({
        data: { conversationId: convo.id, customerId: customer?.id, ...m, status: "READ" } as any,
      })
    }
  }

  const settings = [
    { key: "business_name", value: BUSINESS_CONFIG.name, category: "GENERAL" },
    { key: "currency", value: BUSINESS_CONFIG.currency, category: "GENERAL" },
    { key: "vat_rate", value: "0.05", type: "NUMBER", category: "GENERAL" },
    { key: "whatsapp_mode", value: "SIMULATION", category: "WHATSAPP" },
    { key: "amwalpay_mode", value: "SIMULATION", category: "PAYMENT" },
    { key: "email_mode", value: "SIMULATION", category: "EMAIL" },
    { key: "ai_assistant_enabled", value: "true", type: "BOOLEAN", category: "GENERAL" },
    { key: "auto_reply_enabled", value: "true", type: "BOOLEAN", category: "WHATSAPP" },
  ]
  for (const s of settings) {
    await db.systemSetting.upsert({ where: { key: s.key }, update: {}, create: s })
  }

  console.log("✅ Seed complete!")
  console.log(`   - ${await db.staff.count()} staff`)
  console.log(`   - ${await db.tour.count()} tours`)
  console.log(`   - ${await db.slot.count()} slots`)
  console.log(`   - ${await db.customer.count()} customers`)
  console.log(`   - ${await db.order.count()} orders`)
  console.log(`   - ${await db.payment.count()} payments`)
  console.log(`   - ${await db.conversation.count()} conversations`)
  console.log(`   - ${await db.template.count()} templates`)
}

main()
  .catch((e) => { console.error("Seed error:", e); process.exit(1) })
  .finally(async () => { await db.$disconnect() })
