// FRONTARIS - ONLINE DÜNYA SAVAŞI, İTTİFAK VE ORTAK TAARRUZ MOTORU

let map = null;
let countryLayers = {};
let cityMarkers = {};
let cityTerritoryCircles = {};

const gameState = {
  commanderName: "Mareşal",
  playerCountryId: null,
  enemyCountryIds: new Set(),
  conqueredCountryIds: new Set(), // Fethedilmiş kalıcı MAVİ topraklar
  alliedCountryIds: new Set(),    // İttifaklarımız (YEŞİL)
  money: 1500,
  gameSpeed: 1,
  
  // Saldırı hazırlığı
  attackMode: false,
  attackSourceCityId: null,
  attackUnitType: null,
  
  // Aktif intikaller (yoldaki birlikler)
  marches: [],
  marchCounter: 1,

  // Seçili açık şehir ve hedef ülke
  selectedCity: null,
  pendingTargetCountryId: null,

  // Oda ve Telsiz
  roomCode: "FRNT-1944",
  radioMessages: []
};

// ==========================================
// SES EFEKTLERİ MOTORU (Web Audio API)
// ==========================================
class SimpleAudio {
  constructor() { this.ctx = null; }
  init() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }
  click() {
    this.init(); if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    g.gain.setValueAtTime(0.1, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);
    osc.connect(g); g.connect(this.ctx.destination);
    osc.start(); osc.stop(this.ctx.currentTime + 0.05);
  }
  radioBeep() {
    this.init(); if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(850, this.ctx.currentTime);
    g.gain.setValueAtTime(0.08, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
    osc.connect(g); g.connect(this.ctx.destination);
    osc.start(); osc.stop(this.ctx.currentTime + 0.08);
  }
  siren() {
    this.init(); if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    const t = this.ctx.currentTime;
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.linearRampToValueAtTime(600, t + 0.3);
    osc.frequency.linearRampToValueAtTime(300, t + 0.6);
    osc.frequency.linearRampToValueAtTime(600, t + 0.9);
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + 1.1);
    osc.connect(g); g.connect(this.ctx.destination);
    osc.start(t); osc.stop(t + 1.1);
  }
  victory() {
    this.init(); if (!this.ctx) return;
    const notes = [523, 659, 784, 1046];
    const t = this.ctx.currentTime;
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.frequency.setValueAtTime(freq, t + i * 0.1);
      g.gain.setValueAtTime(0.15, t + i * 0.1);
      g.gain.exponentialRampToValueAtTime(0.01, t + i * 0.1 + 0.3);
      osc.connect(g); g.connect(this.ctx.destination);
      osc.start(t + i * 0.1); osc.stop(t + i * 0.1 + 0.3);
    });
  }
  cannon() {
    this.init(); if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    const t = this.ctx.currentTime;
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.4);
    g.gain.setValueAtTime(0.4, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
    osc.connect(g); g.connect(this.ctx.destination);
    osc.start(t); osc.stop(t + 0.4);
  }
}
const sfx = new SimpleAudio();

function showToast(msg, type = "normal") {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const t = document.createElement("div");
  t.className = `toast ${type === "war" ? "toast-war" : type === "victory" ? "toast-victory" : ""}`;
  t.innerHTML = msg;
  container.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    setTimeout(() => t.remove(), 300);
  }, 4000);
}

// ==========================================
// 1. OTOMATİK KAYIT & OYUN YÜKLEME (PERSISTENCE)
// ==========================================
const SAVE_KEY = "frontaris_save_v2";

function saveGameState() {
  if (!gameState.playerCountryId) return;
  const saveObj = {
    commanderName: gameState.commanderName,
    playerCountryId: gameState.playerCountryId,
    money: gameState.money,
    enemyCountryIds: Array.from(gameState.enemyCountryIds),
    conqueredCountryIds: Array.from(gameState.conqueredCountryIds),
    alliedCountryIds: Array.from(gameState.alliedCountryIds),
    roomCode: gameState.roomCode,
    cities: {}
  };

  Object.values(WORLD_NATIONS).forEach(nation => {
    nation.cities.forEach(c => {
      saveObj.cities[c.id] = {
        controller: c.controller,
        health: c.health,
        infantry: c.infantry,
        tanks: c.tanks,
        baseLvl: c.baseLvl
      };
    });
  });

  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveObj));
  } catch (e) {
    console.error("Save error:", e);
  }
}

function loadSavedGameState() {
  const dataStr = localStorage.getItem(SAVE_KEY);
  if (!dataStr) return null;
  try {
    return JSON.parse(dataStr);
  } catch (e) {
    return null;
  }
}

function checkSavedGameOnStartup() {
  const saved = loadSavedGameState();
  const authModal = document.getElementById("commander-auth-screen");
  const savedCard = document.getElementById("saved-game-card");
  const newForm = document.getElementById("new-commander-form");

  // URL'den Oda Kodu oku (?room=FRNT-XXXX)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has("room")) {
    gameState.roomCode = urlParams.get("room");
  }
  document.getElementById("room-code-display").innerText = gameState.roomCode;

  if (saved && saved.playerCountryId && WORLD_NATIONS[saved.playerCountryId]) {
    const nation = WORLD_NATIONS[saved.playerCountryId];
    document.getElementById("saved-commander-title").innerText = `Komutan: ${saved.commanderName}`;
    document.getElementById("saved-game-desc").innerText = `${nation.flag} ${nation.name} • 💰 ${Math.floor(saved.money)}M $ • ${saved.alliedCountryIds ? saved.alliedCountryIds.length : 0} İttifak Paktı`;
    savedCard.style.display = "block";
    newForm.style.display = "none";
  } else {
    savedCard.style.display = "none";
    newForm.style.display = "flex";
  }
  authModal.style.display = "flex";
}

