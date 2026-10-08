"""Generates the replication-fork SVG for DNA Lab.

Drawn to match the classroom worksheet it is quizzing: a ladder-style duplex
with twisted helix ends, the fork opening to the left, and a distinct
silhouette per enzyme — rectangle clamp for polymerase, small oval for ligase,
tilted oval for primase, triangle wedge for helicase, ball-on-stick for a free
nucleotide. Shape is what the student has to recognise, so no two parts may
share one.

Rungs are emitted here rather than hand-written because there are ~120 of them.
"""

import math

W, H = 1110, 610

TOP_T, TOP_N = 178, 238          # lagging: template backbone, new strand
BOT_N, BOT_T = 322, 382          # leading: new strand, template backbone
DUP_T, DUP_B = 254, 306          # the still-zipped parent duplex
MID = 280
FORK = 690                        # where the strands part
RUNG = 17


def rungs(x0, x1, y0, y1, step=RUNG):
    return ''.join(f'<path d="M{x} {y0}V{y1}"/>' for x in range(x0, x1 + 1, step))


def stubs(x0, x1, y, down, step=RUNG, length=13):
    """Unpaired bases: short ticks off a template with nothing to pair to."""
    d = length if down else -length
    return ''.join(f'<path d="M{x} {y}v{d}"/>' for x in range(x0, x1 + 1, step))


def helix(x0, y, amp=30, half=38, halves=4, start_up=True):
    """Two strands winding around each other.

    Starts at the full offset rather than the crossing point, so it joins a
    flat ladder cleanly: at x0 one strand is at y-amp and the other at y+amp,
    exactly where the two backbones already are. Each half-period swaps them,
    which is what reads as a twist rather than a row of lens shapes.
    """
    s = 1 if start_up else -1
    a, b, rg = [f'M{x0} {y-amp*s}'], [f'M{x0} {y+amp*s}'], []
    for i in range(halves):
        x = x0 + i * half
        top = y - amp * s if i % 2 == 0 else y + amp * s
        bot = y + amp * s if i % 2 == 0 else y - amp * s
        a.append(f'C{x+half*0.55} {top} {x+half*0.45} {bot} {x+half} {bot}')
        b.append(f'C{x+half*0.55} {bot} {x+half*0.45} {top} {x+half} {top}')
        rg.append(f'<path d="M{round(x+half/2)} {y-7}V{y+7}"/>')
    return (f'<path class="bb" d="{" ".join(a)}"/>'
            f'<path class="bb" d="{" ".join(b)}"/>'
            f'<g class="rungs">{"".join(rg)}</g>')


def pentagon(cx, cy, r):
    pts = []
    for i in range(5):
        a = math.radians(-90 + i * 72)
        pts.append(f'{cx + r * math.cos(a):.1f},{cy + r * math.sin(a):.1f}')
    return ' '.join(pts)


def nt(x, y, up=True):
    """A free nucleotide: phosphate head on a sugar-base stick."""
    d = -14 if up else 14
    return (f'<g class="nt"><circle cx="{x}" cy="{y}" r="8"/>'
            f'<path d="M{x} {y + (8 if up else -8)}v{d*-1 if up else d*-1}"/></g>')


