import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import MerchantWikiModuleService from "../../../../../modules/merchant_wiki/service"
import { MERCHANT_WIKI_MODULE } from "../../../../../modules/merchant_wiki"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const wikiService: MerchantWikiModuleService = req.scope.resolve(
      MERCHANT_WIKI_MODULE
    )
    const tables = await wikiService.introspectTables()
    res.status(200).json({ tables })
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to introspect database tables",
      error: error.message,
    })
  }
}