function resumeSavedGame() {
  const saved = loadSavedGameState();
  if (!saved) return;

  sfx.victory();
  gameState.commanderName = saved.commanderName;
  gameState.playerCountryId = saved.playerCountryId;
  gameState.money = saved.money || 1500;
  gameState.enemyCountryIds = new Set(saved.enemyCountryIds || []);
  gameState.conqueredCountryIds = new Set(saved.conqueredCountryIds || []);
  gameState.alliedCountryIds = new Set(saved.alliedCountryIds || []);
  gameState.roomCode = saved.roomCode || gameState.roomCode;

  // Şehir durumlarını geri yükle
  if (saved.cities) {
    Object.values(WORLD_NATIONS).forEach(nation => {
      nation.cities.forEach(c => {
        if (saved.cities[c.id]) {
          const sc = saved.cities[c.id];
          c.controller = sc.controller;
          c.health = sc.health;
          c.infantry = sc.infantry;
          c.tanks = sc.tanks;
          c.baseLvl = sc.baseLvl || 1;
        }
      });
    });
  }

  // Arayüzü aç
  document.getElementById("commander-auth-screen").style.display = "none";
  document.getElementById("game-screen").style.display = "flex";
  
  const nation = WORLD_NATIONS[gameState.playerCountryId];
  document.getElementById("player-flag-pill").innerText = `${nation.flag} ${nation.name.toUpperCase()}`;
  document.getElementById("player-commander-name").innerText = gameState.commanderName;
  document.getElementById("room-code-display").innerText = gameState.roomCode;

  initMap(nation);
  updateTopBar();
  renderOnlineCommanders();
  showToast(`🎖️ Tekrar hoş geldiniz, Komutan ${gameState.commanderName}! Sefer kaldığı yerden devam ediyor.`, "victory");
}

function promptNewGame() {
  localStorage.removeItem(SAVE_KEY);
  document.getElementById("saved-game-card").style.display = "none";
  document.getElementById("new-commander-form").style.display = "flex";
}

function submitCommanderName() {
  const input = document.getElementById("input-commander-name");
  let name = input.value.trim();
  if (!name) name = "Mareşal_" + Math.floor(1000 + Math.random() * 9000);
  
  sfx.click();
  gameState.commanderName = name;
  document.getElementById("player-commander-name").innerText = gameState.commanderName;

  // Giriş modalını kapat, ülke seçim ekranını aç
  document.getElementById("commander-auth-screen").style.display = "none";
  document.getElementById("country-select-screen").style.display = "flex";
  renderCountryPicker();
}

// ==========================================
// 2. ÜLKE SEÇİMİ & SEFERİ BAŞLATMA
// ==========================================
function renderCountryPicker() {
  const listEl = document.getElementById("country-selection-list");
  listEl.innerHTML = "";

  Object.values(WORLD_NATIONS).forEach(nation => {
    const card = document.createElement("div");
    card.className = "country-pick-card";
    card.innerHTML = `
      <div class="flag">${nation.flag}</div>
      <div class="name">${nation.name}</div>
      <div class="power">${nation.power}</div>
    `;
    card.onclick = () => selectCountryAndStart(nation.id);
    listEl.appendChild(card);
  });
}

function selectCountryAndStart(countryId) {
  sfx.victory();
  gameState.playerCountryId = countryId;
  const nation = WORLD_NATIONS[countryId];

  // Seçim ekranını kapat, oyun ekranını aç
  document.getElementById("country-select-screen").style.display = "none";
  document.getElementById("game-screen").style.display = "flex";

  // Üst barı güncelle
  document.getElementById("player-flag-pill").innerText = `${nation.flag} ${nation.name.toUpperCase()}`;
  document.getElementById("player-commander-name").innerText = gameState.commanderName;

  // Haritayı başlat
  initMap(nation);
  updateTopBar();
  renderOnlineCommanders();
  saveGameState();

  showToast(`🎖️ Komutan ${gameState.commanderName}! ${nation.name} (${nation.flag}) yönetiminize geçti. Vatan toprakları MAVİ olarak parlıyor!`, "victory");
}

// ==========================================
// 3. HARİTA MOTORU & DİNAMİK POLİGONLAR
// ==========================================
function initMap(playerNation) {
  const initialCenter = playerNation.cities[0] 
    ? [playerNation.cities[0].lat, playerNation.cities[0].lng] 
    : [42.0, 25.0];

  map = L.map('map', {
    center: initialCenter,
    zoom: 5,
    minZoom: 2,
    maxZoom: 9,
    zoomControl: false,
    attributionControl: false
  });

  L.control.zoom({ position: 'bottomright' }).addTo(map);

  // Esri World Dark Gray - Filigransız ve API Keysiz Tertemiz Askeri Harita
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 16,
    attribution: ''
  }).addTo(map);

  renderCountryPolygons();
  renderCities();

  // Odaklan
  if (countryLayers[playerNation.id]) {
    try {
      map.fitBounds(countryLayers[playerNation.id].getBounds(), { padding: [30, 30] });
    } catch (e) {
      if (playerNation.bounds) map.fitBounds(playerNation.bounds, { padding: [30, 30] });
    }
  } else if (playerNation.bounds) {
    map.fitBounds(playerNation.bounds, { padding: [30, 30] });
  }
}

function getPolygonStyle(cId) {
  // 1. Seçilen Vatan Ülkesi veya FETHEDİLMİŞ ÜLKE -> TAM MAVİ
  if (cId === gameState.playerCountryId || gameState.conqueredCountryIds.has(cId)) {
    return {
      fillColor: "#0077ff",
      fillOpacity: 0.55,
      color: "#00e5ff",
      weight: 3
    };
  }

  // 2. MÜTTEFİK DEVLET (PAKT ÜYESİ) -> PARLAK YEŞİL
  if (gameState.alliedCountryIds.has(cId)) {
    return {
      fillColor: "#00c853",
      fillOpacity: 0.55,
      color: "#69f0ae",
      weight: 3
    };
  }

  // 3. Şehirlerinin ele geçirilme durumunu kontrol et
  const nation = WORLD_NATIONS[cId];
  if (nation && nation.cities && nation.cities.length > 0) {
    const totalCities = nation.cities.length;
    const capturedCities = nation.cities.filter(c => c.controller === gameState.playerCountryId).length;

    // Bütün şehirleri ele geçirildiyse -> TAM MAVİ
    if (capturedCities === totalCities) {
      gameState.conqueredCountryIds.add(cId);
      gameState.enemyCountryIds.delete(cId);
      return {
        fillColor: "#0077ff",
        fillOpacity: 0.55,
        color: "#00e5ff",
        weight: 3
      };
    }

    // Şehirlerinden en az biri ele geçirildiyse -> HÂKİMİYET MAVİSİ
    if (capturedCities > 0) {
      return {
        fillColor: "#0055cc",
        fillOpacity: 0.45,
        color: "#00e5ff",
        weight: 2.5,
        dashArray: "5, 5"
      };
    }
  }

  // 4. Savaş Açılmış Düşman (Henüz hiçbir şehri alınmadıysa) -> KIRMIZI
  if (gameState.enemyCountryIds.has(cId)) {
    return {
      fillColor: "#d50000",
      fillOpacity: 0.55,
      color: "#ff1744",
      weight: 3
    };
  }

  // 5. Tarafsız -> Koyu Askeri Gri
  return {
    fillColor: "#1e293b",
    fillOpacity: 0.35,
    color: "#475569",
    weight: 1.5
  };
}

