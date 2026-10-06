"""Majority-religion data for the Atlas Drill religions tab.

Scope and judgement calls, written down because this is study material:

* "Majority" means the largest religious group *in that country*, which is what
  the assignment asks for — not where a religion's adherents mostly live.
* Countries with no clear answer are deliberately left out rather than guessed:
  a quiz that teaches a contested answer is worse than a shorter quiz. The
  OMITTED table at the bottom records each one and why.
* Where a simplified AP-style map and the census-level truth disagree, this
  follows the simplified map, because that is what the 3.2 slides show. Those
  cases are marked `simplified`.
"""

RELIGIONS = [
    ('catholic',  'Roman Catholic',       'Israel'),
    ('protestant','Protestant',           'Israel'),
    ('orthodox',  'Eastern Orthodox',     'Israel'),
    ('sunni',     'Sunni Islam',          'Saudi Arabia'),
    ('shia',      'Shia Islam',           'Saudi Arabia'),
    ('buddhism',  'Buddhism',             'India'),
    ('sikhism',   'Sikhism',              'India'),
    ('hinduism',  'Hinduism',             'India'),
    ('judaism',   'Judaism',              'Israel'),
]

# Extra wording shown with a hearth answer, since three countries cover nine
# hearths and the distinction is the point.
HEARTH_NOTE = {
    'catholic':  'All of Christianity traces to Israel.',
    'protestant':'All of Christianity traces to Israel.',
    'orthodox':  'All of Christianity traces to Israel.',
    'sunni':     'All of Islam traces to Saudi Arabia.',
    'shia':      'All of Islam traces to Saudi Arabia.',
    'buddhism':  'Northern India.',
    'sikhism':   'The Punjab region of India.',
    'hinduism':  'India.',
    'judaism':   'Israel.',
}

