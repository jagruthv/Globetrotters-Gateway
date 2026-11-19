import React, { useState, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Headphones, 
  Play, 
  Pause, 
  Mic, 
  MicOff, 
  X, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Send,
  AlertCircle,
  Search,
  MapPin
} from 'lucide-react';
import { MASTER_ATLAS_DATA } from '../utils/masterAtlasData.js';

const HERITAGE_STORIES = [
  {
    id: 'ramappa-unesco',
    title: 'Ramappa Temple: 800-Year Floating Bricks',
    district: 'Mulugu, Telangana',
    duration: '1 min 45 sec',
    image: '/images/telangana/ramappa_temple.jpg',
    standout: 'UNESCO World Heritage Site',
    languages: {
      en: {
        title: 'The Miracle of Floating Bricks at Ramappa',
        narrative: "Welcome to Sri Rudreshwara Temple, famously known as Ramappa Temple, constructed in 1213 AD by General Recharla Rudra during the reign of Kakatiya King Ganapati Deva. This is the only temple in India named after its chief sculptor, Ramappa. The temple is an engineering marvel: its roof is constructed using bricks so light and porous that they actually float on water! Kakatiya engineers laid the foundation using a proven sandbox technique (an underground bed of sand, jaggery, and karakkaya fruit paste) that acted as an earthquake damper, preserving these intricately carved black basalt pillars through multiple major earthquakes over eight centuries."
      },
      te: {
        title: 'రామప్ప గుడి: నీటిపై తేలే ఇటుకల అద్భుతం',
        narrative: "కాకతీయ శిల్పకళా వైభవానికి నిదర్శనమైన రామప్ప దేవాలయానికి స్వాగతం. క్రీస్తు శకం 1213 లో కాకతీయ చక్రవర్తి గణపతిదేవుని కాలంలో రేచర్ల రుద్రుడు ఈ ఆలయాన్ని నిర్మించారు. భారతదేశంలో శిల్పి పేరుతో పిలువబడే ఏకైక దేవాలయం ఇదే. ఈ ఆలయ గోపురాన్ని నీటిపై తేలియాడే తేలికపాటి ఇటుకలతో నిర్మించారు. అంతేకాకుండా, శాండ్‌బాక్స్ సాంకేతిక పరిజ్ఞానంతో పునాదులు వేయడం వల్ల ఎనిమిది వందల సంవత్సరాల నుండి భూకంపాలను తట్టుకుని నిలిచింది."
      },
      hi: {
        title: 'रामप्पा मंदिर: पानी पर तैरती ईंटों का रहस्य',
        narrative: "काकतीय साम्राज्य की बेजोड़ वास्तुकला, रामप्पा मंदिर में आपका स्वागत है। सन 1213 में निर्मित, यह भारत का एकमात्र ऐसा मंदिर है जिसका नाम इसके शिल्पकार रामप्पा के नाम पर रखा गया है। इस मंदिर की सबसे बड़ी खासियत इसकी छत है, जो ऐसी हल्की ईंटों से बनी है जो पानी में तैरती हैं। सैंडबॉक्स तकनीक से बनी इसकी नींव ने इसे सैकड़ों वर्षों तक भूकंपों से सुरक्षित रखा है।"
      }
    }
  },
  {
    id: 'charminar-hyderabad',
    title: 'Charminar: 1591 Plague Deliverance Arch',
    district: 'Hyderabad, Telangana',
    duration: '1 min 30 sec',
    image: '/images/telangana/hyderabad.jpg',
    standout: 'Qutb Shahi Monolithic Monument',
    languages: {
      en: {
        title: 'Charminar and the Whispering Laad Bazaar',
        narrative: "Standing proudly in the heart of Hyderabad, Charminar was commissioned in 1591 by Muhammad Quli Qutb Shah, the fifth sultan of the Qutb Shahi dynasty, to commemorate the end of a catastrophic plague epidemic that devastated the city. Constructed of granite, lime, mortar, and pulverized marble, its four grand minarets rise 48.7 meters into the sky. Legend has it that a secret underground tunnel runs 9 kilometers connecting Charminar directly to Golconda Fort."
      },
      te: {
        title: 'చార్మినార్: మహమ్మారి ముగింపుకు చిహ్నం',
        narrative: "హైదరాబాద్ నడిబొడ్డున 1591లో మహమ్మద్ కులీ కుతుబ్ షా చేత నిర్మించబడిన చారిత్రాత్మక కట్టడం చార్మినార్. నగరంలో ప్లేగు వ్యాధి నిర్మూలనకు గుర్తుగా ఈ అద్భుత కట్టడాన్ని నిర్మించారు. దీని నాలుగు మినార్లు 48.7 మీటర్ల ఎత్తుతో ఆకాశాన్ని తాకుతాయి. చార్మినార్ నుండి గోల్కొండ కోటకు రహస్య సొరంగ మార్గం ఉందనే పురాణ కథ ప్రాచుర్యంలో ఉంది."
      },
      hi: {
        title: 'चारमीनार: 1591 का ऐतिहासिक स्थापत्य',
        narrative: "हैदराबाद का गौरव चारमीनार, सन 1591 में कुली कुतुब शाह द्वारा शहर से प्लेग महामारी के खात्मे की खुशी में बनवाया गया था। ग्रेनाइट और चूने से बना यह भव्य स्मारक 48.7 मीटर ऊंचा है। कहा जाता है कि चारमीनार से गोलकोंडा किले तक एक गुप्त भूमिगत सुरंग भी मौजूद है।"
      }
    }
  },
  {
    id: 'borra-caves',
    title: 'Borra Caves: Ancient Million-Year Wonders',
    district: 'Alluri Sitharama Raju, Andhra Pradesh',
    duration: '1 min 40 sec',
    image: '/images/aptourism/borra_caves.jpg',
    standout: 'Ancient Limestone Caves',
    languages: {
      en: {
        title: 'Ancient Limestone Chambers of Borra',
        narrative: "Deep in the Ananthagiri hill ranges of the Eastern Ghats, Borra Caves descend over 90 meters underground. Formed over millions of years by the flowing Gosthani River carving through natural limestone, these are among the deepest caves in the Indian subcontinent. British geologist William King discovered them in 1807. Inside, towering stalactites hanging from the ceiling and stalagmites rising from the floor form surreal natural sculptures revered by indigenous tribal communities."
      },
      te: {
        title: 'బొర్రా గుహలు: మిలియన్ ఏళ్ల సహజ గుహల అద్భుతం',
        narrative: "అనంతగిరి కొండల్లో ఉన్న బొర్రా గుహలు భారతదేశంలోనే అత్యంత లోతైన సహజ సున్నపురాయి గుహల్లో ఒకటి. గోస్తనీ నది ప్రవాహం వల్ల మిలియన్ సంవత్సరాల కాలంలో ఈ అద్భుతమైన స్టాలక్టైట్ మరియు స్టాలగ్మైట్ ఆకారాలు ఏర్పడ్డాయి. 1807 లో బ్రిటిష్ జియాలజిస్ట్ విలియం కింగ్ వీటిని కనుగొన్నారు."
      },
      hi: {
        title: 'बोर्रा गुफाएं: लाखों साल पुरानी प्राकृतिक गुफाएं',
        narrative: "आंध्र प्रदेश की अनंतगिरि पहाड़ियों में स्थित बोर्रा गुफाएं भारत की सबसे गहरी प्राकृतिक चूना पत्थर की गुफाओं में से हैं। गोस्थानी नदी द्वारा लाखों वर्षों में तराशी गई ये गुफाएं रहस्यमयी आकृतियों और शिवलिंग जैसे प्राकृतिक पत्थरों के लिए प्रसिद्ध हैं।"
      }
    }
  },
  {
    id: 'lepakshi-temple',
    title: 'Lepakshi: The Mystery of the Hanging Pillar',
    district: 'Sri Sathya Sai, Andhra Pradesh',
    duration: '1 min 35 sec',
    image: '/images/aptourism/lepakshi.jpg',
    standout: 'Vijayanagara Monolithic Marvel',
    languages: {
      en: {
        title: 'The Hanging Pillar of Veerabhadra Temple',
        narrative: "Built in the 16th century by the royal treasurer Virupanna and his brother Veeranna under the Vijayanagara Empire, Lepakshi is renowned for its world-famous hanging pillar that does not touch the ground. Visitors can pass a thin cloth underneath it completely! Legend also ties this sacred ground to the Ramayana, where the mythical bird Jatayu fell after battling Ravana, and Lord Rama compassionately proclaimed 'Le Pakshi', meaning 'Rise, Bird' in Telugu."
      },
      te: {
        title: 'లేపాక్షి: గాల్లో వేలాడే స్తంభం రహస్యం',
        narrative: "విజయనగర రాజుల కాలంలో 16వ శతాబ్దంలో నిర్మితమైన లేపాక్షి వీరభద్ర దేవాలయం శిల్పకళా అద్భుతం. ఇక్కడి ప్రసిద్ధ వేలాడే స్తంభం నేలను తాకకుండా గాల్లో ఉంటుంది. రామాయణంలో జటాయువు పడిపోయిన ప్రదేశంగా, శ్రీరాముడు 'లే పక్షీ' అని మోక్షం ప్రసాదించిన పుణ్యక్షేత్రంగా ప్రసిద్ధి చెందింది."
      },
      hi: {
        title: 'लेपाक्षी: हवा में झूलते खंभे का रहस्य',
        narrative: "16वीं शताब्दी में विजयनगर साम्राज्य द्वारा निर्मित लेपाक्षी मंदिर अपने रहस्यमयी झूलते खंभे के लिए विश्व प्रसिद्ध है, जो जमीन को नहीं छूता। पौराणिक मान्यताओं के अनुसार, रावण से युद्ध के बाद जटायु यहीं गिरे थे और प्रभु श्री राम ने उन्हें 'ले पाक्षी' यानी 'उठो पक्षी' कहकर मोक्ष दिया था।"
      }
    }
  },
  {
    id: 'golconda-fort',
    title: 'Golconda Fort: Whispering Vaults & Diamond Mines',
    district: 'Hyderabad, Telangana',
    duration: '1 min 50 sec',
    image: '/images/telangana/hyderabad.jpg',
    standout: 'Qutb Shahi Acoustic Citadel',
    languages: {
      en: {
        title: 'The Acoustic Citadel of Golconda',
        narrative: "Perched atop a 120-meter granite hill, Golconda Fort was the medieval seat of the Qutb Shahi dynasty and the global epicenter of the diamond trade that produced the legendary Koh-i-Noor and Hope diamonds. The fort's engineering masterpiece is its acoustic warning system: a handclap beneath the dome at the Fateh Darwaza entrance gate reverberates with crystal clarity all the way up to the Bala Hissar pavilion one kilometer away at the highest summit!"
      },
      te: {
        title: 'గోల్కొండ కోట: చేతి చప్పట్ల శబ్ద అద్భుతం',
        narrative: "హైదరాబాద్‌లోని గోల్కొండ కోట ప్రపంచ ప్రసిద్ధి గాంచిన వజ్రాల గని మరియు కుతుబ్ షాహీల రాజధాని. కోట ప్రవేశద్వారం ఫతే దర్వాజా కింద చప్పట్లు కొడితే ఆ శబ్దం దాదాపు ఒక కిలోమీటరు దూరంలో ఉన్న కొండపై బాలా హిస్సార్ దర్బార్‌లో స్పష్టంగా వినిపిస్తుంది. కోహినూర్ వంటి అద్భుతమైన వజ్రాలు ఈ ప్రాంతం నుంచే లభించాయి."
      },
      hi: {
        title: 'गोलकोंडा किला: तालियों की गूंज और कोहिनूर का इतिहास',
        narrative: "120 मीटर ऊंची ग्रेनाइट पहाड़ी पर बना गोलकोंडा किला कुतुब शाही वंश की राजधानी था। यह किला अपनी बेजोड़ ध्वनिकी तकनीक के लिए प्रसिद्ध है। इसके मुख्य प्रवेश द्वार पर ताली बजाने से उसकी आवाज एक किलोमीटर दूर पहाड़ी की चोटी पर स्थित महल में साफ सुनाई देती है। इसी क्षेत्र से प्रसिद्ध कोहिनूर हीरा भी मिला था।"
      }
    }
  },
  {
    id: 'tirumala-hills',
    title: 'Tirumala Venkateswara: Seven Sacred Hills',
    district: 'Tirupati, Andhra Pradesh',
    duration: '1 min 40 sec',
    image: '/images/aptourism/sri_venkateshwara_swamy_temple.jpg',
    standout: 'Sacred Seshachalam Shrine',
    languages: {
      en: {
        title: 'The Divine Sanctum of Tirumala Hills',
        narrative: "Nestled in the lush Seshachalam biosphere, the Sri Venkateswara Swamy Temple atop Tirumala is among the world's most visited and spiritually revered destinations. Dedicated to Lord Srinivasa, the temple's golden Ananda Nilayam vimana glows beneath the sky. Historical inscriptions from the Pallava, Chola, and Vijayanagara emperors (notably Sri Krishnadevaraya) recount centuries of royal patronage. Traditional attire is mandatory in the sanctum."
      },
      te: {
        title: 'తిరుమల వేంకటేశ్వర స్వామి: ఏడు కొండల దివ్యక్షేత్రం',
        narrative: "శేషాచలం అటవీ ప్రాంతంలోని ఏడు కొండలపై వెలసిన శ్రీ వేంకటేశ్వర స్వామి ఆలయం ప్రపంచ ప్రసిద్ధి చెందిన పుణ్యక్షేత్రం. ఆనంద నిలయం బంగారు గోపురం క్రింద కొలువైన శ్రీనివాసుడిని దర్శించుకోవడానికి రోజూ వేలాది మంది భక్తులు తరలివస్తారు. పల్లవులు, చోళులు, మరియు శ్రీకృష్ణదేవరాయలు ఈ ఆలయానికి విశేష కానుకలు సమర్పించినట్లు శాసనాలు తెలుపుతున్నాయి."
      },
      hi: {
        title: 'तिरुपति तिरुमाला: सात पहाड़ियों पर स्थित दिव्य धाम',
        narrative: "शेषाचलम पहाड़ियों में स्थित तिरुमाला वेंकटेश्वर मंदिर दुनिया के सबसे पवित्र और प्रसिद्ध मंदिरों में से एक है। भगवान श्रीनिवास को समर्पित यह मंदिर अपने स्वर्ण आनंद निलयम गोपुरम और अपार आस्था के लिए जाना जाता है। मंदिर में प्रवेश के लिए पारंपरिक परिधान अनिवार्य हैं।"
      }
    }
  },
  {
    id: 'srisailam-temple',
    title: 'Srisailam: Ancient Jyotirlinga on Krishna Gorges',
    district: 'Nandyal, Andhra Pradesh',
    duration: '1 min 45 sec',
    image: '/images/aptourism/srisailam.jpg',
    standout: 'Jyotirlinga & Shakti Peetha',
    languages: {
      en: {
        title: 'Mallikarjuna Jyotirlinga and Bhramaramba Shakti Peetha',
        narrative: "Perched dramatically on the flat top of the Nallamala Hills overlooking the rushing Krishna River, Srisailam is one of the exceptionally rare places in India that houses both one of the 12 sacred Jyotirlingas of Lord Shiva (Mallikarjuna) and one of the 18 Maha Shakti Peethas of Goddess Parvati (Bhramaramba). Chhatrapati Shivaji Maharaj worshipped here and commissioned the northern gateway tower in 1677."
      },
      te: {
        title: 'శ్రీశైలం: కృష్ణా తీరంలో జ్యోతిర్లింగ క్షేత్రం',
        narrative: "నల్లమల అడవుల్లో కృష్ణా నది తీరాన వెలసిన శ్రీశైలం మహాక్షేత్రం భారతదేశంలోనే అరుదైన పుణ్యస్థలం. ఇక్కడ శివుని ద్వాదశ జ్యోతిర్లింగాలలో ఒకటైన మల్లికార్జున స్వామి మరియు అష్టాదశ శక్తిపీఠాలలో ఒకటైన భ్రమరాంబికా అమ్మవారు ఒకేచోట కొలువై ఉన్నారు. ఛత్రపతి శివాజీ మహారాజ్ ఇక్కడ గోపురాన్ని నిర్మించి ప్రత్యేక పూజలు చేశారు."
      },
      hi: {
        title: 'श्रीशैलम: कृष्णा नदी के तट पर पवित्र ज्योतिर्लिंग',
        narrative: "नल्लामलाई की हरी-भरी पहाड़ियों में स्थित श्रीशैलम भारत का एक अत्यंत दुर्लभ तीर्थ स्थल है, जहाँ 12 ज्योतिर्लिंगों में से एक मल्लिकार्जुन और 18 शक्तिपीठों में से एक भ्रमराम्बा देवी एक साथ विराजमान हैं। छत्रपति शिवाजी महाराज ने भी यहाँ दर्शन कर एक भव्य गोपुरम का निर्माण करवाया था।"
      }
    }
  },
  {
    id: 'warangal-fort',
    title: 'Warangal Fort & Thousand Pillar Temple',
    district: 'Hanamkonda, Telangana',
    duration: '1 min 35 sec',
    image: '/images/telangana/warangal.jpg',
    standout: 'Kakatiya Dynasty Monoliths',
    languages: {
      en: {
        title: 'The Monolithic Keerthi Thoranas of Warangal',
        narrative: "Warangal was the historic capital of the Kakatiya Dynasty from the 12th to 14th centuries, ruled by visionary monarchs including the legendary warrior Queen Rani Rudrama Devi. The four majestic Keerthi Thorana ornamental stone archways in the fort stand as the official emblem of the Government of Telangana today. Nearby, the Thousand Pillar Temple features star-shaped tripartite shrines and a monumental monolith Nandi bull carved from black dolerite."
      },
      te: {
        title: 'వరంగల్ కోట: కాకతీయుల కీర్తి తోరణాలు',
        narrative: "కాకతీయ రాజధానిగా వెలుగొందిన వరంగల్ నగరంలో రాణి రుద్రమదేవి వంటి పరాక్రమవంతులు పాలించారు. వరంగల్ కోటలోని నాలుగు అద్భుత కీర్తి తోరణాలు ప్రస్తుతం తెలంగాణ ప్రభుత్వ అధికారిక చిహ్నంగా ఉన్నాయి. సమీపంలోని వేయి స్తంభాల గుడి నక్షత్రాకార పునాది మరియు ఏకశిలా నంది శిల్పంతో అలరారుతోంది."
      },
      hi: {
        title: 'वारंगल किला: काकतीय साम्राज्य की कीर्ति तोरण',
        narrative: "12वीं से 14वीं शताब्दी के दौरान काकतीय वंश की राजधानी रहे वारंगल में वीरांगना रानी रुद्रमा देवी ने शासन किया था। वारंगल किले के भव्य कीर्ति तोरण आज तेलंगाना सरकार के आधिकारिक प्रतीक हैं। पास ही स्थित हजार खंभों वाला मंदिर अपनी उत्कृष्ट मूर्तिकला के लिए विख्यात है।"
      }
    }
  }
];