function ensureNationData(iso, fallbackName) {
  if (!WORLD_NATIONS[iso]) {
    let lat = 40, lng = 20;
    if (countryLayers[iso] && countryLayers[iso].getBounds) {
      const c = countryLayers[iso].getBounds().getCenter();
      lat = c.lat;
      lng = c.lng;
    }
    WORLD_NATIONS[iso] = {
      id: iso,
      name: fallbackName || iso,
      flag: "🌍",
      capital: fallbackName,
      power: "Egemen Devlet",
      cities: [
        { id: `c_${iso}_1`, name: fallbackName, lat: lat, lng: lng, tier: "big", health: 2, maxHealth: 2, infantry: 3, tanks: 1, baseLvl: 1 }
      ]
    };
  }
  return WORLD_NATIONS[iso];
}

function renderCountryPolygons() {
  if (!window.REAL_WORLD_GEOJSON) return;

  L.geoJSON(window.REAL_WORLD_GEOJSON, {
    style: function(feature) {
      const iso = feature.properties.iso;
      return getPolygonStyle(iso);
    },
    onEachFeature: function(feature, layer) {
      const iso = feature.properties.iso;
      const countryName = feature.properties.name || feature.properties.name_en;
      countryLayers[iso] = layer;

      // Tooltip
      layer.bindTooltip(() => {
        if (iso === gameState.playerCountryId || gameState.conqueredCountryIds.has(iso)) {
          return `<strong>${countryName} (🔵 MAVİ VATAN)</strong>`;
        }
        if (gameState.alliedCountryIds.has(iso)) {
          return `<strong>${countryName} (🤝 YEŞİL MÜTTEFİK)</strong>`;
        }
        if (gameState.enemyCountryIds.has(iso)) {
          return `<strong>${countryName} (🔴 KIRMIZI DÜŞMAN)</strong>`;
        }
        return `<strong>${countryName}</strong>`;
      }, { sticky: true, className: 'tactical-tooltip' });

      // Hover
      layer.on('mouseover', function() {
        if (gameState.attackMode) return;
        this.setStyle({ weight: 3, color: '#ffffff', fillOpacity: 0.65 });
      });

      layer.on('mouseout', function() {
        if (gameState.attackMode) return;
        this.setStyle(getPolygonStyle(iso));
      });

      // Tıklama
      layer.on('click', function(e) {
        L.DomEvent.stopPropagation(e);
        if (gameState.attackMode) return;
        handleCountryClick(iso, countryName);
      });
    }
  }).addTo(map);
}

function updateCountryStyles() {
  Object.keys(countryLayers).forEach(cId => {
    countryLayers[cId].setStyle(getPolygonStyle(cId));
  });
}

// ==========================================
// 4. ŞEHİRLER, BÖLGELER & TANK LOGOLARI
// ==========================================
function getCityOwner(city) {
  return city.controller || city.originalCountry;
}

function renderCityTerritory(city) {
  if (cityTerritoryCircles[city.id]) {
    map.removeLayer(cityTerritoryCircles[city.id]);
  }

  const owner = getCityOwner(city);
  const isMine = (owner === gameState.playerCountryId);
  const isAlly = gameState.alliedCountryIds.has(owner);
  const isEnemy = gameState.enemyCountryIds.has(owner);

  let fillColor = "#334155";
  let strokeColor = "#64748b";
  let opacity = 0.15;

  if (isMine) {
    fillColor = "#0077ff";
    strokeColor = "#00e5ff";
    opacity = 0.40;
  } else if (isAlly) {
    fillColor = "#00c853";
    strokeColor = "#69f0ae";
    opacity = 0.35;
  } else if (isEnemy) {
    fillColor = "#d50000";
    strokeColor = "#ff1744";
    opacity = 0.30;
  }

  const circle = L.circle([city.lat, city.lng], {
    radius: city.tier === "big" ? 75000 : 55000,
    fillColor: fillColor,
    fillOpacity: opacity,
    color: strokeColor,
    weight: isMine || isAlly ? 2.5 : 1.5,
    dashArray: isMine || isAlly ? "" : "4, 4",
    interactive: false
  }).addTo(map);

  cityTerritoryCircles[city.id] = circle;
}

function renderCities() {
  Object.values(cityMarkers).forEach(m => map.removeLayer(m));
  Object.values(cityTerritoryCircles).forEach(c => map.removeLayer(c));
  cityMarkers = {};
  cityTerritoryCircles = {};

  Object.values(WORLD_NATIONS).forEach(nation => {
    nation.cities.forEach(city => {
      if (!city.originalCountry) city.originalCountry = nation.id;
      if (!city.controller) city.controller = nation.id;

      renderCityTerritory(city);
      const marker = createCityMarker(city);
      marker.addTo(map);
      cityMarkers[city.id] = marker;
    });
  });
}

function getTankSvg(color = "#00e5ff", size = 20) {
  return `<svg class="tank-svg" viewBox="0 0 32 32" width="${size}" height="${size}" style="vertical-align:middle; display:inline-block;">
    <rect x="18" y="7" width="13" height="3" rx="1" fill="${color}" />
    <path d="M10 6 H19 L21 12 H8 Z" fill="${color}" />
    <path d="M4 12 H27 L25 18 H2 Z" fill="${color}" opacity="0.85" />
    <rect x="1" y="17" width="27" height="8" rx="4" fill="#0d1b2a" stroke="${color}" stroke-width="1.2" />
    <circle cx="5" cy="21" r="2" fill="${color}" />
    <circle cx="10" cy="21" r="2" fill="${color}" />
    <circle cx="15" cy="21" r="2" fill="${color}" />
    <circle cx="20" cy="21" r="2" fill="${color}" />
  </svg>`;
}

