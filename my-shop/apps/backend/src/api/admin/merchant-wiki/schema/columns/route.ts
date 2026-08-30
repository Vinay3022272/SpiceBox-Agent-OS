import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import MerchantWikiModuleService from "../../../../../modules/merchant_wiki/service"
import { MERCHANT_WIKI_MODULE } from "../../../../../modules/merchant_wiki"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const table = req.query.table as string

  if (!table) {
    res.status(400).json({ message: "Query parameter 'table' is required" })
    return
  }

  try {
    const wikiService: MerchantWikiModuleService = req.scope.resolve(
      MERCHANT_WIKI_MODULE
    )
    const columns = await wikiService.introspectColumns(table)
    res.status(200).json({ table, columns })
  } catch (error: any) {
    res.status(500).json({
      message: `Failed to introspect columns for table ${table}`,
      error: error.message,
    })
  }
}
