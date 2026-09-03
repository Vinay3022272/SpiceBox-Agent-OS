import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import MerchantWikiModuleService from "../../../../modules/merchant_wiki/service"
import { MERCHANT_WIKI_MODULE } from "../../../../modules/merchant_wiki"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const merchantId = (req.query.merchant_id as string) || "default_merchant"
  const domain = req.query.domain as string | undefined
  const section = req.query.section as string | undefined
  const limit = parseInt((req.query.limit as string) || "25", 10)
  const offset = parseInt((req.query.offset as string) || "0", 10)

  const targetDomain = domain || section

  try {
    const wikiService: MerchantWikiModuleService = req.scope.resolve(
      MERCHANT_WIKI_MODULE
    )

    if (targetDomain && targetDomain !== "all") {
      const result = await wikiService.extractCsvDataset(
        merchantId,
        targetDomain,
        limit,
        offset
      )
      res.status(200).json([result])
      return
    }

    // Extract all active domain mappings
    const mappings = await wikiService.listMerchantSchemaMappings({
      merchant_id: merchantId,
      is_active: true,
    })

    const results: any[] = []
    for (const mapping of mappings) {
      const dataset = await wikiService.extractCsvDataset(
        merchantId,
        mapping.domain,
        limit,
        offset
      )
      if (dataset.data && dataset.data.trim() !== "") {
        results.push(dataset)
      }
    }

    res.status(200).json(results)
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to extract CSV dataset for agent",
      error: error.message,
    })
  }
}