function createCityMarker(city) {
  const owner = getCityOwner(city);
  const isMine = (owner === gameState.playerCountryId);
  const isAlly = gameState.alliedCountryIds.has(owner);
  const isEnemy = gameState.enemyCountryIds.has(owner);

  let colorClass = "gray";
  let tankColor = "#90a4ae";
  let labelText = city.name;

  if (isMine) {
    colorClass = "blue";
    tankColor = "#00e5ff";
    labelText = `${city.name} (MAVİ)`;
  } else if (isAlly) {
    colorClass = "green";
    tankColor = "#69f0ae";
    labelText = `${city.name} (MÜTTEFİK)`;
  } else if (isEnemy) {
    colorClass = "red";
    tankColor = "#ff5252";
  }

  // Kullanıcı talebi doğrultusunda şehirlerin üstündeki semboller/emojiler (🏛️, 📍) tamamen kaldırıldı, sade askeri nokta eklendi
  const html = `
    <div class="simple-city-pin">
      <div class="pin-dot ${colorClass}"></div>
      <div class="pin-name ${colorClass}">${labelText}</div>
      <div style="font-size:9px; background:rgba(0,0,0,0.85); padding:1px 5px; border-radius:3px; margin-top:2px; white-space:nowrap; border: 1px solid ${isMine ? '#00e5ff' : isAlly ? '#00e676' : isEnemy ? '#ff5252' : '#475569'};">
        🪖${city.infantry} ${getTankSvg(tankColor, 12)}${city.tanks}
      </div>
    </div>
  `;

  const icon = L.divIcon({
    html: html,
    className: 'leaflet-city-div',
    iconSize: [60, 48],
    iconAnchor: [30, 24]
  });

  const marker = L.marker([city.lat, city.lng], { icon: icon });
  marker.on('click', (e) => {
    L.DomEvent.stopPropagation(e);
    handleCityClick(city);
  });

  return marker;
}

function updateCityMarker(city) {
  if (cityMarkers[city.id]) map.removeLayer(cityMarkers[city.id]);
  const newMarker = createCityMarker(city);
  newMarker.addTo(map);
  cityMarkers[city.id] = newMarker;

  renderCityTerritory(city);
}

// ==========================================
// 5. ETKİLEŞİM & DİPLOMASİ (SAVAŞ & İTTİFAK)
// ==========================================
function handleCountryClick(countryId, fallbackName) {
  sfx.click();
  const nation = ensureNationData(countryId, fallbackName);

  // Kendi ülkemize veya FETHEDİLMİŞ toprağa dokununca (ASLA KIRMIZI OLMAZ!)
  if (countryId === gameState.playerCountryId || gameState.conqueredCountryIds.has(countryId)) {
    showToast(`🔵 ${nation.name} fethedilmiş vatan toprağınızdır (MAVİ). Şehirlerinizi yönetmek için mavi şehirlere dokunun.`);
    return;
  }

  // Müttefik Devlete dokununca
  if (gameState.alliedCountryIds.has(countryId)) {
    showToast(`🤝 ${nation.name} müttefikimizdir (YEŞİL). Düşmanlara karşı ortak taarruzlarda ordularını seferber eder.`);
    return;
  }

  // Zaten savaşta mıyız?
  if (gameState.enemyCountryIds.has(countryId)) {
    showToast(`🔴 ${nation.name} ile savaştasınız! Kırmızı şehirlerine dokunup taarruz edin.`);
    return;
  }

  // SAVAŞ VEYA İTTİFAK POPUP'I
  openCountryWarCard(countryId, fallbackName);
}

function openCountryWarCard(countryId, fallbackName) {
  if (countryId === gameState.playerCountryId || gameState.conqueredCountryIds.has(countryId) || gameState.alliedCountryIds.has(countryId)) {
    return;
  }
  const nation = ensureNationData(countryId, fallbackName);
  gameState.pendingTargetCountryId = countryId;

  document.getElementById("war-card-flag").innerText = nation.flag || "🌍";
  document.getElementById("war-card-name").innerText = nation.name.toUpperCase();
  document.getElementById("war-card-status").innerText = "Bu ülke şu anda tarafsızdır. Diplomasi seçin:";
  
  // Savaş butonu
  const warBtn = document.getElementById("war-card-btn");
  warBtn.innerText = `⚔️ ${nation.name.toUpperCase()} DEVLETİNE SAVAŞ AÇ (KIRMIZI)`;
  warBtn.onclick = () => declareWar(countryId, fallbackName);

  // İttifak butonu
  const allyBtn = document.getElementById("ally-card-btn");
  allyBtn.innerText = `🤝 ${nation.name.toUpperCase()} İLE İTTİFAK KUR (YEŞİL)`;
  allyBtn.onclick = () => proposeAlliance(countryId, fallbackName);

  document.getElementById("country-war-card").style.display = "block";
}

function closeCountryWarCard() {
  document.getElementById("country-war-card").style.display = "none";
}

function declareWar(countryId, fallbackName) {
  sfx.siren();
  const nation = ensureNationData(countryId, fallbackName);
  gameState.enemyCountryIds.add(countryId);
  gameState.alliedCountryIds.delete(countryId);

  closeCountryWarCard();
  closeSheet();

  updateCountryStyles();
  renderCities();
  updateTopBar();
  saveGameState();

  showToast(`🚨 DİKKAT! ${nation.name} (${nation.flag || '🌍'}) devletine SAVAŞ İLAN EDİLDİ! Sınırları KIRMIZI alarmda!`, "war");
  addRadioMessage(`⚔️ SAVAŞ BİLDİRİSİ: ${gameState.commanderName}, ${nation.name} devletine resmen savaş ilan etti!`, "enemy");
}

