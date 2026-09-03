const fs = require("fs")
const path = require("path")

const dataDir = path.join(__dirname, "data")

// 1. Categories Tree
const categories = [
  // Parent Men
  { name: "Men", handle: "men", description: "Men's contemporary apparel and daily essentials" },
  { name: "Men's Tops", handle: "men-tops", parent: "men" },
  { name: "Men's T-Shirts", handle: "men-t-shirts", parent: "men-tops" },
  { name: "Men's Shirts", handle: "men-shirts", parent: "men-tops" },
  { name: "Men's Hoodies & Sweaters", handle: "men-hoodies", parent: "men-tops" },
  { name: "Men's Jackets", handle: "men-jackets", parent: "men-tops" },
  { name: "Men's Bottoms", handle: "men-bottoms", parent: "men" },
  { name: "Men's Jeans", handle: "men-jeans", parent: "men-bottoms" },
  { name: "Men's Trousers & Chinos", handle: "men-chinos", parent: "men-bottoms" },
  { name: "Men's Shorts", handle: "men-shorts", parent: "men-bottoms" },
  { name: "Men's Activewear", handle: "men-activewear", parent: "men" },

  // Parent Women
  { name: "Women", handle: "women", description: "Women's modern fashion, dresses, and timeless staples" },
  { name: "Women's Dresses", handle: "women-dresses", parent: "women" },
  { name: "Women's Tops", handle: "women-tops", parent: "women" },
  { name: "Women's T-Shirts & Tees", handle: "women-tees", parent: "women-tops" },
  { name: "Women's Blouses & Shirts", handle: "women-blouses", parent: "women-tops" },
  { name: "Women's Knitwear & Sweaters", handle: "women-knitwear", parent: "women-tops" },
  { name: "Women's Jackets & Outerwear", handle: "women-jackets", parent: "women-tops" },
  { name: "Women's Bottoms", handle: "women-bottoms", parent: "women" },
  { name: "Women's Jeans", handle: "women-jeans", parent: "women-bottoms" },
  { name: "Women's Trousers & Pants", handle: "women-trousers", parent: "women-bottoms" },
  { name: "Women's Skirts", handle: "women-skirts", parent: "women-bottoms" },
  { name: "Women's Activewear", handle: "women-activewear", parent: "women" },

  // Parent Kids
  { name: "Kids & Teens", handle: "kids", description: "Comfortable, durable clothing designed for everyday play" },
  { name: "Baby & Toddler", handle: "kids-baby", parent: "kids" },
  { name: "Boys' Collection", handle: "kids-boys", parent: "kids" },
  { name: "Girls' Collection", handle: "kids-girls", parent: "kids" },

  // Parent Wearables & Tech
  { name: "Wearables & Tech", handle: "wearables", description: "Next-gen smart wearables, fitness trackers, and modern eyewear" },
  { name: "Smartwatches", handle: "smartwatches", parent: "wearables" },
  { name: "Fitness Bands", handle: "fitness-bands", parent: "wearables" },
  { name: "Eyewear & Sunglasses", handle: "eyewear", parent: "wearables" },
  { name: "Headwear & Caps", handle: "headwear", parent: "wearables" },

  // Parent Footwear & Lifestyle
  { name: "Footwear & Lifestyle", handle: "lifestyle", description: "Minimalist sneakers, daily commuter bags, and leather accessories" },
  { name: "Sneakers & Footwear", handle: "sneakers", parent: "lifestyle" },
  { name: "Bags & Backpacks", handle: "bags", parent: "lifestyle" },
  { name: "Accessories", handle: "accessories", parent: "lifestyle" }
]

fs.writeFileSync(path.join(dataDir, "categories.json"), JSON.stringify(categories, null, 2))

