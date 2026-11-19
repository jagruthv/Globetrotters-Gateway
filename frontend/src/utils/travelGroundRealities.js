/**
 * Sovereign Ground Reality Intelligence Engine for Andhra Pradesh & Telangana
 * 
 * Provides verified ground facts:
 * 1. Real gate acceptance (ASI barcode tickets vs. Free public entries vs. State counters)
 * 2. Last-mile travel traps (4x4 tribal jeeps, cloud sunrise windows, vehicle bans, sheer drops)
 * 3. Forest checkpost curfews & stranding risk alerts (05:30 PM gate lock)
 * 4. Seasonality alerts (gushing water vs. summer trickle)
 * 5. Temple dress code & sanctum restrictions
 * 6. Local driver & checkpost Telugu phrasebook
 */

// 1. Gate Acceptance Classification
export function getGateAcceptanceInfo(spotName = '', feesDescription = '', individualPrice = 0) {
  const name = String(spotName).toLowerCase();
  const feeStr = String(feesDescription || '').toLowerCase();

  // ASI Heritage Monuments (Central Govt ASI Barcode tickets strictly required)
  const isAsi = (
    name.includes('charminar') ||
    name.includes('golconda') ||
    name.includes('warangal fort') ||
    name.includes('chandragiri') ||
    name.includes('amaravati mahachaitya') ||
    name.includes('nagarjunakonda') ||
    name.includes('lepakshi') ||
    name.includes('guntupalli') ||
    name.includes('salihundam') ||
    name.includes('phanigiri') ||
    name.includes('kondaveedu')
  );

  if (isAsi) {
    return {
      type: 'ASI_CENTRAL_GOVT',
      badge: 'Official ASI Ticket Required',
      badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      counterPrice: '₹25 (Indian) / ₹300 (Foreigner)',
      advice: 'Central Government ASI guards strictly scan official national ASI barcode tickets. Buy at gate counter (Cash/UPI) or asi.payumoney.com. Third-party passes cannot bypass ASI turnstiles.',
      isFree: false
    };
  }

  // 100% Free Public Attractions
  const isKnownFree = (
    name.includes('gandikota') ||
    name.includes('ramappa') ||
    name.includes('horsley hills') ||
    name.includes('kallu compound') ||
    name.includes('chaparai') ||
    name.includes('kondakarla ava') ||
    name.includes('buddha statue') ||
    name.includes('hussain sagar') ||
    name.includes('secret lake') ||
    name.includes('durgam cheruvu') ||
    name.includes('pakhal lake') ||
    name.includes('laknavaram') ||
    feeStr.includes('free') ||
    feeStr === '₹0' ||
    feeStr === '0' ||
    (individualPrice === 0 && !feeStr.match(/[1-9]/))
  );

  if (isKnownFree) {
    return {
      type: 'FREE_PUBLIC_ACCESS',
      badge: 'Free Entry — No Ticket Needed',
      badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      counterPrice: '₹0 (Free Public Admission)',
      advice: 'This is a natural landscape, sacred temple, or public heritage site with 100% free admission. No ticket or pass is required by any authority to enter.',
      isFree: true
    };
  }

  // State Tourism Board Sites (APTDC / TSTDC / Forest Dept)
  const isStateTourism = (
    name.includes('borra') ||
    name.includes('haritha') ||
    name.includes('bhavani island') ||
    name.includes('coringa') ||
    name.includes('papikondalu') ||
    name.includes('belum') ||
    name.includes('ethipothala')
  );

  if (isStateTourism) {
    return {
      type: 'STATE_TOURISM_COUNTER',
      badge: 'State Counter Ticket',
      badgeClass: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
      counterPrice: feeStr || '₹80 Adult / ₹40 Child',
      advice: 'State tourism counter tickets are issued at the entrance pavilion via physical paper rolls or department POS machines (Cash & UPI accepted).',
      isFree: false
    };
  }

  // Standard Temple / Heritage
  return {
    type: 'STANDARD_ENTRY',
    badge: individualPrice > 0 ? `Entry: ₹${individualPrice}` : 'Free Entry',
    badgeClass: 'bg-white/10 text-slate-200 border-white/10',
    counterPrice: feeStr || (individualPrice > 0 ? `₹${individualPrice}` : 'Free'),
    advice: individualPrice > 0 ? 'Entry ticket or special darshan pass available at the official entrance counter.' : 'Open public access. Donations optional.',
    isFree: individualPrice === 0
  };
}

// 2. Last-Mile Travel Traps (Hidden Road & Terrain Hurdles)
export function getLastMileTrapWarning(spotName = '', _district = '') {
  const s = String(spotName).toLowerCase();

  if (s.includes('katiki')) {
    return {
      title: '4x4 Tribal Jeep Required',
      description: 'Private cars and standard taxis cannot drive up the hill. The road ends at a railway crossing. You must hire a local tribal committee 4x4 Jeep (₹250–₹350 per seat) or hike 4 km through boulders and mud. Hatchbacks and sedans get stuck or scrape their undercarriage.',
      severity: 'CRITICAL',
      icon: 'Jeep'
    };
  }

  if (s.includes('vanjangi')) {
    return {
      title: 'Strict Sunrise Cloud Window (05:30 AM – 06:45 AM)',
      description: 'The famous "ocean of clouds" is only visible between 05:30 AM and 06:45 AM. If you arrive after 07:30 AM, there are zero clouds—only a steep, exhausting 5 km uphill hike under direct sun.',
      severity: 'HIGH',
      icon: 'Sun'
    };
  }

  if (s.includes('gudisa')) {
    return {
      title: 'Private Vehicles Banned by Forest Dept',
      description: 'Private vehicles are banned beyond the forest checkpost. Commercial camping is restricted by forest rangers. Tourists showing up with private tents at sunset get turned back by authorities.',
      severity: 'CRITICAL',
      icon: 'ShieldAlert'
    };
  }

  if (s.includes('gandikota')) {
    return {
      title: '300-Ft Sheer Cliff (No Safety Railings)',
      description: 'The canyon has a sheer 300-foot vertical drop with no safety railings or fences. Families traveling with small children or elderly relatives must exercise extreme caution and stay back from loose edge boulders.',
      severity: 'HIGH',
      icon: 'AlertTriangle'
    };
  }

  return null;
}

