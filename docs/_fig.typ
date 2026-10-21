// Shared ink and drawing helpers for the figures in this folder.
#let ink = rgb("#26262d")
#let muted = rgb("#55555f")
#let paper = rgb("#ffffff")

#let lilac = rgb("#a78bfa")
#let mint = rgb("#34d399")
#let sky = rgb("#60a5fa")
#let amber = rgb("#f59e0b")
#let faint = ink.transparentize(38%)
#let rule-c = ink.transparentize(88%)

#let W = 184mm

// Use as: #show: setup.with(H)
#let setup(height, doc) = {
  set page(width: W, height: height, margin: 0mm, fill: paper)
  set text(font: "Ubuntu", weight: 300, size: 7pt, fill: ink)
  doc
}

#let caps(s, size: 5.2pt, track: 0.45em, fill: faint) = text(
  size: size, weight: 300, tracking: track, fill: fill, upper(s))

#let mono(s, size: 6.2pt, fill: muted) = text(font: "Ubuntu Mono", size: size, fill: fill, s)

#let at(x, y, body) = place(top + left, dx: x, dy: y, body)

#let hline(x0, x1, y, stroke: 0.4pt + rule-c) = at(0mm, 0mm,
  line(start: (x0, y), end: (x1, y), stroke: stroke))

#let vline(x, y0, y1, stroke: 0.4pt + rule-c) = at(0mm, 0mm,
  line(start: (x, y0), end: (x, y1), stroke: stroke))

// Hairline arrow with an open chevron head. dir: 1 = right, -1 = left.
#let arrow(x0, x1, y, dir, color) = {
  hline(x0, x1, y, stroke: 0.5pt + color)
  let tip = if dir > 0 { x1 } else { x0 }
  let back = tip - dir * 1.4mm
  at(0mm, 0mm, line(start: (tip, y), end: (back, y - 0.9mm), stroke: 0.5pt + color))
  at(0mm, 0mm, line(start: (tip, y), end: (back, y + 0.9mm), stroke: 0.5pt + color))
}

#let vacc(height) = at(0mm, 0mm, rect(width: 0.8mm, height: height, stroke: none,
  fill: gradient.linear(lilac, mint, sky, angle: 90deg)))

#let wash(x, y) = at(x, y, circle(radius: 52mm, stroke: none, fill: gradient.radial(
  lilac.transparentize(91%), sky.transparentize(95%),
  paper.transparentize(100%), paper.transparentize(100%))))

// Figure slug, headline in two weights, and the footer strip.
#let head(num, slug, solid, outline, blurb) = {
  at(9mm, 10mm, caps[Figure #num · #slug])
  at(8.4mm, 17mm, block(spacing: 0pt)[
    #set par(leading: 0.1em)
    #text(size: 30pt, weight: 250, tracking: -0.04em)[#solid] \
    #text(size: 30pt, weight: 300, tracking: -0.04em,
          fill: paper.transparentize(100%), stroke: 0.35pt + ink.transparentize(40%))[#outline]
  ])
  at(9mm, 41mm, text(size: 6.6pt, tracking: 0.1em, fill: faint, blurb))
}

#let strip(height, lhs, rhs) = {
  hline(0.8mm, W, height - 11mm, stroke: 0.4pt + ink.transparentize(90%))
  at(9mm, height - 6.6mm, caps(size: 4.8pt, track: 0.4em, lhs))
  at(0mm, height - 6.6mm, block(width: W - 9mm,
    align(right, caps(size: 4.8pt, track: 0.4em, rhs))))
}