// Curated Unsplash CDN image pools
const IMAGES = {
  menTee: [
    "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&auto=format&fit=crop&q=80"
  ],
  menShirt: [
    "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&auto=format&fit=crop&q=80"
  ],
  menHoodie: [
    "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?w=800&auto=format&fit=crop&q=80"
  ],
  menJacket: [
    "https://images.unsplash.com/photo-1548883354-7622d03aca27?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1495105787522-5334e3ffa0ef?w=800&auto=format&fit=crop&q=80"
  ],
  menBottoms: [
    "https://images.unsplash.com/photo-1542272604-780c96856592?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1517445312882-bc9910d016b7?w=800&auto=format&fit=crop&q=80"
  ],
  womenDress: [
    "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800&auto=format&fit=crop&q=80"
  ],
  womenTop: [
    "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1534126511673-b6899657816a?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=800&auto=format&fit=crop&q=80"
  ],
  womenBottoms: [
    "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1584370848010-d7fe6bc767ec?w=800&auto=format&fit=crop&q=80"
  ],
  kids: [
    "https://images.unsplash.com/photo-1519689680058-324335c77eba?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?w=800&auto=format&fit=crop&q=80"
  ],
  smartwatch: [
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&auto=format&fit=crop&q=80"
  ],
  eyewear: [
    "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&auto=format&fit=crop&q=80"
  ],
  headwear: [
    "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=800&auto=format&fit=crop&q=80"
  ],
  sneakers: [
    "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&auto=format&fit=crop&q=80"
  ],
  bags: [
    "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&auto=format&fit=crop&q=80"
  ]
}

function randItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

// BATCH 1: MEN (55 Products)
const batch1Men = []
const menTeeAdjectives = ["Oversized", "Heavyweight", "Vintage Washed", "Organic Cotton", "Raw Hem", "Boxy Fit", "Classic Crew", "Drop Shoulder", "Brushed Cotton", "Everyday Soft"]
const menTeeColors = [
  ["Onyx Black", "Optic White", "Heather Grey"],
  ["Dusty Olive", "Washed Clay", "Charcoal"],
  ["Midnight Navy", "Bone Ivory", "Forest Green"],
  ["Mocha Brown", "Sage", "Smoky Black"]
]

// 20 T-shirts
for (let i = 1; i <= 20; i++) {
  const adj = menTeeAdjectives[(i - 1) % menTeeAdjectives.length]
  const colors = menTeeColors[(i - 1) % menTeeColors.length]
  const title = `Men's ${adj} Essential Tee ${i > 10 ? `Edition ${i}` : ""}`.trim()
  const handle = `mens-${adj.toLowerCase().replace(/\s+/g, "-")}-tee-${i}`
  batch1Men.push({
    title,
    handle,
    subtitle: "240 GSM combed cotton with relaxed daily drape",
    description: `Engineered for everyday durability. This ${adj.toLowerCase()} tee is cut from premium organic cotton, pre-shrunk, and finished with double-needle ribbed collar.`,
    category_handles: ["men-t-shirts", "men-tops", "men"],
    tags: ["Men", "Tops", "Essentials", "T-Shirt"],
    thumbnail: randItem(IMAGES.menTee),
    images: [randItem(IMAGES.menTee), randItem(IMAGES.menTee)],
    options: [
      { title: "Size", values: ["S", "M", "L", "XL"] },
      { title: "Color", values: colors }
    ],
    base_price_inr: 999 + ((i * 100) % 800),
    base_price_usd: 18 + ((i * 2) % 15),
    base_price_eur: 16 + ((i * 2) % 14)
  })
}

// 12 Shirts
const shirtStyles = ["Oxford Button-Down", "Linen Resort Shirt", "Utility Overshirt", "Flannel Plaid Shirt", "Grandad Collar Shirt", "Textured Camp Collar"]
for (let i = 1; i <= 12; i++) {
  const style = shirtStyles[(i - 1) % shirtStyles.length]
  const title = `Men's ${style} ${i > 6 ? `Vol. ${i}` : ""}`.trim()
  const handle = `mens-${style.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${i}`
  batch1Men.push({
    title,
    handle,
    subtitle: "Breathable tailored silhouette for work and weekends",
    description: `A versatile staple tailored with precision. Crafted from lightweight breathable fabric with mother-of-pearl buttons and clean seams.`,
    category_handles: ["men-shirts", "men-tops", "men"],
    tags: ["Men", "Shirts", "Smart Casual"],
    thumbnail: randItem(IMAGES.menShirt),
    images: [randItem(IMAGES.menShirt), randItem(IMAGES.menShirt)],
    options: [
      { title: "Size", values: ["S", "M", "L", "XL"] },
      { title: "Color", values: ["Sky Blue", "White", "Navy"] }
    ],
    base_price_inr: 1899 + ((i * 150) % 900),
    base_price_usd: 35 + ((i * 3) % 20),
    base_price_eur: 32 + ((i * 3) % 18)
  })
}