MAJORITY = {
    # ---- Roman Catholic -------------------------------------------------
    'Mexico': 'catholic', 'Guatemala': 'catholic', 'Honduras': 'catholic',
    'El Salvador': 'catholic', 'Nicaragua': 'catholic', 'Costa Rica': 'catholic',
    'Panama': 'catholic', 'Cuba': 'catholic', 'Dominican Rep.': 'catholic',
    'Haiti': 'catholic', 'Puerto Rico': 'catholic',
    'Colombia': 'catholic', 'Venezuela': 'catholic', 'Ecuador': 'catholic',
    'Peru': 'catholic', 'Bolivia': 'catholic', 'Brazil': 'catholic',
    'Paraguay': 'catholic', 'Argentina': 'catholic', 'Chile': 'catholic',
    'Uruguay': 'catholic',
    'Spain': 'catholic', 'Portugal': 'catholic', 'France': 'catholic',
    'Italy': 'catholic', 'Ireland': 'catholic', 'Belgium': 'catholic',
    'Luxembourg': 'catholic', 'Austria': 'catholic', 'Poland': 'catholic',
    'Slovakia': 'catholic', 'Slovenia': 'catholic', 'Croatia': 'catholic',
    'Hungary': 'catholic', 'Lithuania': 'catholic', 'Malta': 'catholic',
    'Philippines': 'catholic', 'Timor-Leste': 'catholic',
    'Dem. Rep. of the Congo': 'catholic', 'Congo': 'catholic', 'Angola': 'catholic',
    'Rwanda': 'catholic', 'Burundi': 'catholic', 'Gabon': 'catholic',
    'Eq. Guinea': 'catholic', 'Cabo Verde': 'catholic', 'Lesotho': 'catholic',

    # ---- Protestant -----------------------------------------------------
    'United States': 'protestant', 'United Kingdom': 'protestant',
    'Denmark': 'protestant', 'Norway': 'protestant', 'Sweden': 'protestant',
    'Finland': 'protestant', 'Iceland': 'protestant',
    'Australia': 'protestant', 'New Zealand': 'protestant',
    'South Africa': 'protestant', 'Kenya': 'protestant', 'Ghana': 'protestant',
    'Zambia': 'protestant', 'Zimbabwe': 'protestant', 'Malawi': 'protestant',
    'Namibia': 'protestant', 'Botswana': 'protestant', 'eSwatini': 'protestant',
    'Liberia': 'protestant', 'Papua New Guinea': 'protestant', 'Fiji': 'protestant',
    'Samoa': 'protestant', 'Tonga': 'protestant', 'Jamaica': 'protestant',

    # ---- Eastern Orthodox ----------------------------------------------
    'Russia': 'orthodox', 'Ukraine': 'orthodox', 'Belarus': 'orthodox',
    'Moldova': 'orthodox', 'Romania': 'orthodox', 'Bulgaria': 'orthodox',
    'Serbia': 'orthodox', 'Montenegro': 'orthodox', 'North Macedonia': 'orthodox',
    'Greece': 'orthodox', 'Cyprus': 'orthodox', 'Georgia': 'orthodox',
    'Armenia': 'orthodox', 'Ethiopia': 'orthodox',

    # ---- Sunni Islam ----------------------------------------------------
    'Morocco': 'sunni', 'Algeria': 'sunni', 'Tunisia': 'sunni', 'Libya': 'sunni',
    'Egypt': 'sunni', 'Sudan': 'sunni', 'Chad': 'sunni', 'Niger': 'sunni',
    'Mali': 'sunni', 'Mauritania': 'sunni', 'Senegal': 'sunni', 'Gambia': 'sunni',
    'Guinea': 'sunni', 'Sierra Leone': 'sunni', 'Burkina Faso': 'sunni',
    'Somalia': 'sunni', 'Somaliland': 'sunni', 'Djibouti': 'sunni',
    'Comoros': 'sunni', 'W. Sahara': 'sunni',
    'Turkey': 'sunni', 'Syria': 'sunni', 'Jordan': 'sunni', 'Saudi Arabia': 'sunni',
    'Yemen': 'sunni', 'United Arab Emirates': 'sunni', 'Qatar': 'sunni',
    'Kuwait': 'sunni', 'Palestine': 'sunni',
    'Afghanistan': 'sunni', 'Pakistan': 'sunni', 'Bangladesh': 'sunni',
    'Maldives': 'sunni', 'Uzbekistan': 'sunni', 'Turkmenistan': 'sunni',
    'Tajikistan': 'sunni', 'Kyrgyzstan': 'sunni', 'Kazakhstan': 'sunni',
    'Indonesia': 'sunni', 'Malaysia': 'sunni', 'Brunei': 'sunni',
    'Albania': 'sunni', 'Kosovo': 'sunni', 'Bosnia and Herz.': 'sunni',

    # ---- Shia Islam -----------------------------------------------------
    'Iran': 'shia', 'Iraq': 'shia', 'Azerbaijan': 'shia', 'Bahrain': 'shia',

    # ---- Buddhism -------------------------------------------------------
    'Thailand': 'buddhism', 'Myanmar': 'buddhism', 'Cambodia': 'buddhism',
    'Laos': 'buddhism', 'Sri Lanka': 'buddhism', 'Bhutan': 'buddhism',
    'Mongolia': 'buddhism',
    'China': 'buddhism',    # simplified: officially irreligious, Buddhist on the 3.2 map
    'Japan': 'buddhism',    # simplified: Shinto and Buddhist both
    'Vietnam': 'buddhism',  # simplified: folk religion plus Buddhism
    'Taiwan': 'buddhism',   # simplified: folk religion plus Buddhism

    # ---- Hinduism -------------------------------------------------------
    'India': 'hinduism', 'Nepal': 'hinduism', 'Mauritius': 'hinduism',

    # ---- Judaism --------------------------------------------------------
    'Israel': 'judaism',
}

