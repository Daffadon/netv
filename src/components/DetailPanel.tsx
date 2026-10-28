import type { CSSProperties } from 'react';
import { Badge } from '@cloudflare/kumo/components/badge';
import { Collapsible } from '@cloudflare/kumo/components/collapsible';
import { Link } from '@cloudflare/kumo/components/link';
import { Text } from '@cloudflare/kumo/components/text';
import {
  DELIVERY,
  FIELD_HELP,
  HEADER_LABELS,
  HEADER_ORDER,
  HEADER_ROW,
  citationUrl,
  delivery
} from '../scenarios';
import type { Journey } from '../useJourney';
import type { HeaderKey } from '../types';

const DIR_WORD = {
  out: 'leaving its sender',
  in: 'arriving at its receiver',
  none: 'happening inside one machine'
} as const;

function FieldTable({
  header,
  values,
  previousValues
}: {
  header: HeaderKey;
  values: Record<string, string | number>;
  previousValues: Record<string, string | number> | undefined;
}) {
  return (
    <table className="fields">
      <tbody>
        {Object.keys(values).map((name) => {
          const changed =
            previousValues !== undefined &&
            previousValues[name] !== undefined &&
            String(previousValues[name]) !== String(values[name]);
          const help = FIELD_HELP[header]?.[name];
          return (
            <tr key={name} className={changed ? 'changed' : undefined}>
              <th scope="row">
                <span className="fields-name">{name}</span>
                {help ? <span className="fields-help">{help}</span> : null}
              </th>
              <td title={changed ? `was ${previousValues[name]} in the previous step` : undefined}>
                {String(values[name])}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function DetailPanel({ journey }: { journey: Journey }) {
  const { scenario, step, previous, index } = journey;
  const actor = journey.board.nodes.find((node) => node.id === step.actor);
  const headers = HEADER_ORDER.filter((key) => step.fields?.[key]);
  const walk = step.dir === 'in' ? headers : headers.slice().reverse();
  const mode = delivery(step);

  return (
    <div className="detail">
      {index === 0 && scenario.preamble ? (
        <section className="detail-block detail-preamble">
          <Text variant="heading" as="h3">
            Before we start
          </Text>
          <Text>{scenario.preamble}</Text>
        </section>
      ) : null}

      {step.analogy ? (
        <section className="detail-block detail-analogy">
          <Text variant="heading" as="h3">
            In plain words
          </Text>
          <Text>{step.analogy}</Text>
        </section>
      ) : null}

      <div className="detail-say">
        <Text>{step.explain}</Text>
      </div>

      {step.changes?.length ? (
        <section className="detail-block">
          <Text variant="heading" as="h3">
            What changes here
          </Text>
          <ul>
            {step.changes.map((change) => (
              <li key={change}>{change}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {headers.length ? (
        <section className="detail-block">
          <Text variant="heading" as="h3">
            The packet, field by field
          </Text>
          <p className="walk-note">
            <Badge variant={mode === 'broadcast' ? 'warning' : mode === 'multicast' ? 'info' : 'secondary'}>
              {DELIVERY[mode].word}
            </Badge>
            <span>
              {DELIVERY[mode].note}
              {headers.length > 1
                ? ` · walked ${
                    step.dir === 'in'
                      ? 'from the outermost header inward'
                      : 'from the innermost header outward'
                  }`
                : ''}
            </span>
          </p>
          <div className="packets">
            {walk.map((key, cellIndex) => {
              const values = step.fields?.[key];
              if (!values) return null;
              return (
                <div
                  key={key}
                  className={'packet-cell packet-cell-' + key}
                  style={{ '--d': `${cellIndex * 90}ms` } as CSSProperties}
                >
                  <div className="packet-head">
                    <span>{HEADER_LABELS[key]}</span>
                    <span className="packet-osi">{HEADER_ROW[key]}</span>
                  </div>
                  <FieldTable
                    header={key}
                    values={values}
                    previousValues={previous?.fields?.[key]}
                  />
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {step.note ? (
        <section className="detail-block detail-note">
          <Text variant="heading" as="h3">
            Worth knowing
          </Text>
          <Text>{step.note}</Text>
        </section>
      ) : null}

      <section className="detail-block">
        <Text variant="heading" as="h3">
          Where this is defined
        </Text>
        <ul className="cites">
          {step.cite.map((citation) => (
            <li key={`${citation.rfc}-${citation.sec}`}>
              <Link
                href={citationUrl(citation)}
                target="_blank"
                rel="noopener noreferrer"
              >
                RFC {citation.rfc} §{citation.sec} — {citation.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <Collapsible.Root>
        <Collapsible.DefaultTrigger>Who is who on the map</Collapsible.DefaultTrigger>
        <Collapsible.DefaultPanel>
          <ul className="legend-list">
            {journey.board.nodes.map((node) => (
              <li key={node.id}>
                <span className="legend-name">{node.label}</span> — {node.note || node.sub}
              </li>
            ))}
          </ul>
        </Collapsible.DefaultPanel>
      </Collapsible.Root>
    </div>
  );
}
