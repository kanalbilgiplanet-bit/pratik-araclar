// FRONTARIS - OYUN MOTORU & MANTIK KODLARI (GAME ENGINE)

let map = null;
let countryLayers = {};
let cityMarkers = {};
let activeLines = {};

const gameState = {
  phase: "SELECTION", // "SELECTION" | "WAR_ROOM"
  playerCountryId: null,
  enemyCountryIds: new Set(),
  money: 1500, // Milyon Dolar
  gameSpeed: 1, // 1x, 2x, 5x, 20x
  soundEnabled: true,
  gameDate: new Date(1939, 8, 1), // 1 Eylül 1939
  
  // Saldırı hazırlığı durumu
  attackMode: false,
  attackSourceCityId: null,
  attackUnitType: null,
  
  // Aktif intikaller (yoldaki birlikler)
  operations: [],
  operationIdCounter: 1,

  // Seçili açık şehir
  selectedCity: null
};

// ==========================================
// SES EFEKTLERİ MOTORU (Web Audio API)
// ==========================================
class SoundFX {
  constructor() {
    this.ctx = null;
  }
  
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playClick() {
    if (!gameState.soundEnabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  playSiren() {
    if (!gameState.soundEnabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(350, now);
    osc.frequency.linearRampToValueAtTime(650, now + 0.4);
    osc.frequency.linearRampToValueAtTime(350, now + 0.8);
    osc.frequency.linearRampToValueAtTime(650, now + 1.2);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1.4);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(now + 1.4);
  }

  playMarch() {
    if (!gameState.soundEnabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140 - i * 15, now + i * 0.12);
      gain.gain.setValueAtTime(0.3, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.12 + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.08);
    }
  }

  playCannon() {
    if (!gameState.soundEnabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.1));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.exponentialRampToValueAtTime(60, now + 0.4);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(now);
  }

  playVictory() {
    if (!gameState.soundEnabled) return;
    this.init();
    if (!this.ctx) return;
    const notes = [440, 554, 659, 880];
    const now = this.ctx.currentTime;
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);
      gain.gain.setValueAtTime(0.2, now + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.1 + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.35);
    });
  }
}

const sfx = new SoundFX();

// ==========================================
// TOAST BİLDİRİM SİSTEMİ
// ==========================================
function showToast(msg, type = "normal") {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const t = document.createElement("div");
  t.className = `toast ${type === "war" ? "toast-war" : type === "victory" ? "toast-victory" : ""}`;
  t.innerHTML = msg;
  container.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateY(15px)';
    t.style.transition = 'all 0.3s ease';
    setTimeout(() => t.remove(), 300);
  }, 4000);
}

// ==========================================
// HARİTA KURULUMU (LEAFLET + DARK TACTICAL TILES)
// ==========================================
function initMap() {
  map = L.map('map', {
    center: [45.0, 25.0],
    zoom: 4,
    minZoom: 2,
    maxZoom: 9,
    zoomControl: false,
    attributionControl: false
  });

  // Taktik zoom kontrolü (sağ altta)
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  // CartoDB Dark Matter askeri harita katmanı
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);

  // Ülke sınırlarını ve poligonlarını çiz
  renderWorldPolygons();

  // Şehir ikonlarını ve birlikleri haritaya yerleştir
  renderAllCities();
}

// ==========================================
// ÜLKE POLİGONLARI VE RENKLENDİRME
// ==========================================
function getCountryStyle(cId) {
  if (gameState.phase === "SELECTION") {
    return {
      fillColor: "#1a365d",
      fillOpacity: 0.35,
      color: "#3182ce",
      weight: 1.5
    };
  }

  // Oyuncu Ülkesi -> MAVİ
  if (cId === gameState.playerCountryId) {
    return {
      fillColor: "#0066cc",
      fillOpacity: 0.55,
      color: "#00e5ff",
      weight: 3,
      dashArray: ""
    };
  }

  // Savaş İlan Edilmiş Düşman -> KIRMIZI
  if (gameState.enemyCountryIds.has(cId)) {
    return {
      fillColor: "#b71c1c",
      fillOpacity: 0.55,
      color: "#ff1744",
      weight: 3,
      dashArray: "4, 4"
    };
  }

  // Tarafsız Ülkeler -> Koyu Gri / Nötr
  return {
    fillColor: "#212d38",
    fillOpacity: 0.35,
    color: "#37474f",
    weight: 1.5
  };
}

