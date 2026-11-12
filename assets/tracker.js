/**
 * PratikBase.com - Real-Time & Historical Visitor Analytics Tracker + Live Announcement Receiver
 * Canlı izleme + Geçmişe dönük gün gün sayfa ve ziyaretçi kaydı + Site geneli acil duyuru bandı.
 */
(function() {
  if (window.location.pathname.startsWith('/admin')) {
    return;
  }

  const RTDB_URL = 'https://pratikbase-default-rtdb.firebaseio.com';
  const HEARTBEAT_INTERVAL = 15000;

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

  // 4. Trafik Kaynağı
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

  const screenResolution = `${window.screen.width}x${window.screen.height}`;
  let timezone = 'Europe/Istanbul';
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Istanbul';
  } catch(e) {}

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

  // 5. Canlı Kalp Atışı (Live Presence)
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

  // 6. Geçmiş ve Günlük İstatistik Kaydı (Historical Analytics)
  function recordPageEnter() {
    const pageInfo = getPageInfo();
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const hitId = 'h_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

    const hitData = {
      id: hitId,
      time: timeStr,
      date: dateStr,
      page: pageInfo.path,
      title: pageInfo.title,
      device: deviceType,
      referrer: referrerSource,
      timestamp: Date.now()
    };

    // A. Günlük sayfa görüntüleme kaydı
    fetch(`${RTDB_URL}/stats/daily/${dateStr}/hits/${hitId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(hitData)
    }).catch(() => {});

    // B. Günlük tekil kullanıcı kaydı
    const dailyUserKey = `pb_v_${dateStr}`;
    if (!sessionStorage.getItem(dailyUserKey)) {
      sessionStorage.setItem(dailyUserKey, '1');
      fetch(`${RTDB_URL}/stats/daily/${dateStr}/unique_users/${sessionId}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: sessionId,
          firstSeen: Date.now(),
          device: deviceType,
          os: os,
          referrer: referrerSource,
          entrancePage: pageInfo.path
        })
      }).catch(() => {});
    }

    // C. Canlı Aktivite Akışı (Feed)
    const eventId = 'evt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    fetch(`${RTDB_URL}/activity_feed/${eventId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(hitData)
    }).catch(() => {});
  }

  // 7. Site Geneli Canlı Duyuru Bandı (Admin Yönetimli)
  function checkSiteAnnouncement() {
    fetch(`${RTDB_URL}/site_announcement.json?t=${Date.now()}`)
      .then(r => r.json())
      .then(data => {
        const bannerId = 'pb-global-announcement-bar';
        const existing = document.getElementById(bannerId);

        if (data && data.active && data.text) {
          if (!existing) {
            const banner = document.createElement('div');
            banner.id = bannerId;
            const bgGradient = data.theme === 'emerald' 
              ? 'linear-gradient(90deg, #065f46, #047857)' 
              : data.theme === 'amber'
              ? 'linear-gradient(90deg, #92400e, #b45309)'
              : 'linear-gradient(90deg, #991b1b, #b91c1c)';

            banner.style.cssText = `position:sticky;top:0;z-index:99999;background:${bgGradient};color:#fff;padding:8px 16px;font-size:13px;display:flex;align-items:center;justify-content:center;gap:10px;box-shadow:0 3px 12px rgba(0,0,0,0.35);font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;text-align:center;line-height:1.4;`;

            const badgeHtml = data.badge ? `<span style="background:#fff;color:#0f172a;padding:2px 8px;border-radius:9999px;font-weight:800;font-size:10px;letter-spacing:0.5px;text-transform:uppercase;box-shadow:0 1px 3px rgba(0,0,0,0.2);">${data.badge}</span>` : '';
            const linkHtml = data.link ? `<a href="${data.link}" style="color:#fef08a;text-decoration:underline;font-weight:700;margin-left:6px;display:inline-flex;align-items:center;gap:3px;">İncele &rarr;</a>` : '';

            banner.innerHTML = `${badgeHtml} <span style="font-weight:500;">${data.text}</span> ${linkHtml}`;
            document.body.insertBefore(banner, document.body.firstChild);
          }
        } else if (existing) {
          existing.remove();
        }
      })
      .catch(() => {});
  }

  sendHeartbeat();
  recordPageEnter();
  checkSiteAnnouncement();

  let heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      sendHeartbeat();
      checkSiteAnnouncement();
      if (!heartbeatTimer) heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
    } else {
      sendHeartbeat();
    }
  });

  window.addEventListener('pagehide', () => {
    sendHeartbeat(true);
  });
})();
