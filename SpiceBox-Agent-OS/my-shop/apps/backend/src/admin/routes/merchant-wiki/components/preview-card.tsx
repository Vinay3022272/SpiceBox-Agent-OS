import { Container, Heading, Text, Badge, Table, CodeBlock } from "@medusajs/ui"

type PreviewCardProps = {
  domain: string
  sourceTable: string
  rows: Record<string, any>[]
  csv: string
  sql?: string
  isLoading: boolean
}

export const PreviewCard = ({
  domain,
  sourceTable,
  rows,
  csv,
  sql,
  isLoading,
}: PreviewCardProps) => {
  if (isLoading) {
    return (
      <Container className="p-6">
        <div className="flex items-center justify-center py-8 text-ui-fg-muted">
          <Text size="small">Executing query on table "{sourceTable}"...</Text>
        </div>
      </Container>
    )
  }

  if (!rows || rows.length === 0) {
    return null
  }

  const columns = Object.keys(rows[0])

  return (
    <Container className="p-0 divide-y divide-ui-border-base">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2" className="text-base font-semibold">
            Query Preview ({domain})
          </Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Extracted records from primary table <span className="font-mono text-ui-fg-base">{sourceTable}</span>
          </Text>
        </div>
        <Badge size="small" color="green">Ready for Extraction</Badge>
      </div>

      {/* Generated SQL & CSV Snippets */}
      <div className="p-6 space-y-4">
        {sql && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Text size="small" weight="plus">
                Generated PostgreSQL Query (Relational Joins)
              </Text>
              <Badge size="small" color="blue">SQL</Badge>
            </div>
            <CodeBlock
              snippets={[
                {
                  label: "query.sql",
                  language: "sql",
                  code: sql,
                },
              ]}
            >
              <CodeBlock.Header />
              <CodeBlock.Body />
            </CodeBlock>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Text size="small" weight="plus">
              Canonical CSV Output (Sent to Agent)
            </Text>
            <Badge size="small" color="purple">CSV</Badge>
          </div>
          <CodeBlock
            snippets={[
              {
                label: `${domain}_stream.csv`,
                language: "csv",
                code: csv || "No CSV generated",
              },
            ]}
          >
            <CodeBlock.Header />
            <CodeBlock.Body />
          </CodeBlock>
        </div>
      </div>

      {/* Table Preview */}
      <div className="overflow-x-auto">
        <Table>
          <Table.Header>
            <Table.Row>
              {columns.map((col) => (
                <Table.HeaderCell key={col}>
                  {col}
                </Table.HeaderCell>
              ))}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {rows.map((row, idx) => (
              <Table.Row key={idx}>
                {columns.map((col) => (
                  <Table.Cell key={col} className="text-ui-fg-subtle max-w-xs truncate font-mono text-xs">
                    {typeof row[col] === "object" ? JSON.stringify(row[col]) : String(row[col] ?? "")}
                  </Table.Cell>
                ))}
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </div>
    </Container>
  )
}