# ---------------------------------------------------------------------------
# Regions, as listed on the assignment's region map. Each carries the religion
# a student should answer, plus any that are also accepted — several of these
# regions are genuinely split, and marking a correct-but-not-primary answer
# wrong would teach the wrong thing. `note` is shown with the answer.
# (key, label, primary, also_accepted, note, countries)
# ---------------------------------------------------------------------------
REGIONS = [
    ('canada', 'Canada', 'protestant', ['catholic'],
     'Protestant on most classroom maps; Catholic is actually the largest single group, and Quebec is strongly Catholic.',
     ['Canada']),

    ('usa', 'United States', 'protestant', [],
     'Also striped for Judaism on the assignment map.',
     ['United States']),

    ('latin', 'Latin America', 'catholic', [],
     'The most solidly Catholic region on Earth.',
     ['Mexico', 'Guatemala', 'Belize', 'Honduras', 'El Salvador', 'Nicaragua',
      'Costa Rica', 'Panama', 'Colombia', 'Venezuela', 'Ecuador', 'Peru',
      'Bolivia', 'Chile', 'Argentina', 'Paraguay', 'Uruguay', 'Guyana',
      'Suriname']),

    ('brazil', 'Brazil', 'catholic', [],
     'The largest Catholic population of any country.',
     ['Brazil']),

    ('caribbean', 'Caribbean', 'catholic', ['protestant'],
     'Catholic in the Spanish and French islands; Protestant in the former British ones like Jamaica.',
     ['Cuba', 'Haiti', 'Dominican Rep.', 'Jamaica', 'Puerto Rico', 'Bahamas',
      'Trinidad and Tobago', 'Barbados', 'Saint Lucia', 'Grenada',
      'Antigua and Barb.', 'Dominica', 'St. Kitts and Nevis',
      'St. Vin. and Gren.', 'Aruba', 'Curaçao', 'Cayman Is.',
      'British Virgin Is.', 'U.S. Virgin Is.', 'Turks and Caicos Is.',
      'Anguilla', 'Montserrat', 'Sint Maarten', 'St-Martin', 'Bermuda']),

    ('weurope', 'Western Europe', 'catholic', ['protestant'],
     'Catholic in the south and west, Protestant across the north — Britain, Germany and Scandinavia.',
     ['United Kingdom', 'Ireland', 'France', 'Spain', 'Portugal', 'Italy',
      'Germany', 'Netherlands', 'Belgium', 'Luxembourg', 'Switzerland',
      'Austria', 'Denmark', 'Norway', 'Sweden', 'Finland', 'Iceland', 'Malta',
      'Monaco', 'Andorra', 'San Marino', 'Vatican', 'Liechtenstein']),

    ('eeurope', 'Eastern Europe', 'orthodox', ['catholic'],
     'Orthodox in the east and the Balkans; Poland, Czechia, Slovakia, Hungary and Croatia are Catholic.',
     ['Poland', 'Czechia', 'Slovakia', 'Hungary', 'Romania', 'Bulgaria',
      'Serbia', 'Croatia', 'Slovenia', 'Bosnia and Herz.', 'Montenegro',
      'North Macedonia', 'Albania', 'Kosovo', 'Greece', 'Ukraine', 'Belarus',
      'Moldova', 'Lithuania', 'Latvia', 'Estonia']),

    ('siberia', 'Siberia', 'orthodox', [],
     'Russian Orthodox, the largest Orthodox church in the world.',
     ['Russia']),

    ('casia', 'Central Asia', 'sunni', [],
     'The Turkic republics — Kazakhstan through Kyrgyzstan.',
     ['Kazakhstan', 'Uzbekistan', 'Turkmenistan', 'Tajikistan', 'Kyrgyzstan']),

    ('easia', 'East Asia', 'buddhism', [],
     'Buddhism on the simplified map; China is officially irreligious and Japan is Shinto as well.',
     ['China', 'Japan', 'South Korea', 'North Korea', 'Taiwan', 'Mongolia',
      'Hong Kong', 'Macao']),

    ('mideast', 'Middle East', 'sunni', ['shia'],
     'Sunni across most of it; Iran, Iraq, Azerbaijan and Bahrain are Shia. Israel is Jewish.',
     ['Turkey', 'Syria', 'Lebanon', 'Israel', 'Palestine', 'Jordan', 'Iraq',
      'Iran', 'Saudi Arabia', 'Yemen', 'Oman', 'United Arab Emirates', 'Qatar',
      'Bahrain', 'Kuwait', 'Cyprus', 'N. Cyprus', 'Armenia', 'Azerbaijan',
      'Georgia']),

    ('sasia', 'South Asia', 'hinduism', ['sunni'],
     'Hindu in India and Nepal; Pakistan, Bangladesh, Afghanistan and the Maldives are Muslim. Sikhism\u2019s hearth is here too.',
     ['India', 'Pakistan', 'Bangladesh', 'Nepal', 'Bhutan', 'Sri Lanka',
      'Maldives', 'Afghanistan']),

    ('seasia', 'Southeast Asia', 'sunni', ['buddhism', 'catholic'],
     'Indonesia makes it the largest Muslim population on Earth; the mainland is Buddhist and the Philippines is Catholic.',
     ['Myanmar', 'Thailand', 'Laos', 'Cambodia', 'Vietnam', 'Malaysia',
      'Singapore', 'Indonesia', 'Brunei', 'Philippines', 'Timor-Leste']),

    ('nafrica', 'North Africa', 'sunni', [],
     'Solidly Sunni from Morocco to Egypt.',
     ['Morocco', 'Algeria', 'Tunisia', 'Libya', 'Egypt', 'W. Sahara', 'Sudan']),

    ('wafrica', 'West Africa', 'sunni', ['protestant', 'catholic'],
     'Muslim across the Sahel; Christian along the southern coast, which is why Nigeria is split down the middle.',
     ['Mauritania', 'Mali', 'Niger', 'Senegal', 'Gambia', 'Guinea',
      'Guinea-Bissau', 'Sierra Leone', 'Liberia', "Côte d'Ivoire", 'Ghana',
      'Togo', 'Benin', 'Burkina Faso', 'Nigeria', 'Cabo Verde']),

    ('cafrica', 'Central Africa', 'catholic', [],
     'Catholic, from Belgian and French colonial missions.',
     ['Chad', 'Cameroon', 'Central African Rep.', 'Eq. Guinea', 'Gabon',
      'Congo', 'Dem. Rep. of the Congo', 'São Tomé and Principe', 'Angola']),

    ('eafrica', 'East Africa', 'protestant', ['orthodox', 'sunni', 'catholic'],
     'Genuinely mixed: Protestant in Kenya, Orthodox in Ethiopia, Muslim on the Somali coast, Catholic in Rwanda and Burundi.',
     ['Ethiopia', 'Eritrea', 'Djibouti', 'Somalia', 'Somaliland', 'Kenya',
      'Uganda', 'Rwanda', 'Burundi', 'Tanzania', 'S. Sudan', 'Madagascar',
      'Comoros', 'Seychelles', 'Mauritius']),

    ('safrica', 'Southern Africa', 'protestant', ['catholic'],
     'Protestant, from British and Dutch missions.',
     ['South Africa', 'Namibia', 'Botswana', 'Zimbabwe', 'Zambia', 'Malawi',
      'Mozambique', 'Lesotho', 'eSwatini']),

    ('australia', 'Australia', 'protestant', ['catholic'],
     'Protestant, from British settlement. New Zealand counts here too.',
     ['Australia', 'New Zealand']),

    ('micronesia', 'Micronesia', 'catholic', ['protestant'],
     'Catholic where Spain and then America reached first — Guam, the Marianas, Palau.',
     ['Guam', 'N. Mariana Is.', 'Palau', 'Micronesia', 'Marshall Is.', 'Nauru',
      'Kiribati']),

    ('melanesia', 'Melanesia', 'protestant', ['catholic'],
     'Protestant missions reached Papua New Guinea and the islands east of it.',
     ['Papua New Guinea', 'Solomon Is.', 'Vanuatu', 'Fiji', 'New Caledonia']),

    ('polynesia', 'Polynesia', 'protestant', ['catholic'],
     'Protestant in Samoa and Tonga; Catholic in the French islands.',
     ['Samoa', 'American Samoa', 'Tonga', 'Tuvalu', 'Cook Is.', 'Niue',
      'Fr. Polynesia', 'Wallis and Futuna Is.', 'Pitcairn Is.']),
]