function renderWorldPolygons() {
  Object.values(WORLD_NATIONS).forEach(nation => {
    const polygon = L.polygon(nation.polygon, getCountryStyle(nation.id)).addTo(map);
    
    // Hover efekti
    polygon.on('mouseover', function () {
      if (gameState.attackMode) return;
      this.setStyle({
        weight: 3,
        color: '#ffffff',
        fillOpacity: 0.65
      });
    });

    polygon.on('mouseout', function () {
      if (gameState.attackMode) return;
      this.setStyle(getCountryStyle(nation.id));
    });

    // Tıklayınca Ülke Kartını Aç
    polygon.on('click', function (e) {
      if (gameState.attackMode) return; // Saldırı modundaysa şehir seçilmeli
      sfx.playClick();
      openCountryModal(nation.id);
    });

    // Tooltip
    polygon.bindTooltip(`<strong>${nation.flag} ${nation.name}</strong>`, {
      sticky: true,
      className: 'tactical-tooltip'
    });

    countryLayers[nation.id] = polygon;
  });
}

function updateAllCountryStyles() {
  Object.keys(countryLayers).forEach(cId => {
    countryLayers[cId].setStyle(getCountryStyle(cId));
  });
}

// ==========================================
// ŞEHİR VE BİRLİK MARKERLARI
// ==========================================
function getCityOwner(cityObj) {
  // Şehir kime ait?
  return cityObj.controller || cityObj.originalCountry;
}

function renderAllCities() {
  // Eski markerları temizle
  Object.values(cityMarkers).forEach(m => map.removeLayer(m));
  cityMarkers = {};

  Object.values(WORLD_NATIONS).forEach(nation => {
    nation.cities.forEach(city => {
      if (!city.originalCountry) city.originalCountry = nation.id;
      if (!city.controller) city.controller = nation.id;

      const marker = createCityMarker(city);
      marker.addTo(map);
      cityMarkers[city.id] = marker;
    });
  });
}

function createCityMarker(city) {
  const isPlayer = (getCityOwner(city) === gameState.playerCountryId);
  const isEnemy = gameState.enemyCountryIds.has(getCityOwner(city));
  
  let pinClass = "neutral";
  if (isPlayer) pinClass = "friendly";
  else if (isEnemy) pinClass = "enemy";

  const iconSymbol = city.tier === "big" ? "🏛️" : "📍";

  const divHtml = `
    <div class="city-marker-div" id="marker-city-${city.id}">
      <div class="city-pin ${pinClass}">
        ${iconSymbol}
      </div>
      <div class="city-marker-name">${city.name}</div>
      <div class="city-units-tag">
        <span class="unit-mini-pill">🪖${city.infantry}</span>
        <span class="unit-mini-pill">🚜${city.tanks}</span>
      </div>
    </div>
  `;

  const customIcon = L.divIcon({
    html: divHtml,
    className: 'city-leaflet-div',
    iconSize: [60, 48],
    iconAnchor: [30, 24]
  });

  const marker = L.marker([city.lat, city.lng], { icon: customIcon });

  marker.on('click', function(e) {
    L.DomEvent.stopPropagation(e);
    handleCityClick(city);
  });

  return marker;
}

function updateCityMarkerDisplay(city) {
  if (cityMarkers[city.id]) {
    map.removeLayer(cityMarkers[city.id]);
  }
  const newMarker = createCityMarker(city);
  newMarker.addTo(map);
  cityMarkers[city.id] = newMarker;
}

