import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import MerchantWikiModuleService from "../../../../modules/merchant_wiki/service"
import { MERCHANT_WIKI_MODULE } from "../../../../modules/merchant_wiki"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const merchantId = (req.query.merchant_id as string) || "default_merchant"
  const domain = req.query.domain as string | undefined

  try {
    const wikiService: MerchantWikiModuleService = req.scope.resolve(
      MERCHANT_WIKI_MODULE
    )

    const filters: any = {
      merchant_id: merchantId,
    }
    if (domain) {
      filters.domain = domain
    }

    const mappings = await wikiService.listMerchantSchemaMappings(filters)
    res.status(200).json({ mappings })
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to retrieve schema mappings",
      error: error.message,
    })
  }
}

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const {
    merchant_id = "default_merchant",
    domain,
    source_table,
    field_mappings,
    is_active = true,
  } = req.body as {
    merchant_id?: string
    domain: "catalog" | "reviews" | "promotions" | "inventory" | "orders"
    source_table: string
    field_mappings: Record<string, string>
    is_active?: boolean
  }

  if (!domain || !source_table || !field_mappings) {
    res.status(400).json({
      message: "Fields 'domain', 'source_table', and 'field_mappings' are required.",
    })
    return
  }

  try {
    const wikiService: MerchantWikiModuleService = req.scope.resolve(
      MERCHANT_WIKI_MODULE
    )

    // Check if mapping for this domain already exists
    const existing = await wikiService.listMerchantSchemaMappings({
      merchant_id,
      domain: domain as any,
    })

    let mapping
    if (existing && existing.length > 0) {
      mapping = await wikiService.updateMerchantSchemaMappings({
        id: existing[0].id,
        source_table,
        field_mappings,
        is_active,
      })
    } else {
      mapping = await wikiService.createMerchantSchemaMappings({
        merchant_id,
        domain,
        source_table,
        field_mappings,
        is_active,
      })
    }

    res.status(200).json({ mapping })
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to save schema mapping",
      error: error.message,
    })
  }
}
