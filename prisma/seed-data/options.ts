/** Option vocabularies for demo inventory generation. */

export type Paint = { name: string; hex: string; weight: number };

export const EXTERIOR_COLORS: Paint[] = [
  { name: "Summit White", hex: "#f2f2ef", weight: 9 },
  { name: "Pearl White Tricoat", hex: "#eceae4", weight: 8 },
  { name: "Glacier White", hex: "#f0f1ee", weight: 7 },
  { name: "Midnight Black Metallic", hex: "#121315", weight: 9 },
  { name: "Jet Black", hex: "#0e0f11", weight: 7 },
  { name: "Obsidian Black Pearl", hex: "#16171b", weight: 4 },
  { name: "Magnetic Gray Metallic", hex: "#5c6166", weight: 7 },
  { name: "Carbonized Gray", hex: "#4a4c50", weight: 5 },
  { name: "Graphite Metallic", hex: "#3f4347", weight: 4 },
  { name: "Lunar Rock", hex: "#a3a39b", weight: 3 },
  { name: "Celestial Silver Metallic", hex: "#b5b8bc", weight: 6 },
  { name: "Iconic Silver", hex: "#b9bcbf", weight: 4 },
  { name: "Deep Ocean Blue", hex: "#1f3a68", weight: 4 },
  { name: "Velocity Blue", hex: "#1d58a6", weight: 3 },
  { name: "Atlas Blue Metallic", hex: "#2d4a6e", weight: 3 },
  { name: "Ruby Flare Pearl", hex: "#8c1620", weight: 3 },
  { name: "Rapid Red Metallic", hex: "#9d1b1b", weight: 3 },
  { name: "Soul Red Crystal", hex: "#9a0f1b", weight: 2 },
  { name: "Forest Green Metallic", hex: "#2f4a35", weight: 1 },
  { name: "Army Green", hex: "#4a5340", weight: 1 },
  { name: "Desert Sand", hex: "#c9b48f", weight: 1 },
  { name: "Bronze Oxide", hex: "#6e5236", weight: 1 },
  { name: "Sunset Orange", hex: "#c4561d", weight: 1 },
  { name: "Champagne Gold", hex: "#c6ad7f", weight: 1 },
];

export const INTERIOR_COLORS: Paint[] = [
  { name: "Black", hex: "#111111", weight: 30 },
  { name: "Jet Black", hex: "#0e0f11", weight: 12 },
  { name: "Ebony", hex: "#1a1a1a", weight: 8 },
  { name: "Graphite", hex: "#3f4347", weight: 10 },
  { name: "Light Gray", hex: "#c8cbd0", weight: 8 },
  { name: "Macchiato Beige", hex: "#d8c7a8", weight: 8 },
  { name: "Saddle Tan", hex: "#a8743f", weight: 6 },
  { name: "Cognac", hex: "#8a4b22", weight: 5 },
  { name: "Ivory White", hex: "#efe9dc", weight: 3 },
  { name: "Red", hex: "#8c1620", weight: 2 },
];

export const COMMON_FEATURES = [
  "Apple CarPlay",
  "Android Auto",
  "Bluetooth",
  "Backup Camera",
  "Keyless Entry",
  "Push-Button Start",
  "USB-C Ports",
  "Dual-Zone Climate Control",
  "LED Headlights",
  "Alloy Wheels",
  "Satellite Radio",
];

export const UPSCALE_FEATURES = [
  "Heated Seats",
  "Leather Seats",
  "Sunroof / Moonroof",
  "Navigation",
  "Remote Start",
  "Wireless Charging",
  "Power Liftgate",
  "Adaptive Cruise Control",
  "Heated Steering Wheel",
  "Memory Seats",
  "Ambient Lighting",
  "Digital Instrument Cluster",
];

export const LUXURY_FEATURES = [
  "Ventilated Seats",
  "Panoramic Roof",
  "Premium Audio",
  "Head-Up Display",
  "360° Camera",
  "Massaging Seats",
  "Soft-Close Doors",
  "Adaptive Suspension",
];

export const TAG_FEATURES: Record<string, string[]> = {
  tow: ["Tow Package", "Trailer Hitch", "Trailer Brake Controller", "Bed Liner"],
  offroad: ["Skid Plates", "All-Terrain Tires", "Off-Road Package", "Locking Differential", "Hill Descent Control"],
  threeRow: ["Third-Row Seating", "Captain's Chairs", "Tri-Zone Climate Control"],
  perf: ["Sport Suspension", "Performance Brakes", "Limited-Slip Differential", "Launch Control", "Sport Exhaust"],
  work: ["Cargo Partition", "Upfit Switches", "Spray-In Bedliner"],
  family: ["Rear Seat Reminder", "Rear Sunshades", "Rear USB Ports"],
};

export const EV_FEATURES = [
  "DC Fast Charging",
  "Heat Pump",
  "Mobile Charging Cable",
  "Over-the-Air Updates",
  "One-Pedal Driving",
  "Battery Preconditioning",
  "Vehicle-to-Load (V2L)",
];

export const VAN_FEATURES = ["Power Sliding Doors", "Rear Entertainment System", "Rear Climate Control"];

export const SAFETY_FEATURES = [
  "Automatic Emergency Braking",
  "Forward Collision Warning",
  "Lane Departure Warning",
  "Lane Keeping Assist",
  "Blind Spot Monitoring",
  "Rear Cross-Traffic Alert",
  "Pedestrian Detection",
  "Automatic High Beams",
  "Driver Attention Monitor",
  "Rear Automatic Braking",
  "Parking Sensors",
  "Traffic Sign Recognition",
  "Tire Pressure Monitoring",
  "Front, Side & Curtain Airbags",
  "Stability Control",
  "Hill Start Assist",
];