// ==========================================
// ŞEHİR ETKİLEŞİMİ & SALDIRI HEDEFİ SEÇİMİ
// ==========================================
function handleCityClick(city) {
  sfx.playClick();

  // SALDIRI MODUNDA MIYIZ?
  if (gameState.attackMode) {
    const targetOwner = getCityOwner(city);

    // Kendi şehrine saldıramazsın!
    if (targetOwner === gameState.playerCountryId) {
      showToast("⚠️ Kendi şehrinize saldıramazsınız! Kırmızı bir düşman şehri seçin.");
      return;
    }

    // Düşman (KIRMIZI) bir şehir mi?
    if (!gameState.enemyCountryIds.has(targetOwner)) {
      showToast("⚠️ Bu ülkeyle henüz savaşta değilsiniz! Önce ülkeye dokunup Savaş İlan edin.");
      return;
    }

    // Başarılı hedef seçildi -> Taarruz Başlat!
    executeAttack(gameState.attackSourceCityId, city.id, gameState.attackUnitType);
    cancelAttackMode();
    return;
  }

  // NORMAL MOD: ŞEHİR KARTINI AÇ
  openCityModal(city);
}

// ==========================================
// MODALLAR VE DRAWERLAR
// ==========================================
function closeModals() {
  document.getElementById("country-modal").style.display = "none";
  document.getElementById("city-modal").style.display = "none";
}

// 1. Ülke Bilgi & Seçim Modalı
function openCountryModal(countryId) {
  const nation = WORLD_NATIONS[countryId];
  if (!nation) return;

  closeModals();
  const modal = document.getElementById("country-modal");
  document.getElementById("country-flag").innerText = nation.flag;
  document.getElementById("country-title").innerText = nation.name.toUpperCase();
  document.getElementById("country-capital").innerText = nation.capital;
  document.getElementById("country-power").innerText = nation.power;
  document.getElementById("country-city-count").innerText = `${nation.cities.length} Şehir`;
  document.getElementById("country-industry").innerText = nation.industry;
  document.getElementById("country-desc").innerText = nation.desc;

  const statusPill = document.getElementById("country-status-pill");
  const actionsDiv = document.getElementById("country-actions");
  actionsDiv.innerHTML = "";

  if (gameState.phase === "SELECTION") {
    statusPill.className = "status-pill";
    statusPill.innerText = "SEÇİLEBİLİR DEVLET";
    
    const selectBtn = document.createElement("button");
    selectBtn.className = "btn-primary-action";
    selectBtn.innerHTML = `★ ${nation.name.toUpperCase()} İLE OYUNA BAŞLA`;
    selectBtn.onclick = () => selectPlayerCountry(countryId);
    actionsDiv.appendChild(selectBtn);

  } else {
    // Savaş Odası Modu
    if (countryId === gameState.playerCountryId) {
      statusPill.className = "status-pill blue";
      statusPill.innerText = "VATAN TOPRAKLARI (MAVİ)";
      
      const infoP = document.createElement("p");
      infoP.style.textAlign = "center";
      infoP.style.color = "#90caf9";
      infoP.innerText = "Kendi ülkenizi yönetiyorsunuz. Asker ve tank üretmek için şehirlerinize dokunun.";
      actionsDiv.appendChild(infoP);

    } else if (gameState.enemyCountryIds.has(countryId)) {
      statusPill.className = "status-pill red";
      statusPill.innerText = "DÜŞMAN DEVLET (SAVAŞTA - KIRMIZI)";

      const infoP = document.createElement("p");
      infoP.style.textAlign = "center";
      infoP.style.color = "#ff8a80";
      infoP.innerText = "Bu ülkeyle savaş halindesiniz! Şehirlerini ele geçirmek için birliklerinize 'Saldır' emri verin.";
      actionsDiv.appendChild(infoP);

    } else {
      // Tarafsız Ülke -> SAVAŞ BUTONU ÇIKACAK
      statusPill.className = "status-pill";
      statusPill.innerText = "TARAFSIZ DEVLET";

      const warBtn = document.createElement("button");
      warBtn.className = "btn-war-action";
      warBtn.innerHTML = `⚔️ ${nation.name.toUpperCase()} DEVLETİNE SAVAŞ İLAN ET!`;
      warBtn.onclick = () => declareWar(countryId);
      actionsDiv.appendChild(warBtn);
    }
  }

  modal.style.display = "flex";
}

