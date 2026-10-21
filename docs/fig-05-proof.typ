// How the thing is verified: a pure core under unit tests, the rest observed live.
#import "_fig.typ": *

#let H = 136mm
#show: setup.with(H)

#vacc(H)
#wash(W - 76mm, -36mm)
#head("05", "proof", "Tested on", "the real thing.", [
  mocks would only prove the mock. the live run \
  borrows your browser and a real repl instead.])

#vline(92mm, 56mm, H - 16mm)

// ── layers ───────────────────────────────────────────────────────────────
#at(9mm, 56mm, {
  box(baseline: -0.4mm, circle(radius: 0.7mm, fill: lilac, stroke: none))
  h(1.6mm)
  caps(size: 5pt, track: 0.35em)[layers]
})
#hline(9mm, 80mm, 60mm)
#at(9mm, 62.6mm, text(size: 11pt, weight: 250, tracking: -0.02em)[Two of them])

#let layer(y, cmd, title, body) = {
  at(9mm, y, mono(cmd, size: 6.6pt, fill: ink))
  at(9mm, y + 5mm, block(width: 74mm)[
    #caps(size: 4.4pt, track: 0.3em)[#title]
    #v(1.2mm)
    #text(size: 6pt, fill: muted)[#body]
  ])
}
#layer(74mm, "make test", "pure core, no network")[
  Normalizing, pair selection, redaction and the entry chain, against a fixture.
  Nine tests, well under a second.]
#layer(94mm, "make e2e", "the parts that cannot be faked")[
  A live page and a live repl. Fails loudly when claude.ai changes shape or the
  session format moves.]

// ── the live run ─────────────────────────────────────────────────────────
#at(101mm, 56mm, {
  box(baseline: -0.4mm, circle(radius: 0.7mm, fill: mint, stroke: none))
  h(1.6mm)
  caps(size: 5pt, track: 0.35em)[live run]
})
#hline(101mm, W - 9mm, 60mm)
#at(101mm, 62.6mm, text(size: 11pt, weight: 250, tracking: -0.02em)[Five steps, then nothing left])

#vline(102mm, 74mm, 107mm, stroke: 0.4pt + ink.transparentize(82%))
#let stp(y, accent, label, body) = {
  at(101mm, y, circle(radius: 0.7mm, fill: accent, stroke: none))
  at(106mm, y - 1.4mm, caps(size: 4.4pt, track: 0.3em)[#label])
  at(124mm, y - 1.7mm, block(width: 52mm, text(size: 6pt, fill: muted)[#body]))
}
#stp(74mm, sky, "attach")[to the tab you already have open, never launching one]
#stp(81mm, sky, "inject")[the userscript, save settings, read them back]
#stp(88mm, lilac, "convert")[the last pair with a redaction, into a scratch project]
#stp(95mm, mint, "resume")[a real repl in tmux: picker, then the rendered transcript]
#stp(102mm, amber, "remove")[the session file, the scratch dir, the tmux session]

#hline(101mm, W - 9mm, 110mm)
#at(101mm, 112.5mm, block(width: 74mm)[
  #caps(size: 4.2pt, track: 0.3em)[one step further]
  #v(1.2mm)
  #text(size: 6pt, fill: muted)[`E2E_SEND=1` sends one tiny prompt, so the imported
  session has to answer. That is the only part that spends tokens.]
])

#strip(H, [cdp for the browser · tmux for the terminal], [no mocks · no fixtures of the real thing])
