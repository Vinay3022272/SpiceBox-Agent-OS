import { ExecArgs } from "@medusajs/framework/types"
import cleanDb from "./clean-db"
import setupStore from "./setup-store"
import seedCategories from "./seed-categories"
import { seedProductBatch } from "./seed-batch"
import seedReviews from "./seed-reviews"

export default async function seedAll({ container }: ExecArgs) {
  const startTime = Date.now()

  console.log("==================================================")
  console.log("   SPICEBOX SHOP: MASTER SEEDING PIPELINE")
  console.log("==================================================")

  // Step 1: Clean DB (Preserve Users & Auth)
  await cleanDb({ container, args: [] })

  // Step 2: Configure Store, Sales Channels, Currencies, Regions
  await setupStore({ container, args: [] })

  // Step 3: Seed Category Tree
  await seedCategories({ container, args: [] })

  // Step 4: Seed Batches (250 Products Total)
  await seedProductBatch(container, "batch-1-men.json", "Batch 1: Men's Apparel (55 Products)")
  await seedProductBatch(container, "batch-2-women.json", "Batch 2: Women's Fashion (55 Products)")
  await seedProductBatch(container, "batch-3-kids.json", "Batch 3: Kids & Teens (45 Products)")
  await seedProductBatch(container, "batch-4-wearables.json", "Batch 4: Wearables & Tech (50 Products)")
  await seedProductBatch(container, "batch-5-lifestyle.json", "Batch 5: Footwear & Lifestyle (45 Products)")

  // Step 5: Seed Verified Reviews
  await seedReviews({ container, args: [] })

  const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log("==================================================")
  console.log(`🎉 ALL 5 BATCHES & STORE SETUP COMPLETE IN ${elapsedSeconds}s!`)
  console.log("==================================================")
}
