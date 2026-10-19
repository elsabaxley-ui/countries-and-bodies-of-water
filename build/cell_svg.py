"""Generates the two Cell Division filmstrips: Mitosis, and Meiosis I + II.

Same drawing rules as fork_svg.py: no words on the picture (a part's name is
the quiz answer), currentColor structure, and one accent color reserved for
whichever part is under question.

The one addition this content needs that DNA Lab didn't: two chromosomes have
to read as *different individuals* for pairing, crossing over and independent
assortment to mean anything. Two fixed hues (--chromA/--chromB) mark parental
origin; size (long/short) marks which homologous pair — four chromosomes,
2 pairs, 2n=4, the minimum that can show both ideas at once.
"""

import math

W = 1220

# ---------------------------------------------------------------- geometry
def _rot(cx, cy, dx, dy, deg):
    r = math.radians(deg)
    return (cx + dx*math.cos(r) - dy*math.sin(r),
            cy + dx*math.sin(r) + dy*math.cos(r))

def chrom(cx, cy, color, long_, kind, rot=0):
    """One chromosome, drawn as:
       x    replicated, two sister chromatids   -> a bowtie/X with a centre dot
       bar  single chromatid (post-separation)  -> one short rod
    `long_` picks which homologous pair (bigger vs smaller arm length).
    """
    a = 15 if long_ else 10
    cls = f'chrom {color}'
    if kind == 'x':
        p1 = _rot(cx, cy, -a, -a, rot); p2 = _rot(cx, cy, a, a, rot)
        p3 = _rot(cx, cy, -a, a, rot);  p4 = _rot(cx, cy, a, -a, rot)
        return (f'<path class="{cls}" d="M{p1[0]:.1f} {p1[1]:.1f} L{p2[0]:.1f} {p2[1]:.1f} '
                f'M{p3[0]:.1f} {p3[1]:.1f} L{p4[0]:.1f} {p4[1]:.1f}"/>'
                f'<circle class="chromdot" cx="{cx:.1f}" cy="{cy:.1f}" r="1.6"/>')
    p1 = _rot(cx, cy, 0, -a, rot); p2 = _rot(cx, cy, 0, a, rot)
    return f'<path class="{cls}" d="M{p1[0]:.1f} {p1[1]:.1f} L{p2[0]:.1f} {p2[1]:.1f}"/>'

def scribble(cx, cy, seed=0):
    """Chromatin: a tangled, non-chromosome-shaped squiggle. Deliberately not
    color-coded — individual chromosomes aren't distinguishable yet."""
    pts = []
    n = 7
    for i in range(n+1):
        t = i/n
        ang = t*5.4 + seed
        r = 10 + 10*math.sin(t*4+seed)
        pts.append((cx + r*math.cos(ang), cy + r*math.sin(ang)))
    d = f'M{pts[0][0]:.1f} {pts[0][1]:.1f} ' + ' '.join(
        f'L{x:.1f} {y:.1f}' for x, y in pts[1:])
    return f'<path class="chromatin" d="{d}"/>'

def nucleus(cx, cy, r, dashed):
    cls = 'nucleus dashed' if dashed else 'nucleus'
    return f'<circle class="{cls}" cx="{cx}" cy="{cy}" r="{r}"/>'

def pole(cx, cy, r, side):
    """A small aster mark at the edge of the cell, the spindle's origin."""
    x = cx - r if side < 0 else cx + r
    rays = []
    for k in range(-1, 2):
        ang = 20*k
        x2, y2 = _rot(x, cy, 10*(1 if side < 0 else -1), 0, ang)
        rays.append(f'<path class="aster" d="M{x:.1f} {cy:.1f} L{x2:.1f} {y2:.1f}"/>')
    return ''.join(rays)

def fiber(cx, cy, r, side, tx, ty):
    x = cx - r if side < 0 else cx + r
    return f'<path class="fiber" d="M{x:.1f} {cy:.1f} L{tx:.1f} {ty:.1f}"/>'

def hit(cx, cy, r):
    return f'<circle class="hit" cx="{cx}" cy="{cy}" r="{r}"/>'

def cellbody(cx, cy, r):
    return f'<circle class="cellbody" cx="{cx}" cy="{cy}" r="{r}"/>'