function proposeAlliance(countryId, fallbackName) {
  sfx.victory();
  const nation = ensureNationData(countryId, fallbackName);
  gameState.alliedCountryIds.add(countryId);
  gameState.enemyCountryIds.delete(countryId);

  closeCountryWarCard();
  closeSheet();

  updateCountryStyles();
  renderCities();
  updateTopBar();
  renderOnlineCommanders();
  saveGameState();

  showToast(`🤝 <strong>İTTİFAK PAKTI İMZALANDI!</strong> ${nation.name} (${nation.flag || '🌍'}) artık müttefikimiz! Sınırları ve orduları YEŞİL oldu!`, "victory");
  addRadioMessage(`🤝 İTTİFAK PAKTI: ${gameState.commanderName} ile ${nation.name} komutanlığı arasında askeri ittifak kuruldu! Ortak taarruzlar devrede.`, "ally");
}

function handleCityClick(city) {
  sfx.click();

  // SALDIRI MODUNDA MIYIZ?
  if (gameState.attackMode) {
    const owner = getCityOwner(city);

    if (owner === gameState.playerCountryId || gameState.conqueredCountryIds.has(owner)) {
      showToast("⚠️ Kendi vatan toprağınıza saldıramazsınız! Kırmızı bir düşman şehri seçin.");
      return;
    }
    if (gameState.alliedCountryIds.has(owner)) {
      showToast("⚠️ Müttefik şehirlerine saldıramazsınız! Onlar sizin pakt üyenizdir.");
      return;
    }
    if (!gameState.enemyCountryIds.has(owner)) {
      showToast("⚠️ Bu ülkeyle henüz savaşta değilsiniz! Önce ülkeye dokunup Savaş Açın.");
      return;
    }

    // Taarruz başlat!
    executeAttackWithAllies(city);
    cancelAttack();
    return;
  }

  // NORMAL TIKLAMA: ŞEHİR KARTINI AÇ
  openCitySheet(city);
}

// ==========================================
// 6. ŞEHİR YÖNETİM MENÜSÜ (BOTTOM SHEET)
// ==========================================
function closeSheet() {
  document.getElementById("city-bottom-sheet").style.display = "none";
}

function openCitySheet(city) {
  closeCountryWarCard();
  gameState.selectedCity = city;

  const owner = getCityOwner(city);
  const isMine = (owner === gameState.playerCountryId || gameState.conqueredCountryIds.has(owner));
  const isAlly = gameState.alliedCountryIds.has(owner);
  const isEnemy = gameState.enemyCountryIds.has(owner);

  document.getElementById("sh-city-name").innerText = city.name.toUpperCase();
  document.getElementById("sh-icon").innerText = city.tier === "big" ? "🏛️" : "📍";

  const statusPill = document.getElementById("sh-city-status");
  if (isMine) {
    statusPill.className = "sheet-status-pill blue";
    statusPill.innerText = "DOST TOPRAK (MAVİ)";
  } else if (isAlly) {
    statusPill.className = "sheet-status-pill green";
    statusPill.innerText = "MÜTTEFİK ŞEHRİ (YEŞİL)";
  } else if (isEnemy) {
    statusPill.className = "sheet-status-pill red";
    statusPill.innerText = "DÜŞMAN ŞEHRİ (KIRMIZI)";
  } else {
    statusPill.className = "sheet-status-pill";
    statusPill.innerText = "TARAFSIZ ŞEHİR";
  }

  const hpPill = document.getElementById("sh-city-hp");
  hpPill.innerText = `CAN: ${city.health}/${city.maxHealth} ${city.health === city.maxHealth ? "(TAM GÜÇ)" : "(YARALI)"}`;

  const noteEl = document.getElementById("sh-city-desc");
  if (city.tier === "big") {
    noteEl.innerHTML = "★ <strong>BÜYÜK METROPOL:</strong> Ele geçirmek için <strong>2 BİRLİK</strong> (veya Müttefik ile Ortak Taarruz) gerekir!";
    noteEl.style.color = "#ffb74d";
  } else {
    noteEl.innerHTML = "• <strong>KÜÇÜK ŞEHİR:</strong> 1 birlik vardığında hemen teslim olur ve MAVİ olur!";
    noteEl.style.color = "#81c784";
  }

  // Panel kısımları
  document.getElementById("sh-player-actions").style.display = isMine ? "block" : "none";
  document.getElementById("sh-ally-actions").style.display = isAlly ? "block" : "none";
  document.getElementById("sh-enemy-actions").style.display = isEnemy ? "block" : "none";
  document.getElementById("sh-neutral-actions").style.display = (!isMine && !isAlly && !isEnemy) ? "block" : "none";

  if (isMine) {
    document.getElementById("sh-count-soldiers").innerText = city.infantry;
    document.getElementById("sh-count-tanks").innerText = city.tanks;
  } else if (!isMine && !isAlly && !isEnemy) {
    document.getElementById("btn-declare-war-sheet").onclick = () => declareWar(city.originalCountry);
    document.getElementById("btn-propose-ally-sheet").onclick = () => proposeAlliance(city.originalCountry);
  }

  document.getElementById("city-bottom-sheet").style.display = "block";
}

// ==========================================
// 7. ORTAK TAARRUZ & İNTİKAL (JOINT ATTACK)
// ==========================================
function orderAttack(unitType) {
  const city = gameState.selectedCity;
  if (!city) return;

  if (unitType === "infantry" && city.infantry <= 0) {
    showToast("⚠️ Bu şehirde intikal ettirilecek piyade kalmadı!");
    return;
  }
  if (unitType === "tank" && city.tanks <= 0) {
    showToast("⚠️ Bu şehirde intikal ettirilecek tank kalmadı!");
    return;
  }

  if (gameState.enemyCountryIds.size === 0) {
    showToast("⚠️ Önce haritada bir yabancı ülkeye dokunup SAVAŞ AÇIN!");
    return;
  }

  gameState.attackMode = true;
  gameState.attackSourceCityId = city.id;
  gameState.attackUnitType = unitType;

  closeSheet();

  // Bilgi bandı
  const banner = document.getElementById("attack-instruction-bar");
  const unitName = unitType === "tank" ? "ZIRHLI TANK" : "PİYADE";
  document.getElementById("attack-prompt-text").innerHTML = `🎯 [${city.name}] Şehrinden <strong>${unitName}</strong> yola çıkacak: Hedef <strong>KIRMIZI Şehre</strong> dokunun!`;
  banner.style.display = "flex";
}

