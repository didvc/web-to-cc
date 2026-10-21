// Where the file lands, what it contains, and what the picker shows.
#import "_fig.typ": *

#let H = 138mm
#show: setup.with(H)

#vacc(H)
#wash(W - 70mm, -40mm)
#head("04", "placement", "Into the", "store.", [
  no registry, no index, no daemon. the picker \
  reads whatever jsonl it finds for this directory.])

#vline(92mm, 56mm, H - 16mm)

// ── path encoding ────────────────────────────────────────────────────────
#at(9mm, 56mm, {
  box(baseline: -0.4mm, circle(radius: 0.7mm, fill: sky, stroke: none))
  h(1.6mm)
  caps(size: 5pt, track: 0.35em)[address]
})
#hline(9mm, 80mm, 60mm)
#at(9mm, 62.6mm, text(size: 11pt, weight: 250, tracking: -0.02em)[A path becomes a name])

#at(9mm, 74mm, mono(size: 7pt, fill: ink)[/home/you/code/api])
#arrow(9mm, 24mm, 80mm, 1, faint)
#at(27mm, 78.2mm, text(size: 5.6pt, fill: muted)[every character outside \[a-zA-Z0-9\] turns into a dash])
#at(9mm, 86mm, mono(size: 7pt, fill: sky.darken(25%))[-home-you-code-api])

#at(9mm, 95mm, block(width: 78mm)[
  #set par(leading: 0.72em)
  #mono(size: 6.2pt)[\~/.claude/projects/] \
  #h(3mm) #mono(size: 6.2pt, fill: sky.darken(25%))[-home-you-code-api/] \
  #h(6mm) #mono(size: 6.2pt, fill: ink)[7b9f0c6e-….jsonl] #h(1.5mm) #caps(size: 4pt, track: 0.2em, fill: mint.darken(28%))[written] \
  #h(6mm) #mono(size: 6.2pt)[2c4a39d0-….jsonl] #h(1.5mm) #caps(size: 4pt, track: 0.2em)[your own] \
])

// ── file contents ────────────────────────────────────────────────────────
#at(101mm, 56mm, {
  box(baseline: -0.4mm, circle(radius: 0.7mm, fill: mint, stroke: none))
  h(1.6mm)
  caps(size: 5pt, track: 0.35em)[contents]
})
#hline(101mm, W - 9mm, 60mm)
#at(101mm, 62.6mm, text(size: 11pt, weight: 250, tracking: -0.02em)[Lines, in order])

#let line-row(y, name, note, accent: muted) = {
  at(101mm, y, mono(size: 6.2pt, fill: accent, name))
  at(133mm, y, text(size: 5.6pt, fill: muted, note))
}
#line-row(74mm, "mode", [opening line])
#line-row(80mm, "user", [a prompt you typed on the web], accent: lilac.darken(25%))
#line-row(86mm, "assistant", [the reply, as one text block], accent: lilac.darken(25%))
#line-row(92mm, "…", [the rest of the window])
#line-row(98mm, "last-prompt", [leaf of the chain])
#line-row(104mm, "ai-title", [the name in the picker], accent: mint.darken(28%))

#vline(99mm, 73mm, 107mm, stroke: 0.4pt + ink.transparentize(82%))

#hline(101mm, W - 9mm, 111mm)
#at(101mm, 113.5mm, block(width: 74mm)[
  #caps(size: 4.2pt, track: 0.3em)[what /resume lists]
  #v(1.2mm)
  #mono(size: 6pt, fill: ink)[❯ Widget pipeline notes] \
  #h(3mm) #mono(size: 5.6pt)[16 hours ago · HEAD · 15KB]
])

#strip(H, [the timestamps are the web chat's own], [one write · nothing else touched])
