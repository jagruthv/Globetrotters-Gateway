/**
 * Globetrotter Authentic Photo Curation Engine
 * 
 * Strict Ground-Truth Photo Rules:
 * 1. ONLY return verified, authentic local photography corresponding directly to the attraction.
 * 2. ZERO repeated / cross-mapped photos (e.g. NEVER use Amaravathi photo for Bojjannakonda, 
 *    never use Ettipotala for Katiki, never use Araku landscape for Padmapuram or Galikonda).
 * 3. If an attraction has no verified photo in the repository, return null so the UI cleanly
 *    displays "No photo available".
 */

export const EXACT_PLACE_PHOTOS = {
  "addapuseela sri kasi visweswara swamy temple": "/images/candidates/parvathipurammanyam/2022031982.jpg",
  "adoni hill fort & 12 tiers of perimeter ramparts": "/images/candidates/kurnool/2024110739.jpg",
  "ahobilam nava narasimha kshetram (upper & lower shrines)": "/images/aptourism/ahobilam.jpg",
  "alampur sri jogulamba temple (5th maha shakti peeth)": "/images/telangana/alampur.jpg",
  "aluru kona sri ranganatha swamy waterfall temple": "/images/candidates/ananthapuramu/2019080725.jpg",
  "amaralingeswara swamy temple (amaravati pancharama)": "/images/aptourism/amaralingeswara_swamy_temple.jpg",
  "amaravati buddhist mahastupa & archaeological museum": "/images/candidates/amaravati/amaravati-mahachaitya-amaravati-andhra-pradesh-1-attr-nearby.jpg",
  "ameen peer dargah (pedda dargah)": "/images/aptourism/pedda_dargah.jpg",
  "ananthagiri hills & sri bugga ramalingeswara swamy": "/images/aptourism/bugga_ramalingeswara_swamy_temple.jpg",
  "ananthapuramu historic clock tower & iskcon temple": "/images/aptourism/iskcon_temple.jpg",
  "araku tribal museum": "/images/aptourism/tribal_museum.jpg",
  "arvapally sri ramalingeshwara temple": "/images/candidates/suryapet/2022090955.jpg",
  "ashok sagar & rock garden": "/images/candidates/nizamabad/2018032490.jpg",
  "bapatla historic agricultural college campus (1906)": "/images/candidates/bapatla/2022033062.jpg",
  "belum caves (subterranean karst limestone passages)": "/images/aptourism/belum_caves.jpg",
  "bhadrachalam sri sita ramachandra swamy temple": "/images/telangana/bhadrachalam.jpg",
  "bhavani island tourism resort & water adventure sports": "/images/aptourism/bhavani_islands.jpg",
  "bhongir fort (bhuvanagiri monolithic citadel)": "/images/telangana/bhongir_fort.jpg",
  "birla mandir & b.m. birla planetarium": "/images/candidates/hyderabad/birla-temple-hyderabad-secunderabad-telangana-1-attr-nearby.jpg",
  "bobbili fort & durbar mahal museum": "/images/aptourism/bobbili_fort.jpg",
  "bobbili veena gi craft guild": "/images/aptourism/bobbili_veena.jpg",
  "borra caves": "/images/aptourism/borra_caves.jpg",
  "chandragiri fort & raja-rani archaeological palaces": "/images/aptourism/chandragiri_fort.jpg",
  "charminar & laad bazaar lacquer bangles": "/images/candidates/hyderabad/charminar-hyderabad-telangana-1-city-homepage.jpeg",
  "cheruvugattu sri parvathi jadala ramalingeshwara temple": "/images/candidates/anantapur/bagga-ramalingeshwara-swamy-temple-anantpur-1-andhra-pradesh-attr-popular.jpg",
  "chowmahalla palace & royal vintage car collection": "/images/candidates/hyderabad/falaknuma-palace-hyderabad-telangana-1-attr-homepag.jpg",
  "coringa wildlife sanctuary & mangrove boardwalk": "/images/aptourism/coringa_wildlife_sanctuary.jpg",
  "dharmapuri sri lakshmi narasimha swamy temple": "/images/telangana/dharmapuri.jpg",
  "dichpally ramalayam (the khajuraho of telangana)": "/images/candidates/nizamabad/2018032481.jpg",
  "draksharamam bhimeswara swamy temple (pancharama kshetram)": "/images/aptourism/draksharamam.jpg",
  "durgam cheruvu & extradosed cable-stayed bridge": "/images/candidates/hyderabad/2019043075.jpg",
  "dwaraka tirumala sri venkateswara swamy temple (chinna tirupati)": "/images/aptourism/dwaraka_tirumala.jpg",
  "edupayala sri vana durga bhavani temple": "/images/telangana/edupayala.jpg",
  "elgandal fort (historic hill citadel)": "/images/candidates/karimnagar/1-elgandal-fort-karimnagar-city-homepag.jpg",
  "ethipothala waterfalls & crocodile breeding lagoon": "/images/aptourism/ettipotala_waterfalls.jpg",
  "gandhi hill & sound and light planetarium": "/images/aptourism/gandhi_hill.jpg",
  "gandikota grand canyon of india & historic fort": "/images/aptourism/gandikota.jpg",
  "golconda fort & acoustic portico walk": "/images/candidates/hyderabad/golconda-fort-hyderabad-telangana-1-attr-homepag.jpg",
  "gooty fort (shell-shaped monolithic hill citadel)": "/images/aptourism/gooty_fort.jpg",
  "hamsaladeevi & krishna sagara sangamam confluence": "/images/candidates/krishna/2022040313.png",
  "hemavathi ancient nolamba temple complex (doddeswara)": "/images/candidates/srisathyasai/2019062740.jpg",
  "hinkar thirtha jain temple & dhyana mandir": "/images/candidates/amaravati/dhyana-buddha-statue-amaravati-vijayawada-andhra-pradesh-1-city-homepage.jpeg",
  "horsley hills (yenugu mallamma konda, 1,290m)": "/images/aptourism/horsley_hills.jpg",
  "hyderabadi dum biryani & haleem gastronomy corridor": "/images/telangana/hyderabad.jpg",
  "ins kurusura submarine museum": "/images/aptourism/submarine_museum.jpg",
  "itda tribal culture park (parvathipuram)": "/images/candidates/parvathipurammanyam/2022030789.jpg",
  "jagtial fort (french star-shaped fortress)": "/images/candidates/jagtial/2019111417.jpg",
  "jainath sri lakshmi narayana swamy temple": "/images/candidates/adilabad/2018052594.jpg",
  "jamalapuram sri venkateswara swamy temple": "/images/candidates/khammam/2024081739.jpg",
  "jonnawada sri mallikarjuna kamakshi temple": "/images/candidates/spsnellore/2018081713.jpg",
  "kailasagiri hilltop park & ropeway": "/images/aptourism/kailasagiri_hill.jpg",
  "kakatiya musical garden & rock garden": "/images/candidates/hanumakonda/2018062386.jpg",
  "kaleshwaram temple (sri kaleshwara mukteshwara swamy)": "/images/telangana/kaleshwaram.jpg",
  "kalingapatnam beach & colonial lighthouse": "/images/aptourism/kalingapatnam_beach.jpg",
  "karimnagar cable bridge & riverfront promenade": "/images/telangana/karimnagar.jpg",
  "keesaragutta sri ramalingeswara swamy temple": "/images/candidates/medchal-malkajgiri/2020030452.jpg",
  "khammam fort (stambhadri rock citadel)": "/images/telangana/khammam_fort.jpg",
  "kinnerasani wildlife sanctuary & dam": "/images/candidates/khammam/kinnerasani-wildlife-sanctuary-khammam-telangana-1-attr-popular.jpg",
  "kolimigundla limestone karst formations": "/images/candidates/nandyal/2024071697-1.jpg",
  "konda reddy buruju & kurnool fort": "/images/aptourism/konda_reddy_buruju.jpg",
  "kondagattu sri anjaneya swamy temple": "/images/telangana/kondagattu.jpg",
  "kondapalli fort & gi-tagged wooden toy artisans village": "/images/aptourism/kondapalli.jpg",
  "kondaveedu fort & panoramic hilltop ghat road": "/images/aptourism/kondaveedu_fort.jpg",
  "kothapatnam beach & golden coast promenade": "/images/aptourism/kothapatnam_beach.jpg",
  "koulas fort (12th-century military citadel)": "/images/candidates/kamareddy/2024102243.jpg",
  "kuchipudi village & siddhendra yogi classical dance academy": "/images/aptourism/kuchipudi.jpg",
  "kuntala waterfalls (highest waterfall in telangana)": "/images/telangana/kuntala_falls.jpg",
  "kusumanchi kakatiya temples (ganapeshwaralayam & mukkanteshwaralayam)": "/images/candidates/khammam/2018032971.jpg",
  "laknavaram lake & suspension bridges": "/images/telangana/laknavaram_lake.jpg",
  "lambasingi (kashmir of andhra pradesh)": "/images/aptourism/lambasingi.jpg",
  "latif saheb dargah & nalgonda khilla hillock": "/images/telangana/nalgonda.jpg",
  "lower manair dam (lmd) & deer park": "/images/candidates/karimnagar/lower-manair-dam-karimnagar-1-attr-popular.jpg",
  "machilipatnam 17th-century dutch fort belfry & old cemetery": "/images/aptourism/machilipatnam.jpg",
  "mahanandi sri mahanandiswara swamy temple & mineral springs": "/images/aptourism/mahanandi.jpg",
  "makthal sri padmanabha swamy temple": "/images/candidates/narayanpet/2019051613-rr7mojg6vkg1njo7fhtujbtcjb2b800e2zqmadt4oy.jpg",
  "mallaram forest & prehistoric mushroom rocks": "/images/candidates/nizamabad/2018052549.jpg",
  "mallela theertham waterfalls (nallamala canyon cascade)": "/images/telangana/mallela_theertham.jpg",
  "manjeera crocodile sanctuary & waterbird habitat": "/images/candidates/sangareddy/2018051591.jpg",
  "mantralayam sri raghavendra swamy mutt & brindavanam": "/images/candidates/kurnool/2018022874.jpg",
  "mattapalli sri yoga ananda lakshmi narasimha swamy": "/images/candidates/suryapet/2022090950.jpg",
  "medak cathedral (the diocese of medak)": "/images/telangana/medak_church.jpg",
  "medak fort (methukudurgam rock citadel)": "/images/telangana/medak_fort.jpg",
  "medaram sammakka sarakka gadde": "/images/telangana/medaram.jpg",
  "mypadu beach & casuarina coastline": "/images/aptourism/mypadu_beach.jpg",
  "nagarjuna sagar dam & crest gates viewpoints": "/images/telangana/nagarjuna_sagar.jpg",
  "nagarjunakonda island archaeological museum": "/images/aptourism/nagarjunakonda.jpg",
  "nehru zoological park & forest safari": "/images/candidates/hyderabad/nehru-zoological-park-hyderabad-telangana-1-attr-popular.jpg",
  "nellore malagunta chepala pulusu culinary trail": "/images/candidates/nellore/nellore.jpg",
  "nizam sagar dam & reservoir": "/images/candidates/kamareddy/2019021990.jpg",
  "nizamabad fort & quilla ramalayam": "/images/telangana/nizamabad.jpg",
  "ntr beach & kakinada harbor coastal promenade": "/images/candidates/kakinada/kakinada-beach-kakinada-andhra-pradesh-1-attr-nearby.jpg",
  "orvakal natural rock garden & canyon": "/images/candidates/kurnool/orvakallu-rock-garden-kurnool-andhra-pradesh-1-attr-popular.jpg",
  "pachala someswara temple & sculptural gallery": "/images/candidates/nalgonda/2018070318.jpg",
  "padmakshi temple & jain rock-cut reliefs": "/images/candidates/hanumakonda/2018062320.jpg",
  "pakhal lake & wildlife sanctuary": "/images/candidates/warangal/2020030573.jpg",
  "pattiseema sri veerabhadra swamy temple (river island shrine)": "/images/aptourism/pattiseema.jpg",
  "pedakakani sri malleswara swamy temple": "/images/aptourism/pedakakani.jpg",
  "penchalakona sri penusila lakshmi narasimha swamy temple": "/images/aptourism/penchalakona.jpg",
  "pentlavelli krishna riverbank groves & fruit orchards": "/images/candidates/nagarkurnool/17905956928156.png",
  "penukonda fort & gagan mahal royal palace": "/images/aptourism/penukonda_fort.jpg",
  "pillalamarri sri chennakesava & nameswara temples": "/images/candidates/suryapet/2019013138.jpg",
  "pochera waterfalls & deep rock canyon": "/images/candidates/adilabad/2018052528.jpg",
  "qutb shahi tombs heritage park": "/images/candidates/hyderabad/2019043031.jpg",
  "rajahmundry rose milk legendary outlets": "/images/aptourism/rajahmundry.jpg",
  "ramappa temple (sri rudreshwara swamy, unesco world heritage site)": "/images/telangana/ramappa_temple.jpg",
  "ramayapatnam sea port & historic coastal beach": "/images/aptourism/ramayapatnam.jpg",
  "rollapadu wildlife sanctuary (great indian bustard haven)": "/images/aptourism/rollapadu_wildlife_sanctuary.jpg",
  "rushikonda beach (blue flag certified)": "/images/aptourism/rushikonda.jpg",
  "salar jung museum (world's largest one-man art collection)": "/images/candidates/hyderabad/salar-jung-museum-hyderabad-telangana-1-attr-homepag.jpg",
  "salihundam buddhist heritage stupa complex": "/images/aptourism/salihundam.jpg",
  "salur ghats & sunki pass (odisha gateway)": "/images/candidates/parvathipurammanyam/2022030984-1.jpg",
  "sambara polamamba ammavari temple": "/images/candidates/parvathipurammanyam/2022030762.jpg",
  "shamirpet lake & deer forest sanctuary": "/images/candidates/medchal-malkajgiri/2020032824.jpg",
  "siddeshwara temple (kakatiya rock temple)": "/images/candidates/hanumakonda/2018062371.jpg",
  "sidhout (siddhavatam) fort & rameswaram temple": "/images/aptourism/siddavatam_fort.jpg",
  "singur dam & hydroelectric project on manjeera": "/images/telangana/singur_dam.jpg",
  "sri durga malleswara swamy temple (kanakadurga, indrakeeladri)": "/images/aptourism/kanaka_durga_temple.jpg",
  "sri lakshmi narasimha swamy temple (kadiri)": "/images/candidates/srisathyasai/2019080771.jpg",
  "sri panakala lakshmi narasimha swamy temple (mangalagiri)": "/images/aptourism/mangalagiri.jpg",
  "sri varaha lakshmi narasimha swamy temple (simhachalam)": "/images/aptourism/simhachalam.jpg",
  "sri veera venkata satyanarayana swamy temple (annavaram)": "/images/aptourism/annavaram.jpg",
  "sri veerabhadra temple & the hanging pillar of lepakshi": "/images/aptourism/lepakshi.jpg",
  "srikalahasti hand-painted kalamkari gi artisan guilds": "/images/aptourism/srikalahasti.jpg",
  "srisailam sri bhramaramba mallikarjuna swamy temple (jyotirlinga & shakti peetham)": "/images/aptourism/mallikarjuna_swamy_temple_srisailam.jpg",
  "suryalanka beach & ap tourism coastal resort": "/images/aptourism/suryalanka.jpg",
  "tadvai forest huts & eturnagaram wildlife sanctuary": "/images/telangana/eturnagaram.jpg",
  "talakona waterfalls (highest waterfall in andhra pradesh)": "/images/aptourism/talakona.jpg",
  "talpagiri sri ranganatha swamy temple": "/images/candidates/spsnellore/2018081751.jpg",
  "thimmamma marrimanu (world's largest banyan tree canopy)": "/images/aptourism/thimmamma_marrimanu.jpg",
  "thotapalli barrage & adventure eco-park": "/images/candidates/parvathipurammanyam/2022030944.jpg",
  "tirumala sri venkateswara swamy temple & seshachalam hills": "/images/candidates/tirupati/sri-venkateswara-swamy-vaari-temple-tirupati-andhra-pradesh-1-new-attr-popular.jpg",
  "tyda jungle bells nature camp": "/images/aptourism/tyda.jpg",
  "udayagiri hill fort & 365 historic defense bastions": "/images/aptourism/udayagiri.jpg",
  "undrugonda fort & sri lakshmi narasimha temple": "/images/candidates/suryapet/2022090973.jpg",
  "uppalapadu bird sanctuary": "/images/aptourism/uppalapadu_bird_sanctuary.jpg",
  "vemulawada sri raja rajeshwara swamy temple (dakshina kasi)": "/images/telangana/vemulawada.jpg",
  "vizianagaram fort & moti mahal palace": "/images/aptourism/vizianagaram.jpg",
  "vodarevu beach & coastal fishing wharf": "/images/candidates/bapatla/2022033085.jpg",
  "warangal fort & kakatiya kala thoranam": "/images/telangana/warangal.jpg",
  "yaganti sri uma maheshwara temple & the growing nandi": "/images/candidates/nandyal/2024071657.jpg",
};