export default function VoiceConciergeModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('stories'); // 'stories' | 'live'
  
  // Gemini Live States
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [lastUserPrompt, setLastUserPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [activeModel, setActiveModel] = useState('Voice Assistant (Live)');
  const [liveError, setLiveError] = useState(null);
  const [textInput, setTextInput] = useState('');

  // Stories States
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [activeStoryId, setActiveStoryId] = useState(HERITAGE_STORIES[0].id);
  const [isPlayingStory, setIsPlayingStory] = useState(false);
  const [spokenCharIndex, setSpokenCharIndex] = useState(0);
  const [storySearchQuery, setStorySearchQuery] = useState('');
  const [storyFilter, setStoryFilter] = useState('ALL'); // 'ALL' | 'FEATURED' | 'AP' | 'TG'

  // Extract all 646 destinations dynamically from Master Atlas
  const allAtlasDestinations = useMemo(() => {
    const list = [];
    const processDistricts = (districts, stateName) => {
      if (!Array.isArray(districts)) return;
      districts.forEach(d => {
        if (!Array.isArray(d.spots)) return;
        d.spots.forEach(s => {
          const id = `atlas-${s.slug || s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
          const safeTimings = s.timings || s.openingTime || '09:00 AM – 06:00 PM';
          const safeFees = s.fees || s.feesDescription || (s.individualPrice ? `₹${s.individualPrice}` : 'Free entry');
          const safeDesc = s.description || s.backstory || 'Historical regional landmark in the tourism corridor.';
          const safeFood = s.culinarySpecialty || '';

          list.push({
            id,
            title: s.name,
            district: `${d.name}, ${stateName}`,
            state: stateName,
            duration: '1 min 15 sec',
            image: s.imageUrl || '',
            standout: s.category || 'Corridor Destination',
            isAtlasSpot: true,
            languages: {
              en: {
                title: s.name,
                narrative: `Welcome to ${s.name}, situated in ${d.name}, ${stateName}. ${safeDesc} Official visiting hours are ${safeTimings}, and entrance admission is ${safeFees}. ${safeFood ? `When you are in the area, authentic regional delicacies include ${safeFood}.` : ''}`
              },
              te: {
                title: s.name,
                narrative: `${stateName} లోని ${d.name} జిల్లాలో ఉన్న ${s.name} పర్యాటక ప్రాంతం. ${safeDesc} సందర్శన వేళలు: ${safeTimings}. ప్రవేశ రుసుము: ${safeFees}. ${safeFood ? `ఇక్కడి ప్రత్యేక ఆహారం: ${safeFood}.` : ''}`
              },
              hi: {
                title: s.name,
                narrative: `${stateName} के ${d.name} जिले में स्थित ${s.name} एक प्रसिद्ध स्थल है। ${safeDesc} समय: ${safeTimings}. प्रवेश शुल्क: ${safeFees}. ${safeFood ? `यहाँ का प्रमुख स्थानीय भोजन: ${safeFood}.` : ''}`
              }
            }
          });
        });
      });
    };

    processDistricts(MASTER_ATLAS_DATA?.andhraPradesh, 'Andhra Pradesh');
    processDistricts(MASTER_ATLAS_DATA?.telangana, 'Telangana');
    return list;
  }, []);

  const filteredStories = useMemo(() => {
    let pool = [];
    if (storyFilter === 'FEATURED') {
      pool = HERITAGE_STORIES;
    } else if (storyFilter === 'AP') {
      pool = allAtlasDestinations.filter(s => s.state === 'Andhra Pradesh');
    } else if (storyFilter === 'TG') {
      pool = allAtlasDestinations.filter(s => s.state === 'Telangana');
    } else {
      pool = [...HERITAGE_STORIES, ...allAtlasDestinations];
    }

    if (!storySearchQuery.trim()) {
      return pool.slice(0, 30);
    }

    const q = storySearchQuery.toLowerCase().trim();
    return pool.filter(s =>
      s.title.toLowerCase().includes(q) ||
      s.district.toLowerCase().includes(q) ||
      (s.standout && s.standout.toLowerCase().includes(q))
    ).slice(0, 40);
  }, [allAtlasDestinations, storyFilter, storySearchQuery]);

  // Refs
  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);

  // Stop everything on close
  const handleClose = () => {
    stopLiveSession();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingStory(false);
    setActiveTab('stories');
    if (onClose) onClose();
  };

  // ── Speak AI Response with Natural Voice & Dynamic Accent ──────────────────
  const speakResponse = (text, langOverride = null) => {
    if (!('speechSynthesis' in window) || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);

    const targetLang = langOverride || selectedLanguage;
    const isTelugu = targetLang === 'te' || /[\u0C00-\u0C7F]/.test(text);
    const isHindi = targetLang === 'hi' || /[\u0900-\u097F]/.test(text);

    if (isTelugu) {
      utterance.lang = 'te-IN';
      utterance.rate = 0.95;
    } else if (isHindi) {
      utterance.lang = 'hi-IN';
      utterance.rate = 1.0;
    } else {
      utterance.lang = 'en-IN';
      utterance.rate = 1.02;
    }
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  // ── Dispatch Query to Google Gemini 3.8 Flash (Edge + Direct Fallback) ──────
  const sendToGemini = useCallback(async (userText) => {
    if (!userText || !userText.trim()) return;
    const cleanQuery = userText.trim();
    setLastUserPrompt(cleanQuery);
    setLiveTranscript('');
    setIsThinking(true);
    setLiveError(null);

    // Stop speaking if prior utterance was running (barge-in)
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);

    try {
      // 1. Attempt Cloudflare Edge Proxy First
      let reply = null;
      try {
        const edgeRes = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: cleanQuery
          })
        });
        if (edgeRes.ok) {
          const data = await edgeRes.json();
          reply = data.response || data.message;
          if (data.model) setActiveModel(data.model);
        }
      } catch (edgeErr) {
        console.warn('Edge proxy bypassed, engaging direct Gemini Flash:', edgeErr);
      }

      // 2. Secondary Retry to /api/chat if initial attempt had network jitter
      if (!reply) {
        try {
          const retryRes = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: cleanQuery,
              prompt: cleanQuery
            })
          });
          if (retryRes.ok) {
            const retryData = await retryRes.json();
            reply = retryData.response || retryData.message || null;
            setActiveModel(retryData.model || 'Voice Assistant (Cloud)');
          }
        } catch (retryErr) {
          console.warn('Secondary /api/chat attempt failed:', retryErr);
        }
      }

      setAiResponse(reply);
      speakResponse(reply);
    } catch (err) {
      if (import.meta.env.DEV) console.warn('Voice Assistant Query Error:', err);
      setLiveError(err.message || 'Error connecting to Voice Assistant');
      setAiResponse(`Notice: Unable to reach Voice Assistant: ${err.message}. Please check your connection.`);
    } finally {
      setIsThinking(false);
    }
  }, []);

  // ── Speech Recognition Lifecycle (Live Continuous Listening) ───────────────
  const startLiveSession = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setLiveError('Live voice recognition is not supported in this browser. Please use Chrome, Edge, or type your query below.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
        setLiveError(null);
      };

      recognition.onresult = (event) => {
        let interim = '';
        let finalTrans = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const text = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTrans += text;
          } else {
            interim += text;
          }
        }

        const currentSpeech = finalTrans || interim;
        setLiveTranscript(currentSpeech);

        // Barge-in: If user speaks while AI is speaking, interrupt AI
        if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
          setIsSpeaking(false);
        }

        // Debounce: when silence detected for 1.3 seconds, send query to Gemini
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        if (currentSpeech.trim().length > 2) {
          silenceTimerRef.current = setTimeout(() => {
            sendToGemini(currentSpeech);
          }, 1300);
        }
      };

      recognition.onerror = (e) => {
        if (e.error !== 'no-speech') {
          console.warn('SpeechRecognition error:', e.error);
          setLiveError(`Microphone error: ${e.error}`);
        }
      };

      recognition.onend = () => {
        // If still supposed to be listening, auto-restart (continuous session)
        if (isListening) {
          try {
            recognition.start();
          } catch {
            // Already started
          }
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
    } catch (err) {
      if (import.meta.env.DEV) console.warn('Speech recognition initiation error:', err);
      setLiveError('Could not access microphone: ' + err.message);
    }
  };

  const stopLiveSession = () => {
    setIsListening(false);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  };

  const toggleLiveSession = () => {
    if (isListening) {
      stopLiveSession();
    } else {
      startLiveSession();
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (textInput.trim()) {
      sendToGemini(textInput.trim());
      setTextInput('');
    }
  };

  // ── Heritage Audio Story Playback Handler ──────────────────────────────────
  const togglePlayStory = (story) => {
    if (!('speechSynthesis' in window)) return;

    if (isPlayingStory && activeStoryId === story.id) {
      window.speechSynthesis.cancel();
      setIsPlayingStory(false);
      return;
    }

    window.speechSynthesis.cancel();
    setActiveStoryId(story.id);

    const langData = story.languages[selectedLanguage] || story.languages.en;
    const utterance = new SpeechSynthesisUtterance(langData.narrative);

    if (selectedLanguage === 'te') {
      utterance.lang = 'te-IN';
      utterance.rate = 0.95;
    } else if (selectedLanguage === 'hi') {
      utterance.lang = 'hi-IN';
      utterance.rate = 1.0;
    } else {
      utterance.lang = 'en-IN';
      utterance.rate = 1.02;
    }

    utterance.onboundary = (event) => {
      if (event.name === 'word' || event.name === 'sentence' || typeof event.charIndex === 'number') {
        setSpokenCharIndex(event.charIndex || 0);
      }
    };

    utterance.onend = () => {
      setIsPlayingStory(false);
      setSpokenCharIndex(0);
    };
    utterance.onerror = () => {
      setIsPlayingStory(false);
      setSpokenCharIndex(0);
    };

    window.speechSynthesis.speak(utterance);
    setIsPlayingStory(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.25, type: 'spring', damping: 25 }}
        className="relative w-full max-w-2xl bg-[#0E121A] border border-white/10 rounded-3xl p-5 sm:p-7 shadow-2xl text-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Ambient Top Glow */}
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Top Bar */}
        <div className="relative z-10 flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <Headphones className="w-4 h-4 text-amber-300" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-base font-sans-clean">
                  Tourist Audio Guide Player
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-sans-clean font-semibold border border-emerald-500/30">
                  {activeTab === 'live' ? activeModel : 'Included with Pass'}
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Official audio stories in English, Telugu, & Hindi • Live AI guide
              </span>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="relative z-10 flex items-center gap-2 pt-3 pb-4 shrink-0">
          <button
            onClick={() => setActiveTab('stories')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'stories'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'bg-white/[0.03] text-slate-400 hover:text-slate-200 border border-white/5'
            }`}
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>Monument Audio Player</span>
          </button>
          <button
            onClick={() => setActiveTab('live')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'live'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'bg-white/[0.03] text-slate-400 hover:text-slate-200 border border-white/5'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Ask Voice Guide (AI)</span>
          </button>
        </div>

        {/* Tab 1: Voice Guide Mode */}
        {activeTab === 'live' && (
          <div className="relative z-10 flex-1 overflow-y-auto pr-1 flex flex-col gap-4">
            
            {/* Central Animated Orb & Live Status Visualizer */}
            <div className="flex flex-col items-center justify-center py-6 px-2 bg-white/[0.02] border border-white/5 rounded-2xl relative overflow-hidden">
              <div className="relative flex items-center justify-center my-2">
                {/* Outer Soundwaves */}
                <motion.div
                  animate={{
                    scale: isListening ? [1, 1.25, 1] : isSpeaking ? [1, 1.35, 1] : 1,
                    opacity: isListening || isSpeaking ? [0.2, 0.6, 0.2] : 0.15
                  }}
                  transition={{ repeat: Infinity, duration: isSpeaking ? 1.2 : 1.8, ease: 'easeInOut' }}
                  className={`absolute w-28 h-28 rounded-full ${
                    isSpeaking ? 'bg-emerald-500/30' : isListening ? 'bg-amber-500/30' : 'bg-slate-700/20'
                  }`}
                />

                {/* Primary Mic Action Button */}
                <button
                  onClick={toggleLiveSession}
                  className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-transform active:scale-95 cursor-pointer ${
                    isListening
                      ? 'bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 ring-4 ring-amber-400/30'
                      : isSpeaking
                      ? 'bg-gradient-to-tr from-emerald-500 to-amber-400 text-slate-950'
                      : 'bg-white/10 hover:bg-white/15 text-slate-300 border border-white/15'
                  }`}
                  aria-label={isListening ? 'Pause Listening' : 'Start Live Session'}
                >
                  {isListening ? (
                    <Mic className="w-7 h-7" />
                  ) : (
                    <MicOff className="w-7 h-7" />
                  )}
                </button>
              </div>

              {/* Status Text & Controls */}
              <div className="flex flex-col items-center gap-1.5 mt-2">
                <span className="text-xs font-semibold text-white tracking-wide">
                  {isThinking
                    ? 'Finding travel details...'
                    : isSpeaking
                    ? 'Guide is speaking (tap to pause)'
                    : isListening
                    ? 'Listening... speak anytime'
                    : 'Tap microphone to start voice guide'}
                </span>
                <span className="text-[11px] text-slate-400 text-center max-w-sm">
                  {isListening
                    ? 'Speak naturally to ask about monuments, timings, and history.'
                    : 'Ask travel questions, monument history, or directions by voice.'}
                </span>

                {/* Live Controls: Audio Cancel */}
                {isSpeaking && (
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => {
                        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                        setIsSpeaking(false);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium cursor-pointer"
                    >
                      <VolumeX className="w-3.5 h-3.5" />
                      <span>Stop Audio</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Live Streaming Speech Transcript (No Fake Canned Strings) */}
            {liveTranscript && (
              <div className="p-3 rounded-2xl bg-amber-950/20 border border-amber-500/30 flex items-start gap-2.5">
                <Mic className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <span className="text-[11px] font-sans-clean font-medium text-amber-400">Live speech:</span>
                  <p className="text-sm text-amber-100 font-sans-clean font-medium">
                    "{liveTranscript}"
                  </p>
                </div>
              </div>
            )}

            {/* Error Notice (if any) */}
            {liveError && (
              <div className="p-3 rounded-2xl bg-rose-950/30 border border-rose-500/30 flex items-start gap-2 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{liveError}</span>
              </div>
            )}

            {/* Live Gemini Response Card */}
            {(lastUserPrompt || aiResponse) && (
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-2.5">
                {lastUserPrompt && (
                  <div className="flex flex-col border-b border-white/5 pb-2">
                    <span className="text-[11px] font-sans-clean font-medium text-slate-400">You asked:</span>
                    <p className="text-sm font-semibold text-slate-200 font-sans-clean">
                      "{lastUserPrompt}"
                    </p>
                  </div>
                )}

                {aiResponse && (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-sans-clean font-medium text-emerald-400 flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3" />
                        <span>Guidance:</span>
                      </span>
                      <button
                        onClick={() => speakResponse(aiResponse)}
                        className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1"
                        title="Replay Voice"
                      >
                        <Volume2 className="w-3 h-3 text-amber-400" />
                        <span>Replay</span>
                      </button>
                    </div>
                    <p className="text-sm text-slate-300 font-sans-clean leading-relaxed whitespace-pre-wrap">
                      {aiResponse}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Manual Text Query Input (Zero Obstacles Fallback) */}
            <form onSubmit={handleManualSubmit} className="flex items-center gap-2 mt-auto pt-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Or type a question (e.g. 'Best places in Warangal')..."
                className="flex-1 py-2.5 px-4 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-400 transition-colors"
              />
              <button
                type="submit"
                disabled={!textInput.trim() || isThinking}
                className="py-2.5 px-4 rounded-full bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 hover:bg-amber-300 transition-colors disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Ask</span>
              </button>
            </form>

          </div>
        )}

        {/* Tab 2: Heritage Monument Audio Guides (Zero Mic Required) */}
        {activeTab === 'stories' && (
          <div className="relative z-10 flex-1 overflow-y-auto pr-1 flex flex-col gap-3">
            {/* Language Switcher */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-xs text-slate-400 font-sans-clean pl-2">Narration Language:</span>
              <div className="flex items-center gap-1">
                {[
                  { code: 'en', label: 'English' },
                  { code: 'te', label: 'తెలుగు' },
                  { code: 'hi', label: 'हिन्दी' }
                ].map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setSelectedLanguage(lang.code);
                      if (isPlayingStory) {
                        window.speechSynthesis.cancel();
                        setIsPlayingStory(false);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      selectedLanguage === lang.code
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : 'bg-white/5 text-slate-300 hover:text-white'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Bar for all 646 Destinations */}
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={storySearchQuery}
                onChange={(e) => setStorySearchQuery(e.target.value)}
                placeholder="Search audio guides for 646 destinations (e.g., Belum Caves, Gandikota)..."
                className="w-full pl-9 pr-9 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/60 transition-colors"
              />
              {storySearchQuery && (
                <button
                  type="button"
                  onClick={() => setStorySearchQuery('')}
                  className="absolute right-3 text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {[
                { id: 'ALL', label: 'All 646 Sights' },
                { id: 'FEATURED', label: 'Flagship (8)' },
                { id: 'AP', label: 'Andhra Pradesh (312)' },
                { id: 'TG', label: 'Telangana (334)' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setStoryFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    storyFilter === tab.id
                      ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                      : 'bg-white/[0.02] text-slate-400 hover:text-white border border-white/5'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Accessibility / Audio Guidance Notice */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200 font-sans-clean">
              <Headphones className="w-4 h-4 text-amber-400 shrink-0" />
              <span>In busy queues, plug in earphones or read the live captions synchronized with the audio player.</span>
            </div>

            {/* Story Cards List */}
            <div className="flex flex-col gap-3">
              {filteredStories.length === 0 ? (
                <div className="p-8 text-center bg-white/[0.02] border border-white/5 rounded-2xl text-slate-400 text-xs">
                  No destinations found matching "{storySearchQuery}". Try another sight or district name.
                </div>
              ) : (
                filteredStories.map((story) => {
                  const isSelected = activeStoryId === story.id;
                  const isCurrentlyPlaying = isPlayingStory && isSelected;
                  const langContent = story.languages[selectedLanguage] || story.languages.en;

                  return (
                    <div
                      key={story.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isSelected
                          ? 'bg-amber-950/20 border-amber-500/40 shadow-lg'
                          : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 font-semibold flex items-center gap-1">
                              <MapPin className="w-2.5 h-2.5" />
                              <span>{story.district}</span>
                            </span>
                            {story.standout && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/10 font-sans-clean">
                                {story.standout}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400">{story.duration}</span>
                          </div>
                          <h4 className="text-sm font-bold text-white font-sans-clean mt-1">
                            {langContent.title}
                          </h4>
                          <p className={`text-xs text-slate-300 font-sans-clean leading-relaxed transition-all ${
                            isSelected ? 'mt-1 text-slate-200' : 'line-clamp-2'
                          }`}>
                            {langContent.narrative}
                          </p>
                        </div>

                        <button
                          onClick={() => togglePlayStory(story)}
                          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer ${
                            isCurrentlyPlaying
                              ? 'bg-emerald-400 text-slate-950'
                              : 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                          }`}
                          title={isCurrentlyPlaying ? 'Pause Audio' : 'Play Audio Guide'}
                        >
                          {isCurrentlyPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                        </button>
                      </div>

                      {isCurrentlyPlaying && (
                        <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 animate-in fade-in">
                          <Volume2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5 animate-pulse" />
                          <div className="flex flex-col w-full">
                            <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-emerald-300">
                              <span>Live Captions ({selectedLanguage === 'te' ? 'తెలుగు' : selectedLanguage === 'hi' ? 'हिन्दी' : 'English'}):</span>
                              <span className="text-amber-300/90 lowercase font-normal flex items-center gap-1 font-sans-clean">
                                <Headphones className="w-3 h-3 text-amber-400" /> earphones recommended in crowds
                              </span>
                            </div>
                            <p className="text-xs mt-1.5 leading-relaxed">
                              <span className="text-emerald-300 font-semibold bg-emerald-400/15 px-1 py-0.5 rounded">
                                {langContent.narrative.slice(0, Math.max(30, spokenCharIndex + 30))}
                              </span>
                              <span className="text-slate-400">
                                {langContent.narrative.slice(Math.max(30, spokenCharIndex + 30))}
                              </span>
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

      </motion.div>
    </div>
  );
}
