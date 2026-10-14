# 0014 — A learner pass: teach the vocabulary on the page

* Status: accepted
* Date: 2026-10-14
* Deciders: user (asked for the site to be measured as a beginner would read it)
* Builds on: 0002 (header-field depth), 0011 (board focus), 0012 (tabs, layers, analogy)

## Context

The ask was to read the site as a student who has the technical words but no model of the flow, to
say how hard it is to understand from the site alone, and to fix what is hard.

Walking the 26 steps and reading only what the page shows:

1. **The map speaks jargon and never explains it.** `resolver`, `root server`, `authoritative`,
   `backbone`, `BGP routing`, `NAT`, `referral`, `glue`, `delegates .id`: a reader who does not
   already know DNS architecture cannot tell which box is which, and the labels are the only thing
   the map says.
2. **The layer rail is names with no meaning.** Application, Transport, Internet, Link glow as the
   packet moves and never say what each row does.
3. **The field-by-field tables are names and values, nothing else.** `ttl 64`, `seq 0x1a2b3c4e`,
   `flags PSH, ACK`, `ciaddr 0.0.0.0` — the very section that exists to be precise is unreadable
   without the protocol already in your head. This was the biggest wall.
4. **Nothing says where the reader is in the journey.** The step counter lived in the closed drawer,
   the progress bar had no labels, and only the tab highlighted.
5. **Nothing says what the walkthrough is.** The scenario's `preamble` had never been rendered.
6. **The DNS tab held two ARP steps**, which are not DNS, so the one navigation aid the reader has
   contradicts the content.

## Decision

* **Every field name explains itself.** `NETV.FIELD_HELP` in `src/schema.js` holds one plain sentence
  per catalogued field name (and per HTTP field line), printed under the name in the drawer.
  `tools/validate.js` fails a catalogued name without a hint and warns about an HTTP field line
  without one, so a new field cannot ship silent.
* **Every device explains itself.** Each node in `data/scenario-http.js` carries a `note`; the
  validator requires it. The same sentence is the hover tooltip on the map and the *Who is who on
  the map* legend in the drawer (collapsed, at the end, available on a phone where hover is not).
* **The layer rows explain themselves** on hover, from a `help` string on `NETV.LAYERS`.
* **The visible caption carries the position**: `DNS · step 9 of 26` prefixes the narration line, and
  each chapter tab's tooltip names its range (`DHCP · steps 1 to 6`).
* **The first step opens with the `preamble`**, so the walkthrough says what it is before it starts.
* **The ARP steps move to the DHCP chapter.** "DHCP" is now the chapter about getting onto the local
  network — the address and the hardware address of the gateway — "DNS" is only the name lookup, and
  "HTTP" is the connection, request, response and close. This adjusts ADR 0012, which had kept ARP
  with DNS to avoid moving steps between chapters.

## Consequences

* Two coverage rules now live in the validator (§3 node `note`, §5 field hints), and
  `docs/data-schema.md` §9 rule 13 states the principle: jargon the page never explains is a bug.
* `tools/smoke.mjs` asserts the caption prefix, the chapter ranges, the presence of the preamble on
  step 1, one hint per rendered field row, and the eleven-entry legend.
* A chapter may now span data files (the ARP steps live in `2-resolve.js` but belong to the DHCP
  chapter), so §1 of the data schema no longer claims a file owns whole phases.

## Still hard, and left alone

* **The values are still technical** (`0x1a2b3c4d (ISN)`, `MSS=1460, SACK permitted`). That is the
  point of the field-by-field section (ADR 0002) and the hints now say what the field is for; the
  values themselves stay exact.
* **26 steps is a long ride** for a first visit. The chapters, the ranges and the caption prefix give
  the shape, but there is no shorter path; a "just the three protocols" cut would be a second
  scenario, not a tweak.
* **Per-step analogies do not add up to one story.** There is no single running metaphor across all
  26 steps, and inventing one would fight the per-step mechanism each analogy is tied to.
* **No search or interactive glossary.** The legend is a list, not an index.

## Rejected

* **Renaming the chapters to plain words** ("get an address", "look up the name"). The user chose the
  three protocol names in ADR 0012, and the tooltips now carry the range instead.
* **A paragraph of explanation per field.** The table would double in height and the explain text
  already covers the mechanism; a hint under the name is what an unfamiliar word needs.
* **Rewriting the values to be less technical.** Precision is what makes the page trustworthy, and
  the RFC citations point at it.
