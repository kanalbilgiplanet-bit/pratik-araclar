// FRONTARIS - ULTRA NET VE SADE OYUN MOTORU

let map = null;
let countryLayers = {};
let cityMarkers = {};

const gameState = {
  playerCountryId: null,
  enemyCountryIds: new Set(),
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
  pendingTargetCountryId: null
};

// ==========================================
// SES EFEKTLERİ (Web Audio API)
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
// 1. AÇILIŞ: ÜLKE SEÇİM LİSTESİNİ OLUŞTUR
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

  // Haritayı başlat
  initMap(nation);
  updateTopBar();
  showToast(`🎖️ Komutan! ${nation.name} (${nation.flag}) yönetiminize geçti. Vatan toprakları MAVİ olarak parlıyor!`, "victory");
}

// ==========================================
// 2. HARİTA KURULUMU
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

  // Sade Karanlık Harita
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);

  renderCountryPolygons();
  renderCities();

  // Gerçek Sınırlara Odaklan
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
  // Seçilen Vatan Ülkesi -> TAM MAVİ
  if (cId === gameState.playerCountryId) {
    return {
      fillColor: "#0077ff",
      fillOpacity: 0.55,
      color: "#00e5ff",
      weight: 3
    };
  }

  // Ülkenin şehirlerinin ele geçirilme durumunu kontrol et
  const nation = WORLD_NATIONS[cId];
  if (nation && nation.cities && nation.cities.length > 0) {
    const totalCities = nation.cities.length;
    const capturedCities = nation.cities.filter(c => c.controller === gameState.playerCountryId).length;

    // Bütün şehirleri ele geçirildiyse -> TAM MAVİ
    if (capturedCities === totalCities) {
      return {
        fillColor: "#0077ff",
        fillOpacity: 0.55,
        color: "#00e5ff",
        weight: 3
      };
    }

    // Şehirlerinden en az biri (örn. Selanik) ele geçirildiyse -> HÂKİMİYET MAVİSİ
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

  // Savaş Açılmış Düşman (Henüz hiçbir şehri alınmadıysa) -> KIRMIZI
  if (gameState.enemyCountryIds.has(cId)) {
    return {
      fillColor: "#d50000",
      fillOpacity: 0.55,
      color: "#ff1744",
      weight: 3
    };
  }

  // Tarafsız -> Koyu Gri
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

      // Gerçek Ülke İsmi Tooltip
      layer.bindTooltip(`<strong>${countryName}</strong>`, {
        sticky: true,
        className: 'tactical-tooltip'
      });

      // Hover
      layer.on('mouseover', function() {
        if (gameState.attackMode) return;
        this.setStyle({
          weight: 3,
          color: '#ffffff',
          fillOpacity: 0.65
        });
      });

      layer.on('mouseout', function() {
        if (gameState.attackMode) return;
        this.setStyle(getPolygonStyle(iso));
      });

      // Dokunma / Tıklama
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
// 3. ŞEHİRLER VE MARKERLAR
// ==========================================
function getCityOwner(city) {
  return city.controller || city.originalCountry;
}

let cityTerritoryCircles = {};

function renderCityTerritory(city) {
  if (cityTerritoryCircles[city.id]) {
    map.removeLayer(cityTerritoryCircles[city.id]);
  }

  const isMine = (getCityOwner(city) === gameState.playerCountryId);
  const isEnemy = gameState.enemyCountryIds.has(getCityOwner(city));

  const fillColor = isMine ? "#0077ff" : isEnemy ? "#d50000" : "#334155";
  const strokeColor = isMine ? "#00e5ff" : isEnemy ? "#ff1744" : "#64748b";
  const opacity = isMine ? 0.40 : isEnemy ? 0.30 : 0.15;

  const circle = L.circle([city.lat, city.lng], {
    radius: city.tier === "big" ? 75000 : 55000,
    fillColor: fillColor,
    fillOpacity: opacity,
    color: strokeColor,
    weight: isMine ? 2.5 : 1.5,
    dashArray: isMine ? "" : "4, 4",
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

// TANK LOGOSU VE SVG ÇİZİCİ
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
  const isMine = (getCityOwner(city) === gameState.playerCountryId);
  const isEnemy = gameState.enemyCountryIds.has(getCityOwner(city));

  let colorClass = "gray";
  let tankColor = "#90a4ae";
  if (isMine) {
    colorClass = "blue";
    tankColor = "#00e5ff";
  } else if (isEnemy) {
    colorClass = "red";
    tankColor = "#ff5252";
  }

  const symbol = city.tier === "big" ? "🏛️" : "📍";
  const labelText = isMine ? `★ ${city.name} (MAVİ)` : city.name;

  const html = `
    <div class="simple-city-pin">
      <div class="pin-circle ${colorClass}">${symbol}</div>
      <div class="pin-name ${colorClass}">${labelText}</div>
      <div style="font-size:9px; background:rgba(0,0,0,0.85); padding:1px 4px; border-radius:3px; margin-top:1px; white-space:nowrap; border: 1px solid ${isMine ? '#00e5ff' : isEnemy ? '#ff5252' : '#475569'};">
        🪖${city.infantry} ${getTankSvg(tankColor, 12)}${city.tanks}
      </div>
    </div>
  `;

  const icon = L.divIcon({
    html: html,
    className: 'leaflet-city-div',
    iconSize: [60, 56],
    iconAnchor: [30, 28]
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

  // Bölge hâkimiyet çemberini de MAVİ yap
  renderCityTerritory(city);
}

// ==========================================
// 4. ETKİLEŞİMLER: ÜLKEYE VEYA ŞEHRE DOKUNUNCA
// ==========================================
function handleCountryClick(countryId, fallbackName) {
  sfx.click();
  const nation = ensureNationData(countryId, fallbackName);

  // Kendi ülkemize tıklayınca
  if (countryId === gameState.playerCountryId) {
    showToast(`🔵 ${nation.name} vatan toprağınızdır. Birlikleriniz için mavi şehirlere dokunun.`);
    return;
  }
  // Zaten savaşta mıyız?
  if (gameState.enemyCountryIds.has(countryId)) {
    showToast(`🔴 ${nation.name} ile savaştasınız! Şehirlerine dokunup taarruz edin.`);
    return;
  }

  // SAVAŞ AÇMA POPUP'I
  openCountryWarCard(countryId, fallbackName);
}

function openCountryWarCard(countryId, fallbackName) {
  const nation = ensureNationData(countryId, fallbackName);
  gameState.pendingTargetCountryId = countryId;

  document.getElementById("war-card-flag").innerText = nation.flag || "🌍";
  document.getElementById("war-card-name").innerText = nation.name.toUpperCase();
  document.getElementById("war-card-status").innerText = "Bu ülke şu anda tarafsızdır.";
  
  const warBtn = document.getElementById("war-card-btn");
  warBtn.innerText = `⚔️ ${nation.name.toUpperCase()} DEVLETİNE SAVAŞ AÇ (KIRMIZI YAP)!`;
  warBtn.onclick = () => declareWar(countryId, fallbackName);

  document.getElementById("country-war-card").style.display = "block";
}

function closeCountryWarCard() {
  document.getElementById("country-war-card").style.display = "none";
}

function declareWar(countryId, fallbackName) {
  sfx.siren();
  const nation = ensureNationData(countryId, fallbackName);
  gameState.enemyCountryIds.add(countryId);

  closeCountryWarCard();
  closeSheet();

  updateCountryStyles();
  renderCities();

  showToast(`🚨 DİKKAT! ${nation.name} (${nation.flag || '🌍'}) devletine SAVAŞ İLAN EDİLDİ! Gerçek sınırları KIRMIZI alarmda!`, "war");
}

function handleCityClick(city) {
  sfx.click();

  // SALDIRI MODUNDA MIYIZ?
  if (gameState.attackMode) {
    const owner = getCityOwner(city);

    if (owner === gameState.playerCountryId) {
      showToast("⚠️ Kendi şehrinize saldıramazsınız! Kırmızı bir düşman şehri seçin.");
      return;
    }
    if (!gameState.enemyCountryIds.has(owner)) {
      showToast("⚠️ Bu ülkeyle henüz savaşta değilsiniz! Önce ülkeye dokunup Savaş Açın.");
      return;
    }

    // Taarruz başlat!
    startMarch(gameState.attackSourceCityId, city.id, gameState.attackUnitType);
    cancelAttack();
    return;
  }

  // NORMAL TIKLAMA: ŞEHİR KARTINI AÇ
  openCitySheet(city);
}

// ==========================================
// 5. ŞEHİR ALT MENÜSÜ (BOTTOM SHEET)
// ==========================================
function closeSheet() {
  document.getElementById("city-bottom-sheet").style.display = "none";
}

function openCitySheet(city) {
  closeCountryWarCard();
  gameState.selectedCity = city;

  const isMine = (getCityOwner(city) === gameState.playerCountryId);
  const isEnemy = gameState.enemyCountryIds.has(getCityOwner(city));

  document.getElementById("sh-city-name").innerText = city.name.toUpperCase();
  document.getElementById("sh-icon").innerText = city.tier === "big" ? "🏛️" : "📍";

  const statusPill = document.getElementById("sh-city-status");
  if (isMine) {
    statusPill.className = "sheet-status-pill blue";
    statusPill.innerText = "DOST TOPRAK (MAVİ)";
  } else if (isEnemy) {
    statusPill.className = "sheet-status-pill red";
    statusPill.innerText = "DÜŞMAN ŞEHRİ (KIRMIZI)";
  } else {
    statusPill.className = "sheet-status-pill";
    statusPill.innerText = "TARAFSIZ ŞEHİR";
  }

  // Can durumu
  const hpPill = document.getElementById("sh-city-hp");
  hpPill.innerText = `CAN: ${city.health}/${city.maxHealth} ${city.health === city.maxHealth ? "(TAM GÜÇ)" : "(YARALI)"}`;

  // Şehir açıklaması
  const noteEl = document.getElementById("sh-city-desc");
  if (city.tier === "big") {
    noteEl.innerHTML = "★ <strong>BÜYÜK METROPOL:</strong> Ele geçirmek için <strong>2 BİRLİK</strong> gerekir!";
    noteEl.style.color = "#ffb74d";
  } else {
    noteEl.innerHTML = "• <strong>KÜÇÜK ŞEHİR:</strong> 1 birlik vardığında hemen teslim olur ve MAVİ olur!";
    noteEl.style.color = "#81c784";
  }

  // Panel kısımları
  document.getElementById("sh-player-actions").style.display = isMine ? "block" : "none";
  document.getElementById("sh-enemy-actions").style.display = isEnemy ? "block" : "none";
  document.getElementById("sh-neutral-actions").style.display = (!isMine && !isEnemy) ? "block" : "none";

  if (isMine) {
    document.getElementById("sh-count-soldiers").innerText = city.infantry;
    document.getElementById("sh-count-tanks").innerText = city.tanks;
  } else if (!isMine && !isEnemy) {
    document.getElementById("btn-declare-war-sheet").onclick = () => declareWar(city.originalCountry);
  }

  document.getElementById("city-bottom-sheet").style.display = "block";
}

// ==========================================
// 6. SALDIRI EMRİ VE 2 DAKİKALIK İNTİKAL
// ==========================================
function orderAttack(unitType) {
  const city = gameState.selectedCity;
  if (!city) return;

  if (unitType === "infantry" && city.infantry <= 0) {
    showToast("⚠️ Bu şehirde piyade birliği kalmadı!");
    return;
  }
  if (unitType === "tank" && city.tanks <= 0) {
    showToast("⚠️ Bu şehirde tank birliği kalmadı!");
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

function startMarch(fromId, toId, unitType) {
  const fromCity = findCity(fromId);
  const toCity = findCity(toId);
  if (!fromCity || !toCity) return;

  if (unitType === "infantry") fromCity.infantry--;
  else fromCity.tanks--;

  updateCityMarker(fromCity);
  updateTopBar();
  sfx.click();

  // 2 DAKİKA (120 saniye) intikal süresi
  const durationMs = 120 * 1000;
  const marchId = gameState.marchCounter++;

  // Haritada çizgi ve hareket eden ikon
  const line = L.polyline([[fromCity.lat, fromCity.lng], [toCity.lat, toCity.lng]], {
    color: '#ff1744',
    weight: 3,
    dashArray: '5, 8'
  }).addTo(map);

  const iconHtml = (unitType === "tank")
    ? `<div style="transform:translate(-50%,-50%); filter:drop-shadow(0 0 8px #ff1744);">${getTankSvg('#ff1744', 28)}</div>`
    : `<div style="font-size:24px; filter:drop-shadow(0 0 8px #ff1744); transform:translate(-50%,-50%);">🪖</div>`;

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
    marker: marker
  };

  gameState.marches.push(marchObj);
  renderMarchesBar();
  showToast(`⚡ ${fromCity.name} ➔ ${toCity.name} hedefine ${unitType === "tank" ? "Zırhlı Tank" : "Piyade"} yola çıktı (2 dk)!`);
}

function updateMarches(deltaMs) {
  if (gameState.marches.length === 0) return;

  const adjDelta = deltaMs * gameState.gameSpeed;

  for (let i = gameState.marches.length - 1; i >= 0; i--) {
    const m = gameState.marches[i];
    m.elapsedMs += adjDelta;
    m.progress = Math.min(1, m.elapsedMs / m.durationMs);

    // Pozisyon interpolasyonu
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
    // 1 BİRLİKLE ŞEHİR DOĞRUDAN DÜŞER!
    city.controller = gameState.playerCountryId;
    city.health = city.maxHealth;

    // YENDİĞİMİZ ŞEHİRDEKİ DÜŞMAN BİRLİKLERİ BİZE KATILIR!
    const capturedInf = Math.max(1, city.infantry || 1);
    const capturedTanks = Math.max(1, city.tanks || 1);
    city.infantry = capturedInf + (march.unitType === "infantry" ? 1 : 0);
    city.tanks = capturedTanks + (march.unitType === "tank" ? 1 : 0);

    sfx.victory();
    showToast(`🏆 <strong>ZAFER!</strong> [${city.name}] fethedildi! Şehirdeki <strong>+${capturedInf} Piyade</strong> ve <strong>+${capturedTanks} Tank</strong> teslim olup MAVİ ordumuza katıldı!`, "victory");

  } else {
    // BÜYÜK ŞEHİR: 1 BİRLİK DAHA GEREKİR!
    city.health--;

    if (city.health <= 0) {
      // 2. birlik de vurdu ve şehir düştü!
      city.controller = gameState.playerCountryId;
      city.health = city.maxHealth;

      // YENDİĞİMİZ METROPOLDEKİ DÜŞMAN BİRLİKLERİ BİZE KATILIR!
      const capturedInf = Math.max(2, city.infantry || 2);
      const capturedTanks = Math.max(2, city.tanks || 2);
      city.infantry = capturedInf + (march.unitType === "infantry" ? 1 : 0);
      city.tanks = capturedTanks + (march.unitType === "tank" ? 1 : 0);

      sfx.victory();
      showToast(`🏆 <strong>BÜYÜK METROPOL FETHEDİLDİ!</strong> [${city.name}] teslim oldu! Düşmanın <strong>+${capturedInf} Piyade</strong> ve <strong>+${capturedTanks} Zırhlı Tankı</strong> MAVİ ordumuza katıldı!`, "victory");

    } else {
      // 1 birlik daha gerekiyor uyarısı!
      showToast(`⚔️ <strong>ŞİDDETLİ ÇARPIŞMA!</strong> [${city.name}] savunması yaralandı! Ele geçirmek için <strong>1 BİRLİK DAHA GEREKİYOR!</strong>`, "war");
    }
  }

  updateCityMarker(city);
  updateCountryStyles();
  checkCountryDefeat(city.originalCountry);
  updateTopBar();
}

function checkCountryDefeat(countryId) {
  const nation = WORLD_NATIONS[countryId];
  if (!nation) return;

  const allCaptured = nation.cities.every(c => c.controller === gameState.playerCountryId);
  const capital = nation.cities.find(c => c.tier === "big") || nation.cities[0];
  const capitalCaptured = capital && (capital.controller === gameState.playerCountryId);

  if (allCaptured || capitalCaptured) {
    sfx.victory();

    // Ülkenin kalan tüm şehirleri de teslim olur ve MAVİ olur!
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

    showToast(`👑 <strong>TARİHİ ZAFER!</strong> ${nation.name} tamamen teslim oldu! Tüm toprakları MAVİ vatanımıza katıldı! (+${bonusInf} Piyade, +${bonusTanks} Tank)`, "victory");

    gameState.enemyCountryIds.delete(countryId);
    updateCountryStyles();
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

    const iconHtml = (m.unitType === "tank") ? getTankSvg("#ff5252", 15) : "🪖";

    html += `
      <div class="march-item">
        <div class="march-title">
          <span>${iconHtml} ${m.unitType === "tank" ? "Tank" : "Asker"}: ${m.fromCity.name} ➔ ${m.toCity.name}</span>
          <span style="color:#ff5252;">${timeStr}</span>
        </div>
        <div class="march-progress">
          <div class="march-fill" style="width:${Math.round(m.progress * 100)}%;"></div>
        </div>
      </div>
    `;
  });
  bar.innerHTML = html;
}

// ==========================================
// 7. ŞEHİR İÇİ ÜRETİM VE ÜS
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
}

// ==========================================
// 8. OYUN DÖNGÜSÜ & ZAMAN
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
}

let lastTime = performance.now();
function gameLoop(now) {
  const delta = now - lastTime;
  lastTime = now;

  if (gameState.playerCountryId) {
    updateMarches(delta);
    // Düzenli para geliri
    gameState.money += (delta / 1000) * 5 * gameState.gameSpeed;
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

// Başlangıç: Sayfa açılır açılmaz ÜLKE SEÇİM MENÜSÜNÜ GÖSTER!
window.addEventListener("DOMContentLoaded", () => {
  renderCountryPicker();
  requestAnimationFrame(gameLoop);
});