function cancelAttack() {
  gameState.attackMode = false;
  gameState.attackSourceCityId = null;
  gameState.attackUnitType = null;
  document.getElementById("attack-instruction-bar").style.display = "none";
}

document.getElementById("btn-cancel-attack").onclick = cancelAttack;

function findCity(id) {
  for (const n of Object.values(WORLD_NATIONS)) {
    for (const c of n.cities) {
      if (c.id === id) return c;
    }
  }
  return null;
}

function executeAttackWithAllies(targetCity) {
  const fromCity = findCity(gameState.attackSourceCityId);
  const unitType = gameState.attackUnitType;
  const wantJoint = document.getElementById("chk-joint-ally-attack") ? document.getElementById("chk-joint-ally-attack").checked : true;

  // 1. Kendi birliğimiz yola çıkar (MAVİ)
  startMarch(fromCity.id, targetCity.id, unitType, false /* isAlly */);

  // 2. Müttefikimiz varsa ortak taarruz için müttefik birliğini de yola çıkar! (YEŞİL)
  if (wantJoint && gameState.alliedCountryIds.size > 0) {
    let bestAllyCity = null;
    let bestDist = Infinity;

    Object.values(WORLD_NATIONS).forEach(nation => {
      if (gameState.alliedCountryIds.has(nation.id)) {
        nation.cities.forEach(ac => {
          const d = Math.hypot(ac.lat - targetCity.lat, ac.lng - targetCity.lng);
          if (d < bestDist) {
            bestDist = d;
            bestAllyCity = ac;
          }
        });
      }
    });

    if (bestAllyCity) {
      setTimeout(() => {
        startMarch(bestAllyCity.id, targetCity.id, "tank", true /* isAlly */);
        showToast(`🤝 <strong>ORTAK TAARRUZ BAŞLADI!</strong> Müttefikimiz [${bestAllyCity.name}] üssünden ${targetCity.name} hedefine destek tank birliği intikale geçti!`, "victory");
        addRadioMessage(`🛡️ ORTAK TAARRUZ: [${bestAllyCity.name}] üssünden ${targetCity.name} şehrine taarruz desteği sevk edildi!`, "ally");
      }, 400);
    }
  }
}

function startMarch(fromId, toId, unitType, isAlly = false) {
  const fromCity = findCity(fromId);
  const toCity = findCity(toId);
  if (!fromCity || !toCity) return;

  if (!isAlly) {
    if (unitType === "infantry") fromCity.infantry--;
    else fromCity.tanks--;
    updateCityMarker(fromCity);
    updateTopBar();
    saveGameState();
  }

  sfx.click();

  // 2 DAKİKA (120 saniye) intikal süresi
  const durationMs = 120 * 1000;
  const marchId = gameState.marchCounter++;
  const lineColor = isAlly ? "#00e676" : "#ff1744";

  // Haritada çizgi
  const line = L.polyline([[fromCity.lat, fromCity.lng], [toCity.lat, toCity.lng]], {
    color: lineColor,
    weight: 3,
    dashArray: isAlly ? '8, 6' : '5, 8'
  }).addTo(map);

  const tankCol = isAlly ? "#00e676" : "#ff1744";
  const iconHtml = (unitType === "tank")
    ? `<div style="transform:translate(-50%,-50%); filter:drop-shadow(0 0 8px ${tankCol});">${getTankSvg(tankCol, 28)}</div>`
    : `<div style="font-size:24px; filter:drop-shadow(0 0 8px ${tankCol}); transform:translate(-50%,-50%);">${isAlly ? '🎖️' : '🪖'}</div>`;

  const mIcon = L.divIcon({
    html: iconHtml,
    className: 'moving-unit'
  });
  const marker = L.marker([fromCity.lat, fromCity.lng], { icon: mIcon }).addTo(map);

  const marchObj = {
    id: marchId,
    unitType: unitType,
    fromCity: fromCity,
    toCity: toCity,
    durationMs: durationMs,
    elapsedMs: 0,
    progress: 0,
    line: line,
    marker: marker,
    isAlly: isAlly
  };

  gameState.marches.push(marchObj);
  renderMarchesBar();
  showToast(`⚡ ${fromCity.name} ➔ ${toCity.name} hedefine ${isAlly ? "Müttefik Tankı" : (unitType === "tank" ? "Zırhlı Tank" : "Piyade")} yola çıktı (2 dk)!`);
}

function updateMarches(deltaMs) {
  if (gameState.marches.length === 0) return;

  const adjDelta = deltaMs * gameState.gameSpeed;

  for (let i = gameState.marches.length - 1; i >= 0; i--) {
    const m = gameState.marches[i];
    m.elapsedMs += adjDelta;
    m.progress = Math.min(1, m.elapsedMs / m.durationMs);

    const lat = m.fromCity.lat + (m.toCity.lat - m.fromCity.lat) * m.progress;
    const lng = m.fromCity.lng + (m.toCity.lng - m.fromCity.lng) * m.progress;
    m.marker.setLatLng([lat, lng]);

    // HEDEFE VARDI!
    if (m.progress >= 1) {
      resolveCityAttack(m);
      map.removeLayer(m.line);
      map.removeLayer(m.marker);
      gameState.marches.splice(i, 1);
    }
  }

  renderMarchesBar();
}