// 8 Hoodies & Jackets
for (let i = 1; i <= 8; i++) {
  const isJacket = i % 2 === 0
  const title = isJacket ? `Men's Commuter Harrington Jacket ${i}` : `Men's French Terry Fleece Hoodie ${i}`
  const handle = `mens-${isJacket ? "harrington-jacket" : "fleece-hoodie"}-${i}`
  batch1Men.push({
    title,
    handle,
    subtitle: isJacket ? "Weather-resistant minimalist outerwear" : "420 GSM ultra-dense loopback French terry",
    description: "Built to withstand season transitions. Features heavy-duty YKK hardware, concealed pockets, and ribbed cuffs.",
    category_handles: [isJacket ? "men-jackets" : "men-hoodies", "men-tops", "men"],
    tags: ["Men", "Outerwear", "Winter"],
    thumbnail: isJacket ? randItem(IMAGES.menJacket) : randItem(IMAGES.menHoodie),
    images: [isJacket ? randItem(IMAGES.menJacket) : randItem(IMAGES.menHoodie)],
    options: [
      { title: "Size", values: ["M", "L", "XL"] },
      { title: "Color", values: ["Charcoal", "Deep Olive", "Black"] }
    ],
    base_price_inr: 2999 + ((i * 300) % 1200),
    base_price_usd: 55 + ((i * 5) % 25),
    base_price_eur: 50 + ((i * 5) % 22)
  })
}

// 15 Bottoms (Jeans, Chinos, Shorts)
for (let i = 1; i <= 15; i++) {
  let subCat = "men-jeans"
  let kind = "Selvedge Denim Jeans"
  if (i > 5 && i <= 10) { subCat = "men-chinos"; kind = "Pleated Cotton Chino" }
  if (i > 10) { subCat = "men-shorts"; kind = "Drawstring Leisure Shorts" }

  const title = `Men's ${kind} No. ${i}`
  const handle = `mens-${kind.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${i}`
  batch1Men.push({
    title,
    handle,
    subtitle: "Ergonomic fit with 2% comfort stretch",
    description: "Tailored for all-day mobility. Features reinforced stress points, custom metal rivets, and deep pockets.",
    category_handles: [subCat, "men-bottoms", "men"],
    tags: ["Men", "Bottoms", "Pants"],
    thumbnail: randItem(IMAGES.menBottoms),
    images: [randItem(IMAGES.menBottoms)],
    options: [
      { title: "Waist", values: ["30", "32", "34", "36"] },
      { title: "Color", values: ["Indigo", "Washed Black", "Khaki"] }
    ],
    base_price_inr: 2199 + ((i * 120) % 800),
    base_price_usd: 40 + ((i * 2) % 18),
    base_price_eur: 38 + ((i * 2) % 16)
  })
}

fs.writeFileSync(path.join(dataDir, "batch-1-men.json"), JSON.stringify(batch1Men, null, 2))