// 2. Şehir Yönetim & Üs İnşa Modalı
function openCityModal(city) {
  closeModals();
  gameState.selectedCity = city;

  const modal = document.getElementById("city-modal");
  document.getElementById("city-title").innerText = city.name.toUpperCase();
  document.getElementById("city-type-icon").innerText = city.tier === "big" ? "🏛️" : "📍";
  
  const isPlayer = (getCityOwner(city) === gameState.playerCountryId);
  const isEnemy = gameState.enemyCountryIds.has(getCityOwner(city));
  
  const ownerPill = document.getElementById("city-owner-pill");
  if (isPlayer) {
    ownerPill.className = "status-pill blue";
    ownerPill.innerText = "DOST TOPRAK (MAVİ - BİZİM)";
  } else if (isEnemy) {
    ownerPill.className = "status-pill red";
    ownerPill.innerText = "DÜŞMAN ŞEHRİ (KIRMIZI)";
  } else {
    ownerPill.className = "status-pill";
    ownerPill.innerText = "TARAFSIZ ŞEHİR";
  }

  // Can Barı
  const healthFill = document.getElementById("city-health-fill");
  const healthText = document.getElementById("city-health-text");
  const pct = (city.health / city.maxHealth) * 100;
  healthFill.style.width = `${pct}%`;
  healthText.innerText = `${city.health} / ${city.maxHealth} ${pct === 100 ? "(TAM GÜÇ)" : "(HASARLI)"}`;
  
  const tierNote = document.getElementById("city-tier-note");
  if (city.tier === "big") {
    tierNote.innerHTML = "★ <strong>BÜYÜK METROPOL:</strong> Düşürmek için <strong>2 BİRLİK</strong> gerekir!";
    tierNote.style.color = "#ffb74d";
  } else {
    tierNote.innerHTML = "• <strong>KÜÇÜK ŞEHİR:</strong> <strong>1 BİRLİK</strong> ulaştığında doğrudan düşer!";
    tierNote.style.color = "#81c784";
  }

  // Konuşlu Birlikler
  document.getElementById("city-infantry-count").innerText = `${city.infantry} Birlik`;
  document.getElementById("city-tank-count").innerText = `${city.tanks} Birlik`;

  // Saldırı Butonları Sadece Bizim Şehirlerimizde Aktif
  const btnInf = document.getElementById("btn-attack-infantry");
  const btnTank = document.getElementById("btn-attack-tank");
  
  if (isPlayer) {
    btnInf.disabled = (city.infantry <= 0);
    btnTank.disabled = (city.tanks <= 0);
    document.getElementById("city-build-section").style.display = "block";
    
    // Üs ve Fabrika Seviye Rozetleri
    document.getElementById("badge-military-base").innerText = `Lvl ${city.baseLvl || 1}`;
    document.getElementById("badge-tank-factory").innerText = `Lvl ${city.factoryLvl || 1}`;
  } else {
    btnInf.disabled = true;
    btnTank.disabled = true;
    document.getElementById("city-build-section").style.display = "none";
  }

  modal.style.display = "flex";
}

// ==========================================
// OYUN AKIŞI: ÜLKE SEÇİMİ & SAVAŞ İLANI
// ==========================================
function selectPlayerCountry(countryId) {
  sfx.playVictory();
  gameState.playerCountryId = countryId;
  gameState.phase = "WAR_ROOM";

  const nation = WORLD_NATIONS[countryId];
  showToast(`🎖️ Komutan! ${nation.name} (${nation.flag}) yönetiminize geçti. Vatan toprakları MAVİ olarak işaretlendi!`, "victory");

  // Arayüzü Savaş Odası moduna geçir
  document.getElementById("selection-banner").style.display = "none";
  document.getElementById("player-stats").style.display = "flex";
  document.getElementById("game-status-badge").innerText = `${nation.name.toUpperCase()} BAŞKOMUTANI`;
  document.getElementById("game-status-badge").className = "sub-badge badge-blue";

  // Harita odağını seçilen ülkeye kaydır
  if (nation.bounds) {
    map.flyToBounds(nation.bounds, { padding: [40, 40], duration: 1.5 });
  }

  updateAllCountryStyles();
  renderAllCities();
  updateTopStats();
  closeModals();
}

