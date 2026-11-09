import generated from "../data/targets.generated.json";
import { UNITS } from "../data/toc.generated";

/**
 * The unit overviews' learning targets, set against the NGSS standards, as a
 * coverage matrix: rows are standards, columns are units, and each cell counts
 * how many of that unit's targets sit under the standard.
 *
 * This is a server component. Every row is a native <details>, so opening one
 * needs no JavaScript and the whole matrix reads as text with no script at all:
 * each cell says its unit and its number in words, and the tint is only a second
 * cue for the eye.
 */

interface GeneratedTarget {
  text: string;
  at: string[];
}

interface GeneratedGroup {
  heading: string;
  standard: string | null;
  targets: GeneratedTarget[];
}

interface GeneratedUnit {
  unit: string;
  groups: GeneratedGroup[];
}

interface RowTarget {
  text: string;
  anchors: string[];
}

interface RowGroup {
  heading: string;
  targets: RowTarget[];
}

interface RowUnit {
  unit: string;
  short: string;
  groups: RowGroup[];
}

export interface CurriculumRow {
  code: string;
  title: string;
  counts: Record<string, number>;
  total: number;
  units: RowUnit[];
}

const UNLABELLED = "Unlabelled";

const COLUMNS = UNITS.map((unit) => ({ id: unit.id, short: unit.short, label: unit.label }));

const SHORT = new Map(COLUMNS.map((column) => [column.id, column.short]));

/** A group may name more than one standard, comma or space separated. */
function codesOf(standard: string | null): string[] {
  if (!standard) return [UNLABELLED];
  const codes = standard
    .split(/[\s,]+/)
    .map((code) => code.trim())
    .filter(Boolean);
  return codes.length > 0 ? codes : [UNLABELLED];
}

function titleOf(headings: string[]): string {
  if (headings.length === 1) return headings[0];
  if (headings.length === 2) return `${headings[0]} · ${headings[1]}`;
  return `${headings[0]} · ${headings[1]} + ${headings.length - 2} more`;
}

function buildRows(): { rows: CurriculumRow[]; totals: Record<string, number>; total: number } {
  const units = (generated as unknown as { units?: GeneratedUnit[] }).units ?? [];
  const rows = new Map<string, CurriculumRow>();
  const headings = new Map<string, Set<string>>();
  const unitTotals: Record<string, number> = {};

  for (const unit of units) {
    for (const group of unit.groups) {
      // A unit's own total counts each target once, whatever standards its group
      // names, so the footer stays a true target count even where one group
      // credits two standards and therefore appears in two rows.
      unitTotals[unit.unit] = (unitTotals[unit.unit] ?? 0) + group.targets.length;

      for (const code of codesOf(group.standard)) {
        let row = rows.get(code);
        if (!row) {
          row = { code, title: "", counts: {}, total: 0, units: [] };
          rows.set(code, row);
          headings.set(code, new Set());
        }

        const label = group.heading.trim();
        if (label) headings.get(code)?.add(label);

        for (const target of group.targets) {
          row.counts[unit.unit] = (row.counts[unit.unit] ?? 0) + 1;
          row.total += 1;

          let rowUnit = row.units.find((entry) => entry.unit === unit.unit);
          if (!rowUnit) {
            rowUnit = {
              unit: unit.unit,
              short: SHORT.get(unit.unit) ?? unit.unit,
              groups: [],
            };
            row.units.push(rowUnit);
          }

          let rowGroup = rowUnit.groups.find((entry) => entry.heading === label);
          if (!rowGroup) {
            rowGroup = { heading: label, targets: [] };
            rowUnit.groups.push(rowGroup);
          }
          rowGroup.targets.push({ text: target.text, anchors: target.at });
        }
      }
    }
  }

  const ordered = [...rows.values()].sort((a, b) => {
    if (a.code === UNLABELLED) return 1;
    if (b.code === UNLABELLED) return -1;
    return a.code.localeCompare(b.code, "en", { numeric: true });
  });

  for (const row of ordered) {
    row.title = titleOf([...(headings.get(row.code) ?? [])]);
    row.units.sort(
      (a, b) => COLUMNS.findIndex((c) => c.id === a.unit) - COLUMNS.findIndex((c) => c.id === b.unit),
    );
  }

  const totals: Record<string, number> = {};
  for (const column of COLUMNS) {
    totals[column.id] = unitTotals[column.id] ?? 0;
  }

  return {
    rows: ordered,
    totals,
    total: COLUMNS.reduce((sum, column) => sum + (totals[column.id] ?? 0), 0),
  };
}

