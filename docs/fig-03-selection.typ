// What the two export options do: a window over the pairs, a mask over the text.
#import "_fig.typ": *

#let H = 124mm
#show: setup.with(H)

#vacc(H)
#wash(W - 74mm, -38mm)
#head("03", "selection", "A window", "and a mask.", [
  the two choices worth making before an import, \
  offered in the panel and on the command line.])

#vline(88mm, 56mm, H - 16mm)

// ── pairs ────────────────────────────────────────────────────────────────
#at(9mm, 56mm, {
  box(baseline: -0.4mm, circle(radius: 0.7mm, fill: lilac, stroke: none))
  h(1.6mm)
  caps(size: 5pt, track: 0.35em)[pairs]
})
#hline(9mm, 76mm, 60mm)
#at(9mm, 62.6mm, text(size: 11pt, weight: 250, tracking: -0.02em)[A window over turns])

// one pair = a hollow prompt dot and a filled reply dot
#let pair(x, y, on) = {
  let c = if on { lilac } else { ink.transparentize(78%) }
  at(x, y, circle(radius: 1.1mm, stroke: 0.4pt + c, fill: none))
  at(x + 3.4mm, y, circle(radius: 1.1mm, stroke: none, fill: c))
}
#let row(y, spec, picked, note) = {
  at(9mm, y - 1.2mm, mono(spec, size: 6.4pt, fill: ink))
  for i in range(4) { pair(34mm + i * 9mm, y, picked.contains(i)) }
  at(9mm, y + 4.4mm, text(size: 5.6pt, fill: muted, note))
}
#row(77mm, "all", (0, 1, 2, 3), [every prompt and reply, oldest first])
#row(89mm, "first:1", (0,), [the brief that opened the chat])
#row(101mm, "last:2", (2, 3), [where the thinking ended up])

#at(34mm, 69mm, caps(size: 4.2pt, track: 0.25em)[older])
#at(62mm, 69mm, caps(size: 4.2pt, track: 0.25em)[newer])
#arrow(44mm, 61mm, 71.4mm, 1, ink.transparentize(72%))

// ── redaction ────────────────────────────────────────────────────────────
#at(97mm, 56mm, {
  box(baseline: -0.4mm, circle(radius: 0.7mm, fill: amber, stroke: none))
  h(1.6mm)
  caps(size: 5pt, track: 0.35em)[redaction]
})
#hline(97mm, W - 9mm, 60mm)
#at(97mm, 62.6mm, text(size: 11pt, weight: 250, tracking: -0.02em)[A mask over text])

#at(97mm, 74mm, block(width: 78mm)[
  #set par(leading: 0.7em)
  #caps(size: 4.2pt, track: 0.25em)[in the browser] \
  #v(0.6mm)
  #mono[ping maya\@acme.io about PROJ-412] \
  #v(1.2mm)
  #caps(size: 4.2pt, track: 0.25em, fill: mint.darken(28%))[what reaches the disk] \
  #v(0.6mm)
  #mono(fill: ink)[ping #text(fill: amber.darken(20%))[\[REDACTED\]] about #text(fill: amber.darken(20%))[\[REDACTED\]]]
])

#hline(97mm, W - 9mm, 94mm)
#let kind(x, w, label, body) = at(x, 97mm, block(width: w)[
  #caps(size: 4.4pt, track: 0.3em)[#label]
  #v(1.2mm)
  #text(size: 5.8pt, fill: muted)[#body]
])
#kind(97mm, 24mm, "a word")[`Acme Corp`, case insensitive]
#kind(124mm, 24mm, "a pattern")[`/\bPROJ-\d+\b/`]
#kind(151mm, 24mm, "builtins")[emails, IPv4, api keys]

#strip(H, [the panel and the flags share one vocabulary], [--pairs · --redact · --redact-builtins])