def build():
    p = []
    a = p.append

    # ---- 5' and 3' ends.
    # The strands are antiparallel, which is the whole reason one new strand
    # runs continuously and the other has to be built backwards — so the ends
    # are marked rather than left to be taken on faith.
    #   bottom template 3' (left) -> 5' (right); top template is its mirror.
    a('<g class="ticks">')
    for x, y, t, anchor in (
            (72, TOP_T + 5, "5", 'end'),      # top template, far left
            (72, TOP_N + 5, "3", 'end'),      # new lagging strand
            (72, BOT_N + 5, "5", 'end'),      # new leading strand
            (72, BOT_T + 5, "3", 'end'),      # bottom template, far left
            (1052, DUP_T + 5, "3", 'start'),  # top strand, far right
            (1052, DUP_B + 5, "5", 'start')): # bottom strand, far right
        a(f'<text x="{x}" y="{y}" text-anchor="{anchor}" class="tick">'
          f'{t}&#8242;</text>')
    a('</g>')

    # ---- parent duplex, still zipped, with the wound tail beyond it
    a(f'<g class="struct">')
    a(f'<path class="bb" d="M{FORK+70} {DUP_T}H880"/>')
    a(f'<path class="bb" d="M{FORK+70} {DUP_B}H880"/>')
    a(f'<g class="rungs">{rungs(FORK+78, 872, DUP_T, DUP_B)}</g>')
    a(helix(880, MID, amp=26, half=40, halves=4))
    a('</g>')

    # ---- the fork: templates peeling apart
    a(f'<path class="bb" d="M{FORK+70} {DUP_T} C{FORK+26} {DUP_T} {FORK+10} {TOP_T+26} {FORK} {TOP_T} H192"/>')
    a(f'<path class="bb" d="M{FORK+70} {DUP_B} C{FORK+26} {DUP_B} {FORK+10} {BOT_T-26} {FORK} {BOT_T} H192"/>')
    # the unreplicated tails, wound; they start where the ladders stop
    a(helix(96, (TOP_T + TOP_N) // 2, amp=30, half=32, halves=3, start_up=True))
    a(helix(96, (BOT_N + BOT_T) // 2, amp=30, half=32, halves=3, start_up=True))

    # ---- lagging strand (top): fragments with gaps, unpaired near the fork.
    # The whole ladder is the click target, so the rungs sit inside the part.
    a('<g class="part strand" data-id="d_lagging" data-name="Lagging strand">')
    for x0, x1 in ((192, 300), (326, 452), (486, 566)):
        a(f'<rect class="hit" x="{x0}" y="{TOP_T}" width="{x1-x0}" height="{TOP_N-TOP_T}"/>')
        a(f'<path class="newstrand" d="M{x0} {TOP_N}H{x1}"/>')
        a(f'<g class="rungs paired">{rungs(x0 + 8, x1 - 4, TOP_T, TOP_N)}</g>')
    a(f'<text x="600" y="{TOP_N+22}" class="tick">5&#8242;</text>')
    a(f'<text x="368" y="130" class="plabel">Lagging strand</text>')
    a('</g>')
    a(f'<g class="rungs">{stubs(584, FORK - 8, TOP_T, True)}</g>')

    # ---- leading strand (bottom): one continuous piece chasing the fork
    a('<g class="part strand" data-id="d_leading" data-name="Leading strand">')
    a(f'<rect class="hit" x="192" y="{BOT_N}" width="356" height="{BOT_T-BOT_N}"/>')
    a(f'<path class="newstrand" d="M192 {BOT_N}H548"/>')
    a(f'<g class="rungs paired">{rungs(200, 544, BOT_N, BOT_T)}</g>')
    a(f'<text x="600" y="{BOT_N-12}" class="tick">3&#8242;</text>')
    a(f'<text x="368" y="440" class="plabel">Leading strand</text>')
    a('</g>')
    a(f'<g class="rungs">{stubs(584, FORK - 8, BOT_T, False)}</g>')

    # ---- free nucleotides, waiting at the opened fork
    a('<g class="part" data-id="d_nucleotide" data-name="Nucleotide">')
    for x, y in ((600, 214), (634, 206), (666, 200)):
        a(nt(x, y, up=True))
    for x, y in ((600, 346), (634, 354), (666, 360)):
        a(nt(x, y, up=False))
    a('<text x="624" y="150" class="plabel">Nucleotide</text>')
    a('</g>')

    # ---- helicase: the wedge prying the strands apart
    a('<g class="part" data-id="d_helicase" data-name="Helicase">')
    a(f'<polygon class="enz wedge" points="{FORK+2},{MID-38} {FORK+2},{MID+38} {FORK+62},{MID}"/>')
    a(f'<text x="800" y="356" class="plabel">Helicase</text>')
    a('</g>')

    # ---- primase: tilted oval laying the next primer, nearest the fork
    a('<g class="part" data-id="d_primase" data-name="Primase">')
    a(f'<ellipse class="enz" cx="566" cy="{TOP_N+2}" rx="23" ry="15" '
      f'transform="rotate(-24 566 {TOP_N+2})"/>')
    a(f'<text x="548" y="{TOP_N+56}" class="plabel">Primase</text>')
    a('</g>')

    # ---- one nucleotide, enlarged in the empty band below the fork. The main
    # drawing says where things happen; this says what DNA is made of. A leader
    # ties it back to a free nucleotide at the fork so it reads as a zoom
    # rather than a second, unrelated picture.
    a('<path class="leader" d="M604 356 C560 440 470 500 404 516"/>')

    a('<g class="part" data-id="d_phosphate" data-name="Phosphate group">')
    a('<circle class="hit" cx="186" cy="528" r="27"/>')
    a('<circle class="unit" cx="186" cy="528" r="18"/>')
    a('<text x="186" y="486" class="plabel">Phosphate group</text>')
    a('</g>')

    a('<path class="bond" d="M204 528H230"/>')

    a('<g class="part" data-id="d_sugar" data-name="Sugar">')
    a('<circle class="hit" cx="254" cy="528" r="29"/>')
    a(f'<polygon class="unit" points="{pentagon(254, 530, 24)}"/>')
    a('<text x="254" y="590" class="plabel">Sugar</text>')
    a('</g>')

    a('<path class="bond" d="M278 528H302"/>')

    a('<g class="part" data-id="d_base" data-name="Nitrogenous base">')
    a('<rect class="hit" x="300" y="500" width="100" height="56"/>')
    a('<path class="unit" d="M302 508h64l18 20-18 20h-64z"/>')
    a('<text x="414" y="534" text-anchor="start" class="plabel">Nitrogenous base</text>')
    a('</g>')

    # ---- ligase: small upright oval sitting in the nick it seals
    a('<g class="part" data-id="d_ligase" data-name="Ligase">')
    a(f'<ellipse class="enz" cx="313" cy="{TOP_N-6}" rx="15" ry="22"/>')
    a(f'<text x="330" y="{TOP_N+52}" class="plabel">Ligase</text>')
    a('</g>')

    # ---- DNA polymerase: a clamp straddling the whole duplex, one per strand
    a('<g class="part" data-id="d_polymerase" data-name="DNA polymerase">')
    a(f'<rect class="enz" x="226" y="{TOP_T-12}" width="34" height="{TOP_N-TOP_T+24}" rx="4"/>')
    a(f'<rect class="enz" x="548" y="{BOT_N-12}" width="34" height="{BOT_T-BOT_N+24}" rx="4"/>')
    a(f'<path class="flow" d="M590 {(BOT_N+BOT_T)//2}h34" marker-end="url(#ah)"/>')
    a(f'<text x="226" y="{TOP_T-30}" class="plabel">DNA polymerase</text>')
    a('</g>')

    return '\n        '.join(p)


SVG = f'''      <svg viewBox="0 0 {W} {H}" role="img"
           aria-label="A DNA replication fork drawn as a ladder: the parent double helix is unzipped by a wedge-shaped helicase, free nucleotides pair with the opened templates, rectangular DNA polymerase clamps build the new strands, a tilted primase sits at the fork, and a small ligase fills the nick between two fragments.">
        <defs>
          <marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7"
                  markerHeight="7" orient="auto-start-reverse">
            <polygon points="0,1 10,5 0,9" fill="currentColor"/>
          </marker>
        </defs>
        {build()}
      </svg>'''

if __name__ == '__main__':
    print(SVG)
