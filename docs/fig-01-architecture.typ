// Architecture figure: browser half, file contract, terminal half.
#import "_fig.typ": *

#let H = 80mm
#show: setup.with(H)

// ── atmosphere ───────────────────────────────────────────────────────────
#vacc(H)
#wash(W - 82mm, -34mm)

// ── headline column ──────────────────────────────────────────────────────
#at(9mm, 10mm, caps[Figure 01 · web-to-cc])

#at(8.4mm, 17mm, block(spacing: 0pt)[
  #set par(leading: 0.1em)
  #text(size: 38pt, weight: 250, tracking: -0.04em)[One] \
  #text(size: 38pt, weight: 300, tracking: -0.04em,
        fill: paper.transparentize(100%), stroke: 0.35pt + ink.transparentize(40%))[seam.]
])

#at(9mm, 50mm, text(size: 6.6pt, tracking: 0.1em, fill: faint)[
  two halves, neither importing \ the other, meeting in a file.])

#hline(9mm, 21mm, 62.6mm, stroke: 0.4pt + ink)
#at(25mm, 61.5mm, caps(size: 5pt, track: 0.3em)[read · reshape · place])

// ── stages ───────────────────────────────────────────────────────────────
#let NY = 22mm
#let RY = 26.5mm

#let node(x, w, idx, accent, name, sub, body) = {
  at(x, NY, {
    box(baseline: -0.4mm, circle(radius: 0.7mm, fill: accent, stroke: none))
    h(1.6mm)
    caps(size: 5pt, track: 0.35em)[#idx]
  })
  hline(x, x + w, RY)
  at(x, RY + 2.6mm, block(width: w, spacing: 0pt)[
    #set par(leading: 0.55em)
    #text(size: 14pt, weight: 250, tracking: -0.02em)[#name]
    #v(1.4mm)
    #caps(size: 4.4pt, track: 0.2em)[#sub]
    #v(3.2mm)
    #text(size: 6.4pt, fill: muted)[#body]
  ])
}

#node(62mm, 26mm, "01", lilac, "Userscript", [browser · no build])[
  Fetches the chat from the page's own API. Flattens blocks to text.]

#node(103mm, 24mm, "02", sky, "Envelope", [json · versioned])[
  #mono[{role, text, createdAt}] and the chat's name. Hand-editable.]

#node(146mm, 28mm, "03", mint, "Transcript", [jsonl · parent-chained])[
  Written where #mono(size: 6.2pt)[/resume] already looks, under the project path.]

// 01 → 02
#at(90mm, 30.2mm, caps(size: 4.6pt, track: 0.3em, fill: lilac.darken(25%))[export])
#arrow(90mm, 101mm, 33.6mm, 1, faint)
#at(90mm, 35mm, text(size: 5.4pt, fill: muted)[file or clipboard \ pairs · redaction])

// 02 → 03
#at(129mm, 30.2mm, caps(size: 4.6pt, track: 0.3em, fill: sky.darken(20%))[convert])
#arrow(129mm, 144mm, 33.6mm, 1, sky.darken(10%))
#at(129mm, 35mm, text(size: 5.4pt, fill: muted)[pure function, \ then one write])

// ── vertical right column ────────────────────────────────────────────────
#at(176.5mm, 0mm, block(height: H - 11mm, width: 4mm,
  align(horizon + center, rotate(90deg, reflow: true,
    caps(size: 4.8pt, track: 0.4em)[Web #h(5mm) Session #h(5mm) 2026]))))

#strip(H, [No package.json · no deps · no account · no server], [Tampermonkey · node · jsonl])