# Judaism is a majority only in Israel; the assignment also wants the United
# States marked, which the app shows as a second, striped answer.
JUDAISM_DIASPORA = ['United States']

OMITTED = {
    'Canada': 'Catholic plurality but Protestant on most classroom maps',
    'Germany': 'Catholic and Protestant within a point of each other',
    'Switzerland': 'Catholic and Protestant split',
    'Netherlands': 'no religious majority — unaffiliated is largest',
    'Czechia': 'unaffiliated is the largest group',
    'Estonia': 'unaffiliated is the largest group',
    'Latvia': 'Lutheran, Catholic and Orthodox all sizeable',
    'South Korea': 'no majority — unaffiliated is largest',
    'North Korea': 'no reliable data',
    'Nigeria': 'Christian and Muslim near-even split',
    'Lebanon': 'Muslim overall, but Shia, Sunni and Christian are all large',
    'Oman': 'Ibadi Islam, which is neither Sunni nor Shia',
    'Eritrea': 'Orthodox and Muslim near-even split',
    'Tanzania': 'Christian and Muslim near-even split',
    'Ivory Coast': 'Muslim and Christian near-even split',
    'Togo': 'traditional beliefs are the largest group',
    'Benin': 'Christian, Muslim and Vodun all sizeable',
    'Uganda': 'Catholic plurality over Anglican, too close to quiz',
    'Cameroon': 'Catholic plurality over Protestant, too close to quiz',
    'Singapore': 'Buddhist plurality, no majority',
    'Suriname': 'no majority — Christian, Hindu and Muslim all sizeable',
    'Guyana': 'Christian majority but Hindu and Muslim both large',
    'Madagascar': 'Christian overall, traditional beliefs widespread',
    'Mozambique': 'Catholic plurality, large Muslim and Protestant groups',
    'Burma': 'listed as Myanmar',
}