def part(id_, name, inner, interactive=True):
    tag = 'part' if interactive else 'context'
    cls = f'class="{tag}"'
    attrs = f' data-id="{id_}" data-name="{name}"' if interactive else ''
    return f'<g {cls}{attrs}>{inner}</g>'

def label(cx, cy, name):
    return f'<text x="{cx}" y="{cy}" class="plabel">{name}</text>'

def arrow(x1, y, x2):
    return f'<path class="flow" d="M{x1} {y}H{x2}" marker-end="url(#cah)"/>'


# ---------------------------------------------------------------- Mitosis
def build_mitosis():
    r = 62
    y = 110
    xs = [110 + i*200 for i in range(6)]
    names = ['Interphase', 'Prophase', 'Metaphase', 'Anaphase', 'Telophase', 'Cytokinesis']
    ids = ['cm_interphase', 'cm_prophase', 'cm_metaphase', 'cm_anaphase',
           'cm_telophase', 'cm_cytokinesis']
    out = []
    for i in range(5):
        out.append(arrow(xs[i]+r+6, y, xs[i+1]-r-6))

    # 1 Interphase — chromatin, solid nucleus
    out.append(part(ids[0], names[0],
        hit(xs[0], y, r+10) + cellbody(xs[0], y, r) +
        nucleus(xs[0], y, 42, False) + scribble(xs[0], y) +
        label(xs[0], y+r+32, names[0])))

    # 2 Prophase — nucleus breaking down (dashed), 4 condensed chromosomes, loose
    spots = [(-22,-18),(18,-20),(-16,20),(20,16)]
    chroms = ''.join(chrom(xs[1]+dx, y+dy, c, l, 'x', rot)
                      for (dx,dy),c,l,rot in zip(spots, ['ca','cb','ca','cb'], [1,1,0,0], [20,-15,10,-25]))
    out.append(part(ids[1], names[1],
        hit(xs[1], y, r+10) + cellbody(xs[1], y, r) +
        nucleus(xs[1], y, 46, True) + chroms +
        label(xs[1], y+r+32, names[1])))

    # 3 Metaphase — 4 chromosomes aligned on the equator, spindle from both poles
    ys4 = [-33,-11,11,33]
    fibers = ''.join(fiber(xs[2], y, r, -1, xs[2], y+dy) + fiber(xs[2], y, r, 1, xs[2], y+dy) for dy in ys4)
    chroms = ''.join(chrom(xs[2], y+dy, c, l, 'x', 90) for dy,c,l in
                      zip(ys4, ['ca','cb','ca','cb'], [1,1,0,0]))
    out.append(part(ids[2], names[2],
        hit(xs[2], y, r+10) + cellbody(xs[2], y, r) +
        pole(xs[2], y, r, -1) + pole(xs[2], y, r, 1) + fibers + chroms +
        label(xs[2], y+r+32, names[2])))

    # 4 Anaphase — sister chromatids split, two clusters of 4 single rods moving apart
    left = [(-36,-24),(-30,0),(-34,24)]
    right = [(34,-24),(30,0),(36,24)]
    def cluster(pts, colors):
        return ''.join(chrom(xs[3]+dx, y+dy, c, l, 'bar', 90)
                        for (dx,dy),c,l in zip(pts, colors, [1,0,1]))
    chroms = cluster(left, ['ca','ca','cb']) + cluster(right, ['cb','cb','ca'])
    fibers = ''.join(fiber(xs[3], y, r, -1, xs[3]+dx, y+dy) for dx,dy in left) + \
             ''.join(fiber(xs[3], y, r, 1, xs[3]+dx, y+dy) for dx,dy in right)
    out.append(part(ids[3], names[3],
        hit(xs[3], y, r+10) + cellbody(xs[3], y, r) +
        pole(xs[3], y, r, -1) + pole(xs[3], y, r, 1) + fibers + chroms +
        label(xs[3], y+r+32, names[3])))

    # 5 Telophase — pinching cell, two reforming nuclei
    out.append(part(ids[4], names[4],
        hit(xs[4], y, r+12) +
        f'<ellipse class="cellbody" cx="{xs[4]}" cy="{y}" rx="92" ry="60"/>' +
        nucleus(xs[4]-46, y, 34, True) + nucleus(xs[4]+46, y, 34, True) +
        ''.join(chrom(xs[4]-46+dx, y+dy, c, l, 'bar', 60) for (dx,dy),c,l in
                zip([(-10,-10),(10,6)], ['ca','cb'], [1,0])) +
        ''.join(chrom(xs[4]+46+dx, y+dy, c, l, 'bar', 60) for (dx,dy),c,l in
                zip([(-10,-6),(10,10)], ['cb','ca'], [1,0])) +
        label(xs[4], y+76, names[4])))

    # 6 Cytokinesis — two separate cells, chromatin decondensing
    out.append(part(ids[5], names[5],
        hit(xs[5]-40, y, 44) + hit(xs[5]+40, y, 44) +
        cellbody(xs[5]-40, y, 38) + cellbody(xs[5]+40, y, 38) +
        nucleus(xs[5]-40, y, 24, False) + nucleus(xs[5]+40, y, 24, False) +
        scribble(xs[5]-40, y, 1) + scribble(xs[5]+40, y, 3) +
        label(xs[5], y+r+32, names[5])))

    return f'<svg viewBox="0 0 {W} 260" role="img" aria-label="Mitosis: a single cell progresses through interphase, prophase, metaphase, anaphase, telophase and cytokinesis to produce two identical diploid cells."><defs><marker id="cah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><polygon points="0,1 10,5 0,9" fill="currentColor"/></marker></defs>{"".join(out)}</svg>'