// BATCH 2: WOMEN (55 Products)
const batch2Women = []
// 15 Dresses
const dressStyles = ["Ribbed Knit Midi Dress", "Floral Linen Sundress", "Wrap Slip Dress", "Tiered Maxi Dress", "Satin Cocktail Dress", "Smocked A-Line Dress"]
for (let i = 1; i <= 15; i++) {
  const style = dressStyles[(i - 1) % dressStyles.length]
  const title = `Women's ${style} ${i > 6 ? `Series ${i}` : ""}`.trim()
  const handle = `womens-${style.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${i}`
  batch2Women.push({
    title,
    handle,
    subtitle: "Fluid drape crafted from sustainably sourced fibers",
    description: "Effortlessly elegant. Cut with flattering proportions and breathable texture, perfect for both daytime gatherings and evening dinners.",
    category_handles: ["women-dresses", "women"],
    tags: ["Women", "Dresses", "Summer", "Bestseller"],
    thumbnail: randItem(IMAGES.womenDress),
    images: [randItem(IMAGES.womenDress), randItem(IMAGES.womenDress)],
    options: [
      { title: "Size", values: ["XS", "S", "M", "L"] },
      { title: "Color", values: ["Dusty Rose", "Sage Green", "Black"] }
    ],
    base_price_inr: 2499 + ((i * 200) % 1500),
    base_price_usd: 45 + ((i * 4) % 25),
    base_price_eur: 42 + ((i * 4) % 22)
  })
}

// 20 Tops & Blouses
const womenTopStyles = ["Square-Neck Ribbed Top", "Oversized Cotton Boyfriend Tee", "Cropped Linen Blouse", "Silk Blend Satin Shirt", "Mock-Neck Longsleeve", "Waffle Knit Henley"]
for (let i = 1; i <= 20; i++) {
  const style = womenTopStyles[(i - 1) % womenTopStyles.length]
  const title = `Women's ${style} ${i > 6 ? `Edition ${i}` : ""}`.trim()
  const handle = `womens-${style.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${i}`
  batch2Women.push({
    title,
    handle,
    subtitle: "Ultra-soft micro-modal touch with contour fit",
    description: "A chic basic that layers seamlessly. Breathable, stretchy, and holds its silhouette wash after wash.",
    category_handles: ["women-tees", "women-tops", "women"],
    tags: ["Women", "Tops", "Essentials"],
    thumbnail: randItem(IMAGES.womenTop),
    images: [randItem(IMAGES.womenTop)],
    options: [
      { title: "Size", values: ["XS", "S", "M", "L"] },
      { title: "Color", values: ["Cream", "Espresso", "Black"] }
    ],
    base_price_inr: 1299 + ((i * 100) % 800),
    base_price_usd: 24 + ((i * 2) % 14),
    base_price_eur: 22 + ((i * 2) % 12)
  })
}

// 20 Bottoms (Jeans, Wide-Leg, Activewear)
for (let i = 1; i <= 20; i++) {
  const isJeans = i <= 8
  const isPants = i > 8 && i <= 14
  const kind = isJeans ? "High-Waist Wide Leg Jeans" : isPants ? "Pleated Linen Palazzo Trousers" : "Seamless Performance Biker Tights"
  const cat = isJeans ? "women-jeans" : isPants ? "women-trousers" : "women-activewear"
  const title = `Women's ${kind} ${i}`
  const handle = `womens-${kind.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${i}`
  batch2Women.push({
    title,
    handle,
    subtitle: "Designed for sculpt, comfort, and zero restriction",
    description: "Flattering high-rise cut with premium textile structure. Engineered for maximum versatility throughout your day.",
    category_handles: [cat, "women-bottoms", "women"],
    tags: ["Women", "Bottoms", "Trending"],
    thumbnail: randItem(IMAGES.womenBottoms),
    images: [randItem(IMAGES.womenBottoms)],
    options: [
      { title: "Size", values: ["26", "28", "30", "32"] },
      { title: "Color", values: ["Light Vintage Wash", "Raw Indigo", "Charcoal"] }
    ],
    base_price_inr: 2299 + ((i * 140) % 900),
    base_price_usd: 39 + ((i * 3) % 20),
    base_price_eur: 36 + ((i * 3) % 18)
  })
}

fs.writeFileSync(path.join(dataDir, "batch-2-women.json"), JSON.stringify(batch2Women, null, 2))

