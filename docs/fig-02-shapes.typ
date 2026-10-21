// Field mapping: a web chat message, the envelope row, the transcript line.
#import "_fig.typ": *

#let H = 126mm
#show: setup.with(H)

#vacc(H)
#wash(W - 78mm, -36mm)
#head("02", "shapes", "From blocks", "to lines.", [
  three records, one meaning. the conversion keeps \
  what a transcript can carry and marks the rest.])

#let col(x, w, accent, idx, title, sub, body) = {
  at(x, 56mm, {
    box(baseline: -0.4mm, circle(radius: 0.7mm, fill: accent, stroke: none))
    h(1.6mm)
    caps(size: 5pt, track: 0.35em)[#idx]
  })
  hline(x, x + w, 60mm)
  at(x, 62.6mm, block(width: w, spacing: 0pt)[
    #set par(leading: 0.5em)
    #text(size: 11pt, weight: 250, tracking: -0.02em)[#title]
    #v(1.2mm)
    #caps(size: 4.4pt, track: 0.2em)[#sub]
  ])
  at(x, 76mm, block(width: w)[#set par(leading: 0.68em); #body])
}

#let drop = caps(size: 4.2pt, track: 0.22em, fill: amber.darken(18%))[dropped]
#let mark = caps(size: 4.2pt, track: 0.22em, fill: amber.darken(18%))[marked]
#let keep = caps(size: 4.2pt, track: 0.22em, fill: mint.darken(28%))[kept]

#col(9mm, 50mm, lilac, "01", "Web message", [claude.ai api])[
  #mono[sender: "assistant"] \
  #mono[created_at: "2026-10-20T10:28Z"] \
  #mono[content: \[] \
  #h(3mm) #mono[{ type: "thinking" }] #h(1mm) #drop \
  #h(3mm) #mono[{ type: "text" }] #h(1mm) #keep \
  #h(3mm) #mono[{ type: "image" }] #h(1mm) #mark \
  #mono[\]]
]

#col(71mm, 44mm, sky, "02", "Envelope row", [portable json])[
  #mono[role: "assistant"] \
  #mono[text: "Chunk it and fan out…"] \
  #mono[createdAt: "2026-10-20…"] \
  #mono[uuid: "a1b2c3d4…"]
  #v(2.4mm)
  #text(size: 5.6pt, fill: muted)[flat text, already redacted]
]

#col(127mm, 49mm, mint, "03", "Transcript line", [one jsonl record])[
  #mono[parentUuid: "…prior uuid"] \
  #mono[type: "assistant"] \
  #mono[message: { role, content: \[] \
  #h(3mm) #mono[{ type: "text", text }\] }] \
  #mono[uuid, timestamp, sessionId] \
  #mono[cwd, version, gitBranch]
]

#arrow(61mm, 69mm, 72mm, 1, faint)
#arrow(117mm, 125mm, 72mm, 1, faint)
#at(60.5mm, 66mm, caps(size: 4.2pt, track: 0.25em, fill: lilac.darken(25%))[flatten])
#at(116.5mm, 66mm, caps(size: 4.2pt, track: 0.25em, fill: sky.darken(20%))[stamp])

#hline(9mm, W - 9mm, 100mm)
#let note(x, w, label, body) = at(x, 103mm, block(width: w)[
  #caps(size: 4.4pt, track: 0.3em)[#label]
  #v(1.4mm)
  #text(size: 6pt, fill: muted)[#body]
])
#note(9mm, 50mm, "sender becomes role")[human and assistant map straight onto the two entry kinds.]
#note(71mm, 44mm, "blocks collapse")[one string per message, so nothing needs a renderer.]
#note(127mm, 49mm, "the chain carries")[`parentUuid` links each line to the one before it.]

#strip(H, [thinking dropped · images and tools marked], [lossy where honesty requires it])
