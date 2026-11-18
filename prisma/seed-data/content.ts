/**
 * Demo locations, reviews and leads. Everything here is FICTIONAL placeholder
 * content (555-01xx phone numbers, example.com emails) flagged is_demo where
 * the schema supports it. Replace before launch.
 */

const week = (open: string | null, close: string | null, sat: [string, string] | null, sun: [string, string] | null) => [
  { day: "Mon", open, close },
  { day: "Tue", open, close },
  { day: "Wed", open, close },
  { day: "Thu", open, close },
  { day: "Fri", open, close },
  { day: "Sat", open: sat?.[0] ?? null, close: sat?.[1] ?? null },
  { day: "Sun", open: sun?.[0] ?? null, close: sun?.[1] ?? null },
];

export const DEMO_LOCATIONS = [
  {
    slug: "austin",
    name: "Prestige Auto Group — Austin",
    address1: "100 Showroom Way",
    city: "Austin",
    state: "TX",
    zip: "78701",
    phone: "(512) 555-0142",
    smsPhone: "(512) 555-0143",
    email: "austin@example.com",
    latitude: 30.2672,
    longitude: -97.7431,
    salesHours: week("09:00", "20:00", ["09:00", "19:00"], ["11:00", "17:00"]),
    serviceHours: week("07:00", "18:00", ["08:00", "15:00"], null),
    isPrimary: true,
    weight: 45,
  },
  {
    slug: "dallas",
    name: "Prestige Auto Group — Dallas",
    address1: "2500 Motorway Blvd",
    city: "Dallas",
    state: "TX",
    zip: "75201",
    phone: "(214) 555-0167",
    smsPhone: "(214) 555-0168",
    email: "dallas@example.com",
    latitude: 32.7767,
    longitude: -96.797,
    salesHours: week("09:00", "21:00", ["09:00", "20:00"], ["12:00", "18:00"]),
    serviceHours: week("07:00", "19:00", ["08:00", "16:00"], null),
    isPrimary: false,
    weight: 35,
  },
  {
    slug: "san-antonio-ev",
    name: "Prestige EV & Hybrid Center — San Antonio",
    address1: "800 Charge Point Ave",
    city: "San Antonio",
    state: "TX",
    zip: "78205",
    phone: "(210) 555-0119",
    smsPhone: "(210) 555-0120",
    email: "ev@example.com",
    latitude: 29.4241,
    longitude: -98.4936,
    salesHours: week("10:00", "19:00", ["10:00", "18:00"], null),
    serviceHours: week("08:00", "17:00", ["09:00", "14:00"], null),
    isPrimary: false,
    weight: 20,
  },
];

export const DEMO_REVIEWS = [
  { author: "Sample Reviewer A.", rating: 5, title: "Painless from start to finish", body: "Placeholder review: the online price matched the paperwork and the whole visit took under two hours." },
  { author: "Sample Reviewer B.", rating: 5, title: "Great EV guidance", body: "Placeholder review: the team explained home charging options and set up the charging app before delivery." },
  { author: "Sample Reviewer C.", rating: 4, title: "Fair trade-in offer", body: "Placeholder review: the trade-in estimate online was close to the final offer after inspection." },
  { author: "Sample Reviewer D.", rating: 5, title: "Home delivery was easy", body: "Placeholder review: signed digitally and the vehicle was delivered to my driveway the next day." },
  { author: "Sample Reviewer E.", rating: 5, title: "No-pressure test drive", body: "Placeholder review: I booked a test drive online and the car was ready and charged when I arrived." },
  { author: "Sample Reviewer F.", rating: 4, title: "Quick service visit", body: "Placeholder review: booked an oil change online, done in under an hour with a clear inspection report." },
];

export const DEMO_LEADS = [
  { type: "CHECK_AVAILABILITY", firstName: "Alex", lastName: "Demo", email: "alex.demo@example.com", phone: "(512) 555-0101", message: "[Demo] Is this vehicle still available this weekend?" },
  { type: "TEST_DRIVE", firstName: "Jordan", lastName: "Sample", email: "jordan.sample@example.com", phone: "(214) 555-0102", message: "[Demo] Saturday morning works best." },
  { type: "PRE_APPROVAL", firstName: "Taylor", lastName: "Placeholder", email: "taylor.placeholder@example.com", phone: "(210) 555-0103", message: "[Demo] Looking for ~$500/mo." },
  { type: "TRADE_IN", firstName: "Morgan", lastName: "Example", email: "morgan.example@example.com", phone: "(512) 555-0104", message: "[Demo] Trading a 2018 sedan with 64k miles." },
  { type: "CONTACT", firstName: "Casey", lastName: "Test", email: "casey.test@example.com", phone: null, message: "[Demo] Do you offer home delivery to Waco?" },
  { type: "SERVICE", firstName: "Riley", lastName: "Demo", email: "riley.demo@example.com", phone: "(214) 555-0106", message: "[Demo] Tire rotation and brake check." },
  { type: "TEXT_US", firstName: "Jamie", lastName: "Sample", email: "jamie.sample@example.com", phone: "(210) 555-0107", message: "[Demo] Can you text me the out-the-door price?" },
  { type: "CHECK_AVAILABILITY", firstName: "Avery", lastName: "Placeholder", email: "avery.placeholder@example.com", phone: "(512) 555-0108", message: "[Demo] Is the white one still in stock?" },
] as const;