// BATCH 3: KIDS (45 Products)
const batch3Kids = []
const kidsItems = [
  { name: "Organic Cotton Baby Romper", cat: "kids-baby", tag: "Baby" },
  { name: "Everyday Toddler Bodysuit 3-Pack", cat: "kids-baby", tag: "Baby" },
  { name: "Kids Graphic Dino Tee", cat: "kids-boys", tag: "Boys" },
  { name: "Kids Stretch Denim Overalls", cat: "kids-boys", tag: "Boys" },
  { name: "Boys Cargo Fleece Joggers", cat: "kids-boys", tag: "Boys" },
  { name: "Boys Colorblock Zip Hoodie", cat: "kids-boys", tag: "Boys" },
  { name: "Girls Floral Chiffon Party Frock", cat: "kids-girls", tag: "Girls" },
  { name: "Girls Soft Ribbed Cardigan", cat: "kids-girls", tag: "Girls" },
  { name: "Kids Cotton Pajama Set", cat: "kids-baby", tag: "Baby" }
]

for (let i = 1; i <= 45; i++) {
  const tmpl = kidsItems[(i - 1) % kidsItems.length]
  const title = `${tmpl.name} #${i}`
  const handle = `kids-${tmpl.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${i}`
  batch3Kids.push({
    title,
    handle,
    subtitle: "Hypoallergenic, tagless comfort for sensitive skin",
    description: "Safe for kids, tough on play. Made with OEKO-TEX certified cotton, snap buttons, and stretchy flatlock seams.",
    category_handles: [tmpl.cat, "kids"],
    tags: ["Kids", tmpl.tag, "Cotton"],
    thumbnail: randItem(IMAGES.kids),
    images: [randItem(IMAGES.kids)],
    options: [
      { title: "Age", values: ["2-3Y", "4-5Y", "6-7Y", "8-9Y"] },
      { title: "Color", values: ["Pastel Blue", "Sunny Yellow", "Coral Pink"] }
    ],
    base_price_inr: 799 + ((i * 80) % 500),
    base_price_usd: 15 + ((i * 2) % 10),
    base_price_eur: 14 + ((i * 2) % 9)
  })
}

fs.writeFileSync(path.join(dataDir, "batch-3-kids.json"), JSON.stringify(batch3Kids, null, 2))

// BATCH 4: WEARABLES & TECH (50 Products)
const batch4Wearables = []
// 15 Smartwatches
const watchModels = ["Pro Ultra AMOLED Smartwatch", "Active Pulse GPS Watch", "Titanium Rugged Sports Watch", "Slim Fit Elegance Smartwatch", "Explorer Multi-Sport Watch"]
for (let i = 1; i <= 15; i++) {
  const model = watchModels[(i - 1) % watchModels.length]
  const title = `Apex ${model} Gen ${i}`
  const handle = `apex-${model.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${i}`
  batch4Wearables.push({
    title,
    handle,
    subtitle: "1.43” Always-on AMOLED display with 14-day battery life",
    description: "Track biometrics with surgical accuracy. Features continuous heart rate, SpO2, sleep scoring, IP68 water resistance, and 100+ workout modes.",
    category_handles: ["smartwatches", "wearables"],
    tags: ["Wearables", "Tech", "Smartwatch", "Waterproof"],
    thumbnail: randItem(IMAGES.smartwatch),
    images: [randItem(IMAGES.smartwatch), randItem(IMAGES.smartwatch)],
    options: [
      { title: "Case Finish", values: ["Midnight Black", "Space Silver", "Titanium Grey"] },
      { title: "Band", values: ["Silicone Strap", "Leather Band"] }
    ],
    base_price_inr: 4999 + ((i * 500) % 3000),
    base_price_usd: 79 + ((i * 8) % 40),
    base_price_eur: 75 + ((i * 8) % 35)
  })
}

