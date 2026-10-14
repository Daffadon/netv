# 0012 — Three tabs, four TCP/IP rows, and an analogy before the explanation

* Status: accepted
* Date: 2026-10-14
* Deciders: user, reading the step details
* Builds on: 0002 (header-field depth), 0008 (animated story), 0011 (board focus)
* Adjusted by: 0014 (the ARP steps moved from the DNS chapter to the DHCP chapter)

## Context

Four things about the reader's experience of the last build, in the user's words: the chapter tabs
should be *"only DHCP, DNS, HTTP"*; the layer rail should *"use tcp/ip only layer, so remove the
presentation and session"*; the packet field-by-field section should *"order vertically, not
horizontally"*; and the explanation *"is easy to understand. better if there is simpler analogy
too"*.

The tabs were the six OSI-flavoured chapter names (`P0 · Getting on the network` … `P5 · Closing`),
the rail was the seven OSI rows with a TCP/IP number beside each, the field-by-field walk was a
horizontally scrolling row of header cards, and the drawer opened straight onto dense RFC prose.

## Decision

* **Three tabs.** `phase` is now exactly `DHCP`, `DNS`, `HTTP` — the protocol a reader is watching,
  not a phase number. The existing chapter boundaries are kept and merged: steps 1–4 (the address
  handshake, plus the lead-in) are DHCP, steps 5–9 (the two ARP steps and the three DNS steps) are
  DNS, and steps 10–26 (the TCP handshake, the request, the response, the close) are HTTP.
  `tools/validate.js` fails a scenario whose phase list is not exactly those three in that order.
* **Four TCP/IP rows, no OSI numbers on screen.** `NETV.LAYERS` becomes Application, Transport,
  Internet, Link, each carrying the OSI numbers that file into it (`[7,6,5]`, `[4]`, `[3]`, `[2,1]`),
  so the step data keeps the OSI numbers it always had — nothing in the data changed — while the
  rail prints the TCP/IP name only. The packet inspector names the row too: `NETV.HEADER_ROW`
  replaces `NETV.HEADER_OSI`, and ARP reads `Internet/Link` rather than `layer 2/3`.
* **The field-by-field walk goes down, not across.** One header card under the next, in the order
  the animation takes, with the arrow between them turned to point down and each card's colour moved
  from its top to its left edge. Full width means the values no longer scroll sideways inside a
  212-pixel card.
* **Every step gains an `analogy`**, and every `explain` was rewritten plainly: 2–4 short sentences,
  ≤ 110 words, same facts, no new numbers, addresses or citations. The analogy leads the drawer —
  an everyday situation (a queue, a hotel desk, a parcel, a librarian) that maps onto this step's own
  mechanism, one sentence, 8–25 words, no acronym, protocol name or number. The rewrite touched all
  five data files and nothing but these three keys.
* **The rules are enforced, not requested.** `docs/data-schema.md` §4 and §9 gained the specification,
  and `tools/validate.js` checks the analogy's length, its sentence stop, its filler words, its
  acronyms and its numbers, plus the length of the rewritten `explain`.

## Consequences

* `tools/smoke.mjs` now asserts the four-row rail (ARP lights `Internet,Link`, a DHCP broadcast
  lights all four), three tabs reading exactly `DHCP,DNS,HTTP`, and that every one of the 26 steps
  opens the drawer with an analogy.
* The rewrite was verified mechanically, not by eye: every step was loaded before and after the
  change and every key compared, so `id`, `title`, `say`, `actor`, `hop`, `dir`, `osi`, `pdu`,
  `payload`, `fields`, `changes`, `note` and `cite` are provably untouched, with zero unexpected
  differences across the 26 steps.
* `docs/glossary.md` §1 now says what the app draws and how the OSI numbers map onto the four rows,
  because the table there still documents both models.
* The liner notes in the data files still cite OSI numbers (`osi: [7, 4, 3, 2, 1]`); that is the
  internal vocabulary, and the engine is what turns it into the four rows on screen.

## Rejected

* **Giving ARP its own tab, or eight tabs.** The user asked for three. ARP stays with the DNS chapter
  it already shared a phase with, rather than moving steps between chapters.
* **Deleting the steps that are not DHCP, DNS or HTTP.** The tabs are navigation, not scope: the ARP
  and TCP steps are what makes the story correct, and the frozen step list in data-schema §7 owns
  their order.
* **Keeping the OSI number beside the TCP/IP name.** Two numbers and two names per row is exactly
  the translation burden the reader asked to be rid of.
* **A second, shorter `explain`.** One explanation, written plainly, beats two registers to keep in
  sync; the analogy, not a summary, is what a beginner reads first.
* **Staggering the field cards horizontally on a phone.** The vertical walk is the same layout at
  every width, and the panel is 480 pixels wide at most.
