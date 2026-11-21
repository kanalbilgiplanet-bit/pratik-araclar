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
  defeat() {
    this.init(); if (!this.ctx) return;
    const notes = [440, 370, 311, 220, 164];
    const t = this.ctx.currentTime;
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t + i * 0.22);
      g.gain.setValueAtTime(0.25, t + i * 0.22);
      g.gain.exponentialRampToValueAtTime(0.01, t + i * 0.22 + 0.45);
      osc.connect(g); g.connect(this.ctx.destination);
      osc.start(t + i * 0.22); osc.stop(t + i * 0.22 + 0.45);
    });
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
      try {
        const c = countryLayers[iso].getBounds().getCenter();
        lat = c.lat;
        lng = c.lng;
      } catch (e) {}
    }
    const cleanName = fallbackName || iso;
    const newCity = {
      id: `c_${iso}_1`,
      name: cleanName,
      lat: lat,
      lng: lng,
      tier: "big",
      health: 2,
      maxHealth: 2,
      infantry: 3,
      tanks: 1,
      baseLvl: 1,
      originalCountry: iso,
      controller: iso
    };

    WORLD_NATIONS[iso] = {
      id: iso,
      name: cleanName,
      flag: "🌍",
      capital: cleanName,
      power: "Egemen Devlet",
      cities: [newCity]
    };

    if (map && !cityMarkers[newCity.id]) {
      renderCityTerritory(newCity);
      const marker = createCityMarker(newCity);
      marker.addTo(map);
      cityMarkers[newCity.id] = marker;
    }
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
        if (gameState.attackMode) {
          // Saldırı modunda ülke arazisine dokunulduğunda doğrudan o ülkenin şehrine taarruz et!
          if (iso === gameState.playerCountryId || gameState.conqueredCountryIds.has(iso)) {
            showToast("⚠️ Kendi vatan toprağınıza saldıramazsınız! Düşman bir ülke veya şehir seçin.");
            return;
          }
          if (gameState.alliedCountryIds.has(iso)) {
            showToast("⚠️ Müttefik ülkeye saldıramazsınız! Pakt ortağınızdır.");
            return;
          }

          const targetNation = ensureNationData(iso, countryName);
          const targetCity = targetNation.cities[0];
          if (targetCity) {
            if (!gameState.enemyCountryIds.has(iso)) {
              declareWar(iso, countryName);
            }
            executeAttackWithAllies(targetCity);
            cancelAttack();
          }
          return;
        }
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
      showToast("⚠️ Kendi vatan toprağınıza saldıramazsınız! Hedef yabancı bir şehir seçin.");
      return;
    }
    if (gameState.alliedCountryIds.has(owner)) {
      showToast("⚠️ Müttefik şehirlerine saldıramazsınız! Onlar sizin pakt üyenizdir.");
      return;
    }

    // Bu ülkeyle henüz savaşta değilsek otomatik savaş ilan et!
    if (!gameState.enemyCountryIds.has(owner)) {
      declareWar(owner, city.name);
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
  } else if (!isMine && !isAlly) {
    // Düşman veya tarafsız şehir: en yakın mavi üs durumunu göster
    const nearBase = findNearestFriendlyCityWithUnits(city);
    const nearInfoEl = document.getElementById("sh-target-nearest-info");
    if (nearInfoEl) {
      if (nearBase) {
        nearInfoEl.innerHTML = `En Yakın Mavi Üssümüz: <strong>${nearBase.name}</strong> (🪖 ${nearBase.infantry} Piyade, 🚜 ${nearBase.tanks} Tank)`;
      } else {
        nearInfoEl.innerHTML = `⚠️ Mavi şehirlerinizde intikale hazır birlik yok. Önce dost şehirlerden asker eğitin!`;
      }
    }

    if (!isEnemy) {
      document.getElementById("btn-declare-war-sheet").onclick = () => declareWar(city.originalCountry || owner);
      document.getElementById("btn-propose-ally-sheet").onclick = () => proposeAlliance(city.originalCountry || owner);
    }
  }

  document.getElementById("city-bottom-sheet").style.display = "block";
}