# ---------------------------------------------------------------- Meiosis
def build_meiosis():
    r = 62
    y1 = 110
    y2 = 400
    xs = [110 + i*200 for i in range(6)]
    out = []

    # ---- Meiosis I row
    for i in range(5):
        out.append(arrow(xs[i]+r+6, y1, xs[i+1]-r-6))

    # context frame: interphase, shared concept with mitosis, not re-quizzed
    out.append(part('', '',
        hit(xs[0], y1, r+10) + cellbody(xs[0], y1, r) +
        nucleus(xs[0], y1, 42, False) + scribble(xs[0], y1, 2),
        interactive=False))

    names1 = ['Prophase I', 'Metaphase I', 'Anaphase I', 'Telophase I', 'Cytokinesis I']
    ids1 = ['c1_prophase', 'c1_metaphase', 'c1_anaphase', 'c1_telophase', 'c1_cytokinesis']

    # Prophase I — two homologous PAIRS (tetrads); crossing over shown on one
    big = (xs[1]-13, y1-18); bigpair = (xs[1]+13, y1-18)
    small = (xs[1]-11, y1+20); smallpair = (xs[1]+11, y1+20)
    out.append(part(ids1[0], names1[0],
        hit(xs[1], y1, r+10) + cellbody(xs[1], y1, r) + nucleus(xs[1], y1, 46, True) +
        f'<path class="chiasma" d="M{xs[1]-6} {y1-22} L{xs[1]+6} {y1-14}"/>' +
        chrom(*big, 'ca', True, 'x', 25) + chrom(*bigpair, 'cb', True, 'x', -25) +
        chrom(*small, 'ca', False, 'x', 18) + chrom(*smallpair, 'cb', False, 'x', -18) +
        label(xs[1], y1+r+32, names1[0])))

    # Metaphase I — the two tetrads line up side by side on the equator
    out.append(part(ids1[1], names1[1],
        hit(xs[2], y1, r+10) + cellbody(xs[2], y1, r) +
        pole(xs[2], y1, r, -1) + pole(xs[2], y1, r, 1) +
        fiber(xs[2], y1, r, -1, xs[2]-14, y1-20) + fiber(xs[2], y1, r, -1, xs[2]-14, y1+16) +
        fiber(xs[2], y1, r, 1, xs[2]+14, y1-20) + fiber(xs[2], y1, r, 1, xs[2]+14, y1+16) +
        chrom(xs[2]-14, y1-20, 'ca', True, 'x', 90) + chrom(xs[2]+14, y1-20, 'cb', True, 'x', 90) +
        chrom(xs[2]-14, y1+16, 'ca', False, 'x', 90) + chrom(xs[2]+14, y1+16, 'cb', False, 'x', 90) +
        label(xs[2], y1+r+32, names1[1])))

    # Anaphase I — whole homologs (still X, 2 chromatids) pulled apart; each
    # pole gets one of each colour, showing independent assortment
    out.append(part(ids1[2], names1[2],
        hit(xs[3], y1, r+10) + cellbody(xs[3], y1, r) +
        pole(xs[3], y1, r, -1) + pole(xs[3], y1, r, 1) +
        fiber(xs[3], y1, r, -1, xs[3]-34, y1-18) + fiber(xs[3], y1, r, -1, xs[3]-32, y1+16) +
        fiber(xs[3], y1, r, 1, xs[3]+34, y1-16) + fiber(xs[3], y1, r, 1, xs[3]+32, y1+18) +
        chrom(xs[3]-34, y1-18, 'ca', True, 'x', 90) + chrom(xs[3]-32, y1+16, 'cb', False, 'x', 90) +
        chrom(xs[3]+34, y1-16, 'cb', True, 'x', 90) + chrom(xs[3]+32, y1+18, 'ca', False, 'x', 90) +
        label(xs[3], y1+r+32, names1[2])))

    # Telophase I — nuclei reforming, each with 2 chromosomes (still 2 chromatids)
    out.append(part(ids1[3], names1[3],
        hit(xs[4], y1, r+12) +
        f'<ellipse class="cellbody" cx="{xs[4]}" cy="{y1}" rx="92" ry="60"/>' +
        nucleus(xs[4]-46, y1, 34, True) + nucleus(xs[4]+46, y1, 34, True) +
        chrom(xs[4]-46-10, y1-10, 'ca', True, 'x', 70) + chrom(xs[4]-46+10, y1+10, 'cb', False, 'x', 70) +
        chrom(xs[4]+46-10, y1-10, 'cb', True, 'x', 70) + chrom(xs[4]+46+10, y1+10, 'ca', False, 'x', 70) +
        label(xs[4], y1+76, names1[3])))

    # Cytokinesis I — two haploid cells, each chromosome still 2 chromatids
    out.append(part(ids1[4], names1[4],
        hit(xs[5]-40, y1, 44) + hit(xs[5]+40, y1, 44) +
        cellbody(xs[5]-40, y1, 38) + cellbody(xs[5]+40, y1, 38) +
        nucleus(xs[5]-40, y1, 26, False) + nucleus(xs[5]+40, y1, 26, False) +
        chrom(xs[5]-40-8, y1-6, 'ca', True, 'x', 40) + chrom(xs[5]-40+8, y1+7, 'cb', False, 'x', -30) +
        chrom(xs[5]+40-8, y1-6, 'cb', True, 'x', 40) + chrom(xs[5]+40+8, y1+7, 'ca', False, 'x', -30) +
        label(xs[5], y1+r+32, names1[4])))

    # ---- divider between the two divisions (no text — a plain visual break)
    out.append(f'<path class="divider" d="M30 {(y1+r+70+y2-70)//2}H{W-30}"/>')

    # ---- Meiosis II row: both Meiosis-I products divide in parallel, so every
    # active frame shows two mini-cells
    mr = 34
    for i in range(5):
        out.append(arrow(xs[i]+ (24 if i==0 else mr+4), y2, xs[i+1]-mr-4))

    # context: "no interphase" — an empty, de-emphasised placeholder
    out.append(f'<circle class="noint" cx="{xs[0]}" cy="{y2}" r="24"/>'
               f'<path class="noint" d="M{xs[0]-17} {y2-17}L{xs[0]+17} {y2+17}"/>')

    names2 = ['Prophase II', 'Metaphase II', 'Anaphase II', 'Telophase II', 'Cytokinesis II']
    ids2 = ['c2_prophase', 'c2_metaphase', 'c2_anaphase', 'c2_telophase', 'c2_cytokinesis']

    def minicell(cx, cy, inner):
        return hit(cx, cy, mr+8) + cellbody(cx, cy, mr) + inner

    # Prophase II — nucleus breaks down again in both
    def p2(cx, cy, ca, cb):
        return nucleus(cx, cy, 24, True) + chrom(cx-8, cy-6, ca, True, 'x', 35) + chrom(cx+8, cy+6, cb, False, 'x', -25)
    out.append(part(ids2[0], names2[0],
        minicell(xs[1]-38, y2, p2(xs[1]-38, y2, 'ca', 'cb')) +
        minicell(xs[1]+38, y2, p2(xs[1]+38, y2, 'cb', 'ca')) +
        label(xs[1], y2+58, names2[0])))

    # Metaphase II — single chromosomes line up individually (not paired)
    def m2(cx, cy, ca, cb):
        return (pole(cx, cy, mr, -1) + pole(cx, cy, mr, 1) +
                fiber(cx, cy, mr, -1, cx, cy-10) + fiber(cx, cy, mr, 1, cx, cy-10) +
                fiber(cx, cy, mr, -1, cx, cy+10) + fiber(cx, cy, mr, 1, cx, cy+10) +
                chrom(cx, cy-10, ca, True, 'x', 90) + chrom(cx, cy+10, cb, False, 'x', 90))
    out.append(part(ids2[1], names2[1],
        minicell(xs[2]-38, y2, m2(xs[2]-38, y2, 'ca', 'cb')) +
        minicell(xs[2]+38, y2, m2(xs[2]+38, y2, 'cb', 'ca')) +
        label(xs[2], y2+58, names2[1])))

    # Anaphase II — sister chromatids finally split, pulled to each mini-pole
    def a2(cx, cy, ca, cb):
        return (pole(cx, cy, mr, -1) + pole(cx, cy, mr, 1) +
                fiber(cx, cy, mr, -1, cx-16, cy-9) + fiber(cx, cy, mr, -1, cx-16, cy+11) +
                fiber(cx, cy, mr, 1, cx+16, cy-11) + fiber(cx, cy, mr, 1, cx+16, cy+9) +
                chrom(cx-16, cy-9, ca, True, 'bar', 90) + chrom(cx-16, cy+11, cb, False, 'bar', 90) +
                chrom(cx+16, cy-11, ca, True, 'bar', 90) + chrom(cx+16, cy+9, cb, False, 'bar', 90))
    out.append(part(ids2[2], names2[2],
        minicell(xs[3]-38, y2, a2(xs[3]-38, y2, 'ca', 'cb')) +
        minicell(xs[3]+38, y2, a2(xs[3]+38, y2, 'cb', 'ca')) +
        label(xs[3], y2+58, names2[2])))

    # Telophase II — four nuclei reforming, two per original mini-cell
    def t2(cx, cy, ca, cb):
        return (nucleus(cx-15, cy, 15, True) + nucleus(cx+15, cy, 15, True) +
                chrom(cx-15, cy-5, ca, True, 'bar', 90) + chrom(cx-15, cy+6, cb, False, 'bar', 90) +
                chrom(cx+15, cy-5, ca, True, 'bar', 90) + chrom(cx+15, cy+6, cb, False, 'bar', 90))
    out.append(part(ids2[3], names2[3],
        minicell(xs[4]-38, y2, t2(xs[4]-38, y2, 'ca', 'cb')) +
        minicell(xs[4]+38, y2, t2(xs[4]+38, y2, 'cb', 'ca')) +
        label(xs[4], y2+58, names2[3])))

    # Cytokinesis II — four separate haploid cells, single-chromatid chromosomes
    cx5 = xs[5]
    offs = [-78, -26, 26, 78]
    inner = ''.join(
        hit(cx5+o, y2, 30) + cellbody(cx5+o, y2, 26) + nucleus(cx5+o, y2, 17, False) +
        chrom(cx5+o, y2-6, 'ca', True, 'bar', 90) + chrom(cx5+o, y2+7, 'cb', False, 'bar', 90)
        for o in offs)
    out.append(part(ids2[4], names2[4], inner + label(cx5, y2+58, names2[4])))

    return (f'<svg viewBox="0 0 {W} 490" role="img" '
            f'aria-label="Meiosis: a cell goes through prophase I, where homologous chromosomes pair and cross over, '
            f'metaphase I, anaphase I, where whole homologous chromosomes separate, and cytokinesis I to make two '
            f'haploid cells; those two cells then both go through meiosis II in parallel, where sister chromatids '
            f'finally split, producing four genetically unique haploid cells.">'
            f'<defs><marker id="cah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" '
            f'orient="auto-start-reverse"><polygon points="0,1 10,5 0,9" fill="currentColor"/></marker></defs>'
            f'{"".join(out)}</svg>')


MITOSIS_SVG = build_mitosis()
MEIOSIS_SVG = build_meiosis()

if __name__ == '__main__':
    open('cell_mitosis_preview.svg', 'w').write(MITOSIS_SVG)
    open('cell_meiosis_preview.svg', 'w').write(MEIOSIS_SVG)
    print('wrote previews')
