import { MedusaService } from "@medusajs/framework/utils"
import MerchantSchemaMapping from "./models/schema-mapping"

type InjectedDependencies = {
  __pg_connection__?: any
}

export type FieldMappingItem = {
  table?: string
  column?: string
  join_on?: string
}

function sanitizeIdentifier(identifier: string): string {
  if (!/^[a-zA-Z0-9_]+$/.test(identifier)) {
    throw new Error(`Invalid identifier: ${identifier}`)
  }
  return `"${identifier}"`
}

function rowsToCsv(rows: Record<string, any>[]): string {
  if (!rows || rows.length === 0) {
    return ""
  }
  const headers = Object.keys(rows[0])
  const headerLine = headers.join(",")
  const lines = rows.map((row) =>
    headers
      .map((header) => {
        const val = row[header]
        if (val === null || val === undefined) {
          return ""
        }
        let strVal = typeof val === "object" ? JSON.stringify(val) : String(val)
        if (strVal.includes(",") || strVal.includes('"') || strVal.includes("\n")) {
          strVal = `"${strVal.replace(/"/g, '""')}"`
        }
        return strVal
      })
      .join(",")
  )
  return [headerLine, ...lines].join("\n")
}

function buildSqlFromMapping(
  primaryTable: string,
  primaryIdCol: string = "id",
  fieldMappings: Record<string, string | FieldMappingItem>,
  limit?: number,
  offset?: number
): string {
  const safePrimaryTable = sanitizeIdentifier(primaryTable)
  const safePrimaryIdCol = sanitizeIdentifier(primaryIdCol || "id")

  const selectClauses: string[] = []
  const joinedTables = new Map<string, string>()

  for (const [canonicalField, mapping] of Object.entries(fieldMappings)) {
    if (!mapping) continue

    if (typeof mapping === "string") {
      if (mapping.trim() !== "") {
        selectClauses.push(
          `${safePrimaryTable}.${sanitizeIdentifier(mapping)} AS ${sanitizeIdentifier(canonicalField)}`
        )
      }
    } else if (
      typeof mapping === "object" &&
      mapping.column &&
      mapping.column.trim() !== ""
    ) {
      const targetTable =
        mapping.table && mapping.table.trim() !== ""
          ? mapping.table
          : primaryTable
      const safeTargetTable = sanitizeIdentifier(targetTable)
      const safeTargetCol = sanitizeIdentifier(mapping.column)

      selectClauses.push(
        `${safeTargetTable}.${safeTargetCol} AS ${sanitizeIdentifier(canonicalField)}`
      )

      if (targetTable !== primaryTable && !joinedTables.has(targetTable)) {
        joinedTables.set(targetTable, mapping.join_on || "product_id")
      }
    }
  }

  if (selectClauses.length === 0) {
    selectClauses.push(`${safePrimaryTable}.*`)
  }

  let fromClause = `FROM ${safePrimaryTable}`
  for (const [secondaryTable, joinOnCol] of joinedTables.entries()) {
    const safeSecTable = sanitizeIdentifier(secondaryTable)
    const safeJoinCol = sanitizeIdentifier(joinOnCol)
    fromClause += `\nLEFT JOIN ${safeSecTable} ON ${safePrimaryTable}.${safePrimaryIdCol} = ${safeSecTable}.${safeJoinCol}`
  }

  let query = `SELECT \n  ${selectClauses.join(",\n  ")}\n${fromClause}`

  if (limit !== undefined) {
    query += `\nLIMIT ${limit}`
  }
  if (offset !== undefined && offset > 0) {
    query += ` OFFSET ${offset}`
  }

  query += ";"
  return query
}

class MerchantWikiModuleService extends MedusaService({
  MerchantSchemaMapping,
}) {
  protected pgConnection: any

  constructor(container: InjectedDependencies) {
    super(...arguments)
    this.pgConnection = container.__pg_connection__
  }

  async introspectTables(): Promise<string[]> {
    if (!this.pgConnection) {
      throw new Error("PostgreSQL connection is not available in container")
    }

    const query = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name ASC;
    `
    const result = await this.pgConnection.raw(query)
    const rows = result.rows || result
    return rows.map((r: any) => r.table_name || r.TABLE_NAME)
  }

  async introspectColumns(
    tableName: string
  ): Promise<{ column_name: string; data_type: string }[]> {
    if (!this.pgConnection) {
      throw new Error("PostgreSQL connection is not available in container")
    }

    const query = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = ?
      ORDER BY ordinal_position ASC;
    `
    const result = await this.pgConnection.raw(query, [tableName])
    const rows = result.rows || result
    return rows.map((r: any) => ({
      column_name: r.column_name || r.COLUMN_NAME,
      data_type: r.data_type || r.DATA_TYPE,
    }))
  }

  async generatePreview(
    domain: string,
    sourceTable: string,
    fieldMappings: Record<string, string | FieldMappingItem>,
    limit: number = 3,
    primaryIdCol: string = "id"
  ): Promise<{ rows: Record<string, any>[]; csv: string; sql: string }> {
    if (!this.pgConnection) {
      throw new Error("PostgreSQL connection is not available in container")
    }

    const query = buildSqlFromMapping(
      sourceTable,
      primaryIdCol,
      fieldMappings,
      Math.min(limit, 50)
    )

    const result = await this.pgConnection.raw(query)
    const rows = result.rows || result
    const csv = rowsToCsv(rows)

    return {
      rows,
      csv,
      sql: query,
    }
  }

  async extractCsvDataset(
    merchantId: string,
    domain: string,
    limit: number = 25,
    offset: number = 0
  ): Promise<{
    category: string
    data: string
    format: string
    total_count?: number
  }> {
    const mappings = await this.listMerchantSchemaMappings({
      merchant_id: merchantId,
      domain: domain as any,
      is_active: true,
    })

    if (!mappings || mappings.length === 0) {
      return {
        category: domain,
        data: "",
        format: "csv",
        total_count: 0,
      }
    }

    const mapping = mappings[0]
    const sourceTable = mapping.source_table
    const fieldMappings = (mapping.field_mappings as Record<
      string,
      string | FieldMappingItem
    >) || {}

    const query = buildSqlFromMapping(
      sourceTable,
      "id",
      fieldMappings,
      limit,
      offset
    )

    const result = await this.pgConnection.raw(query)
    const rows = result.rows || result
    const csv = rowsToCsv(rows)

    return {
      category: domain,
      data: csv,
      format: "csv",
      total_count: rows.length,
    }
  }
}

export default MerchantWikiModuleService
