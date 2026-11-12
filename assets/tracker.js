/**
 * PratikBase.com - Real-Time Visitor & Analytics Tracker
 * Hafif, gizlilik dostu ve kesintisiz canlı ziyaretçi takip sistemi.
 */
(function() {
  // Admin panelindeyken kendi ziyaretlerimizi sayıma dahil etme
  if (window.location.pathname.startsWith('/admin')) {
    return;
  }

  const RTDB_URL = 'https://pratikbase-default-rtdb.firebaseio.com';
  const HEARTBEAT_INTERVAL = 15000; // 15 saniyede bir kalp atışı

  // 1. Session ID (Oturum Kimliği)
  let sessionId = sessionStorage.getItem('pb_sid');
  if (!sessionId) {
    sessionId = 's_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
    sessionStorage.setItem('pb_sid', sessionId);
  }

  // 2. Cihaz Tespiti
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const deviceType = isMobile ? 'Mobil' : 'Masaüstü';

  // 3. İşletim Sistemi
  let os = 'Bilinmiyor';
  const ua = navigator.userAgent;
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Macintosh|Mac OS/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  // 4. Trafik Kaynağı (Referrer & UTM)
  let referrerSource = sessionStorage.getItem('pb_ref_source');
  if (!referrerSource) {
    const urlParams = new URLSearchParams(window.location.search);
    const utmSource = urlParams.get('utm_source') || urlParams.get('source') || urlParams.get('ref');

    if (utmSource) {
      referrerSource = 'Kampanya: ' + utmSource;
    } else {
      const ref = document.referrer;
      if (!ref || ref.includes(window.location.hostname)) {
        referrerSource = 'Doğrudan (Direct)';
      } else if (/whatsapp/i.test(ref) || /wa\.me/i.test(ref)) {
        referrerSource = 'WhatsApp';
      } else if (/google\./i.test(ref)) {
        referrerSource = 'Google Arama';
      } else if (/instagram\./i.test(ref)) {
        referrerSource = 'Instagram';
      } else if (/t\.co|twitter\.com|x\.com/i.test(ref)) {
        referrerSource = 'Twitter (X)';
      } else if (/facebook\.com|fb\.com/i.test(ref)) {
        referrerSource = 'Facebook';
      } else if (/tiktok\.com/i.test(ref)) {
        referrerSource = 'TikTok';
      } else if (/youtube\.com/i.test(ref)) {
        referrerSource = 'YouTube';
      } else if (/yandex\./i.test(ref)) {
        referrerSource = 'Yandex';
      } else {
        try {
          referrerSource = new URL(ref).hostname.replace('www.', '');
        } catch(e) {
          referrerSource = 'Diğer Web Sitesi';
        }
      }
    }
    sessionStorage.setItem('pb_ref_source', referrerSource);
  }

  // 5. Ekran Çözünürlüğü & Zaman Dilimi
  const screenResolution = `${window.screen.width}x${window.screen.height}`;
  let timezone = 'Europe/Istanbul';
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Istanbul';
  } catch(e) {}

  // 6. Sayfa Bilgisi
  const getPageInfo = () => {
    let p = window.location.pathname;
    if (p.endsWith('/') && p.length > 1) p = p.slice(0, -1);
    return {
      path: p || '/',
      title: document.title || 'PratikBase'
    };
  };

  const startedAt = parseInt(sessionStorage.getItem('pb_started_at') || '0', 10) || Date.now();
  if (!sessionStorage.getItem('pb_started_at')) {
    sessionStorage.setItem('pb_started_at', startedAt.toString());
  }

  // 7. Kalp Atışı Gönderimi
  function sendHeartbeat(isExiting = false) {
    const pageInfo = getPageInfo();
    const payload = {
      id: sessionId,
      page: pageInfo.path,
      title: pageInfo.title,
      device: deviceType,
      os: os,
      referrer: referrerSource,
      screen: screenResolution,
      timezone: timezone,
      lastSeen: Date.now(),
      startedAt: startedAt,
      isExiting: isExiting
    };

    fetch(`${RTDB_URL}/live_presence/${sessionId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(() => {});
  }

  // 8. Sayfa Giriş Aktivite Olayı (Feed)
  function recordPageEnter() {
    const pageInfo = getPageInfo();
    const eventId = 'evt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const now = new Date();
    const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = now.toISOString().split('T')[0];

    const feedEntry = {
      id: eventId,
      time: timeStr,
      date: dateStr,
      page: pageInfo.path,
      title: pageInfo.title,
      device: deviceType,
      referrer: referrerSource,
      timestamp: Date.now()
    };

    // Aktivite akışına son girişleri ekle
    fetch(`${RTDB_URL}/activity_feed/${eventId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedEntry)
    }).catch(() => {});
  }

  // İlk yükleme
  sendHeartbeat();
  recordPageEnter();

  // Düzenli kalp atışı
  let heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

  // Sekme gizlendiğinde kalp atışını yavaşlat / görünür olunca hemen tazele
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      sendHeartbeat();
      if (!heartbeatTimer) heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
    } else {
      // Sekme arka plandayken de son durumu bildir
      sendHeartbeat();
    }
  });

  // Sayfadan çıkış anında
  window.addEventListener('pagehide', () => {
    sendHeartbeat(true);
  });
})();
