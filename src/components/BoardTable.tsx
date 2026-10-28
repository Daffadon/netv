import { Table } from '@cloudflare/kumo/components/table';
import { Text } from '@cloudflare/kumo/components/text';
import type { EvidenceTable } from '../types';

interface BoardTableProps {
  table: EvidenceTable | null;
  fromIndex: number | null;
  currentIndex: number;
  stepTitle: string | null;
}

export function BoardTable({ table, fromIndex, currentIndex, stepTitle }: BoardTableProps) {
  if (!table) return <aside id="board-table" className="board-table" hidden />;
  return (
    <aside className="board-table" id="board-table" aria-label="The figures this step is read on">
      {fromIndex !== null && fromIndex !== currentIndex ? (
        <div className="board-table-from">
          <Text variant="secondary" size="sm">
            Calculated at step {fromIndex + 1} — {stepTitle}
          </Text>
        </div>
      ) : null}
      <Text variant="heading" as="h3">
        {table.caption || 'The numbers'}
      </Text>
      <Table className="step-table">
        <Table.Header>
          <Table.Row>
            {table.columns.map((column) => (
              <Table.Head key={column}>{column}</Table.Head>
            ))}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {table.rows.map((row, rowIndex) => (
            <Table.Row key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <Table.Cell key={cellIndex}>{String(cell)}</Table.Cell>
              ))}
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </aside>
  );
}
