/**
 * Replaces the placeholder tour catalogue with ten real Oman itineraries.
 *
 * Existing tours are matched by slug and updated rather than recreated, because
 * two of them carry live bookings and an order references its tour. New ones
 * are created with departures for the next eight weeks.
 *
 * Run with: bun run scripts/seed-tours.ts
 */

import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

interface TourSeed {
  slug: string
  name: string
  nameAr: string
  description: string
  category: string
  city: string
  location: string
  basePrice: number
  childPrice: number
  durationHours: number
  difficulty: "EASY" | "MODERATE" | "HARD"
  capacityPerSlot: number
  meetingPoint: string
  image: string
  itinerary: { time: string; title: string; description: string }[]
  inclusions: string[]
  exclusions: string[]
  whatToBring: string[]
  seoTitle: string
  seoDescription: string
  featured?: boolean
  times: string[]
}

/**
 * Photographs must be served from our own domain.
 *
 * Hot-linking Unsplash looked fine — the URL returns 200 to a browser and to
 * curl — but WhatsApp accepts the send and then silently fails to fetch it, so
 * the customer receives nothing and no error is reported anywhere. Proven by
 * sending the same picture twice: hosted by Unsplash it never arrived, hosted
 * by us it did.
 *
 * scripts/mirror-tour-photos.sh copies remote images into the media store and
 * rewrites the tour to point at our copy.
 */