function declareWar(targetCountryId) {
  sfx.playSiren();
  gameState.enemyCountryIds.add(targetCountryId);

  const enemy = WORLD_NATIONS[targetCountryId];
  showToast(`🚨 DİKKAT! ${enemy.name} (${enemy.flag}) devletine SAVAŞ İLAN EDİLDİ! Toprakları KIRMIZI alarmda!`, "war");

  updateAllCountryStyles();
  renderAllCities();
  closeModals();
}

// ==========================================
// SALDIRI MEKANİĞİ & 2 DAKİKALIK İNTİKAL
// ==========================================
function startAttackFromCity(unitType) {
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

  // Henüz savaş açılmış bir ülke yoksa uyar
  if (gameState.enemyCountryIds.size === 0) {
    showToast("⚠️ Önce haritadan bir yabancı ülkeye dokunup SAVAŞ İLAN edin!");
    return;
  }

  // Saldırı hazırlığı moduna geç
  gameState.attackMode = true;
  gameState.attackSourceCityId = city.id;
  gameState.attackUnitType = unitType;

  closeModals();

  // Bilgi bandını göster
  const banner = document.getElementById("attack-banner");
  const unitName = unitType === "tank" ? "ZIRHLI TANK" : "PİYADE";
  document.getElementById("attack-banner-text").innerText = `🎯 [${city.name}] Şehrinden ${unitName} Yola Çıkacak: Hedef KIRMIZI Düşman Şehrine Dokunun!`;
  banner.style.display = "flex";
}

function cancelAttackMode() {
  gameState.attackMode = false;
  gameState.attackSourceCityId = null;
  gameState.attackUnitType = null;
  document.getElementById("attack-banner").style.display = "none";
}

document.getElementById("cancel-attack-btn").onclick = cancelAttackMode;

function findCityById(id) {
  for (const nation of Object.values(WORLD_NATIONS)) {
    for (const city of nation.cities) {
      if (city.id === id) return city;
    }
  }
  return null;
}

function executeAttack(fromCityId, toCityId, unitType) {
  const fromCity = findCityById(fromCityId);
  const toCity = findCityById(toCityId);
  if (!fromCity || !toCity) return;

  // Birlik sayısını şehirden düş
  if (unitType === "infantry") fromCity.infantry--;
  else if (unitType === "tank") fromCity.tanks--;

  updateCityMarkerDisplay(fromCity);
  updateTopStats();
  sfx.playMarch();

  // 2 DAKİKA (120 saniye) intikal süresi (Oyun hızına göre ilerleyecek)
  const baseDurationSeconds = 120; // 2 dk
  const opId = gameState.operationIdCounter++;

  // Haritada çizgi oluştur
  const routeLine = L.polyline([[fromCity.lat, fromCity.lng], [toCity.lat, toCity.lng]], {
    color: '#ff1744',
    weight: 3,
    dashArray: '6, 8',
    opacity: 0.8
  }).addTo(map);

  // Hareket eden birlik simgesi
  const iconStr = unitType === "tank" ? "🚜" : "🪖";
  const moveIcon = L.divIcon({
    html: `<div style="font-size: 22px; filter: drop-shadow(0 0 6px #ff1744); transform: translate(-50%, -50%);">${iconStr}</div>`,
    className: 'marching-unit-icon'
  });
  const movingMarker = L.marker([fromCity.lat, fromCity.lng], { icon: moveIcon }).addTo(map);

  const op = {
    id: opId,
    unitType: unitType,
    fromCity: fromCity,
    toCity: toCity,
    durationMs: baseDurationSeconds * 1000,
    elapsedMs: 0,
    progress: 0,
    line: routeLine,
    marker: movingMarker
  };

  gameState.operations.push(op);
  renderOperationsList();
  showToast(`⚡ ${fromCity.name} ➔ ${toCity.name} hedefine ${unitType === "tank" ? "Zırhlı Tank" : "Piyade"} birliği intikale başladı (2 dk)!`);
}