function resolveCityAttack(march) {
  const city = march.toCity;
  sfx.cannon();

  // KÜÇÜK ŞEHİR Mİ BÜYÜK ŞEHİR Mİ?
  if (city.tier === "small") {
    // 1 BİRLİKLE ŞEHİR DÜŞER!
    city.controller = gameState.playerCountryId;
    city.health = city.maxHealth;

    // YENDİĞİMİZ ŞEHİRDEKİ DÜŞMAN BİRLİKLERİ BİZE KATILIR!
    const capturedInf = Math.max(1, city.infantry || 1);
    const capturedTanks = Math.max(1, city.tanks || 1);
    city.infantry = capturedInf + (march.unitType === "infantry" ? 1 : 0);
    city.tanks = capturedTanks + (march.unitType === "tank" ? 1 : 0);

    sfx.victory();
    const heroText = march.isAlly ? "Müttefikimiz ile Ortak Taarruzda" : "Taarruzumuzla";
    showToast(`🏆 <strong>ZAFER!</strong> [${city.name}] ${heroText} fethedildi ve MAVİ oldu! Şehirdeki <strong>+${capturedInf} Piyade</strong> ve <strong>+${capturedTanks} Tank</strong> teslim olup MAVİ ordumuza katıldı!`, "victory");

  } else {
    // BÜYÜK METROPOL: 1 BİRLİK DAHA GEREKİR (Ortak taarruzda her gelen birlik can düşürür!)
    city.health--;

    if (city.health <= 0) {
      city.controller = gameState.playerCountryId;
      city.health = city.maxHealth;

      const capturedInf = Math.max(2, city.infantry || 2);
      const capturedTanks = Math.max(2, city.tanks || 2);
      city.infantry = capturedInf + (march.unitType === "infantry" ? 1 : 0);
      city.tanks = capturedTanks + (march.unitType === "tank" ? 1 : 0);

      sfx.victory();
      showToast(`🏆 <strong>BÜYÜK METROPOL FETHEDİLDİ!</strong> [${city.name}] çifte taarruz ile tamamen düştü! Düşmanın <strong>+${capturedInf} Piyade</strong> ve <strong>+${capturedTanks} Zırhlı Tankı</strong> MAVİ ordumuza katıldı!`, "victory");
    } else {
      showToast(`⚔️ <strong>ŞİDDETLİ ÇARPIŞMA!</strong> [${city.name}] savunması yaralandı! Ele geçirmek için <strong>1 BİRLİK DAHA GEREKİYOR!</strong>`, "war");
    }
  }

  updateCityMarker(city);
  updateCountryStyles();
  checkCountryDefeat(city.originalCountry);
  updateTopBar();
  saveGameState();
}

function checkCountryDefeat(countryId) {
  const nation = WORLD_NATIONS[countryId];
  if (!nation) return;

  const allCaptured = nation.cities.every(c => c.controller === gameState.playerCountryId);
  const capital = nation.cities.find(c => c.tier === "big") || nation.cities[0];
  const capitalCaptured = capital && (capital.controller === gameState.playerCountryId);

  if (allCaptured || capitalCaptured) {
    sfx.victory();

    gameState.conqueredCountryIds.add(countryId);
    gameState.enemyCountryIds.delete(countryId);

    nation.cities.forEach(c => {
      c.controller = gameState.playerCountryId;
      updateCityMarker(c);
    });

    const bonusInf = 4;
    const bonusTanks = 3;
    if (capital) {
      capital.infantry += bonusInf;
      capital.tanks += bonusTanks;
      updateCityMarker(capital);
    }

    showToast(`👑 <strong>TARİHİ ZAFER!</strong> ${nation.name} tamamen teslim oldu! Tüm toprakları kalıcı olarak MAVİ vatanımıza katıldı! (+${bonusInf} Piyade, +${bonusTanks} Tank)`, "victory");
    addRadioMessage(`👑 ZAFER: ${gameState.commanderName}, ${nation.name} devletini tamamen fethetti!`, "system");

    updateCountryStyles();
    saveGameState();
  }
}

function renderMarchesBar() {
  const bar = document.getElementById("active-marches-bar");
  if (gameState.marches.length === 0) {
    bar.style.display = "none";
    bar.innerHTML = "";
    return;
  }

  bar.style.display = "flex";
  let html = "";
  gameState.marches.forEach(m => {
    const remSec = Math.max(0, Math.ceil((m.durationMs - m.elapsedMs) / (1000 * gameState.gameSpeed)));
    const min = Math.floor(remSec / 60);
    const sec = remSec % 60;
    const timeStr = `${min}:${sec < 10 ? '0' : ''}${sec}`;

    const iconCol = m.isAlly ? "#00e676" : "#ff5252";
    const iconHtml = (m.unitType === "tank") ? getTankSvg(iconCol, 15) : (m.isAlly ? "🎖️" : "🪖");
    const namePrefix = m.isAlly ? "🤝 Müttefik Tankı" : (m.unitType === "tank" ? "🚜 Tank" : "🪖 Asker");

    html += `
      <div class="march-item" style="border-color:${iconCol};">
        <div class="march-title">
          <span>${iconHtml} ${namePrefix}: ${m.fromCity.name} ➔ ${m.toCity.name}</span>
          <span style="color:${iconCol};">${timeStr}</span>
        </div>
        <div class="march-progress">
          <div class="march-fill" style="width:${Math.round(m.progress * 100)}%; background:${iconCol};"></div>
        </div>
      </div>
    `;
  });
  bar.innerHTML = html;
}

// ==========================================
// 8. ASKERİ TELSİZ & ONLINE SOHBET
// ==========================================
function toggleRadioPanel() {
  sfx.radioBeep();
  const drawer = document.getElementById("radio-drawer");
  drawer.style.display = (drawer.style.display === "none") ? "flex" : "none";
}

function renderOnlineCommanders() {
  const container = document.getElementById("online-commanders-list");
  if (!container) return;

  const list = [
    { name: gameState.commanderName, nation: gameState.playerCountryId || "TR", role: "mine", rank: "Mareşal" }
  ];

  // Müttefik komutanlar
  gameState.alliedCountryIds.forEach(id => {
    const n = WORLD_NATIONS[id];
    list.push({ name: `General_${n ? n.name : id}`, nation: id, role: "ally", rank: "Korgeneral (Müttefik)" });
  });

  // Düşman komutanlar
  gameState.enemyCountryIds.forEach(id => {
    const n = WORLD_NATIONS[id];
    list.push({ name: `Komutan_${n ? n.name : id}`, nation: id, role: "enemy", rank: "Düşman Lider" });
  });

  // Diğer dünya komutanları
  if (list.length < 4) {
    list.push({ name: "Commander_Alex", nation: "USA", role: "neutral", rank: "Tümgeneral" });
    list.push({ name: "General_Zhukov", nation: "RUS", role: "neutral", rank: "Orgeneral" });
  }

  let html = "";
  list.forEach(c => {
    const roleClass = c.role === "mine" ? "mine" : c.role === "ally" ? "ally" : c.role === "enemy" ? "enemy" : "";
    html += `
      <div class="commander-item">
        <span><strong>${c.name}</strong> <small style="color:#78909c;">(${c.nation})</small></span>
        <span class="c-status ${roleClass}">${c.rank}</span>
      </div>
    `;
  });
  container.innerHTML = html;
}

