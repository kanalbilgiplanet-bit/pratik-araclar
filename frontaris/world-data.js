// FRONTARIS - GERÇEK DÜNYA VE ÜLKE VERİLERİ (WORLD DATA)

const WORLD_NATIONS = {
  TUR: {
    id: "TUR",
    name: "Türkiye",
    flag: "🇹🇷",
    capital: "Ankara",
    power: "Bölgesel Güç",
    industry: "★★★☆☆",
    desc: "Boğazlara ve Anadolu'nun stratejik kilit noktalarına hakim. Kara ordusu disiplinli ve savunmada çok çetin.",
    bounds: [[36.0, 26.0], [42.0, 45.0]],
    cities: [
      { id: "ankara", name: "Ankara", lat: 39.9334, lng: 32.8597, tier: "big", health: 2, maxHealth: 2, infantry: 3, tanks: 2, baseLvl: 2, factoryLvl: 1 },
      { id: "istanbul", name: "İstanbul", lat: 41.0082, lng: 28.9784, tier: "big", health: 2, maxHealth: 2, infantry: 3, tanks: 1, baseLvl: 2, factoryLvl: 2 },
      { id: "izmir", name: "İzmir", lat: 38.4237, lng: 27.1428, tier: "small", health: 1, maxHealth: 1, infantry: 2, tanks: 1, baseLvl: 1, factoryLvl: 1 },
      { id: "trabzon", name: "Trabzon", lat: 41.0027, lng: 39.7168, tier: "small", health: 1, maxHealth: 1, infantry: 1, tanks: 0, baseLvl: 1, factoryLvl: 0 },
      { id: "adana", name: "Adana", lat: 37.0000, lng: 35.3213, tier: "small", health: 1, maxHealth: 1, infantry: 2, tanks: 1, baseLvl: 1, factoryLvl: 1 }
    ],
    polygon: [
      [41.5, 26.5], [42.1, 28.0], [41.8, 32.0], [41.9, 35.0], [41.4, 41.5],
      [41.0, 43.5], [39.8, 44.5], [37.2, 44.3], [37.0, 42.0], [36.7, 38.0],
      [36.0, 36.0], [36.2, 33.5], [36.8, 30.0], [36.7, 27.3], [38.4, 26.2],
      [40.0, 26.1], [40.7, 26.0], [41.5, 26.5]
    ]
  },
  DEU: {
    id: "DEU",
    name: "Almanya",
    flag: "🇩🇪",
    capital: "Berlin",
    power: "Büyük Askeri Güç",
    industry: "★★★★★",
    desc: "Ağır sanayi, ileri zırhlı doktrin ve güçlü panzer tümenleri. Hızlı taarruz kabiliyeti çok yüksek.",
    bounds: [[47.2, 5.8], [55.0, 15.0]],
    cities: [
      { id: "berlin", name: "Berlin", lat: 52.5200, lng: 13.4050, tier: "big", health: 2, maxHealth: 2, infantry: 4, tanks: 3, baseLvl: 3, factoryLvl: 3 },
      { id: "munih", name: "Münih", lat: 48.1351, lng: 11.5820, tier: "big", health: 2, maxHealth: 2, infantry: 3, tanks: 2, baseLvl: 2, factoryLvl: 2 },
      { id: "koln", name: "Köln", lat: 50.9375, lng: 6.9603, tier: "small", health: 1, maxHealth: 1, infantry: 2, tanks: 2, baseLvl: 2, factoryLvl: 2 },
      { id: "hamburg", name: "Hamburg", lat: 53.5511, lng: 9.9937, tier: "small", health: 1, maxHealth: 1, infantry: 2, tanks: 1, baseLvl: 1, factoryLvl: 1 }
    ],
    polygon: [
      [54.8, 8.5], [54.5, 10.0], [54.0, 14.0], [52.5, 14.7], [51.0, 15.0],
      [50.2, 12.5], [47.5, 13.0], [47.5, 10.0], [47.6, 7.6], [49.0, 8.0],
      [50.0, 6.0], [53.5, 7.0], [54.8, 8.5]
    ]
  },
  RUS: {
    id: "RUS",
    name: "Sovyet Rusya",
    flag: "🇷🇺",
    capital: "Moskova",
    power: "Süper Güç",
    industry: "★★★★☆",
    desc: "Uçsuz bucaksız coğrafya ve devasa insan gücü rezervi. Kışın savunması neredeyse imkansız kırılır.",
    bounds: [[50.0, 27.0], [65.0, 60.0]],
    cities: [
      { id: "moskova", name: "Moskova", lat: 55.7558, lng: 37.6173, tier: "big", health: 2, maxHealth: 2, infantry: 5, tanks: 3, baseLvl: 3, factoryLvl: 3 },
      { id: "leningrad", name: "Leningrad (St. Petersburg)", lat: 59.9343, lng: 30.3351, tier: "big", health: 2, maxHealth: 2, infantry: 4, tanks: 2, baseLvl: 2, factoryLvl: 2 },
      { id: "stalingrad", name: "Stalingrad (Volgograd)", lat: 48.7080, lng: 44.5133, tier: "big", health: 2, maxHealth: 2, infantry: 4, tanks: 2, baseLvl: 3, factoryLvl: 2 },
      { id: "rostov", name: "Rostov", lat: 47.2357, lng: 39.7015, tier: "small", health: 1, maxHealth: 1, infantry: 2, tanks: 1, baseLvl: 1, factoryLvl: 1 }
    ],
    polygon: [
      [65.0, 30.0], [65.0, 55.0], [55.0, 55.0], [50.0, 45.0], [48.0, 40.0],
      [52.0, 32.0], [56.0, 28.0], [60.0, 30.0], [65.0, 30.0]
    ]
  },
  GBR: {
    id: "GBR",
    name: "Birleşik Krallık",
    flag: "🇬🇧",
    capital: "Londra",
    power: "İmparatorluk",
    industry: "★★★★☆",
    desc: "Ada devleti avantajı, efsanevi donanma ve sömürgelerden gelen devasa ikmal zincirleri.",
    bounds: [[49.8, -8.0], [59.0, 2.0]],
    cities: [
      { id: "londra", name: "Londra", lat: 51.5074, lng: -0.1278, tier: "big", health: 2, maxHealth: 2, infantry: 4, tanks: 2, baseLvl: 3, factoryLvl: 2 },
      { id: "manchester", name: "Manchester", lat: 53.4808, lng: -2.2426, tier: "small", health: 1, maxHealth: 1, infantry: 2, tanks: 1, baseLvl: 2, factoryLvl: 2 },
      { id: "edinburgh", name: "Edinburgh", lat: 55.9533, lng: -3.1883, tier: "small", health: 1, maxHealth: 1, infantry: 2, tanks: 1, baseLvl: 1, factoryLvl: 1 }
    ],
    polygon: [
      [58.5, -4.5], [57.5, -2.0], [52.8, 1.5], [51.2, 1.4], [50.5, -1.0],
      [50.0, -5.2], [52.0, -5.0], [54.5, -3.5], [56.0, -5.5], [58.5, -4.5]
    ]
  },
  FRA: {
    id: "FRA",
    name: "Fransa",
    flag: "🇫🇷",
    capital: "Paris",
    power: "Büyük Güç",
    industry: "★★★★☆",
    desc: "Zengin tarım ve sanayi toprakları, Maginot savunma hattı. Savunmada sağlam, taarruzda dikkatli.",
    bounds: [[42.3, -4.8], [51.1, 8.2]],
    cities: [
      { id: "paris", name: "Paris", lat: 48.8566, lng: 2.3522, tier: "big", health: 2, maxHealth: 2, infantry: 4, tanks: 2, baseLvl: 3, factoryLvl: 2 },
      { id: "marsilya", name: "Marsilya", lat: 43.2965, lng: 5.3698, tier: "small", health: 1, maxHealth: 1, infantry: 2, tanks: 1, baseLvl: 1, factoryLvl: 1 },
      { id: "lyon", name: "Lyon", lat: 45.7640, lng: 4.8357, tier: "small", health: 1, maxHealth: 1, infantry: 2, tanks: 1, baseLvl: 1, factoryLvl: 1 }
    ],
    polygon: [
      [51.0, 2.5], [49.5, 6.0], [48.0, 7.5], [44.0, 7.0], [43.0, 6.0],
      [42.5, 3.0], [42.5, -1.8], [46.0, -1.2], [48.5, -4.7], [50.0, -1.5], [51.0, 2.5]
    ]
  },
  ITA: {
    id: "ITA",
    name: "İtalya",
    flag: "🇮🇹",
    capital: "Roma",
    power: "Akdeniz Gücü",
    industry: "★★★☆☆",
    desc: "Akdeniz'in kalbinde stratejik çizme konumu. Deniz ve hava üsleri kritik önem taşır.",
    bounds: [[36.5, 6.5], [47.1, 18.5]],
    cities: [
      { id: "roma", name: "Roma", lat: 41.9028, lng: 12.4964, tier: "big", health: 2, maxHealth: 2, infantry: 3, tanks: 2, baseLvl: 2, factoryLvl: 2 },
      { id: "milano", name: "Milano", lat: 45.4642, lng: 9.1900, tier: "small", health: 1, maxHealth: 1, infantry: 2, tanks: 1, baseLvl: 2, factoryLvl: 2 },
      { id: "napoli", name: "Napoli", lat: 40.8518, lng: 14.2681, tier: "small", health: 1, maxHealth: 1, infantry: 2, tanks: 0, baseLvl: 1, factoryLvl: 0 }
    ],
    polygon: [
      [46.5, 7.0], [46.5, 13.0], [45.5, 13.5], [42.0, 15.0], [40.0, 18.0],
      [38.0, 16.0], [38.0, 13.0], [41.0, 13.0], [44.0, 8.5], [46.5, 7.0]
    ]
  },
  USA: {
    id: "USA",
    name: "Amerika Birleşik Devletleri",
    flag: "🇺🇸",
    capital: "Washington",
    power: "Dev Sanayi Devi",
    industry: "★★★★★",
    desc: "Okyanus ötesi koruma, devasa fabrika kapasitesi ve sınırsız kaynak rezervi.",
    bounds: [[25.0, -125.0], [49.0, -66.0]],
    cities: [
      { id: "washington", name: "Washington D.C.", lat: 38.9072, lng: -77.0369, tier: "big", health: 2, maxHealth: 2, infantry: 5, tanks: 3, baseLvl: 3, factoryLvl: 3 },
      { id: "newyork", name: "New York", lat: 40.7128, lng: -74.0060, tier: "big", health: 2, maxHealth: 2, infantry: 4, tanks: 3, baseLvl: 3, factoryLvl: 3 },
      { id: "chicago", name: "Chicago", lat: 41.8781, lng: -87.6298, tier: "small", health: 1, maxHealth: 1, infantry: 3, tanks: 2, baseLvl: 2, factoryLvl: 2 }
    ],
    polygon: [
      [49.0, -123.0], [49.0, -95.0], [46.0, -84.0], [45.0, -71.0], [41.0, -70.0],
      [32.0, -80.0], [25.0, -80.5], [29.5, -95.0], [26.0, -97.0], [32.0, -117.0],
      [38.0, -123.0], [48.5, -124.5], [49.0, -123.0]
    ]
  },
  GRC: {
    id: "GRC",
    name: "Yunanistan",
    flag: "🇬🇷",
    capital: "Atina",
    power: "Bölgesel Savunma",
    industry: "★★☆☆☆",
    desc: "Dağlık arazi ve ada ağları ile doğal savunma üstünlüğü.",
    bounds: [[34.8, 19.3], [41.8, 28.2]],
    cities: [
      { id: "atina", name: "Atina", lat: 37.9838, lng: 23.7275, tier: "big", health: 2, maxHealth: 2, infantry: 2, tanks: 1, baseLvl: 2, factoryLvl: 1 },
      { id: "selanik", name: "Selanik", lat: 40.6401, lng: 22.9444, tier: "small", health: 1, maxHealth: 1, infantry: 2, tanks: 0, baseLvl: 1, factoryLvl: 0 }
    ],
    polygon: [
      [41.5, 26.0], [41.0, 23.0], [39.5, 20.0], [37.5, 21.5], [36.5, 23.0],
      [38.0, 24.5], [40.0, 24.0], [41.5, 26.0]
    ]
  },
  EGY: {
    id: "EGY",
    name: "Mısır",
    flag: "🇪🇬",
    capital: "Kahire",
    power: "Kuzey Afrika Anahtarı",
    industry: "★★☆☆☆",
    desc: "Süveyş Kanalı kontrolü dünya ticaret ve donanma rotalarının kaderini belirler.",
    bounds: [[22.0, 25.0], [31.5, 36.0]],
    cities: [
      { id: "kahire", name: "Kahire", lat: 30.0444, lng: 31.2357, tier: "big", health: 2, maxHealth: 2, infantry: 3, tanks: 1, baseLvl: 2, factoryLvl: 1 },
      { id: "iskenderiye", name: "İskenderiye", lat: 31.2001, lng: 29.9187, tier: "small", health: 1, maxHealth: 1, infantry: 2, tanks: 1, baseLvl: 1, factoryLvl: 0 }
    ],
    polygon: [
      [31.5, 25.0], [31.5, 34.0], [29.5, 35.0], [22.0, 36.5], [22.0, 25.0], [31.5, 25.0]
    ]
  },
  IRN: {
    id: "IRN",
    name: "İran",
    flag: "🇮🇷",
    capital: "Tahran",
    power: "Orta Doğu Gücü",
    industry: "★★★☆☆",
    desc: "Zengin petrol yatakları ve aşılması güç Zagros dağları.",
    bounds: [[25.0, 44.0], [40.0, 63.5]],
    cities: [
      { id: "tahran", name: "Tahran", lat: 35.6892, lng: 51.3890, tier: "big", health: 2, maxHealth: 2, infantry: 3, tanks: 1, baseLvl: 2, factoryLvl: 1 },
      { id: "tebriz", name: "Tebriz", lat: 38.0800, lng: 46.2919, tier: "small", health: 1, maxHealth: 1, infantry: 2, tanks: 1, baseLvl: 1, factoryLvl: 1 }
    ],
    polygon: [
      [39.5, 45.0], [38.0, 49.0], [37.0, 59.0], [30.0, 61.0], [25.5, 57.0],
      [28.0, 51.0], [32.0, 48.0], [36.0, 45.0], [39.5, 45.0]
    ]
  },
  POL: {
    id: "POL",
    name: "Polonya",
    flag: "🇵🇱",
    capital: "Varşova",
    power: "Orta Avrupa Cephesi",
    industry: "★★★☆☆",
    desc: "İki büyük devin arasında tampon bölge. Süvari birlikleri ve bağımsızlık azmi yüksek.",
    bounds: [[49.0, 14.1], [54.8, 24.1]],
    cities: [
      { id: "varsova", name: "Varşova", lat: 52.2297, lng: 21.0122, tier: "big", health: 2, maxHealth: 2, infantry: 3, tanks: 1, baseLvl: 2, factoryLvl: 1 },
      { id: "krakow", name: "Krakow", lat: 50.0647, lng: 19.9450, tier: "small", health: 1, maxHealth: 1, infantry: 2, tanks: 1, baseLvl: 1, factoryLvl: 1 }
    ],
    polygon: [
      [54.5, 18.5], [54.0, 23.0], [51.5, 24.0], [49.5, 22.5], [49.5, 19.0],
      [50.5, 15.0], [53.5, 14.5], [54.5, 18.5]
    ]
  },
  JPN: {
    id: "JPN",
    name: "Japon İmparatorluğu",
    flag: "🇯🇵",
    capital: "Tokyo",
    power: "Pasifik Gücü",
    industry: "★★★★☆",
    desc: "Büyük uçak gemisi filoları, disiplinli kara birlikleri ve adalar zinciri hakimiyeti.",
    bounds: [[30.0, 128.0], [45.5, 146.0]],
    cities: [
      { id: "tokyo", name: "Tokyo", lat: 35.6762, lng: 139.6503, tier: "big", health: 2, maxHealth: 2, infantry: 4, tanks: 2, baseLvl: 3, factoryLvl: 2 },
      { id: "osaka", name: "Osaka", lat: 34.6937, lng: 135.5023, tier: "small", health: 1, maxHealth: 1, infantry: 2, tanks: 1, baseLvl: 2, factoryLvl: 2 }
    ],
    polygon: [
      [45.0, 142.0], [43.0, 145.5], [40.0, 140.0], [35.0, 140.0], [33.0, 131.0],
      [31.0, 130.5], [34.0, 133.0], [37.0, 137.0], [41.0, 140.0], [45.0, 142.0]
    ]
  },
  BGR: {
    id: "BGR",
    name: "Bulgaristan",
    flag: "🇧🇬",
    capital: "Sofya",
    power: "Balkan Gücü",
    industry: "★★☆☆☆",
    desc: "Balkanların kalbinde stratejik geçiş koridoru.",
    bounds: [[41.2, 22.3], [44.2, 28.6]],
    cities: [
      { id: "sofya", name: "Sofya", lat: 42.6977, lng: 23.3219, tier: "big", health: 2, maxHealth: 2, infantry: 3, tanks: 1, baseLvl: 2, factoryLvl: 1 },
      { id: "varna", name: "Varna", lat: 43.2141, lng: 27.9147, tier: "small", health: 1, maxHealth: 1, infantry: 2, tanks: 1, baseLvl: 1, factoryLvl: 1 },
      { id: "filibe", name: "Filibe", lat: 42.1354, lng: 24.7453, tier: "small", health: 1, maxHealth: 1, infantry: 2, tanks: 0, baseLvl: 1, factoryLvl: 0 }
    ]
  },
  SYR: {
    id: "SYR",
    name: "Suriye",
    flag: "🇸🇾",
    capital: "Şam",
    power: "Levant Gücü",
    industry: "★★☆☆☆",
    desc: "Orta Doğu ticaret ve çatışma kavşağı.",
    bounds: [[32.3, 35.6], [37.3, 42.4]],
    cities: [
      { id: "sam", name: "Şam", lat: 33.5138, lng: 36.2765, tier: "big", health: 2, maxHealth: 2, infantry: 3, tanks: 1, baseLvl: 2, factoryLvl: 1 },
      { id: "halep", name: "Halep", lat: 36.2021, lng: 37.1343, tier: "small", health: 1, maxHealth: 1, infantry: 2, tanks: 1, baseLvl: 1, factoryLvl: 1 }
    ]
  },
  IRQ: {
    id: "IRQ",
    name: "Irak",
    flag: "🇮🇶",
    capital: "Bağdat",
    power: "Mezopotamya Gücü",
    industry: "★★★☆☆",
    desc: "Dicle ve Fırat nehirlerinin zengin enerji coğrafyası.",
    bounds: [[29.0, 38.8], [37.4, 48.6]],
    cities: [
      { id: "bagdat", name: "Bağdat", lat: 33.3152, lng: 44.3661, tier: "big", health: 2, maxHealth: 2, infantry: 4, tanks: 2, baseLvl: 2, factoryLvl: 1 },
      { id: "musul", name: "Musul", lat: 36.3400, lng: 43.1300, tier: "small", health: 1, maxHealth: 1, infantry: 2, tanks: 1, baseLvl: 1, factoryLvl: 1 },
      { id: "basra", name: "Basra", lat: 30.5081, lng: 47.7835, tier: "small", health: 1, maxHealth: 1, infantry: 2, tanks: 1, baseLvl: 1, factoryLvl: 1 }
    ]
  },
  ROU: {
    id: "ROU",
    name: "Romanya",
    flag: "🇷🇴",
    capital: "Bükreş",
    power: "Doğu Avrupa Savunması",
    industry: "★★★☆☆",
    desc: "Karpatlar ve Tuna nehri havzası.",
    bounds: [[43.6, 20.2], [48.3, 29.7]],
    cities: [
      { id: "bukres", name: "Bükreş", lat: 44.4268, lng: 26.1025, tier: "big", health: 2, maxHealth: 2, infantry: 3, tanks: 2, baseLvl: 2, factoryLvl: 1 },
      { id: "kostence", name: "Köstence", lat: 44.1792, lng: 28.6498, tier: "small", health: 1, maxHealth: 1, infantry: 2, tanks: 1, baseLvl: 1, factoryLvl: 1 }
    ]
  },
  UKR: {
    id: "UKR",
    name: "Ukrayna",
    flag: "🇺🇦",
    capital: "Kiev",
    power: "Karadeniz Gücü",
    industry: "★★★☆☆",
    desc: "Geniş tahıl ambarı ve stratejik Karadeniz limanları.",
    bounds: [[44.3, 22.1], [52.4, 40.2]],
    cities: [
      { id: "kiev", name: "Kiev", lat: 50.4501, lng: 30.5234, tier: "big", health: 2, maxHealth: 2, infantry: 3, tanks: 2, baseLvl: 2, factoryLvl: 1 },
      { id: "odesa", name: "Odesa", lat: 46.4825, lng: 30.7233, tier: "small", health: 1, maxHealth: 1, infantry: 2, tanks: 1, baseLvl: 1, factoryLvl: 1 }
    ]
  },
  AZE: {
    id: "AZE",
    name: "Azerbaycan",
    flag: "🇦🇿",
    capital: "Bakü",
    power: "Kafkasya Gücü",
    industry: "★★★☆☆",
    desc: "Hazar Denizi kıyısında stratejik petrol ve doğal gaz merkezi.",
    bounds: [[38.3, 44.7], [41.9, 50.9]],
    cities: [
      { id: "baku", name: "Bakü", lat: 40.4093, lng: 49.8671, tier: "big", health: 2, maxHealth: 2, infantry: 3, tanks: 2, baseLvl: 2, factoryLvl: 2 },
      { id: "gence", name: "Gence", lat: 40.6828, lng: 46.3606, tier: "small", health: 1, maxHealth: 1, infantry: 2, tanks: 1, baseLvl: 1, factoryLvl: 1 }
    ]
  },
  GEO: {
    id: "GEO",
    name: "Gürcistan",
    flag: "🇬🇪",
    capital: "Tiflis",
    power: "Kafkasya Geçidi",
    industry: "★★☆☆☆",
    desc: "Kafkas dağları ve Karadeniz kıyısı.",
    bounds: [[41.0, 40.0], [43.6, 46.7]],
    cities: [
      { id: "tiflis", name: "Tiflis", lat: 41.7151, lng: 44.8271, tier: "big", health: 2, maxHealth: 2, infantry: 2, tanks: 1, baseLvl: 1, factoryLvl: 1 },
      { id: "batum", name: "Batum", lat: 41.6168, lng: 41.6367, tier: "small", health: 1, maxHealth: 1, infantry: 1, tanks: 1, baseLvl: 1, factoryLvl: 0 }
    ]
  }
};