// ==========================================
// İNTİKAL HESAPLAMA & BİRLİK VARMA MEKANİĞİ
// ==========================================
function updateOperations(deltaMs) {
  if (gameState.operations.length === 0) return;

  const adjustedDelta = deltaMs * gameState.gameSpeed;

  for (let i = gameState.operations.length - 1; i >= 0; i--) {
    const op = gameState.operations[i];
    op.elapsedMs += adjustedDelta;
    op.progress = Math.min(1, op.elapsedMs / op.durationMs);

    // Marker pozisyonunu güncelle (interpolasyon)
    const curLat = op.fromCity.lat + (op.toCity.lat - op.fromCity.lat) * op.progress;
    const curLng = op.fromCity.lng + (op.toCity.lng - op.fromCity.lng) * op.progress;
    op.marker.setLatLng([curLat, curLng]);

    // BİRLİK HEDEFE VARDI! (SAVAS SONUCU)
    if (op.progress >= 1) {
      resolveCombat(op);
      // Temizle
      map.removeLayer(op.line);
      map.removeLayer(op.marker);
      gameState.operations.splice(i, 1);
    }
  }

  renderOperationsList();
}

function resolveCombat(op) {
  const targetCity = op.toCity;
  sfx.playCannon();

  // KURAL: KÜÇÜK ŞEHİR Mİ, BÜYÜK ŞEHİR Mİ?
  if (targetCity.tier === "small") {
    // Küçük bir şehir ise: Şehri doğrudan alacak ve şehir MAVİ olacak!
    targetCity.controller = gameState.playerCountryId;
    targetCity.health = targetCity.maxHealth;
    
    // Varan birlik şehre yerleşir
    if (op.unitType === "infantry") targetCity.infantry++;
    else targetCity.tanks++;

    sfx.playVictory();
    showToast(`🏆 <strong>ZAFER!</strong> [${targetCity.name}] küçük şehri ele geçirildi ve vatan topraklarına (MAVİ) katıldı!`, "victory");

  } else {
    // Büyük bir şehir ise: 1 birlik daha gerekecek!
    targetCity.health--;

    if (targetCity.health <= 0) {
      // 2. birlik de vurdu ve şehir düştü!
      targetCity.controller = gameState.playerCountryId;
      targetCity.health = targetCity.maxHealth;
      
      if (op.unitType === "infantry") targetCity.infantry++;
      else targetCity.tanks++;

      sfx.playVictory();
      showToast(`🏆 <strong>BÜYÜK FETİH!</strong> [${targetCity.name}] metropolü 2. birliğin taarruzuyla tamamen düştü ve MAVİ oldu!`, "victory");

    } else {
      // İlk birlik vurdu, şehir yaralandı, 1 birlik daha lazım!
      showToast(`⚔️ <strong>ŞİDDETLİ ÇARPIŞMA!</strong> [${targetCity.name}] savunması %50 kırıldı! Ele geçirmek için <strong>1 BİRLİK DAHA GEREKİYOR!</strong>`, "war");
    }
  }

  // Şehir markerını ve durumunu güncelle
  updateCityMarkerDisplay(targetCity);
  checkNationCapitulation(targetCity.originalCountry);
  updateTopStats();

  // Eğer şehir detay penceresi açıksa tazele
  if (gameState.selectedCity && gameState.selectedCity.id === targetCity.id) {
    openCityModal(targetCity);
  }
}

