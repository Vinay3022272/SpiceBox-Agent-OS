import { MedusaService } from "@medusajs/framework/utils"
import MerchantSchemaMapping from "./models/schema-mapping"

type InjectedDependencies = {
  __pg_connection__?: any
}

export type JoinDefinition = {
  table: string
  alias?: string
  on: string
  type?: "LEFT" | "INNER" | "RIGHT"
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

export function buildSqlFromMapping(
  primaryTable: string,
  primaryIdCol: string = "id",
  fieldMappings: Record<string, any> = {},
  limit?: number,
  offset?: number,
  customSql?: string,
  customJoins?: JoinDefinition[]
): string {
  // 1. Direct custom_sql mode (either passed as parameter or stored inside fieldMappings)
  const explicitSql =
    customSql ||
    (fieldMappings && typeof fieldMappings === "object"
      ? fieldMappings.custom_sql
      : undefined)

  if (explicitSql && typeof explicitSql === "string" && explicitSql.trim() !== "") {
    let cleanSql = explicitSql.trim().replace(/;+\s*$/, "")
    if (
      cleanSql.toLowerCase().includes("from product") &&
      !cleanSql.toLowerCase().includes("distinct") &&
      !cleanSql.toLowerCase().includes("group by")
    ) {
      cleanSql = cleanSql.replace(/select\s+/i, "SELECT DISTINCT ON (p.id) ")
      if (!cleanSql.toLowerCase().includes("order by")) {
        cleanSql += "\nORDER BY p.id"
      }
    }
    if (limit !== undefined) {
      cleanSql += `\nLIMIT ${limit}`
    }
    if (offset !== undefined && offset > 0) {
      cleanSql += ` OFFSET ${offset}`
    }
    return cleanSql + ";"
  }

  // 2. Multi-hop joins & field mappings
  let rawFields = fieldMappings || {}
  let joinsList: JoinDefinition[] = customJoins || []

  if (fieldMappings && typeof fieldMappings === "object") {
    if (Array.isArray(fieldMappings.joins) && joinsList.length === 0) {
      joinsList = fieldMappings.joins
    }
    if (fieldMappings.fields && typeof fieldMappings.fields === "object") {
      rawFields = fieldMappings.fields
    }
  }

  const safePrimaryTable = sanitizeIdentifier(primaryTable || "product")
  const safePrimaryIdCol = sanitizeIdentifier(primaryIdCol || "id")

  const selectClauses: string[] = []
  const autoJoinedTables = new Map<string, string>()

  // Track tables/aliases already covered in explicit joins
  const coveredTables = new Set<string>()
  for (const j of joinsList) {
    if (j.alias) coveredTables.add(j.alias)
    if (j.table) coveredTables.add(j.table)
  }

  for (const [canonicalField, mapping] of Object.entries(rawFields)) {
    if (
      !mapping ||
      canonicalField === "joins" ||
      canonicalField === "custom_sql" ||
      canonicalField === "fields"
    ) {
      continue
    }

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

      if (
        targetTable !== primaryTable &&
        !coveredTables.has(targetTable) &&
        !autoJoinedTables.has(targetTable)
      ) {
        autoJoinedTables.set(targetTable, mapping.join_on || `${primaryTable}_id`)
      }
    }
  }

  if (selectClauses.length === 0) {
    selectClauses.push(`${safePrimaryTable}.*`)
  }

  let fromClause = `FROM ${safePrimaryTable}`

  // Explicit multi-hop joins
  for (const j of joinsList) {
    if (!j.table || !j.on) continue
    const joinType = (j.type || "LEFT").toUpperCase()
    const safeJoinTable = sanitizeIdentifier(j.table)
    const aliasClause = j.alias ? ` AS ${sanitizeIdentifier(j.alias)}` : ""
    fromClause += `\n${joinType} JOIN ${safeJoinTable}${aliasClause} ON ${j.on}`
  }

  // Fallback 1-hop joined tables
  for (const [secondaryTable, joinOnCol] of autoJoinedTables.entries()) {
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
    fieldMappings: Record<string, any> = {},
    limit: number = 3,
    primaryIdCol: string = "id",
    customSql?: string,
    joins?: JoinDefinition[]
  ): Promise<{ rows: Record<string, any>[]; csv: string; sql: string }> {
    if (!this.pgConnection) {
      throw new Error("PostgreSQL connection is not available in container")
    }

    const query = buildSqlFromMapping(
      sourceTable,
      primaryIdCol,
      fieldMappings,
      Math.min(limit, 50),
      0,
      customSql,
      joins
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
    const fieldMappings = (mapping.field_mappings as any) || {}

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