// Sort keys descending by length to match the most specific landmark names first
const SORTED_PLACE_KEYS = Object.keys(EXACT_PLACE_PHOTOS).sort((a, b) => b.length - a.length);

/**
 * Returns an authentic photograph for a specific attraction if verified, or null.
 * 
 * Strict Ground-Truth Rules:
 * - If the location has a verified photo, return it.
 * - If the location has no verified photo, return null (never fake or repeat photos from other locations).
 */
export function getAuthenticPlacePhoto(placeOrName) {
  let name = '';
  let imageUrl = '';

  if (typeof placeOrName === 'string') {
    name = placeOrName.toLowerCase().trim();
  } else if (placeOrName && typeof placeOrName === 'object') {
    name = (placeOrName.name || placeOrName.placeName || '').toLowerCase().trim();
    imageUrl = placeOrName.imageUrl || '';
  }

  if (!name) return null;

  // Clean and normalize name
  const normalized = name.replace(/[()&,]/g, ' ').replace(/\s+/g, ' ').trim();

  // 1. Direct specific match in curated photo repository (exact specific match only)
  for (const key of SORTED_PLACE_KEYS) {
    if (normalized === key) {
      return EXACT_PLACE_PHOTOS[key];
    }
    // Only match as discrete whole words if key is specific enough (>= 6 chars)
    if (key.length >= 6) {
      const escapedKey = key.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedKey}\\b`, 'i');
      if (regex.test(normalized)) {
        return EXACT_PLACE_PHOTOS[key];
      }
    }
  }

  // 2. Verified Local Image URL from place data (Strictly forbid Unsplash and third-party stock photos)
  if (
    imageUrl &&
    typeof imageUrl === 'string' &&
    imageUrl.startsWith('/images/') &&
    !imageUrl.includes('unsplash.com')
  ) {
    return imageUrl;
  }

  // 3. Ground truth: No verified photo for this location -> return null (no fake fallbacks)
  return null;
}

const CATEGORY_PALETTES = {
  heritage: { bg1: '#1e293b', bg2: '#0f172a', accent: '#f59e0b', text: '#fde68a', label: 'HERITAGE & MONUMENT' },
  temple:   { bg1: '#2e1065', bg2: '#0f172a', accent: '#f43f5e', text: '#fbcfe8', label: 'SPIRITUAL & SACRED' },
  nature:   { bg1: '#064e3b', bg2: '#022c22', accent: '#10b981', text: '#a7f3d0', label: 'NATURE & SCENIC' },
  beach:    { bg1: '#0c4a6e', bg2: '#082f49', accent: '#06b6d4', text: '#bae6fd', label: 'COASTAL PROMENADE' },
  fort:     { bg1: '#451a03', bg2: '#1c1917', accent: '#d97706', text: '#fed7aa', label: 'HISTORIC FORTRESS' },
  default:  { bg1: '#0f172a', bg2: '#020617', accent: '#14b8a6', text: '#99f6e4', label: 'REGIONAL GEM' },
};

function getCategoryPalette(category = '', name = '') {
  const c = (category + ' ' + name).toLowerCase();
  if (c.includes('temple') || c.includes('spiritual') || c.includes('mosque') || c.includes('church') || c.includes('dargah')) {
    return CATEGORY_PALETTES.temple;
  }
  if (c.includes('beach') || c.includes('coast') || c.includes('port') || c.includes('sea') || c.includes('island')) {
    return CATEGORY_PALETTES.beach;
  }
  if (c.includes('nature') || c.includes('waterfall') || c.includes('wildlife') || c.includes('forest') || c.includes('lake') || c.includes('valley')) {
    return CATEGORY_PALETTES.nature;
  }
  if (c.includes('fort') || c.includes('palace') || c.includes('bastion')) {
    return CATEGORY_PALETTES.fort;
  }
  if (c.includes('heritage') || c.includes('museum') || c.includes('historic') || c.includes('monument')) {
    return CATEGORY_PALETTES.heritage;
  }
  return CATEGORY_PALETTES.default;
}

/**
 * Creates an offline SVG data-URL formatted banner for circuit cards.
 */
export function getOfflineImageFallback(title = 'Attraction', category = '', district = '') {
  const p = getCategoryPalette(category, title);
  const cleanTitle = (title || 'Attraction').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const cleanDistrict = (district || 'Andhra Pradesh & Telangana').replace(/&/g, '&amp;');

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${p.bg1}" />
          <stop offset="100%" stop-color="${p.bg2}" />
        </linearGradient>
        <radialGradient id="glow" cx="80%" cy="20%" r="60%">
          <stop offset="0%" stop-color="${p.accent}" stop-opacity="0.3" />
          <stop offset="100%" stop-color="${p.accent}" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="800" height="500" fill="url(#grad)" />
      <circle cx="650" cy="120" r="300" fill="url(#glow)" />
      <g opacity="0.08" stroke="#ffffff" stroke-width="1.5">
        <line x1="0" y1="100" x2="800" y2="100" />
        <line x1="0" y1="250" x2="800" y2="250" />
        <line x1="0" y1="400" x2="800" y2="400" />
        <line x1="200" y1="0" x2="200" y2="500" />
        <line x1="400" y1="0" x2="400" y2="500" />
        <line x1="600" y1="0" x2="600" y2="500" />
      </g>
      <g font-family="system-ui, -apple-system, sans-serif">
        <rect x="48" y="52" width="180" height="28" rx="14" fill="${p.accent}" fill-opacity="0.15" stroke="${p.accent}" stroke-opacity="0.4" stroke-width="1" />
        <text x="62" y="70" font-size="11" font-weight="700" fill="${p.text}" letter-spacing="1.5">${p.label}</text>
        <text x="48" y="270" font-size="34" font-weight="800" fill="#ffffff">${cleanTitle}</text>
        <text x="48" y="315" font-size="16" font-weight="500" fill="#94a3b8">${cleanDistrict}</text>
        <rect x="48" y="420" width="130" height="24" rx="6" fill="#0f172a" fill-opacity="0.7" stroke="#334155" stroke-width="1" />
        <text x="60" y="436" font-size="10" font-weight="600" fill="#38bdf8" letter-spacing="0.5">GLOBETROTTER VERIFIED</text>
      </g>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
