import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import MerchantWikiModuleService, {
  FieldMappingItem,
} from "../../../../../modules/merchant_wiki/service"
import { MERCHANT_WIKI_MODULE } from "../../../../../modules/merchant_wiki"

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const {
    domain = "catalog",
    source_table,
    primary_id_col = "id",
    field_mappings = {},
    limit = 3,
  } = req.body as {
    domain?: string
    source_table: string
    primary_id_col?: string
    field_mappings: Record<string, string | FieldMappingItem>
    limit?: number
  }

  if (!source_table) {
    res.status(400).json({ message: "Field 'source_table' is required." })
    return
  }

  try {
    const wikiService: MerchantWikiModuleService = req.scope.resolve(
      MERCHANT_WIKI_MODULE
    )

    const preview = await wikiService.generatePreview(
      domain,
      source_table,
      field_mappings,
      limit,
      primary_id_col
    )

    res.status(200).json(preview)
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to generate query preview",
      error: error.message,
    })
  }
}