// ==========================================
// 7. ORTAK TAARRUZ & İNTİKAL (JOINT ATTACK)
// ==========================================
function findNearestFriendlyCityWithUnits(targetCity, unitType = null) {
  let bestCity = null;
  let bestDist = Infinity;

  Object.values(WORLD_NATIONS).forEach(nation => {
    nation.cities.forEach(c => {
      const isMine = (c.controller === gameState.playerCountryId || (!c.controller && c.originalCountry === gameState.playerCountryId));
      if (!isMine) return;

      const hasUnits = unitType === "tank" 
        ? (c.tanks > 0) 
        : (unitType === "infantry" ? (c.infantry > 0) : (c.infantry > 0 || c.tanks > 0));
      if (!hasUnits) return;

      const dist = Math.hypot(c.lat - targetCity.lat, c.lng - targetCity.lng);
      if (dist < bestDist) {
        bestDist = dist;
        bestCity = c;
      }
    });
  });

  return bestCity;
}

function launchDirectAttackToSelected(unitType) {
  const targetCity = gameState.selectedCity;
  if (!targetCity) return;

  const fromCity = findNearestFriendlyCityWithUnits(targetCity, unitType);
  if (!fromCity) {
    showToast(`⚠️ Taarruz için hazır birlik bulunamadı! Dost şehirlerinizden yeni ${unitType === 'tank' ? 'tank' : 'asker'} eğitin.`);
    return;
  }

  const owner = getCityOwner(targetCity);
  if (!gameState.enemyCountryIds.has(owner)) {
    declareWar(owner, targetCity.name);
  }

  gameState.attackSourceCityId = fromCity.id;
  gameState.attackUnitType = unitType;

  closeSheet();
  executeAttackWithAllies(targetCity);
  showToast(`⚔️ [${fromCity.name}] üssümüzden ${targetCity.name} hedefine ${unitType === 'tank' ? 'Zırhlı Tank' : 'Piyade'} taarruzu başladı!`, "war");
}