// 12 Fitness Bands
for (let i = 1; i <= 12; i++) {
  const title = `PulseTrack Band S${i} Slim Fitness Tracker`
  const handle = `pulsetrack-band-s${i}`
  batch4Wearables.push({
    title,
    handle,
    subtitle: "Ultra-lightweight 18g daily health tracker",
    description: "Minimalist wrist tracker that monitors steps, calories, sleep cycles, and daily heart rate with vibrating silent haptic alarms.",
    category_handles: ["fitness-bands", "wearables"],
    tags: ["Wearables", "Fitness", "Health"],
    thumbnail: randItem(IMAGES.smartwatch),
    images: [randItem(IMAGES.smartwatch)],
    options: [
      { title: "Strap Color", values: ["Matte Black", "Ocean Blue", "Crimson Red"] }
    ],
    base_price_inr: 1999 + ((i * 120) % 800),
    base_price_usd: 29 + ((i * 3) % 15),
    base_price_eur: 27 + ((i * 3) % 14)
  })
}

// 12 Eyewear & Sunglasses
const glassesStyles = ["Polarized Aviator Sunglasses", "Classic Matte Wayfarers", "Round Vintage Tortoise Sunnies", "Blue-Light Computer Glasses", "Rimless Minimalist Frames"]
for (let i = 1; i <= 12; i++) {
  const style = glassesStyles[(i - 1) % glassesStyles.length]
  const title = `Spectra ${style} Series ${i}`
  const handle = `spectra-${style.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${i}`
  batch4Wearables.push({
    title,
    handle,
    subtitle: "UV400 Category 3 polarized optical lenses",
    description: "Crafted with lightweight Italian acetate and durable stainless steel barrel hinges. Protects eyes with crisp contrast clarity.",
    category_handles: ["eyewear", "wearables"],
    tags: ["Wearables", "Eyewear", "Accessories", "UV Protection"],
    thumbnail: randItem(IMAGES.eyewear),
    images: [randItem(IMAGES.eyewear)],
    options: [
      { title: "Frame Color", values: ["Matte Black", "Havana Tortoise", "Gunmetal"] }
    ],
    base_price_inr: 1499 + ((i * 150) % 1000),
    base_price_usd: 29 + ((i * 2) % 15),
    base_price_eur: 26 + ((i * 2) % 14)
  })
}

// 11 Headwear & Caps
const capStyles = ["Structured 6-Panel Snapback", "Unstructured Cotton Dad Cap", "Ribbed Merino Wool Beanie", "Water-Repellent Bucket Hat"]
for (let i = 1; i <= 11; i++) {
  const style = capStyles[(i - 1) % capStyles.length]
  const title = `Apex ${style} V${i}`
  const handle = `apex-${style.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${i}`
  batch4Wearables.push({
    title,
    handle,
    subtitle: "Comfortable sweatband with breathable brass eyelets",
    description: "Timeless headwear designed for everyday shade and streetwear pairing. Adjustable metal buckle fits all head sizes.",
    category_handles: ["headwear", "wearables"],
    tags: ["Wearables", "Headwear", "Caps", "Streetwear"],
    thumbnail: randItem(IMAGES.headwear),
    images: [randItem(IMAGES.headwear)],
    options: [
      { title: "Color", values: ["Washed Olive", "Black", "Sand Beige"] }
    ],
    base_price_inr: 899 + ((i * 90) % 500),
    base_price_usd: 19 + ((i * 2) % 10),
    base_price_eur: 17 + ((i * 2) % 9)
  })
}

fs.writeFileSync(path.join(dataDir, "batch-4-wearables.json"), JSON.stringify(batch4Wearables, null, 2))