// 3. Mountain & Forest Checkpost Curfews
export function getCheckpostCurfewInfo(spotName = '', district = '') {
  const s = (String(spotName) + ' ' + String(district)).toLowerCase();

  const isForestOrGhat = (
    s.includes('araku') ||
    s.includes('vanjangi') ||
    s.includes('katiki') ||
    s.includes('maredumilli') ||
    s.includes('srisailam') ||
    s.includes('tyda') ||
    s.includes('gudisa') ||
    s.includes('rampachodavaram') ||
    s.includes('kothapalli') ||
    s.includes('talakona') ||
    s.includes('papikondalu')
  );

  if (isForestOrGhat) {
    return {
      lockTime: '05:30 PM',
      exitDeadline: '04:30 PM',
      warning: 'Forest checkpost gate locks at 05:30 PM and does not reopen until 06:00 AM. Start your return drive before 04:30 PM to avoid being locked inside dark ghat roads without mobile network.'
    };
  }

  return null;
}

// 4. Waterfall & River Seasonality Status
export function getSeasonalityInfo(spotName = '', category = '') {
  const s = (String(spotName) + ' ' + String(category)).toLowerCase();

  const isWaterfallOrRiver = (
    s.includes('waterfall') ||
    s.includes('falls') ||
    s.includes('katiki') ||
    s.includes('kothapalli') ||
    s.includes('talakona') ||
    s.includes('chaparai') ||
    s.includes('ethipothala') ||
    s.includes('mallela theertham') ||
    s.includes('bogatha') ||
    s.includes('kuntala') ||
    s.includes('pochera') ||
    s.includes('kaigal') ||
    s.includes('papikondalu')
  );

  if (isWaterfallOrRiver) {
    return {
      bestMonths: 'September to January (Post-monsoon surge)',
      summerAlert: 'March to May: Water flow reduced to a trickle or dry rock.',
      monsoonAlert: 'July to August: Heavy rains may cause sudden flash flood closures by district administration.'
    };
  }

  return null;
}

// 5. Strict Temple Dress Code & Sanctum Conduct
export function getTempleDressCodeInfo(spotName = '', category = '') {
  const s = (String(spotName) + ' ' + String(category)).toLowerCase();

  const isMajorTemple = (
    s.includes('tirupati') ||
    s.includes('tirumala') ||
    s.includes('srisailam') ||
    s.includes('draksharamam') ||
    s.includes('bhadrachalam') ||
    s.includes('yadagirigutta') ||
    s.includes('alampur') ||
    s.includes('mahanandi') ||
    s.includes('simhachalam') ||
    s.includes('annavaram') ||
    s.includes('vemulawada') ||
    s.includes('basar') ||
    s.includes('ahobilam') ||
    s.includes('kanaka durga') ||
    s.includes('srikalahasti')
  );

  if (isMajorTemple) {
    return {
      title: 'Strict Traditional Dress Code Enforced',
      dressCode: 'Men: Dhoti/Kurta or Pyjama. Women: Saree, Half-Saree, or Churidar with Dupatta. Western wear, shorts, ripped jeans, and sleeveless shirts are strictly barred.',
      sanctumRules: 'Mobile phones, cameras, leather belts, and shoes are strictly prohibited inside the sanctum queues.'
    };
  }

  return null;
}

// 6. Practical Local Telugu Phrasebook for Drivers, Checkposts & Stalls
export const LOCAL_TELUGU_PHRASEBOOK = [
  {
    english: 'How much for the 4x4 Jeep?',
    telugu: 'జీప్ ఛార్జ్ ఎంత?',
    transliteration: 'Jeep charge entha?'
  },
  {
    english: 'Which way to the checkpost / exit?',
    telugu: 'చెక్‌పోస్ట్ / దారి ఎక్కడ?',
    transliteration: 'Checkpost / Daari ekkada?'
  },
  {
    english: 'Is there water flowing in the falls right now?',
    telugu: 'ఇప్పుడు నీళ్లు ఉన్నాయా?',
    transliteration: 'Ippudu neellu unnaaya?'
  },
  {
    english: 'Where is the nearest petrol pump?',
    telugu: 'దగ్గర్లో పెట్రోల్ బంక్ ఎక్కడ?',
    transliteration: 'Daggarlo petrol bunk ekkada?'
  },
  {
    english: 'Is this temple open right now?',
    telugu: 'గుడి ఇప్పుడు తెరిచి ఉందా?',
    transliteration: 'Gudi ippudu terichi undaa?'
  },
  {
    english: 'Please help / Emergency',
    telugu: 'సహాయం చేయండి',
    transliteration: 'Sahayam cheyandi'
  }
];