const MATRIX = buildRows();

/**
 * Four tint steps, from 0 (untinted) to 4 (darkest). The number is always
 * printed, so the tint never carries the meaning on its own.
 */
function stepFor(count: number): number {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 4) return 2;
  if (count <= 6) return 3;
  return 4;
}

export default function CurriculumMap() {
  return (
    <div className="ref-matrix">
      <p className="ref-legend-lead">
        Read across a row to see which units carry a standard, and down a column to see what a
        unit is mostly for. Each row opens.
      </p>

      <div className="ref-scroll">
        <div className="ref-headrow">
          <span className="ref-codehead">Standard</span>
          {COLUMNS.map((column) => (
            <span className="ref-cell ref-unithead" key={column.id}>
              <span className="ref-unitid">{column.id}</span>
              <span className="ref-unitname">{column.short}</span>
              <span className="ref-vh"> ({column.label})</span>
            </span>
          ))}
          <span className="ref-cell ref-unithead">All</span>
        </div>

        {MATRIX.rows.map((row) => (
          <details className="ref-row" key={row.code} id={`standard-${row.code}`}>
            <summary>
              <span className="ref-code">
                <span className="ref-caret" aria-hidden="true">
                  ›
                </span>
                <span className="ref-code-name">{row.code}</span>
                {row.title && <span className="ref-code-title">{row.title}</span>}
              </span>
              {COLUMNS.map((column) => {
                const count = row.counts[column.id] ?? 0;
                return (
                  <span
                    className={count === 0 ? "ref-cell ref-cell-zero" : "ref-cell"}
                    data-step={stepFor(count)}
                    key={column.id}
                  >
                    <span className="ref-vh">{column.short}: </span>
                    {count}
                    <span className="ref-vh"> targets</span>
                  </span>
                );
              })}
              <span className="ref-cell ref-cell-total">
                {row.total}
                <span className="ref-vh"> targets in all units</span>
              </span>
            </summary>

            <div className="ref-detail">
              {row.units.map((unit) => (
                <div className="ref-detail-unit" key={unit.unit}>
                  <h3 className="ref-detail-head">
                    {unit.short} <span className="ref-detail-unitid">{unit.unit}</span>
                  </h3>
                  {unit.groups.map((group) => (
                    <div className="ref-detail-group" key={`${unit.unit}-${group.heading}`}>
                      {group.heading && <h4 className="ref-detail-subhead">{group.heading}</h4>}
                      <ul className="ref-targets">
                        {group.targets.map((target, index) => (
                          <li className="ref-target" key={`${group.heading}-${index}`}>
                            <p className="ref-target-text">{target.text}</p>
                            <p className="ref-anchors">
                              {target.anchors.map((anchor) => (
                                <code className="ref-anchor" key={anchor}>
                                  {anchor}
                                </code>
                              ))}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </details>
        ))}

        <div className="ref-footrow">
          <span className="ref-code ref-code-foot">Total targets</span>
          {COLUMNS.map((column) => (
            <span className="ref-cell" key={column.id}>
              <span className="ref-vh">{column.short}: </span>
              {MATRIX.totals[column.id] ?? 0}
              <span className="ref-vh"> targets</span>
            </span>
          ))}
          <span className="ref-cell ref-cell-total">
            {MATRIX.total}
            <span className="ref-vh"> targets</span>
          </span>
        </div>
      </div>

      <ul className="ref-legend">
        <li>
          <span className="ref-swatch" data-step="0" aria-hidden="true" /> none
        </li>
        <li>
          <span className="ref-swatch" data-step="1" aria-hidden="true" /> 1–2 targets
        </li>
        <li>
          <span className="ref-swatch" data-step="2" aria-hidden="true" /> 3–4 targets
        </li>
        <li>
          <span className="ref-swatch" data-step="3" aria-hidden="true" /> 5–6 targets
        </li>
        <li>
          <span className="ref-swatch" data-step="4" aria-hidden="true" /> 7 or more targets
        </li>
      </ul>

      <p className="ref-foot-note">
        Counts come from the learning targets each unit’s overview publishes, so a group that names
        two standards counts towards both. Standards with no targets anywhere are left out rather
        than shown as an empty row.
      </p>
    </div>
  );
}