function addRadioMessage(text, type = "normal", author = null) {
  const box = document.getElementById("radio-messages-box");
  if (!box) return;

  const msgDiv = document.createElement("div");
  msgDiv.className = `chat-msg ${type}`;
  msgDiv.innerHTML = `<span class="author">${author || (type === "system" ? "📡 SİSTEM:" : type === "ally" ? "🤝 MÜTTEFİK:" : "👤 KOMUTAN:")}</span> <span class="text">${text}</span>`;
  box.appendChild(msgDiv);
  box.scrollTop = box.scrollHeight;
}

function sendRadioMessage() {
  const input = document.getElementById("radio-chat-input");
  const txt = input.value.trim();
  if (!txt) return;

  sfx.radioBeep();
  addRadioMessage(txt, "normal", `🎖️ ${gameState.commanderName}:`);
  input.value = "";

  // Otomatik Müttefik / Telsiz Cevabı
  setTimeout(() => {
    if (gameState.alliedCountryIds.size > 0) {
      const allyId = Array.from(gameState.alliedCountryIds)[0];
      const allyNation = WORLD_NATIONS[allyId];
      addRadioMessage(`Emredersiniz Komutan ${gameState.commanderName}! ${allyNation ? allyNation.name : 'Müttefik'} ordusu ortak taarruz için tetikte bekliyor.`, "ally", `🤝 General_${allyId}:`);
      sfx.radioBeep();
    } else {
      addRadioMessage(`Mesajınız küresel askeri frekansta yayınlandı. İttifak teklifleri bekleniyor.`, "system");
    }
  }, 1200);
}

function copyGameInvite() {
  sfx.click();
  const url = window.location.origin + window.location.pathname + `?room=${gameState.roomCode}`;
  navigator.clipboard.writeText(url).then(() => {
    showToast(`🔗 <strong>DAVET LİNKİ KOPYALANDI!</strong> Arkadaşına gönder, aynı odada ittifak kurup birlikte savaşın!`, "victory");
  }).catch(() => {
    showToast(`Oda Kodu: ${gameState.roomCode}`);
  });
}

// Enter ile mesaj gönderme
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && document.activeElement && document.activeElement.id === "radio-chat-input") {
    sendRadioMessage();
  }
});

// ==========================================
// 9. ŞEHİR İÇİ ÜRETİM VE ÜS
// ==========================================
function buildMilitaryBase() {
  const city = gameState.selectedCity;
  if (!city) return;
  if (gameState.money < 100) {
    showToast("⚠️ Yetersiz hazine! Askeri Üs için 100M $ gerekiyor.");
    return;
  }
  sfx.click();
  gameState.money -= 100;
  city.baseLvl = (city.baseLvl || 1) + 1;
  showToast(`🏢 [${city.name}] Askeri Üssü kuruldu/yükseltildi!`);
  updateTopBar();
  saveGameState();
}

function recruitUnit(type) {
  const city = gameState.selectedCity;
  if (!city) return;
  const cost = (type === "tank") ? 150 : 50;
  
  if (gameState.money < cost) {
    showToast(`⚠️ Yetersiz hazine! ${type === "tank" ? "Tank için 150M $" : "Asker için 50M $"} gerekiyor.`);
    return;
  }
  sfx.click();
  gameState.money -= cost;

  if (type === "tank") {
    city.tanks++;
    document.getElementById("sh-count-tanks").innerText = city.tanks;
    showToast(`🚜 [${city.name}] şehrinde yeni Tank üretildi!`);
  } else {
    city.infantry++;
    document.getElementById("sh-count-soldiers").innerText = city.infantry;
    showToast(`🪖 [${city.name}] şehrinde yeni Asker eğitildi!`);
  }

  updateCityMarker(city);
  updateTopBar();
  saveGameState();
}

// ==========================================
// 10. OYUN DÖNGÜSÜ & ZAMAN
// ==========================================
function updateTopBar() {
  let inf = 0;
  let tanks = 0;
  Object.values(WORLD_NATIONS).forEach(n => {
    n.cities.forEach(c => {
      if (getCityOwner(c) === gameState.playerCountryId) {
        inf += c.infantry;
        tanks += c.tanks;
      }
    });
  });

  document.getElementById("val-money").innerText = `${Math.floor(gameState.money)}M $`;
  document.getElementById("val-soldiers").innerText = inf;
  document.getElementById("val-tanks").innerText = tanks;
  document.getElementById("val-allies").innerText = `${gameState.alliedCountryIds.size} İttifak`;
}

let lastTime = performance.now();
function gameLoop(now) {
  const delta = now - lastTime;
  lastTime = now;

  if (gameState.playerCountryId) {
    updateMarches(delta);
    // Düzenli para geliri (her şehir + müttefik ticareti)
    const allyBonus = gameState.alliedCountryIds.size * 3;
    gameState.money += (delta / 1000) * (5 + allyBonus) * gameState.gameSpeed;
    updateTopBar();
  }

  requestAnimationFrame(gameLoop);
}

// Hız Butonları
document.querySelectorAll(".spd-btn").forEach(btn => {
  btn.onclick = function() {
    sfx.click();
    document.querySelectorAll(".spd-btn").forEach(b => b.classList.remove("active"));
    this.classList.add("active");
    gameState.gameSpeed = parseInt(this.dataset.spd, 10);
    showToast(`⏩ Oyun Hızı: ${gameState.gameSpeed}x`);
  };
});

// Başlangıç: Sayfa açılır açılmaz Komutan Girişi / Kayıt Kontrolü
window.addEventListener("DOMContentLoaded", () => {
  checkSavedGameOnStartup();
  requestAnimationFrame(gameLoop);
});