function checkNationCapitulation(nationId) {
  const nation = WORLD_NATIONS[nationId];
  if (!nation) return;

  // Ülkenin tüm şehirleri ele geçirildi mi?
  const allCaptured = nation.cities.every(c => c.controller === gameState.playerCountryId);
  if (allCaptured) {
    sfx.playVictory();
    showToast(`👑 <strong>TARİHİ ZAFER!</strong> ${nation.name} tamamen teslim oldu! Tüm sınırları MAVİ olarak vatanımıza katıldı!`, "victory");
    
    // Ülke sınırlarını da kalıcı MAVİ yap
    if (countryLayers[nationId]) {
      countryLayers[nationId].setStyle({
        fillColor: "#0066cc",
        fillOpacity: 0.55,
        color: "#00e5ff",
        weight: 3
      });
    }
    gameState.enemyCountryIds.delete(nationId);
  }
}

function renderOperationsList() {
  const listEl = document.getElementById("operations-list");
  const countBadge = document.getElementById("op-count-badge");
  countBadge.innerText = gameState.operations.length;

  if (gameState.operations.length === 0) {
    listEl.innerHTML = `<div class="empty-op-msg">Şu anda intikal eden birlik yok.</div>`;
    return;
  }

  let html = "";
  gameState.operations.forEach(op => {
    const remainSec = Math.max(0, Math.ceil((op.durationMs - op.elapsedMs) / (1000 * gameState.gameSpeed)));
    const min = Math.floor(remainSec / 60);
    const sec = remainSec % 60;
    const timeStr = `${min}:${sec < 10 ? '0' : ''}${sec}`;

    html += `
      <div class="op-card attack-red">
        <div class="op-title-row">
          <span>${op.unitType === "tank" ? "🚜 Tank" : "🪖 Piyade"}: ${op.fromCity.name} ➔ ${op.toCity.name}</span>
          <span style="color: #ff5252;">${timeStr}</span>
        </div>
        <div class="op-progress-bar">
          <div class="op-progress-fill" style="width: ${Math.round(op.progress * 100)}%;"></div>
        </div>
      </div>
    `;
  });
  listEl.innerHTML = html;
}

// ==========================================
// ŞEHİRDE İNŞA VE ÜRETİM MEKANİKLERİ
// ==========================================
function upgradeBase() {
  const city = gameState.selectedCity;
  if (!city) return;
  const cost = 100;
  if (gameState.money < cost) {
    showToast("⚠️ Yetersiz hazine! Askeri Üs için 100M $ gerekiyor.");
    return;
  }
  sfx.playClick();
  gameState.money -= cost;
  city.baseLvl = (city.baseLvl || 1) + 1;
  showToast(`🏢 [${city.name}] Askeri Üssü Seviye ${city.baseLvl}'e yükseltildi!`);
  updateTopStats();
  openCityModal(city);
}

function upgradeTankFactory() {
  const city = gameState.selectedCity;
  if (!city) return;
  const cost = 200;
  if (gameState.money < cost) {
    showToast("⚠️ Yetersiz hazine! Tank Fabrikası için 200M $ gerekiyor.");
    return;
  }
  sfx.playClick();
  gameState.money -= cost;
  city.factoryLvl = (city.factoryLvl || 1) + 1;
  showToast(`🏭 [${city.name}] Tank Fabrikası Seviye ${city.factoryLvl}'e yükseltildi!`);
  updateTopStats();
  openCityModal(city);
}

function recruitInfantry() {
  const city = gameState.selectedCity;
  if (!city) return;
  const cost = 50;
  if (gameState.money < cost) {
    showToast("⚠️ Yetersiz hazine! Piyade için 50M $ gerekiyor.");
    return;
  }
  sfx.playClick();
  gameState.money -= cost;
  city.infantry++;
  showToast(`🪖 [${city.name}] şehrinde yeni piyade tümeni eğitildi!`);
  updateCityMarkerDisplay(city);
  updateTopStats();
  openCityModal(city);
}

