# 0013 — The walkthrough follows a real domain, with a stand-in address

* Status: accepted
* Date: 2026-10-14
* Deciders: user (asked for the explanation target to change)
* Adjusts: the address policy in `docs/data-schema.md` §2 and the README accuracy rules

## Context

The scenario followed `example.com`, which RFC 2606 reserves for documentation, and two documents
turned that into a rule: *"nothing in the scenario may point at a real host"* (data schema §2) and
*"the only hostname is `example.com`, reserved by RFC 2606"* (README). The step that returns the
lookup carried a `note` explaining why the address shown is not the real one — it had to, because
`example.com` does not resolve to anything.

The user asked for the target to be their own site, `daffapn.my.id`: the walkthrough is nicer when
the page it follows is the page you are looking at.

## Decision

* **Rename the target everywhere**: the `Host` field lines, the three DNS questions, the answer
  record, the server node's sub-line, the scenario subtitle, and the URLs quoted in prose. The DNS
  chapter follows the domain's own TLD: the `tld` node is the `.id` server, the root's sub-line says
  `delegates .id`, and the referral text says `.id`.
* **Keep every address a documentation address.** The target stays `203.0.113.80` (RFC 5737), and the
  answer step's `note` now says exactly that: it is not the address `daffapn.my.id` really resolves
  to, because a real lookup returns whatever the zone holds at that moment. Nothing in the
  walkthrough can be dialled, and the reader is told where the number came from.
* **RFC 2606 is dropped from the citation table** and from the validator's whitelist, because no step
  cites it any more. A step may only cite what it uses (data schema §9 rule 1), and the citation
  table is a whitelist, not a reading list.
* **The policy is restated** in data schema §2 and in the README: no *address* may point at a real
  machine; the one real *name* is the site the walkthrough follows.

## Consequences

* The user's own domain now appears in the page, the deck, and the drawer. That is theirs to show.
* The DNS chapter is one level shallower than reality: the chain drawn is root → `.id` →
  authoritative, while `my.id` is a public suffix with its own delegation level. This is the same
  simplification the `.com` chain already made, and the chapter is about referrals, not about the
  registry hierarchy.
* `docs/adr/0003` and `0009` still mention `example.com` and RFC 2606 as they were at the time; ADRs
  are a record of what was decided then, so they are left alone.
* `tools/validate.js` no longer accepts a 2606 citation, and `tools/smoke.mjs` asserts the drawer
  carries `http://daffapn.my.id` rather than the old name.

## Rejected

* **Changing the prose only.** The text would then describe a site the scenario does not follow.
* **A name inside a reserved TLD** (`daffapn.example`). Reserved names are what the previous policy
  wanted, but the user asked for their own domain.
* **Showing the address the domain really resolves to.** It changes over time and it points at a
  real machine, which is exactly what the walkthrough must not do.
