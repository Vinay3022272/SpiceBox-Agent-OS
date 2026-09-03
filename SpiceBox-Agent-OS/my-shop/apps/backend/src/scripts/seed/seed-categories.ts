import { ExecArgs } from "@medusajs/framework/types"
import * as path from "path"
import * as fs from "fs"

type CategoryDef = {
  name: string
  handle: string
  description?: string
  parent?: string
}

export default async function seedCategories({ container }: ExecArgs) {
  console.log("--------------------------------------------------")
  console.log("SEEDING CATEGORIES HIERARCHY")
  console.log("--------------------------------------------------")

  const productModule = container.resolve("product")
  const categoriesPath = path.join(__dirname, "data", "categories.json")
  const categories: CategoryDef[] = JSON.parse(fs.readFileSync(categoriesPath, "utf8"))

  const handleToIdMap: Record<string, string> = {}

  // 1. Create top-level categories
  const rootCategories = categories.filter((c) => !c.parent)
  for (const cat of rootCategories) {
    let [existing] = await productModule.listProductCategories({ handle: cat.handle })
    if (!existing) {
      existing = await productModule.createProductCategories({
        name: cat.name,
        handle: cat.handle,
        description: cat.description || "",
        is_active: true,
        is_internal: false,
      })
    }
    handleToIdMap[cat.handle] = existing.id
    console.log(`✔ Root Category: ${cat.name} (${cat.handle})`)
  }

  // 2. Create second-level categories
  const secondLevel = categories.filter((c) => c.parent && handleToIdMap[c.parent])
  for (const cat of secondLevel) {
    const parentId = handleToIdMap[cat.parent!]
    let [existing] = await productModule.listProductCategories({ handle: cat.handle })
    if (!existing) {
      existing = await productModule.createProductCategories({
        name: cat.name,
        handle: cat.handle,
        parent_category_id: parentId,
        is_active: true,
        is_internal: false,
      })
    }
    handleToIdMap[cat.handle] = existing.id
    console.log(`  └─ Category: ${cat.name} (${cat.handle})`)
  }

  // 3. Create third-level categories (e.g. men-t-shirts inside men-tops)
  const remaining = categories.filter((c) => c.parent && !handleToIdMap[c.handle])
  for (const cat of remaining) {
    const parentId = handleToIdMap[cat.parent!]
    if (parentId) {
      let [existing] = await productModule.listProductCategories({ handle: cat.handle })
      if (!existing) {
        existing = await productModule.createProductCategories({
          name: cat.name,
          handle: cat.handle,
          parent_category_id: parentId,
          is_active: true,
          is_internal: false,
        })
      }
      handleToIdMap[cat.handle] = existing.id
      console.log(`      └─ Subcategory: ${cat.name} (${cat.handle})`)
    }
  }

  console.log(`✔ Finished seeding ${Object.keys(handleToIdMap).length} categories.`)
  console.log("--------------------------------------------------")
  return handleToIdMap
}