const img = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=80`

const TOURS: TourSeed[] = [
  {
    slug: "wahiba-sands-desert-safari",
    name: "Wahiba Sands Desert Safari",
    nameAr: "رحلة سفاري رمال وهيبة",
    description:
      "Cross the apricot dunes of the Sharqiya Sands by 4x4, ride the ridges at sunset, and take mint tea with a Bedouin family who have grazed these sands for generations. The dunes run for 180 kilometres and shift colour through the afternoon, from pale gold to deep rust.",
    category: "Desert",
    city: "Muscat",
    location: "Sharqiya (Wahiba) Sands",
    basePrice: 45,
    childPrice: 25,
    durationHours: 10,
    difficulty: "MODERATE",
    capacityPerSlot: 12,
    meetingPoint: "Mutrah Corniche, opposite the fish market",
    image: img("1451337516015-6b6e9a44a8a3"),
    itinerary: [
      { time: "07:00", title: "Hotel pickup", description: "Air-conditioned 4x4 collects you from central Muscat." },
      { time: "09:30", title: "Bidiyah dune briefing", description: "Tyres deflated for the sand, safety briefing, coffee stop." },
      { time: "10:30", title: "Dune bashing", description: "An hour of driving the high ridges with a licensed desert driver." },
      { time: "12:30", title: "Bedouin camp lunch", description: "Omani rice and grilled chicken with a local family." },
      { time: "15:00", title: "Camel ride", description: "A short ride across the flats — optional, and gentle." },
      { time: "17:00", title: "Sunset on the ridge", description: "The best light of the day from the highest nearby dune." },
      { time: "19:30", title: "Return to Muscat", description: "Dropped back at your hotel." },
    ],
    inclusions: ["Hotel pickup and drop-off", "4x4 with licensed desert driver", "Lunch at a Bedouin camp", "Camel ride", "Bottled water throughout"],
    exclusions: ["Personal expenses", "Gratuities", "Travel insurance"],
    whatToBring: ["Sunscreen and sunglasses", "A hat or scarf", "Closed shoes", "A light jacket for the evening"],
    seoTitle: "Wahiba Sands Desert Safari from Muscat | Oman Adventures",
    seoDescription: "Full-day 4x4 desert safari into the Sharqiya Sands with dune bashing, a Bedouin camp lunch, camel riding and sunset. Hotel pickup from Muscat included.",
    featured: true,
    times: ["07:00"],
  },
  {
    slug: "musandam-dhow-cruise-dolphin-watching",
    name: "Musandam Dhow Cruise & Dolphin Watching",
    nameAr: "رحلة بحرية في مسندم ومشاهدة الدلافين",
    description:
      "Sail the fjords of Musandam on a traditional wooden dhow. The cliffs drop straight into water so still it mirrors them, humpback dolphins ride the bow most mornings, and the snorkelling at Telegraph Island is the clearest in the country.",
    category: "Water Sports",
    city: "Khasab",
    location: "Musandam Peninsula",
    basePrice: 32.5,
    childPrice: 18,
    durationHours: 8,
    difficulty: "EASY",
    capacityPerSlot: 20,
    meetingPoint: "Khasab Harbour, dhow jetty",
    image: img("1519046904884-53103b34b206"),
    itinerary: [
      { time: "09:00", title: "Board at Khasab Harbour", description: "Welcome with Omani coffee and dates on deck." },
      { time: "09:30", title: "Into the fjords", description: "Sail Khor Sham past the mountain villages of Sibi and Qanaha." },
      { time: "10:30", title: "Dolphin watching", description: "Humpback and spinner dolphins are seen on most mornings." },
      { time: "12:00", title: "Telegraph Island", description: "Anchor for swimming and snorkelling in sheltered water." },
      { time: "13:00", title: "Lunch on board", description: "Omani buffet served on deck." },
      { time: "16:00", title: "Return to harbour", description: "Back at Khasab jetty." },
    ],
    inclusions: ["Traditional dhow cruise", "Lunch and refreshments", "Snorkelling equipment", "Dolphin watching", "Life jackets"],
    exclusions: ["Transport to Khasab", "Diving equipment", "Gratuities"],
    whatToBring: ["Swimwear and a towel", "Reef-safe sunscreen", "A camera", "A light cover-up"],
    seoTitle: "Musandam Dhow Cruise & Dolphin Watching, Khasab | Oman Adventures",
    seoDescription: "Full-day traditional dhow cruise through the Musandam fjords with dolphin watching, snorkelling at Telegraph Island and lunch on board.",
    featured: true,
    times: ["09:00"],
  },
  {
    slug: "jebel-shams-rim-walk-trek",
    name: "Jebel Shams Rim Walk Trek",
    nameAr: "مسار الحافة في جبل شمس",
    description:
      "The W6 balcony walk traces a ledge cut into the wall of Wadi Ghul, Oman's deepest canyon, ending at the abandoned village of As Sab. The drop is a thousand metres and the path is level most of the way — spectacular rather than strenuous.",
    category: "Mountain",
    city: "Nizwa",
    location: "Jebel Shams, Al Hamra",
    basePrice: 38,
    childPrice: 22,
    durationHours: 9,
    difficulty: "MODERATE",
    capacityPerSlot: 10,
    meetingPoint: "Nizwa Fort car park",
    image: img("1464822759023-fed622ff2c3b"),
    itinerary: [
      { time: "07:30", title: "Depart Nizwa", description: "Drive up through Al Hamra to the Jebel Shams plateau." },
      { time: "09:00", title: "Trailhead briefing", description: "Safety briefing at the Al Khitaym trailhead." },
      { time: "09:30", title: "The balcony walk", description: "Two hours along the canyon ledge with the drop beside you." },
      { time: "11:30", title: "As Sab village", description: "The abandoned terraced village at the end of the path." },
      { time: "13:00", title: "Picnic lunch", description: "Lunch at the rim with the canyon below." },
      { time: "16:30", title: "Return to Nizwa", description: "Back at Nizwa Fort." },
    ],
    inclusions: ["Transport from Nizwa", "Certified mountain guide", "Picnic lunch", "Water and snacks", "First aid kit"],
    exclusions: ["Hotel pickup outside Nizwa", "Personal hiking gear", "Gratuities"],
    whatToBring: ["Sturdy walking shoes", "A hat and sunscreen", "A warm layer — the plateau is cool", "At least two litres of water"],
    seoTitle: "Jebel Shams Rim Walk (W6 Balcony Trek) | Oman Adventures",
    seoDescription: "Guided trek along the W6 balcony walk on Jebel Shams, above Oman's deepest canyon, to the abandoned village of As Sab. Transport and lunch included.",
    times: ["07:30"],
  },
  {
    slug: "muscat-city-highlights-tour",
    name: "Muscat City Highlights Tour",
    nameAr: "جولة معالم مسقط",
    description:
      "Half a day covering the Sultan Qaboos Grand Mosque, the Royal Opera House, the corniche at Mutrah and its souq. A good first day in Oman, and an easy one — most of it is short walks between air-conditioned stops.",
    category: "City Tour",
    city: "Muscat",
    location: "Muscat",
    basePrice: 22,
    childPrice: 12,
    durationHours: 5,
    difficulty: "EASY",
    capacityPerSlot: 15,
    meetingPoint: "Your hotel lobby in Muscat",
    image: img("1580418827493-f2b22c0a76cb"),
    itinerary: [
      { time: "08:30", title: "Hotel pickup", description: "Collected from any central Muscat hotel." },
      { time: "09:00", title: "Sultan Qaboos Grand Mosque", description: "The prayer hall carpet was hand-woven by six hundred weavers." },
      { time: "10:30", title: "Royal Opera House", description: "Exterior and grounds, with interior access when performances allow." },
      { time: "11:30", title: "Mutrah Corniche", description: "The harbour walk, with the forts above." },
      { time: "12:15", title: "Mutrah Souq", description: "Frankincense, silver and textiles in one of the oldest markets in Arabia." },
      { time: "13:30", title: "Return", description: "Dropped back at your hotel." },
    ],
    inclusions: ["Hotel pickup and drop-off", "English-speaking guide", "Air-conditioned vehicle", "Bottled water", "Mosque entry"],
    exclusions: ["Lunch", "Opera House interior tickets", "Souq purchases"],
    whatToBring: ["Modest dress for the mosque — shoulders and knees covered", "A headscarf for women", "Comfortable shoes"],
    seoTitle: "Muscat City Tour — Grand Mosque, Opera House & Mutrah Souq",
    seoDescription: "Half-day guided tour of Muscat covering the Sultan Qaboos Grand Mosque, Royal Opera House, Mutrah Corniche and the souq. Hotel pickup included.",
    times: ["08:30", "14:00"],
  },
  {
    slug: "ras-al-jinz-turtle-watching",
    name: "Ras Al Jinz Turtle Watching",
    nameAr: "مشاهدة السلاحف في رأس الجنز",
    description:
      "Green turtles have nested on this beach for far longer than anyone has watched them. A ranger leads small groups down after dark to see females haul out and lay, and — depending on the month — hatchlings run for the water.",
    category: "Family",
    city: "Sur",
    location: "Ras Al Jinz Turtle Reserve",
    basePrice: 28,
    childPrice: 15,
    durationHours: 4,
    difficulty: "EASY",
    capacityPerSlot: 16,
    meetingPoint: "Ras Al Jinz Scientific Centre reception",
    image: img("1437622368342-7a3d73a34c8f"),
    itinerary: [
      { time: "19:30", title: "Reserve briefing", description: "Conservation briefing at the scientific centre." },
      { time: "20:30", title: "Guided beach walk", description: "Down to the nesting beach with a reserve ranger." },
      { time: "21:00", title: "Nesting turtles", description: "Watching females dig and lay, at a distance that does not disturb them." },
      { time: "22:30", title: "Return", description: "Back at the centre." },
    ],
    inclusions: ["Reserve entry permit", "Licensed ranger guide", "Conservation briefing", "Museum access"],
    exclusions: ["Transport to the reserve", "Accommodation", "Meals"],
    whatToBring: ["Closed shoes for sand", "A light jacket", "A red-filtered torch if you have one — white light disturbs the turtles"],
    seoTitle: "Ras Al Jinz Turtle Watching Tour, Sur | Oman Adventures",
    seoDescription: "Evening ranger-guided turtle watching at the Ras Al Jinz reserve near Sur, where green turtles nest year-round. Permit and briefing included.",
    times: ["19:30"],
  },
  {
    slug: "wadi-shab-swimming-cliff-jumping",
    name: "Wadi Shab Swimming & Cliff Jumping",
    nameAr: "وادي شاب: السباحة والقفز",
    description:
      "A short boat crossing, forty minutes of easy walking between date palms, then three emerald pools. The last one is reached by swimming through a gap in the rock into a cave with a waterfall inside it.",
    category: "Adventure",
    city: "Sur",
    location: "Wadi Shab, Tiwi",
    basePrice: 35,
    childPrice: 20,
    durationHours: 8,
    difficulty: "MODERATE",
    capacityPerSlot: 12,
    meetingPoint: "Wadi Shab car park, Tiwi",
    image: img("1559827260-dc66d52bef19"),
    itinerary: [
      { time: "08:00", title: "Depart Muscat", description: "Coastal drive south along the Quriyat road." },
      { time: "10:00", title: "Boat crossing", description: "A two-minute boat across the wadi mouth." },
      { time: "10:30", title: "Walk to the pools", description: "Forty minutes on a rocky path through plantations." },
      { time: "11:30", title: "Swimming", description: "The three pools, and the swim into the waterfall cave." },
      { time: "13:30", title: "Picnic lunch", description: "Lunch in the shade by the water." },
      { time: "16:00", title: "Return to Muscat", description: "Back at your hotel." },
    ],
    inclusions: ["Transport from Muscat", "Boat crossing", "Guide", "Picnic lunch", "Dry bag"],
    exclusions: ["Personal swimming gear", "Gratuities", "Travel insurance"],
    whatToBring: ["Swimwear worn under your clothes", "Water shoes with grip", "A towel", "A waterproof phone case"],
    seoTitle: "Wadi Shab Tour — Swimming & the Waterfall Cave | Oman Adventures",
    seoDescription: "Day trip from Muscat to Wadi Shab: boat crossing, walk through the palm plantations, and swimming to the hidden waterfall cave. Lunch included.",
    featured: true,
    times: ["08:00"],
  },
  {
    slug: "nizwa-fort-friday-goat-market",
    name: "Nizwa Fort & Friday Goat Market",
    nameAr: "قلعة نزوى وسوق الماشية",
    description:
      "Nizwa's livestock market runs on Friday mornings exactly as it has for centuries: handlers walk goats in a circle while buyers call bids from the edge. Afterwards, the fort's round tower and the silver souq behind it.",
    category: "Cultural",
    city: "Nizwa",
    location: "Nizwa",
    basePrice: 26,
    childPrice: 14,
    durationHours: 7,
    difficulty: "EASY",
    capacityPerSlot: 15,
    meetingPoint: "Your hotel lobby in Muscat",
    image: img("1518623489648-a173ef7824f3"),
    itinerary: [
      { time: "06:30", title: "Early departure", description: "The market is over by nine, so this one starts early." },
      { time: "08:00", title: "Goat market", description: "The auction circle at its busiest." },
      { time: "09:30", title: "Nizwa Fort", description: "The great round tower and its defences." },
      { time: "11:00", title: "Souq", description: "Silver, pottery and halwa in the covered market." },
      { time: "12:30", title: "Lunch", description: "Omani lunch in the old quarter." },
      { time: "15:00", title: "Return to Muscat", description: "Back at your hotel." },
    ],
    inclusions: ["Hotel pickup and drop-off", "Guide", "Fort entry", "Lunch", "Bottled water"],
    exclusions: ["Souq purchases", "Gratuities"],
    whatToBring: ["Modest dress", "A hat", "Cash for the souq"],
    seoTitle: "Nizwa Fort & Friday Goat Market Tour from Muscat",
    seoDescription: "Friday morning tour to Nizwa for the traditional livestock auction, the fort's round tower and the silver souq. Departs early from Muscat.",
    times: ["06:30"],
  },
  {
    slug: "salalah-khareef-waterfalls",
    name: "Salalah Khareef & Waterfalls",
    nameAr: "خريف صلالة والشلالات",
    description:
      "For three months a year the monsoon turns Dhofar green and the escarpment runs with waterfalls. Wadi Darbat fills, Ayn Athum flows, and the whole plateau is under mist — a landscape that looks nothing like the rest of Arabia.",
    category: "Adventure",
    city: "Salalah",
    location: "Dhofar",
    basePrice: 42,
    childPrice: 24,
    durationHours: 8,
    difficulty: "EASY",
    capacityPerSlot: 14,
    meetingPoint: "Your hotel lobby in Salalah",
    image: img("1447752875215-b2761acb3c5d"),
    itinerary: [
      { time: "08:30", title: "Hotel pickup", description: "Collected from central Salalah." },
      { time: "09:30", title: "Wadi Darbat", description: "The waterfalls and the lake above them." },
      { time: "11:30", title: "Ayn Athum", description: "A spring at the foot of the escarpment." },
      { time: "13:00", title: "Lunch", description: "Local lunch with a view over the plain." },
      { time: "15:00", title: "Mughsail blowholes", description: "Sea caves that spout on a rising swell." },
      { time: "16:30", title: "Return", description: "Back at your hotel." },
    ],
    inclusions: ["Hotel pickup and drop-off", "Guide", "Lunch", "All entry fees", "Bottled water"],
    exclusions: ["Flights to Salalah", "Accommodation", "Gratuities"],
    whatToBring: ["A light rain jacket", "Shoes with grip — the rock is wet", "A camera"],
    seoTitle: "Salalah Khareef Tour — Wadi Darbat & Mughsail | Oman Adventures",
    seoDescription: "Monsoon-season day tour of Dhofar: Wadi Darbat waterfalls, Ayn Athum spring and the Mughsail blowholes. Hotel pickup in Salalah included.",
    times: ["08:30"],
  },
  {
    slug: "bimmah-sinkhole-white-beach-snorkel",
    name: "Bimmah Sinkhole & White Beach Snorkel",
    nameAr: "حوية نجم والشاطئ الأبيض",
    description:
      "A limestone sinkhole fifty metres across, filled with water so clear the fish nibble your feet on the steps. Then an hour south to White Beach for snorkelling over reef, with turtles more often than not.",
    category: "Water Sports",
    city: "Muscat",
    location: "Hawiyat Najm Park, Dibab",
    basePrice: 30,
    childPrice: 16,
    durationHours: 7,
    difficulty: "EASY",
    capacityPerSlot: 14,
    meetingPoint: "Your hotel lobby in Muscat",
    image: img("1505228395891-9a51e7e86bf6"),
    itinerary: [
      { time: "08:30", title: "Hotel pickup", description: "Collected from central Muscat." },
      { time: "10:00", title: "Bimmah Sinkhole", description: "Swimming in the sinkhole at Hawiyat Najm Park." },
      { time: "12:00", title: "White Beach", description: "Snorkelling over the reef; turtles are common here." },
      { time: "13:30", title: "Beach lunch", description: "Grilled lunch under shade." },
      { time: "16:00", title: "Return", description: "Back at your hotel." },
    ],
    inclusions: ["Hotel pickup and drop-off", "Snorkelling equipment", "Beach lunch", "Guide", "Towels"],
    exclusions: ["Underwater camera hire", "Gratuities"],
    whatToBring: ["Swimwear", "Reef-safe sunscreen", "A change of clothes"],
    seoTitle: "Bimmah Sinkhole & White Beach Snorkelling Tour from Muscat",
    seoDescription: "Day trip from Muscat to the Bimmah Sinkhole and White Beach for snorkelling over reef, with lunch and equipment included.",
    times: ["08:30"],
  },
  {
    slug: "misfat-al-abriyeen-village-walk",
    name: "Misfat Al Abriyeen Village Walk",
    nameAr: "جولة قرية مسفاة العبريين",
    description:
      "A mud-brick village built onto a cliff above its own date plantation, still irrigated by a falaj channel that has run for a thousand years. The walk goes down through the terraces and back up the old stone lanes.",
    category: "Cultural",
    city: "Al Hamra",
    location: "Misfat Al Abriyeen",
    basePrice: 24,
    childPrice: 13,
    durationHours: 6,
    difficulty: "EASY",
    capacityPerSlot: 12,
    meetingPoint: "Misfat Al Abriyeen village car park",
    image: img("1539650116574-75c0c6d73f6e"),
    itinerary: [
      { time: "09:00", title: "Village briefing", description: "Meeting the guide at the car park." },
      { time: "09:30", title: "The old quarter", description: "Mud-brick houses and the shaded lanes between them." },
      { time: "10:30", title: "Falaj and plantations", description: "Following the water channel down through the date terraces." },
      { time: "12:00", title: "Omani coffee", description: "Coffee and dates at a village guesthouse." },
      { time: "13:30", title: "Finish", description: "Back at the car park." },
    ],
    inclusions: ["Local village guide", "Omani coffee and dates", "Bottled water"],
    exclusions: ["Transport to the village", "Lunch", "Gratuities"],
    whatToBring: ["Modest dress — this is a living village", "Shoes with grip for the terraces", "A hat"],
    seoTitle: "Misfat Al Abriyeen Village & Falaj Walk | Oman Adventures",
    seoDescription: "Guided walk through the mud-brick village of Misfat Al Abriyeen and its thousand-year-old falaj irrigation terraces, with Omani coffee.",
    times: ["09:00", "15:00"],
  },
]

function slugify(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-")
}

async function main() {
  let created = 0
  let updated = 0

  for (const seed of TOURS) {
    const data = {
      name: seed.name,
      nameAr: seed.nameAr,
      description: seed.description,
      category: seed.category,
      city: seed.city,
      location: seed.location,
      basePrice: seed.basePrice,
      childPrice: seed.childPrice,
      durationHours: seed.durationHours,
      difficulty: seed.difficulty,
      capacityPerSlot: seed.capacityPerSlot,
      meetingPoint: seed.meetingPoint,
      status: "ACTIVE",
      featured: seed.featured ?? false,
      currency: "OMR",
      seoTitle: seed.seoTitle,
      seoDescription: seed.seoDescription,
      cancellationPolicy: "Free cancellation up to 24 hours before departure. Inside 24 hours, 50% is retained.",
      // Stored as JSON strings: every reader, including the live customer site,
      // calls JSON.parse on these.
      media: JSON.stringify([{ type: "image", url: seed.image, alt: seed.name }]),
      itinerary: JSON.stringify(seed.itinerary),
      inclusions: JSON.stringify(seed.inclusions),
      exclusions: JSON.stringify(seed.exclusions),
      whatToBring: JSON.stringify(seed.whatToBring),
      pricingTiers: JSON.stringify([]),
    }

    const existing = await db.tour.findFirst({
      where: { OR: [{ slug: seed.slug }, { name: seed.name }] },
    })

    let tourId: string
    if (existing) {
      // Updated rather than replaced: two of these carry live bookings, and an
      // order references its tour.
      await db.tour.update({ where: { id: existing.id }, data })
      tourId = existing.id
      updated++
    } else {
      const tour = await db.tour.create({ data: { ...data, slug: seed.slug || slugify(seed.name) } })
      tourId = tour.id
      created++
    }

    // Eight weeks of departures, skipping any that already exist.
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    for (let day = 1; day <= 56; day++) {
      const date = new Date(today)
      date.setUTCDate(date.getUTCDate() + day)
      for (const startTime of seed.times) {
        const already = await db.slot.findUnique({
          where: { tourId_date_startTime: { tourId, date, startTime } },
        })
        if (already) continue
        await db.slot.create({
          data: { tourId, date, startTime, capacity: seed.capacityPerSlot, seatsBooked: 0, status: "OPEN" },
        })
      }
    }
  }

  const [tours, slots] = await Promise.all([db.tour.count(), db.slot.count()])
  console.log(`created ${created}, updated ${updated} — ${tours} tours, ${slots} departures`)
}

main()
  .catch(error => { console.error(error); process.exit(1) })
  .finally(() => db.$disconnect())
