/**
 * PratikBase - Ziyaretçi Geri Bildirim & Hata Bildirimi Eklentisi (Feedback Widget)
 * Kullanıcıların nazikçe öneri, yeni fikir ve hata bildirimlerini iletebilmesini sağlar.
 */
(function () {
  if (window._pbFeedbackInitialized) return;
  window._pbFeedbackInitialized = true;

  const RTDB_URL = 'https://pratikbase-default-rtdb.firebaseio.com';
  const isEn = (document.documentElement.lang || '').toLowerCase().startsWith('en');

  // 1. Floating Trigger Button (Bottom Left)
  const btn = document.createElement('button');
  btn.id = 'pbFeedbackTriggerBtn';
  btn.type = 'button';
  btn.setAttribute('aria-label', isEn ? 'Feedback & Bug Report' : 'Geri Bildirim & Hata Bildir');
  btn.className = 'fixed bottom-4 left-4 z-40 px-3 py-2 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 shadow-2xl backdrop-blur-md transition-all flex items-center gap-2 text-xs font-semibold select-none cursor-pointer hover:scale-105 active:scale-95 group';
  btn.innerHTML = `
    <span class="w-2 h-2 rounded-full bg-indigo-400 group-hover:animate-ping"></span>
    <span class="text-sm">💡</span>
    <span class="hidden sm:inline font-sans">${isEn ? 'Feedback' : 'Öneri / Hata Bildir'}</span>
  `;

  document.body.appendChild(btn);

  // 2. Feedback Modal HTML
  const modal = document.createElement('div');
  modal.id = 'pbFeedbackModal';
  modal.className = 'fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm hidden flex items-center justify-center p-3 sm:p-6 transition-opacity duration-200';
  modal.innerHTML = `
    <div class="bg-slate-900 border border-slate-700/90 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
      
      <!-- Modal Header -->
      <div class="p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-lg shrink-0">
            💡
          </div>
          <div>
            <h3 class="text-base font-bold text-white font-sans">${isEn ? 'Feedback & Bug Report' : 'Değerli Görüşleriniz & Hata Bildirimi'}</h3>
            <p class="text-xs text-slate-400 mt-0.5">${isEn ? 'Help us improve PratikBase' : 'Platformumuzu geliştirmemize yardımcı olun'}</p>
          </div>
        </div>
        <button id="pbFbCloseBtn" type="button" class="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm transition">
          ✕
        </button>
      </div>

      <!-- Modal Body Form -->
      <form id="pbFeedbackForm" class="p-5 space-y-4 text-left font-sans">
        
        <div>
          <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            ${isEn ? 'Category' : 'Bildirim Türü'}
          </label>
          <div class="grid grid-cols-3 gap-2 text-xs">
            <label class="p-2.5 rounded-xl border border-slate-800 bg-slate-950/80 hover:border-indigo-500/50 flex flex-col items-center justify-center gap-1 cursor-pointer transition text-center select-none has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-950/40">
              <input type="radio" name="fbCategory" value="suggestion" checked class="hidden">
              <span class="text-base">💡</span>
              <span class="text-[11px] font-semibold text-slate-300">${isEn ? 'Suggestion' : 'Yeni Öneri'}</span>
            </label>
            <label class="p-2.5 rounded-xl border border-slate-800 bg-slate-950/80 hover:border-rose-500/50 flex flex-col items-center justify-center gap-1 cursor-pointer transition text-center select-none has-[:checked]:border-rose-500 has-[:checked]:bg-rose-950/40">
              <input type="radio" name="fbCategory" value="bug" class="hidden">
              <span class="text-base">🐛</span>
              <span class="text-[11px] font-semibold text-slate-300">${isEn ? 'Bug Report' : 'Hata Bildirimi'}</span>
            </label>
            <label class="p-2.5 rounded-xl border border-slate-800 bg-slate-950/80 hover:border-emerald-500/50 flex flex-col items-center justify-center gap-1 cursor-pointer transition text-center select-none has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-950/40">
              <input type="radio" name="fbCategory" value="other" class="hidden">
              <span class="text-base">💬</span>
              <span class="text-[11px] font-semibold text-slate-300">${isEn ? 'General' : 'Genel Görüş'}</span>
            </label>
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            ${isEn ? 'Name or Nickname (Optional)' : 'Adınız veya Rumuzunuz (İsteğe Bağlı)'}
          </label>
          <input type="text" id="pbFbName" maxlength="40" placeholder="${isEn ? 'e.g. Alex' : 'Örn: Ahmet / Yarışmacı'}"
            class="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none text-xs transition">
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            ${isEn ? 'Your Message' : 'Mesajınız / Öneriniz'} <span class="text-rose-400">*</span>
          </label>
          <textarea id="pbFbMessage" required rows="4" maxlength="1000" placeholder="${isEn ? 'Write your thoughts, suggestions, or bug description here...' : 'Fikirlerinizi, karşılaştığınız aksaklığı veya önerinizi lütfen buraya yazın...'}"
            class="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none text-xs transition resize-none"></textarea>
        </div>

        <!-- Success Message Notice (Initially hidden) -->
        <div id="pbFbSuccessBox" class="hidden p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
          <span class="text-base">✔</span>
          <span>${isEn ? 'Thank you! Your feedback has been sent successfully.' : 'Geri bildiriminiz için teşekkür ederiz! Mesajınız yöneticilerimize iletildi.'}</span>
        </div>

        <!-- Submit Button -->
        <div class="flex items-center justify-end gap-2.5 pt-2">
          <button id="pbFbCancelBtn" type="button" class="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition">
            ${isEn ? 'Cancel' : 'Vazgeç'}
          </button>
          <button id="pbFbSubmitBtn" type="submit" class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold text-xs uppercase shadow-lg shadow-indigo-500/25 transition flex items-center gap-1.5 cursor-pointer">
            <span>${isEn ? 'Send Feedback' : 'Görüşümü İlet'}</span>
            <span>➔</span>
          </button>
        </div>

      </form>

    </div>
  `;

  document.body.appendChild(modal);

  // Open / Close events
  const openModal = () => {
    modal.classList.remove('hidden');
    document.getElementById('pbFbSuccessBox').classList.add('hidden');
    document.getElementById('pbFbSubmitBtn').disabled = false;
    document.getElementById('pbFbMessage').focus();
  };

  const closeModal = () => {
    modal.classList.add('hidden');
  };

  btn.addEventListener('click', openModal);
  document.getElementById('pbFbCloseBtn').addEventListener('click', closeModal);
  document.getElementById('pbFbCancelBtn').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Submit Handler
  const form = document.getElementById('pbFeedbackForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msgInput = document.getElementById('pbFbMessage');
    const nameInput = document.getElementById('pbFbName');
    const submitBtn = document.getElementById('pbFbSubmitBtn');
    const successBox = document.getElementById('pbFbSuccessBox');

    const message = msgInput.value.trim();
    if (!message) return;

    const name = nameInput.value.trim() || (isEn ? 'Anonymous Visitor' : 'Ziyaretçi');
    const catInput = form.querySelector('input[name="fbCategory"]:checked');
    const category = catInput ? catInput.value : 'suggestion';

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>${isEn ? 'Sending...' : 'İletiliyor...'}</span>`;

    const feedbackId = 'fb_' + Date.now() + '_' + Math.floor(100 + Math.random() * 900);
    const now = new Date();

    const payload = {
      id: feedbackId,
      name: name,
      category: category,
      message: message,
      page: window.location.pathname || '/',
      url: window.location.href,
      date: now.toLocaleDateString('tr-TR'),
      time: now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
      status: 'new'
    };

    try {
      await fetch(`${RTDB_URL}/user_feedback/${feedbackId}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      successBox.classList.remove('hidden');
      msgInput.value = '';
      nameInput.value = '';
      submitBtn.innerHTML = `<span>✔ ${isEn ? 'Sent!' : 'İletildi!'}</span>`;

      setTimeout(() => {
        closeModal();
        submitBtn.innerHTML = `<span>${isEn ? 'Send Feedback' : 'Görüşümü İlet'}</span><span>➔</span>`;
        submitBtn.disabled = false;
      }, 1600);
    } catch (err) {
      console.warn('Feedback send error:', err);
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>${isEn ? 'Send Feedback' : 'Görüşümü İlet'}</span><span>➔</span>`;
      alert(isEn ? 'Could not send feedback. Please try again later.' : 'Geri bildirim iletilemedi. Lütfen daha sonra tekrar deneyin.');
    }
  });
})();
