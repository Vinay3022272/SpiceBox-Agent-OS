import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import MerchantWikiModuleService, {
  FieldMappingItem,
  JoinDefinition,
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
    custom_sql,
    joins,
    limit = 3,
  } = req.body as {
    domain?: string
    source_table?: string
    primary_id_col?: string
    field_mappings?: Record<string, any>
    custom_sql?: string
    joins?: JoinDefinition[]
    limit?: number
  }

  const effectiveSourceTable = source_table || (custom_sql ? "custom_sql" : "")
  if (!effectiveSourceTable && !custom_sql) {
    res.status(400).json({ message: "Either 'source_table' or 'custom_sql' is required." })
    return
  }

  try {
    const wikiService: MerchantWikiModuleService = req.scope.resolve(
      MERCHANT_WIKI_MODULE
    )

    const preview = await wikiService.generatePreview(
      domain,
      effectiveSourceTable,
      field_mappings,
      limit,
      primary_id_col,
      custom_sql,
      joins
    )

    res.status(200).json(preview)
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to generate query preview",
      error: error.message,
    })
  }
}
