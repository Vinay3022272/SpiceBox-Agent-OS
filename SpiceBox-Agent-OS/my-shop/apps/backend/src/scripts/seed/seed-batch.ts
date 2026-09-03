import { ExecArgs } from "@medusajs/framework/types"
import { createProductsWorkflow } from "@medusajs/medusa/core-flows"
import * as path from "path"
import * as fs from "fs"

type RawProduct = {
  title: string
  handle: string
  subtitle?: string
  description?: string
  category_handles?: string[]
  tags?: string[]
  thumbnail?: string
  images?: string[]
  options?: { title: string; values: string[] }[]
  base_price_inr: number
  base_price_usd: number
  base_price_eur: number
}

export async function seedProductBatch(
  container: any,
  batchFileName: string,
  batchName: string
) {
  console.log(`\n=== SEEDING ${batchName.toUpperCase()} ===`)

  const filePath = path.join(__dirname, "data", batchFileName)
  if (!fs.existsSync(filePath)) {
    throw new Error(`Batch file not found: ${filePath}`)
  }

  const rawProducts: RawProduct[] = JSON.parse(fs.readFileSync(filePath, "utf8"))
  console.log(`Loaded ${rawProducts.length} products from ${batchFileName}`)

  const salesChannelModule = container.resolve("sales_channel")
  const productModule = container.resolve("product")

  const [salesChannel] = await salesChannelModule.listSalesChannels()
  if (!salesChannel) {
    throw new Error("No default sales channel found!")
  }

  // 1. Fetch categories to map handles to IDs
  const allCategories = await productModule.listProductCategories({}, { take: 100 })
  const categoryHandleMap: Record<string, string> = {}
  allCategories.forEach((cat: any) => {
    categoryHandleMap[cat.handle] = cat.id
  })

  // 2. Ensure all unique tags exist and build tag map
  const uniqueTags = Array.from(
    new Set(rawProducts.flatMap((p) => p.tags || []))
  )
  const tagMap: Record<string, string> = {}
  for (const tagValue of uniqueTags) {
    let [existing] = await productModule.listProductTags({ value: tagValue })
    if (!existing) {
      existing = await productModule.createProductTags({ value: tagValue })
    }
    tagMap[tagValue] = existing.id
  }

  // 3. Format products for Medusa createProductsWorkflow
  const formattedProducts = rawProducts.map((p) => {
    const options = p.options || [{ title: "Standard", values: ["Default"] }]
    const opt1 = options[0]
    const opt2 = options[1]

    const variants: any[] = []

    if (opt1 && opt2) {
      for (const val1 of opt1.values) {
        for (const val2 of opt2.values) {
          variants.push({
            title: `${val1} / ${val2}`,
            sku: `${p.handle}-${val1}-${val2}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            options: {
              [opt1.title]: val1,
              [opt2.title]: val2,
            },
            prices: [
              { currency_code: "inr", amount: p.base_price_inr },
              { currency_code: "usd", amount: p.base_price_usd },
              { currency_code: "eur", amount: p.base_price_eur },
            ],
            manage_inventory: false,
            allow_backorder: true,
          })
        }
      }
    } else if (opt1) {
      for (const val1 of opt1.values) {
        variants.push({
          title: val1,
          sku: `${p.handle}-${val1}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          options: {
            [opt1.title]: val1,
          },
          prices: [
            { currency_code: "inr", amount: p.base_price_inr },
            { currency_code: "usd", amount: p.base_price_usd },
            { currency_code: "eur", amount: p.base_price_eur },
          ],
          manage_inventory: false,
          allow_backorder: true,
        })
      }
    }

    const categoryIds = (p.category_handles || [])
      .map((h) => categoryHandleMap[h])
      .filter(Boolean)

    const tagIds = (p.tags || [])
      .map((t) => tagMap[t])
      .filter(Boolean)

    return {
      title: p.title,
      handle: p.handle,
      subtitle: p.subtitle || "",
      description: p.description || "",
      thumbnail: p.thumbnail || "",
      images: (p.images || []).map((url) => ({ url })),
      status: "published" as const,
      options: options.map((opt) => ({
        title: opt.title,
        values: opt.values,
      })),
      variants,
      sales_channels: [{ id: salesChannel.id }],
      category_ids: categoryIds,
      tag_ids: tagIds,
    }
  })

  // 4. Execute in chunks of 10
  const CHUNK_SIZE = 10
  let totalCreated = 0
  for (let i = 0; i < formattedProducts.length; i += CHUNK_SIZE) {
    const chunk = formattedProducts.slice(i, i + CHUNK_SIZE)
    const { result } = await createProductsWorkflow(container).run({
      input: { products: chunk },
    })
    totalCreated += result.length
    console.log(`  ✔ Processed ${totalCreated}/${formattedProducts.length} products...`)
  }

  console.log(`✔ Completed ${batchName}: ${totalCreated} products seeded successfully.`)
}

export default async function seedBatchDirect({ container, args }: ExecArgs) {
  const batchNum = args?.[0] || "1"
  const batchFiles: Record<string, { file: string; name: string }> = {
    "1": { file: "batch-1-men.json", name: "Batch 1: Men's Apparel (55 Products)" },
    "2": { file: "batch-2-women.json", name: "Batch 2: Women's Fashion (55 Products)" },
    "3": { file: "batch-3-kids.json", name: "Batch 3: Kids & Teens (45 Products)" },
    "4": { file: "batch-4-wearables.json", name: "Batch 4: Wearables & Tech (50 Products)" },
    "5": { file: "batch-5-lifestyle.json", name: "Batch 5: Footwear & Lifestyle (45 Products)" },
  }

  const selected = batchFiles[batchNum]
  if (!selected) {
    console.error(`Invalid batch number: ${batchNum}. Available batches: 1, 2, 3, 4, 5`)
    return
  }

  await seedProductBatch(container, selected.file, selected.name)
}