function orderAttack(unitType) {
  const city = gameState.selectedCity;
  if (!city) return;

  if (unitType === "infantry" && city.infantry <= 0) {
    showToast(`⚠️ [${city.name}] şehrinde intikal ettirilecek piyade kalmadı! Askeri üsten yeni asker eğitebilirsiniz.`);
    return;
  }
  if (unitType === "tank" && city.tanks <= 0) {
    showToast(`⚠️ [${city.name}] şehrinde intikal ettirilecek tank kalmadı! Askeri üsten yeni tank üretebilirsiniz.`);
    return;
  }

  gameState.attackMode = true;
  gameState.attackSourceCityId = city.id;
  gameState.attackUnitType = unitType;

  closeSheet();

  // Bilgi bandı
  const banner = document.getElementById("attack-instruction-bar");
  const unitName = unitType === "tank" ? "ZIRHLI TANK" : "PİYADE";
  document.getElementById("attack-prompt-text").innerHTML = `🎯 [${city.name}] Şehrinden <strong>${unitName}</strong> yola çıkmaya hazır: Haritada hedef <strong>ŞEHRE veya ÜLKEYE</strong> dokunun!`;
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
  let fromCity = findCity(gameState.attackSourceCityId);
  const unitType = gameState.attackUnitType || "infantry";
  const wantJoint = document.getElementById("chk-joint-ally-attack") ? document.getElementById("chk-joint-ally-attack").checked : true;

  if (!fromCity || (unitType === "infantry" && fromCity.infantry <= 0) || (unitType === "tank" && fromCity.tanks <= 0)) {
    fromCity = findNearestFriendlyCityWithUnits(targetCity, unitType);
  }

  if (!fromCity) {
    showToast("⚠️ Taarruz yapacak uygun dost şehirde birlik kalmadı!");
    return;
  }

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

function startMarch(fromId, toId, unitType, isAlly = false, isEnemy = false) {
  const fromCity = findCity(fromId);
  const toCity = findCity(toId);
  if (!fromCity || !toCity) return;

  if (!isAlly && !isEnemy) {
    if (unitType === "infantry") fromCity.infantry = Math.max(0, (fromCity.infantry || 0) - 1);
    else fromCity.tanks = Math.max(0, (fromCity.tanks || 0) - 1);
    updateCityMarker(fromCity);
    updateTopBar();
    saveGameState();
    sfx.click();
  } else if (isEnemy) {
    if (unitType === "infantry") fromCity.infantry = Math.max(0, (fromCity.infantry || 0) - 1);
    else fromCity.tanks = Math.max(0, (fromCity.tanks || 0) - 1);
    updateCityMarker(fromCity);
    sfx.siren();
  }

  // İntikal süresi: Düşman 80 sn, Oyuncu/Müttefik 120 sn
  const durationMs = isEnemy ? (80 * 1000) : (120 * 1000);
  const marchId = gameState.marchCounter++;
  const lineColor = isAlly ? "#00e676" : (isEnemy ? "#ff1744" : "#00e5ff");

  // Haritada intikal çizgisi
  const line = L.polyline([[fromCity.lat, fromCity.lng], [toCity.lat, toCity.lng]], {
    color: lineColor,
    weight: isEnemy ? 4 : 3,
    dashArray: isAlly ? '8, 6' : (isEnemy ? '4, 6' : '5, 8')
  }).addTo(map);

  const tankCol = isAlly ? "#00e676" : (isEnemy ? "#ff1744" : "#00e5ff");
  const iconHtml = (unitType === "tank")
    ? `<div style="transform:translate(-50%,-50%); filter:drop-shadow(0 0 10px ${tankCol});">${getTankSvg(tankCol, 28)}</div>`
    : `<div style="font-size:24px; filter:drop-shadow(0 0 10px ${tankCol}); transform:translate(-50%,-50%);">${isAlly ? '🎖️' : (isEnemy ? '⚔️' : '🪖')}</div>`;

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
    isAlly: isAlly,
    isEnemy: isEnemy
  };

  gameState.marches.push(marchObj);
  renderMarchesBar();

  if (isEnemy) {
    showToast(`🚨 <strong>DÜŞMAN KARŞI TAARRUZU!</strong> [${fromCity.name}] noktasından [${toCity.name}] şehrimize ${unitType === "tank" ? "Zırhlı Tank" : "Piyade"} yola çıktı! Savunmayı hazırlayın!`, "war");
    addRadioMessage(`🚨 İSTİHBARAT: Düşman [${fromCity.name}] üssünden [${toCity.name}] hedefiyle taarruza geçti!`, "enemy");
  } else {
    showToast(`⚡ ${fromCity.name} ➔ ${toCity.name} hedefine ${isAlly ? "Müttefik Tankı" : (unitType === "tank" ? "Zırhlı Tank" : "Piyade")} yola çıktı!`);
  }
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

  const isEnemyAttacking = !!march.isEnemy;
  const attackerUnit = march.unitType;

  if (isEnemyAttacking) {
    // ==========================================
    // 1. DÜŞMAN BİZE (veya Müttefikimize) SALDIRIYOR!
    // ==========================================
    if (city.tanks > 0) {
      if (attackerUnit === "tank") {
        city.tanks--;
        showToast(`💥 <strong>ZIRHLI ÇARPIŞMASI!</strong> [${city.name}] savunmasında tankçılarımız 1 düşman tankını imha etti! (Kayıp: -1 Tank)`, "war");
      } else {
        sfx.victory();
        showToast(`🛡️ <strong>SAVUNMA BAŞARILI!</strong> [${city.name}] üssümüzdeki tanklar düşman piyadesini ezdi ve püskürttü!`, "victory");
      }
    } else if (city.infantry > 0) {
      if (attackerUnit === "tank") {
        city.infantry = Math.max(0, city.infantry - 2);
        showToast(`⚠️ <strong>SAVUNMA YARALANDI!</strong> [${city.name}] Düşman tankı siperlerimize girdi (-2 Piyade)!`, "war");
      } else {
        city.infantry--;
        showToast(`⚔️ <strong>SİPER SAVAŞI!</strong> [${city.name}] Garnizonumuz düşman saldırısını püskürttü (-1 Piyade).`, "war");
      }
    } else {
      // Şehirde hiç savunmacı asker kalmadı! Şehir canı düşer
      city.health--;
      if (city.health <= 0) {
        // ŞEHİR DÜŞMANIN ELİNE GEÇER (DÜŞER)!
        city.controller = march.fromCity.originalCountry || "ENEMY";
        city.health = city.maxHealth;
        city.infantry = 2;
        city.tanks = 1;

        sfx.siren();
        showToast(`💀 <strong>ŞEHİR DÜŞTÜ! [${city.name}] DÜŞMAN İŞGALİNE UĞRADI VE KIRMIZI OLDU!</strong>`, "war");
        addRadioMessage(`🚨 ACI HABER: [${city.name}] şehri düşman ordusu tarafından işgal edildi ve kaybedildi!`, "enemy");

        updateCityMarker(city);
        renderCityTerritory(city);
        updateTopBar();
        saveGameState();

        // Başkent düştü mü veya tüm şehirlerimiz kaybedildi mi?
        checkPlayerDefeat();
        return;
      } else {
        showToast(`⚠️ <strong>ŞEHİR SURU ÇATLADI!</strong> [${city.name}] savunmasız! 1 düşman taarruzu daha gelirse şehir düşecek!`, "war");
      }
    }

    updateCityMarker(city);
    updateTopBar();
    saveGameState();
    return;
  }

  // ==========================================
  // 2. OYUNCU (veya Müttefik) DÜŞMANA SALDIRIYOR!
  // ==========================================
  if (city.tanks > 0) {
    if (attackerUnit === "infantry") {
      showToast(`🛡️ <strong>TAARRUZ PÜSKÜRTÜLDÜ!</strong> [${city.name}] Düşman panzerleri piyademizi biçti! Şehre zırhlı TANK ile taarruz etmelisiniz!`, "war");
      return;
    } else {
      city.tanks--;
      showToast(`💥 <strong>DÜŞMAN TANKI İMHA EDİLDİ!</strong> [${city.name}] savunmasındaki 1 düşman tankı vuruldu! Kendi tankımız da feda oldu.`, "war");
      updateCityMarker(city);
      saveGameState();
      return;
    }
  } else if (city.infantry > 0) {
    if (attackerUnit === "tank") {
      city.infantry = Math.max(0, city.infantry - 2);
      showToast(`🚜 <strong>HATT-I MÜDAFAA YARILDI!</strong> [${city.name}] Tankımız düşman piyadesini ezdi (-2 Düşman)!`, "victory");
      if (city.infantry > 0) {
        updateCityMarker(city);
        saveGameState();
        return;
      }
    } else {
      city.infantry--;
      showToast(`⚔️ <strong>ŞİDDETLİ ÇATIŞMA!</strong> [${city.name}] Düşmandan 1 piyade etkisiz hale getirildi.`, "war");
      if (city.infantry > 0) {
        updateCityMarker(city);
        saveGameState();
        return;
      }
    }
  }

  // Düşman şehrinde asker kalmadı -> ŞEHİR CANI DÜŞER VEYA FETHEDİLİR!
  city.health--;

  if (city.health <= 0) {
    city.controller = gameState.playerCountryId;
    city.health = city.maxHealth;
    city.infantry = attackerUnit === "infantry" ? 2 : 1;
    city.tanks = attackerUnit === "tank" ? 1 : 0;

    sfx.victory();
    const heroText = march.isAlly ? "Müttefikimiz ile Ortak Taarruzda" : "Kahraman ordumuzla";
    showToast(`🏆 <strong>ZAFER!</strong> [${city.name}] ${heroText} fethedildi ve MAVİ oldu!`, "victory");
    addRadioMessage(`🏆 ZAFER: ${gameState.commanderName}, [${city.name}] şehrini teslim aldı!`, "system");

    checkCountryDefeat(city.originalCountry);
  } else {
    showToast(`⚔️ <strong>ŞEHİR SAVUNMASI KIRILDI!</strong> [${city.name}] garnizonu temizlendi! Şehri düşürmek için <strong>1 BİRLİK DAHA</strong> gönderin!`, "war");
  }

  updateCityMarker(city);
  updateCountryStyles();
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

// ==========================================
// 8. DÜŞMAN YAPAY ZEKASI (KARŞI SALDIRI & ÜRETİM)
// ==========================================
function updateEnemyAI(deltaMs) {
  if (!gameState.playerCountryId) return;
  const scaledDelta = deltaMs * gameState.gameSpeed;

  // 1. DÜŞMAN ÜRETİMİ (Her 28 saniyede bir düşman şehirleri güçlenir)
  if (!gameState.aiProduceTimer) gameState.aiProduceTimer = 0;
  gameState.aiProduceTimer += scaledDelta;

  if (gameState.aiProduceTimer >= 28000) {
    gameState.aiProduceTimer = 0;
    gameState.enemyCountryIds.forEach(iso => {
      const nation = WORLD_NATIONS[iso];
      if (nation) {
        nation.cities.forEach(c => {
          if (c.controller === iso) {
            if (Math.random() > 0.35) c.infantry = Math.min(8, (c.infantry || 0) + 1);
            if (Math.random() > 0.60) c.tanks = Math.min(4, (c.tanks || 0) + 1);
            updateCityMarker(c);
          }
        });
      }
    });
  }

  // 2. DÜŞMAN KARŞI TAARRUZ DÖNGÜSÜ (Her 22-25 saniyede bir saldırır)
  if (!gameState.aiAttackTimer) gameState.aiAttackTimer = 0;
  gameState.aiAttackTimer += scaledDelta;

  if (gameState.aiAttackTimer >= 22000) {
    gameState.aiAttackTimer = 0;

    if (gameState.enemyCountryIds.size > 0) {
      launchEnemyAIAttack();
    } else {
      // Barış döneminde rakip ülkeler sınır ihlali yapabilir
      checkRivalAggression();
    }
  }
}

function launchEnemyAIAttack() {
  const activeEnemies = Array.from(gameState.enemyCountryIds);
  if (activeEnemies.length === 0) return;

  // Rastgele bir düşman ülke seç
  const enemyIso = activeEnemies[Math.floor(Math.random() * activeEnemies.length)];
  const enemyNation = WORLD_NATIONS[enemyIso];
  if (!enemyNation) return;

  // Bu ülkenin askeri olan şehirlerini bul
  const capableCities = enemyNation.cities.filter(c => (c.controller === enemyIso) && (c.infantry > 0 || c.tanks > 0));
  if (capableCities.length === 0) return;

  const fromCity = capableCities[Math.floor(Math.random() * capableCities.length)];

  // Hedef olarak en yakın oyuncu şehrini bul
  let bestTarget = null;
  let bestDist = Infinity;

  Object.values(WORLD_NATIONS).forEach(nation => {
    nation.cities.forEach(c => {
      const isPlayerCity = (c.controller === gameState.playerCountryId || (!c.controller && c.originalCountry === gameState.playerCountryId));
      if (isPlayerCity) {
        const d = Math.hypot(c.lat - fromCity.lat, c.lng - fromCity.lng);
        if (d < bestDist) {
          bestDist = d;
          bestTarget = c;
        }
      }
    });
  });

  if (!bestTarget) return;

  // Düşman tank mı piyade mi gönderecek?
  const unitType = (fromCity.tanks > 0 && Math.random() > 0.45) ? "tank" : "infantry";

  // Düşman taarruzu yola çıkar!
  startMarch(fromCity.id, bestTarget.id, unitType, false /* isAlly */, true /* isEnemy */);
}

function checkRivalAggression() {
  const availableRivals = ["BGR", "SYR", "IRQ", "IRN", "RUS", "ROU", "DEU"].filter(iso => {
    return WORLD_NATIONS[iso] && 
           iso !== gameState.playerCountryId && 
           !gameState.conqueredCountryIds.has(iso) && 
           !gameState.alliedCountryIds.has(iso) && 
           !gameState.enemyCountryIds.has(iso);
  });

  if (availableRivals.length === 0) return;

  const rivalIso = availableRivals[Math.floor(Math.random() * availableRivals.length)];
  const rivalNation = WORLD_NATIONS[rivalIso];
  if (!rivalNation) return;

  declareWar(rivalIso, rivalNation.name);
  showToast(`🚨 <strong>TEHDİT ARTTI!</strong> ${rivalNation.name} (${rivalNation.flag}) sınırlarımıza askeri yığınak yaparak bize SAVAŞ AÇTI!`, "war");
  addRadioMessage(`🚨 ACİL BİLDİRİ: ${rivalNation.name} Genelkurmayı ülkemize savaş ilan etti!`, "enemy");
}

function checkPlayerDefeat() {
  const playerNation = WORLD_NATIONS[gameState.playerCountryId];
  if (!playerNation) return;

  const capital = playerNation.cities.find(c => c.tier === "big") || playerNation.cities[0];
  const capitalLost = capital && capital.controller && (capital.controller !== gameState.playerCountryId);

  let playerCitiesRemaining = 0;
  Object.values(WORLD_NATIONS).forEach(n => {
    n.cities.forEach(c => {
      if (c.controller === gameState.playerCountryId) {
        playerCitiesRemaining++;
      }
    });
  });

  if (capitalLost || playerCitiesRemaining === 0) {
    sfx.defeat();
    const defeatModal = document.getElementById("defeat-modal");
    if (defeatModal) {
      const reasonEl = document.getElementById("defeat-reason-text");
      if (reasonEl) {
        if (capitalLost) {
          reasonEl.innerHTML = `🚨 Başkentimiz <strong>[${capital.name}]</strong> düşman kuvvetleri tarafından ele geçirildi ve kaybedildi! Komuta kademesi dağıtıldı.`;
        } else {
          reasonEl.innerHTML = `🚨 Bütün şehirlerimiz düşman işgali altına girdi! Elimizde savunacak hiçbir üs kalmadı.`;
        }
      }
      defeatModal.style.display = "flex";
    }
  }
}

function emergencyMobilization() {
  sfx.victory();
  const playerNation = WORLD_NATIONS[gameState.playerCountryId];
  const capital = playerNation.cities.find(c => c.tier === "big") || playerNation.cities[0];

  if (capital) {
    capital.controller = gameState.playerCountryId;
    capital.health = capital.maxHealth;
    capital.infantry = 4;
    capital.tanks = 2;
    updateCityMarker(capital);
  }

  gameState.money += 600;
  document.getElementById("defeat-modal").style.display = "none";
  updateCountryStyles();
  updateTopBar();
  saveGameState();

  showToast(`🛡️ <strong>ACİL SEFERBERLİK İLAN EDİLDİ!</strong> Başkent [${capital ? capital.name : 'Vatan'}] kurtarıldı! Ordumuza +4 Piyade, +2 Zırhlı Tank ve +600M $ acil yardım ulaştı! Karşı taarruza geçin!`, "victory");
  addRadioMessage(`🛡️ SEFERBERLİK: Komutan ${gameState.commanderName} başkenti geri aldı ve karşı taarruz emri verdi!`, "system");
}

function restartNewCampaign() {
  localStorage.removeItem("frontaris_save_v2");
  window.location.reload();
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

    const isEnemy = !!m.isEnemy;
    const iconCol = m.isAlly ? "#00e676" : (isEnemy ? "#ff1744" : "#00e5ff");
    const namePrefix = m.isAlly 
      ? "🤝 Müttefik Tankı" 
      : (isEnemy ? `🚨 DÜŞMAN TAARRUZU (${m.unitType === 'tank' ? 'Zırhlı Tank' : 'Piyade'})` : (m.unitType === "tank" ? "🚜 Tank" : "🪖 Asker"));
    const iconHtml = (m.unitType === "tank") ? getTankSvg(iconCol, 15) : (m.isAlly ? "🎖️" : (isEnemy ? "⚔️" : "🪖"));

    html += `
      <div class="march-item ${isEnemy ? 'march-enemy' : ''}" style="border-color:${iconCol}; ${isEnemy ? 'background:rgba(50, 4, 10, 0.95); animation: pulseRedBorder 1s infinite;' : ''}">
        <div class="march-title">
          <span>${iconHtml} ${namePrefix}: <strong>${m.fromCity.name}</strong> ➔ <strong>${m.toCity.name}</strong></span>
          <span style="color:${iconCol}; font-weight:bold;">${timeStr}</span>
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
    updateEnemyAI(delta);
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