function produceTank() {
  const city = gameState.selectedCity;
  if (!city) return;
  const cost = 150;
  if (gameState.money < cost) {
    showToast("⚠️ Yetersiz hazine! Zırhlı Tank için 150M $ gerekiyor.");
    return;
  }
  sfx.playClick();
  gameState.money -= cost;
  city.tanks++;
  showToast(`🚜 [${city.name}] şehrinde yeni zırhlı tank birliği üretildi!`);
  updateCityMarkerDisplay(city);
  updateTopStats();
  openCityModal(city);
}

// ==========================================
// HAZİNE & ZAMAN DÖNGÜSÜ (GAME LOOP)
// ==========================================
function updateTopStats() {
  if (gameState.phase !== "WAR_ROOM") return;

  let totalInf = 0;
  let totalTanks = 0;
  let controlledCities = 0;

  Object.values(WORLD_NATIONS).forEach(nation => {
    nation.cities.forEach(city => {
      if (getCityOwner(city) === gameState.playerCountryId) {
        totalInf += city.infantry;
        totalTanks += city.tanks;
        controlledCities++;
      }
    });
  });

  document.getElementById("stat-money").innerText = `${Math.floor(gameState.money)}M $`;
  document.getElementById("stat-infantry").innerText = totalInf;
  document.getElementById("stat-tanks").innerText = totalTanks;
  document.getElementById("stat-cities").innerText = controlledCities;
}

let lastTick = performance.now();

function gameLoop(now) {
  const delta = now - lastTick;
  lastTick = now;

  if (gameState.phase === "WAR_ROOM") {
    // İntikalleri güncelle
    updateOperations(delta);

    // Tarihi ve geliri ilerlet
    const dayAdvance = (delta / 1000) * gameState.gameSpeed * 0.5; // Her 2 sn = 1 gün
    gameState.gameDate.setHours(gameState.gameDate.getHours() + dayAdvance * 24);
    
    // Tarih ekranını güncelle
    const months = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    const dStr = `${gameState.gameDate.getDate()} ${months[gameState.gameDate.getMonth()]} ${gameState.gameDate.getFullYear()}`;
    document.getElementById("game-date-display").innerText = dStr;

    // Şehirlerden düzenli gelir (her saniye)
    let cityCount = 0;
    Object.values(WORLD_NATIONS).forEach(nation => {
      nation.cities.forEach(c => {
        if (getCityOwner(c) === gameState.playerCountryId) cityCount++;
      });
    });
    const incomePerSec = cityCount * 5; // Şehir başına $5M / sn
    gameState.money += (incomePerSec * (delta / 1000) * gameState.gameSpeed) * 0.1;
    updateTopStats();
  }

  requestAnimationFrame(gameLoop);
}

// ==========================================
// HIZ KONTROLLERİ VE SES AÇ/KAPA
// ==========================================
document.querySelectorAll(".spd-btn").forEach(btn => {
  btn.onclick = function() {
    sfx.playClick();
    document.querySelectorAll(".spd-btn").forEach(b => b.classList.remove("active"));
    this.classList.add("active");
    gameState.gameSpeed = parseInt(this.dataset.spd, 10);
    showToast(`⏩ Oyun Hızı: ${gameState.gameSpeed}x olarak ayarlandı.`);
  };
});

document.getElementById("sound-toggle-btn").onclick = function() {
  gameState.soundEnabled = !gameState.soundEnabled;
  this.innerText = gameState.soundEnabled ? "🔊" : "🔇";
  showToast(gameState.soundEnabled ? "Ses Açıldı 🔊" : "Ses Kapatıldı 🔇");
};

// ==========================================
// EKRAN VE YÖN DEĞİŞİMİ UYUMU
// ==========================================
window.addEventListener("resize", () => {
  if (map) map.invalidateSize();
});
window.addEventListener("orientationchange", () => {
  setTimeout(() => { if (map) map.invalidateSize(); }, 200);
});

// ==========================================
// BAŞLANGIÇ ÇAĞRISI
// ==========================================
window.addEventListener("DOMContentLoaded", () => {
  initMap();
  requestAnimationFrame(gameLoop);
});