// BATCH 5: FOOTWEAR & LIFESTYLE (45 Products)
const batch5Lifestyle = []
// 20 Sneakers & Footwear
const sneakerModels = ["Court Minimalist Leather Sneaker", "Retro High-Top Basketball Sneaker", "Breathable Knit Running Trainer", "Suede Skate Cupsole Sneaker", "Everyday Foam Slide"]
for (let i = 1; i <= 20; i++) {
  const model = sneakerModels[(i - 1) % sneakerModels.length]
  const title = `Stride ${model} Edition ${i}`
  const handle = `stride-${model.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${i}`
  batch5Lifestyle.push({
    title,
    handle,
    subtitle: "Cushioned memory foam insole with vulcanized rubber grip",
    description: "Combines timeless athletic silhouette with orthopedic daily comfort. Hand-finished leather and breathable perforated toe-box.",
    category_handles: ["sneakers", "lifestyle"],
    tags: ["Footwear", "Sneakers", "Lifestyle", "Bestseller"],
    thumbnail: randItem(IMAGES.sneakers),
    images: [randItem(IMAGES.sneakers), randItem(IMAGES.sneakers)],
    options: [
      { title: "Size (EU)", values: ["40", "41", "42", "43", "44"] },
      { title: "Color", values: ["Triple White", "Black / Gum", "Navy / Grey"] }
    ],
    base_price_inr: 3499 + ((i * 250) % 2000),
    base_price_usd: 65 + ((i * 5) % 30),
    base_price_eur: 60 + ((i * 5) % 28)
  })
}

// 15 Bags & Backpacks
const bagStyles = ["Waterproof 25L Commuter Backpack", "Heavyweight Waxed Canvas Tote", "Minimalist Tech Crossbody Sling", "Weekend Leather Duffle Bag"]
for (let i = 1; i <= 15; i++) {
  const style = bagStyles[(i - 1) % bagStyles.length]
  const title = `Nomad ${style} Mk.${i}`
  const handle = `nomad-${style.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${i}`
  batch5Lifestyle.push({
    title,
    handle,
    subtitle: "Dedicated 16” padded laptop compartment and weatherproofing",
    description: "Engineered for city travel. YKK Aquaguard zips, ergonomic shoulder straps, and modular interior organizers.",
    category_handles: ["bags", "lifestyle"],
    tags: ["Bags", "Travel", "Lifestyle", "Waterproof"],
    thumbnail: randItem(IMAGES.bags),
    images: [randItem(IMAGES.bags)],
    options: [
      { title: "Color", values: ["Matte Black", "Forest Moss", "Desert Tan"] }
    ],
    base_price_inr: 2999 + ((i * 200) % 1500),
    base_price_usd: 55 + ((i * 4) % 25),
    base_price_eur: 50 + ((i * 4) % 22)
  })
}

// 10 Everyday Accessories
const accessoryItems = ["Full-Grain Leather Cardholder", "Braided Paracord Key Lanyard", "Matte Stainless Steel Water Bottle 750ml", "Leather Travel Tech Organizer"]
for (let i = 1; i <= 10; i++) {
  const style = accessoryItems[(i - 1) % accessoryItems.length]
  const title = `Nomad ${style} ${i}`
  const handle = `nomad-${style.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${i}`
  batch5Lifestyle.push({
    title,
    handle,
    subtitle: "Precision crafted for everyday carry",
    description: "Minimalist EDC accessory built from durable materials to organize your daily essentials.",
    category_handles: ["accessories", "lifestyle"],
    tags: ["Accessories", "EDC", "Lifestyle"],
    thumbnail: randItem(IMAGES.bags),
    images: [randItem(IMAGES.bags)],
    options: [
      { title: "Finish", values: ["Classic Tan", "Charcoal Black"] }
    ],
    base_price_inr: 899 + ((i * 90) % 500),
    base_price_usd: 19 + ((i * 2) % 10),
    base_price_eur: 17 + ((i * 2) % 9)
  })
}

fs.writeFileSync(path.join(dataDir, "batch-5-lifestyle.json"), JSON.stringify(batch5Lifestyle, null, 2))

console.log("SUCCESS! Generated dataset:")
console.log("- Categories:", categories.length)
console.log("- Batch 1 (Men):", batch1Men.length)
console.log("- Batch 2 (Women):", batch2Women.length)
console.log("- Batch 3 (Kids):", batch3Kids.length)
console.log("- Batch 4 (Wearables):", batch4Wearables.length)
console.log("- Batch 5 (Lifestyle):", batch5Lifestyle.length)
console.log("- Total Products:", batch1Men.length + batch2Women.length + batch3Kids.length + batch4Wearables.length + batch5Lifestyle.length)