def payload():
    """The compact object the page embeds."""
    return {
        'rel': [[k, label, hearth, HEARTH_NOTE[k]] for k, label, hearth in RELIGIONS],
        'maj': MAJORITY,
        'dia': JUDAISM_DIASPORA,
        'reg': [[k, label, primary, alts, note, [c for c in countries]]
                for k, label, primary, alts, note, countries in REGIONS],
    }


if __name__ == '__main__':
    import json, sys, os
    D = os.path.dirname(os.path.abspath(__file__))
    names = {f['n'] for f in json.load(open(f'{D}/mapdata.json'))['land']}
    bad = sorted(n for n in MAJORITY if n not in names)
    for _, label, _, _, _, countries in REGIONS:
        bad += [f'{label}: {c}' for c in countries if c not in names]
    if bad:
        print('NOT ON THE MAP:', bad); sys.exit(1)
    seen = {}
    for key, label, _, _, _, countries in REGIONS:
        for c in countries:
            if c in seen:
                print(f'DUPLICATE: {c} in both {seen[c]} and {label}'); sys.exit(1)
            seen[c] = label
    keys = {k for k, *_ in RELIGIONS}
    for key, label, primary, alts, _, _ in REGIONS:
        for r in [primary] + alts:
            if r not in keys:
                print(f'BAD RELIGION KEY in {label}: {r}'); sys.exit(1)
    print(f'{len(REGIONS)} regions covering {len(seen)} countries')
    counts = {}
    for r in MAJORITY.values():
        counts[r] = counts.get(r, 0) + 1
    print(f'{len(MAJORITY)} countries assigned')
    for key, label, hearth in RELIGIONS:
        print(f'  {label:<20} {counts.get(key, 0):>3}   hearth: {hearth}')
    print(f'{len(OMITTED)} deliberately omitted')
    if '--json' in sys.argv:
        json.dump(payload(), open(f'{D}/religions.json', 'w'), separators=(',', ':'))
        print('wrote religions.json')
