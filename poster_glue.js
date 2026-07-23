/* Слой-драйвер для poster_render.html (байт-в-байт копия poster_mockup.html).
   Макет НЕ трогаем: его скрипт глобальный, поэтому кормим реальными данными снаружи.
   Подключается и приложением (в iframe), и сервером (add_script_tag).
   Экспорт: __fmxPosterInit(data, api), __fmxPosterState(), __fmxPosterApply(state),
            __fmxPosterRenderMode(), __fmxPosterRender(data, state, api, opts). */
(function () {
  'use strict';
  var API = '';
  function abs(u) { if (!u) return u; if (/^(https?:|blob:|data:)/.test(u)) return u; return API + u; }
  function el(id) { return document.getElementById(id); }
  function fmt(n) { return Math.round(n).toLocaleString('ru-RU'); }

  /* ===== локализация постера (метки/цена) — МАКЕТ НЕ ТРОГАЕМ =====
     Переводим только известные статичные подписи #poster по карте; данные (имя канала,
     ниша, числа, хук, свой формат размещения) не затрагиваем. Работает и в редакторе
     (переключатель в пульте), и на сервере (язык берётся из state.lang → кеш PNG делится по языкам). */
  var POSTER_L = {
    ru: {"subs": "Подписчики", "reach": "Средний охват", "post_i": "· пост", "er": "Вовлечённость", "cpm": "Цена 1000 показов", "err": "Охват к базе", "grow": "Прирост · 30 дней", "freq": "Частота постов", "mv": "Просмотры · месяц", "chart": "Просмотры · 30 дней", "prsub": "минимальный формат размещения", "cta": "Забронировать", "prpref": "Реклама от", "prneg": "Цена по договорённости", "er_i": "· ER", "cpm_i": "· CPM", "err_i": "· ERR", "hook": "Здесь рекламу дочитывают: живая аудитория и реальные охваты.", "trust": "Метрики подтверждены ForgeMetrics · живая карточка по QR", "callout": "Реклама в канале"},
    en: {"subs": "Subscribers", "reach": "Average reach", "post_i": "· post", "er": "Engagement", "cpm": "Price per 1000 impressions", "err": "Reach to base", "grow": "Growth · 30 days", "freq": "Posting frequency", "mv": "Views · month", "chart": "Views · 30 days", "prsub": "minimum placement format", "cta": "Reserve", "prpref": "Ads from", "prneg": "Price on request", "er_i": "· ER", "cpm_i": "· CPM", "err_i": "· ERR", "hook": "Ads get read here: a live audience and real reach.", "trust": "Metrics verified by ForgeMetrics · live card via QR", "callout": "Advertise here"},
    es: {"subs": "Suscriptores", "reach": "Alcance medio", "post_i": "· post", "er": "Interacción", "cpm": "Precio de 1000 impresiones", "err": "Alcance sobre base", "grow": "Crecimiento · 30 días", "freq": "Frecuencia de publicaciones", "mv": "Vistas · mes", "chart": "Vistas · 30 días", "prsub": "formato mínimo de publicación", "cta": "Reservar", "prpref": "Publicidad desde", "prneg": "Precio a convenir", "er_i": "· ER", "cpm_i": "· CPM", "err_i": "· ERR", "hook": "Aquí la publicidad sí se lee: audiencia viva y alcance real.", "trust": "Métricas verificadas por ForgeMetrics · tarjeta en vivo por QR", "callout": "Anúnciate aquí"},
    de: {"subs": "Abonnenten", "reach": "Durchschnittliche Reichweite", "post_i": "· Beitrag", "er": "Engagement", "cpm": "Preis pro 1000 Impressionen", "err": "Reichweite zur Basis", "grow": "Zuwachs · 30 Tage", "freq": "Beitragsfrequenz", "mv": "Aufrufe · Monat", "chart": "Aufrufe · 30 Tage", "prsub": "Mindestformat der Platzierung", "cta": "Reservieren", "prpref": "Werbung ab", "prneg": "Preis auf Anfrage", "er_i": "· ER", "cpm_i": "· CPM", "err_i": "· ERR", "hook": "Hier wird Werbung gelesen: echtes Publikum, echte Reichweite.", "trust": "Metriken von ForgeMetrics bestätigt · Live-Karte per QR", "callout": "Hier werben"},
    kk: {"subs": "Жазылушылар", "reach": "Орташа қамту", "post_i": "· жазба", "er": "Тартылым", "cpm": "1000 көрсетілім бағасы", "err": "Базаға қамту", "grow": "Өсім · 30 күн", "freq": "Постар жиілігі", "mv": "Қаралымдар · ай", "chart": "Қаралымдар · 30 күн", "prsub": "орналастырудың ең аз форматы", "cta": "Брондау", "prpref": "Жарнама, бастап", "prneg": "Баға келісім бойынша", "er_i": "· ER", "cpm_i": "· CPM", "err_i": "· ERR", "hook": "Мұнда жарнаманы шынымен оқиды: тірі аудитория және нақты қамту.", "trust": "Метрикаларды ForgeMetrics растаған · QR арқылы жанды карточка", "callout": "Арнадағы жарнама"},
    uz: {"subs": "Obunachilar", "reach": "Oʻrtacha qamrov", "post_i": "· post", "er": "Jalb etilganlik", "cpm": "1000 ta koʻrsatish narxi", "err": "Bazaga qamrov", "grow": "Oʻsish · 30 kun", "freq": "Postlar chastotasi", "mv": "Koʻrishlar · oy", "chart": "Ko'rishlar · 30 kun", "prsub": "joylashtirishning minimal formati", "cta": "Band qilish", "prpref": "Reklama —", "prneg": "Narx kelishuv asosida", "er_i": "· ER", "cpm_i": "· CPM", "err_i": "· ERR", "hook": "Bu yerda reklama chindan o‘qiladi: jonli auditoriya va haqiqiy qamrov.", "trust": "Metrikalar ForgeMetrics tomonidan tasdiqlangan · QR orqali jonli kartochka", "callout": "Kanalda reklama"},
    be: {"subs": "Падпісчыкі", "reach": "Сярэдні ахоп", "post_i": "· допіс", "er": "Уцягнутасць", "cpm": "Цана 1000 паказаў", "err": "Ахоп да базы", "grow": "Прырост · 30 дзён", "freq": "Частата пастоў", "mv": "Прагляды · месяц", "chart": "Прагляды · 30 дзён", "prsub": "мінімальны фармат размяшчэння", "cta": "Забраніраваць", "prpref": "Рэклама ад", "prneg": "Цана па дамоўленасці", "er_i": "· ER", "cpm_i": "· CPM", "err_i": "· ERR", "hook": "Тут рэкламу дачытваюць: жывая аўдыторыя і рэальныя ахопы.", "trust": "Метрыкі пацверджаны ForgeMetrics · жывая картка па QR", "callout": "Рэклама ў канале"},
    az: {"subs": "Abunəçilər", "reach": "Orta əhatə", "post_i": "· post", "er": "Cəlbolunma", "cpm": "1000 göstərişin qiyməti", "err": "Bazaya əhatə", "grow": "Artım · 30 gün", "freq": "Post tezliyi", "mv": "Baxışlar · ay", "chart": "Baxışlar · 30 gün", "prsub": "minimum yerləşdirmə formatı", "cta": "Rezerv et", "prpref": "Reklam", "prneg": "Qiymət razılaşma ilə", "er_i": "· ER", "cpm_i": "· CPM", "err_i": "· ERR", "hook": "Burada reklam həqiqətən oxunur: canlı auditoriya, real əhatə.", "trust": "Metrikalar ForgeMetrics tərəfindən təsdiqlənib · QR ilə canlı kart", "callout": "Kanalda reklam"},
    ar: {"subs": "المشتركون", "reach": "متوسط الوصول", "post_i": "· منشور", "er": "التفاعل", "cpm": "سعر 1000 ظهور", "err": "الوصول إلى القاعدة", "grow": "النمو · 30 يومًا", "freq": "تكرار النشر", "mv": "المشاهدات · شهر", "chart": "المشاهدات · 30 يومًا", "prsub": "الحد الأدنى لصيغة الإعلان", "cta": "احجز الآن", "prpref": "الإعلان من", "prneg": "السعر حسب الاتفاق", "er_i": "· ER", "cpm_i": "· CPM", "err_i": "· ERR", "hook": "هنا تُقرأ الإعلانات فعلًا: جمهور حقيقي ووصول حقيقي.", "trust": "المقاييس موثّقة من ForgeMetrics · بطاقة حية عبر QR", "callout": "مساحة إعلانية"},
    fa: {"subs": "دنبال‌کنندگان", "reach": "میانگین بازدید", "post_i": "· پست", "er": "نرخ تعامل", "cpm": "قیمت ۱۰۰۰ نمایش", "err": "بازدید به دنبال‌کننده", "grow": "رشد · ۳۰ روز", "freq": "تناوب پست‌ها", "mv": "بازدید · ماه", "chart": "بازدید · ۳۰ روز", "prsub": "حداقل فرمت درج آگهی", "cta": "رزرو", "prpref": "تبلیغ از", "prneg": "قیمت توافقی", "er_i": "· ER", "cpm_i": "· CPM", "err_i": "· ERR", "hook": "اینجا تبلیغ واقعاً خوانده می‌شود: مخاطب واقعی و دسترسی واقعی.", "trust": "متریک‌ها با تأیید ForgeMetrics · کارت زنده از طریق QR", "callout": "تبلیغ در کانال"},
    tr: {"subs": "Aboneler", "reach": "Ortalama erişim", "post_i": "· gönderi", "er": "Etkileşim", "cpm": "1000 gösterim fiyatı", "err": "Erişim / abone", "grow": "Artış · 30 gün", "freq": "Gönderi sıklığı", "mv": "Görüntülenme · ay", "chart": "Görüntülenme · 30 gün", "prsub": "minimum yerleşim formatı", "cta": "Rezerve et", "prpref": "Reklam min.", "prneg": "Fiyat görüşülür", "er_i": "· ER", "cpm_i": "· CPM", "err_i": "· ERR", "hook": "Burada reklam gerçekten okunur: canlı kitle, gerçek erişim.", "trust": "Metrikler ForgeMetrics tarafından doğrulandı · QR ile canlı kart", "callout": "Kanalda reklam"},
    hi: {"subs": "सब्सक्राइबर", "reach": "औसत रीच", "post_i": "· पोस्ट", "er": "एंगेजमेंट", "cpm": "1000 इंप्रेशन की कीमत", "err": "बेस पर रीच", "grow": "ग्रोथ · 30 दिन", "freq": "पोस्ट फ्रीक्वेंसी", "mv": "व्यूज़ · माह", "chart": "व्यूज़ · 30 दिन", "prsub": "न्यूनतम प्लेसमेंट फॉर्मेट", "cta": "बुक करें", "prpref": "विज्ञापन से", "prneg": "कीमत अनुरोध पर", "er_i": "· ER", "cpm_i": "· CPM", "err_i": "· ERR", "hook": "यहाँ विज्ञापन सच में पढ़े जाते हैं: असली ऑडियंस, असली रीच।", "trust": "मेट्रिक्स ForgeMetrics द्वारा सत्यापित · QR से लाइव कार्ड", "callout": "चैनल में विज्ञापन"},
    bn: {"subs": "সাবস্ক্রাইবার", "reach": "গড় রিচ", "post_i": "· পোস্ট", "er": "এনগেজমেন্ট", "cpm": "১০০০ ভিউয়ের দাম", "err": "বেস অনুপাতে রিচ", "grow": "বৃদ্ধি · ৩০ দিন", "freq": "পোস্টের হার", "mv": "ভিউ · মাস", "chart": "ভিউ · ৩০ দিন", "prsub": "ন্যূনতম প্লেসমেন্ট ফরম্যাট", "cta": "বুক করুন", "prpref": "বিজ্ঞাপন শুরু", "prneg": "দাম আলোচনাসাপেক্ষ", "er_i": "· ER", "cpm_i": "· CPM", "err_i": "· ERR", "hook": "এখানে বিজ্ঞাপন সত্যিই পড়া হয়: আসল অডিয়েন্স, আসল রিচ।", "trust": "মেট্রিক্স ForgeMetrics দ্বারা যাচাইকৃত · QR-এ লাইভ কার্ড", "callout": "চ্যানেলে বিজ্ঞাপন"},
    id: {"subs": "Subscriber", "reach": "Jangkauan rata-rata", "post_i": "· post", "er": "Engagement", "cpm": "Harga per 1000 tayangan", "err": "Jangkauan vs basis", "grow": "Pertumbuhan · 30 hari", "freq": "Frekuensi posting", "mv": "Tayangan · bulan", "chart": "Tayangan · 30 hari", "prsub": "format penempatan minimum", "cta": "Booking", "prpref": "Iklan mulai", "prneg": "Harga nego", "er_i": "· ER", "cpm_i": "· CPM", "err_i": "· ERR", "hook": "Iklan di sini benar-benar dibaca: audiens aktif, jangkauan nyata.", "trust": "Metrik terverifikasi ForgeMetrics · kartu live via QR", "callout": "Iklan di channel"},
    vi: {"subs": "Người theo dõi", "reach": "Reach trung bình", "post_i": "· bài", "er": "Tương tác", "cpm": "Giá 1000 lượt xem", "err": "Reach / người theo dõi", "grow": "Tăng trưởng · 30 ngày", "freq": "Tần suất đăng", "mv": "Lượt xem · tháng", "chart": "Lượt xem · 30 ngày", "prsub": "định dạng đặt tối thiểu", "cta": "Đặt chỗ", "prpref": "Quảng cáo từ", "prneg": "Giá thỏa thuận", "er_i": "· ER", "cpm_i": "· CPM", "err_i": "· ERR", "hook": "Quảng cáo ở đây được đọc thật sự: khán giả thật, độ phủ thật.", "trust": "Số liệu do ForgeMetrics xác thực · thẻ live qua QR", "callout": "Nhận quảng cáo"},
    pt: {"subs": "Inscritos", "reach": "Alcance médio", "post_i": "· post", "er": "Engajamento", "cpm": "Preço por 1000 views", "err": "Alcance vs. base", "grow": "Crescimento · 30 dias", "freq": "Frequência de posts", "mv": "Views · mês", "chart": "Views · 30 dias", "prsub": "formato mínimo de anúncio", "cta": "Reservar", "prpref": "Anúncios a partir de", "prneg": "Preço sob consulta", "er_i": "· ER", "cpm_i": "· CPM", "err_i": "· ERR", "hook": "Aqui a publicidade é lida de verdade: audiência viva e alcance real.", "trust": "Métricas verificadas pela ForgeMetrics · cartão ao vivo via QR", "callout": "Anuncie aqui"},
    fr: {"subs": "Abonnés", "reach": "Portée moyenne", "post_i": "· post", "er": "Engagement", "cpm": "Prix pour 1000 vues", "err": "Portée / base", "grow": "Croissance · 30 j", "freq": "Fréquence de posts", "mv": "Vues · mois", "chart": "Vues · 30 jours", "prsub": "format de placement minimal", "cta": "Réserver", "prpref": "Pub dès", "prneg": "Prix sur demande", "er_i": "· ER", "cpm_i": "· CPM", "err_i": "· ERR", "hook": "Ici, la pub est vraiment lue : audience vivante, portée réelle.", "trust": "Métriques vérifiées par ForgeMetrics · fiche live via QR", "callout": "Espace publicitaire"},
    it: {"subs": "Iscritti", "reach": "Copertura media", "post_i": "· post", "er": "Engagement", "cpm": "Prezzo per 1000 impression", "err": "Copertura su base", "grow": "Crescita · 30 giorni", "freq": "Frequenza post", "mv": "Visualizzazioni · mese", "chart": "Visualizzazioni · 30 giorni", "prsub": "formato minimo di inserzione", "cta": "Prenota", "prpref": "Ads da", "prneg": "Prezzo su richiesta", "er_i": "· ER", "cpm_i": "· CPM", "err_i": "· ERR", "hook": "Qui la pubblicità si legge davvero: pubblico vivo e copertura reale.", "trust": "Metriche verificate da ForgeMetrics · scheda live via QR", "callout": "Spazio pubblicitario"},
    am: {"subs": "ተከታዮች", "reach": "አማካይ ተደራሽነት", "post_i": "· ፖስት", "er": "ተሳትፎ", "cpm": "ዋጋ ለ1000 እይታ", "err": "ተደራሽነት ከመሠረት", "grow": "እድገት · 30 ቀን", "freq": "የፖስት ድግግሞሽ", "mv": "እይታዎች · ወር", "chart": "እይታዎች · 30 ቀን", "prsub": "አነስተኛ የማስታወቂያ ቅርጸት", "cta": "አስይዝ", "prpref": "ማስታወቂያ ከ", "prneg": "ዋጋ በስምምነት", "er_i": "· ER", "cpm_i": "· CPM", "err_i": "· ERR", "hook": "እዚህ ማስታወቂያ በእውነት ይነበባል፦ ቀጥታ ታዳሚ እና እውነተኛ ተደራሽነት።", "trust": "መለኪያዎች በForgeMetrics ተረጋግጠዋል · በQR ቀጥታ ካርድ", "callout": "የቻናል ማስታወቂያ"},
    sw: {"subs": "Wasajili", "reach": "Ufikiaji wastani", "post_i": "· chapisho", "er": "Ushirikiano", "cpm": "Bei ya maonyesho 1000", "err": "Ufikiaji kwa msingi", "grow": "Ukuaji · siku 30", "freq": "Kasi ya machapisho", "mv": "Mionekano · mwezi", "chart": "Mionekano · siku 30", "prsub": "kifurushi cha chini cha tangazo", "cta": "Weka nafasi", "prpref": "Matangazo kuanzia", "prneg": "Bei kwa makubaliano", "er_i": "· ER", "cpm_i": "· CPM", "err_i": "· ERR", "hook": "Hapa matangazo yanasomwa kweli: hadhira hai na ufikiaji halisi.", "trust": "Vipimo vimethibitishwa na ForgeMetrics · kadi hai kwa QR", "callout": "Tangaza hapa"}
  };
  var _psLang = 'ru';
  function _psPack() { return POSTER_L[_psLang] || POSTER_L.ru; }
  function _psEsc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function _psLbl(m, main, suff) {
    var e = document.querySelector('.mcell[data-m="' + m + '"] .l');
    if (e) e.innerHTML = _psEsc(main) + (suff ? ' <i>' + _psEsc(suff) + '</i>' : '');
  }
  var _psNiche = null;   // {raw, tr} — ниша листинга и её переводы (с бэка), для смены языка на лету
  var _psAsof = null;    // дата среза метрик (с бэка) — для строки-пруфа
  // QR всегда включён и всегда наш (решение владельца 14.07: отключение убрано из пульта);
  // легаси none/both/channel из старых сохранений приводим к card
  function _psQr(m) { return 'card'; }
  /* плашка «Реклама в канале» в правом верхнем углу (скрин владельца 13.07): постер —
     оффер, а не визитка. line-height:1 — глифы высоких письменностей (ar/hi) не раздувают
     плашку; при пересечении с длинным названием канала прячется, на текст не наезжает. */
  function _psApplyCallout() {
    var poster = el('poster'); if (!poster) return;
    var Pk = _psPack();
    var c = el('fmxCallout');
    if (!c) {
      c = document.createElement('div'); c.id = 'fmxCallout';
      /* размеры В ТОЧНОСТИ как в исходной версии (git b5fbe92, вердикт владельца 14.07):
         top:14, паддинг 7px 14px; line-height:1 — высокие глифы ar/hi не раздувают капсулу */
      c.style.cssText = 'position:absolute;top:14px;right:24px;z-index:6;padding:7px 14px;border-radius:999px;' +
        'font-size:12px;font-weight:800;letter-spacing:1.1px;text-transform:uppercase;line-height:1;' +
        'background:rgba(93,202,165,0.14);border:1px solid rgba(93,202,165,0.5);color:#7ee7c2;' +
        'white-space:nowrap;pointer-events:none;';
      poster.appendChild(c);
    }
    c.textContent = Pk.callout || 'Реклама в канале';
    c.style.display = '';
    /* сброс возможного ужатия — ЯВНЫМИ базовыми значениями: пустая строка стирала бы
       и штатные отступы из cssText (плашка становилась плоской) */
    c.style.fontSize = '12px'; c.style.padding = '7px 14px'; c.style.letterSpacing = '1.1px';
    /* Коллизия с названием: только РЕАЛЬНОЕ пересечение прямоугольников (искусственные
       запасы давали ложное срабатывание после догрузки шрифта — плашка «исчезала»).
       При пересечении сначала ужимаемся, прячемся только если не помогло. */
    var t = el('titEl');
    function hit() {
      var a = c.getBoundingClientRect(), b = t.getBoundingClientRect();
      if (!a.width || !b.width) return false;   // не измерили — не решаем
      /* нахлёст ≤4px по рамке названия — это пустое поле строки над буквами (line-height),
         визуального касания нет; считаем коллизией только заход глубже */
      return a.left < b.right + 2 && a.right > b.left && a.top < b.bottom && a.bottom > b.top + 4;
    }
    if (t && hit()) {
      c.style.fontSize = '10px'; c.style.padding = '5px 10px'; c.style.letterSpacing = '0.6px';
      if (hit()) c.style.display = 'none';
    }
  }
  /* строка-пруф под нижним блоком: подтверждение метрик площадкой + дата среза.
     Заменяет текстовую реф-ссылку Free — её никто не вводил руками, рефка теперь вшита в QR. */
  function _psProofLine() {
    var poster = el('poster'); if (!poster) return;
    var Pk = _psPack();
    var d = el('fmxProof');
    if (!d) {
      d = document.createElement('div'); d.id = 'fmxProof';
      d.style.cssText = 'position:absolute;left:36px;right:36px;bottom:8px;height:12px;line-height:12px;' +
        'text-align:center;font:600 9.5px Inter,Arial,sans-serif;letter-spacing:.03em;' +
        'color:rgba(255,255,255,0.45);text-shadow:0 1px 2px rgba(0,0,0,0.55);' +
        'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none;z-index:60;';
      poster.appendChild(d);
    }
    var dt = _psAsof;
    if (!dt) { var nn = new Date(); dt = ('0' + nn.getDate()).slice(-2) + '.' + ('0' + (nn.getMonth() + 1)).slice(-2) + '.' + nn.getFullYear(); }
    d.textContent = (Pk.trust || 'Метрики подтверждены ForgeMetrics · живая карточка по QR') + ' · ' + dt;
  }
  function _psApplyNiche() {
    if (!_psNiche || !el('nicheEl')) return;
    var v = (_psLang !== 'ru' && _psNiche.tr && _psNiche.tr[_psLang]) ? _psNiche.tr[_psLang] : _psNiche.raw;
    if (v) el('nicheEl').textContent = v;
  }
  function _psApplyLabels() {
    var P = _psPack();
    _psLbl('subs', P.subs);
    _psLbl('reach', P.reach, P.post_i);
    _psLbl('er', P.er, P.er_i);
    _psLbl('cpm', P.cpm, P.cpm_i);
    _psLbl('err', P.err, P.err_i);
    _psLbl('grow', P.grow);
    _psLbl('freq', P.freq);
    _psLbl('mv', P.mv);
    var ct = document.querySelector('.chart .ct span'); if (ct) ct.textContent = P.chart;   // заголовок графика
    var cta = el('ctaEl'); if (cta) cta.innerHTML = _psEsc(P.cta) + ' <span class="arw">↓</span>';
    // хук: ДЕФОЛТНЫЙ слоган макета переводится пакетом; свой текст пользователя не трогаем
    var hk = el('hookText'), hin = el('hookInp');
    if (hk && P.hook && (!hin || !String(hin.value || '').trim())) hk.textContent = P.hook;
    if (P.hook) window.DEFAULT_HOOK = P.hook;   // очистка поля в макете вставляет дефолт — держим его на языке постера
    _psApplyNiche();
    _psApplyCallout();
    _psProofLine();
    _psLocalizePrice();
  }
  function _psLocalizePrice() {
    var P = _psPack();
    var pv = el('prVal');
    var box = el('prBox');
    var ruVal = null;
    if (pv) {
      // русский оригинал держим в data-атрибуте: после первого перевода textContent уже
      // не русский, и повторная смена языка без этого «залипала» на прошлом переводе
      var cur = pv.textContent || '';
      if (cur === 'Цена по договорённости' || cur.indexOf('Реклама от') === 0) pv.setAttribute('data-fmx-src', cur);
      var t = pv.getAttribute('data-fmx-src') || cur;
      ruVal = t;
      if (t === 'Цена по договорённости') pv.textContent = (_psLang === 'ru') ? t : P.prneg;   // n = 0
      else if (t.indexOf('Реклама от') === 0) pv.textContent = (_psLang === 'ru') ? t : (P.prpref + t.slice(('Реклама от').length));  // «Реклама от NNN ₽» → префикс на языке, число как есть
      var nt = pv.textContent || '';
      pv.style.fontSize = nt.length > 16 ? '21px' : '';   // длинные цены: 21px (акцент 14.07; базовые 24px)
    }
    var ps = el('prSub');
    var fmtv = el('prFmtInp') ? String(el('prFmtInp').value || '').trim() : '';
    if (ps) {
      if (!fmtv) ps.textContent = (_psLang === 'ru') ? 'минимальный формат размещения' : P.prsub;   // свой формат размещения (данные) не трогаем — только дефолт
    }
    // ШИРИНА КНОПКИ: длина текста в каждом языке своя, и кнопка «плясала».
    // Фиксируем ширину по русскому эталону (для ru — естественная, вид не меняется),
    // а перевод вписываем ужатием шрифта. Замер русской ширины — синхронно, до отрисовки кадра.
    if (box && pv) {
      if (_psLang === 'ru') {
        box.style.width = '';
        pv.style.fontSize = (pv.textContent || '').length > 16 ? '21px' : '';
      } else {
        var trVal = pv.textContent, trValFs = pv.style.fontSize;
        var trSub = ps ? ps.textContent : null;
        pv.textContent = ruVal || trVal;
        pv.style.fontSize = (ruVal && ruVal.length > 16) ? '21px' : '';
        if (ps && !fmtv) ps.textContent = 'минимальный формат размещения';
        box.style.width = '';
        var ruW = box.offsetWidth;                       // эталонная ширина с русским текстом
        pv.textContent = trVal; pv.style.fontSize = trValFs;
        if (ps && !fmtv) ps.textContent = trSub;
        if (ruW > 0) box.style.width = ruW + 'px';
        // ужимаем перевод цены, пока не влезет (пол 13px)
        var fs = parseFloat(getComputedStyle(pv).fontSize) || 22, guard = 0;
        while (pv.scrollWidth > pv.clientWidth && fs > 13 && guard < 8) {
          guard++; fs = fs * 0.93;
          pv.style.fontSize = fs.toFixed(1) + 'px';
        }
      }
    }
  }
  /* каждая метка — максимум 2 строки: длинные языки не толкают сетку за нижний край постера */
  function _psFit() {
    var poster = el('poster'); if (!poster) return;
    poster.querySelectorAll('.mcell .l').forEach(function (l) {
      l.style.fontSize = ''; l.style.letterSpacing = '';
      var fs = parseFloat(getComputedStyle(l).fontSize) || 10;
      var max2 = fs * 1.35 * 2 + 2, guard = 0;
      while (l.scrollHeight > max2 && guard < 6) {
        guard++; fs = fs * 0.9; if (fs < 6.5) break;
        l.style.fontSize = fs.toFixed(2) + 'px'; l.style.letterSpacing = '0.2px';
      }
    });
  }
  function _psEnsurePriceHooks() {
    if (window.__fmxPsPriceHooked) return;
    var pi = el('prInp'), pf = el('prFmtInp');
    if (!pi && !pf) return;
    window.__fmxPsPriceHooked = 1;   // наши слушатели идут ПОСЛЕ макетных → отрабатывают следом и локализуют
    if (pi) pi.addEventListener('input', function () { _psLocalizePrice(); _psFit(); });
    if (pf) pf.addEventListener('input', function () { _psLocalizePrice(); _psFit(); });
  }
  function _psEnsureLangUI() {
    if (document.getElementById('fmxPsLang')) return;
    var panel = document.querySelector('.panel'); if (!panel) return;
    var anchor = panel.querySelector('.sub') || panel.querySelector('h2'); if (!anchor) return;
    var codes = [['ru', 'RU'], ['en', 'EN'], ['ar', 'AR'], ['hi', 'HI'], ['id', 'ID'], ['pt', 'PT'], ['es', 'ES'], ['fr', 'FR'], ['de', 'DE'], ['it', 'IT'], ['tr', 'TR'], ['fa', 'FA'], ['vi', 'VI'], ['bn', 'BN'], ['kk', 'KK'], ['uz', 'UZ'], ['be', 'BE'], ['az', 'AZ'], ['am', 'AM'], ['sw', 'SW']];
    var lbl = document.createElement('div'); lbl.className = 'lbl'; lbl.textContent = 'Язык постера';   // локализатор пульта переведёт сам
    var chips = document.createElement('div'); chips.className = 'chips'; chips.id = 'fmxPsLang';
    codes.forEach(function (c) {
      var b = document.createElement('button'); b.className = 'chip' + (c[0] === _psLang ? ' on' : '');
      b.setAttribute('data-pl', c[0]);
      // флаг + код (вердикт 14.07): SVG-флаги из i18n.js (window.I18N) — эмодзи-флаги
      // не рисуются на Windows; при недоступности словаря — только код
      var fl = null;
      try { fl = window.I18N && window.I18N.flagSvg && window.I18N.flagSvg[c[0]]; } catch (e) {}
      if (fl) b.innerHTML = fl + '<span>' + c[1] + '</span>';
      else b.textContent = c[1];
      chips.appendChild(b);
    });
    anchor.parentNode.insertBefore(chips, anchor.nextSibling);
    anchor.parentNode.insertBefore(lbl, chips);
    chips.addEventListener('click', function (e) {
      var b = e.target && e.target.closest ? e.target.closest('.chip') : null;
      if (b) { var pl = b.getAttribute('data-pl'); if (pl) window.__fmxPosterSetLang(pl); }
    });
  }
  function _psMarkLangChips() {
    var c = document.getElementById('fmxPsLang'); if (!c) return;
    c.querySelectorAll('.chip').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-pl') === _psLang); });
  }
  /* публичный переключатель языка постера (пульт + внешние вызовы) */
  window.__fmxPosterSetLang = function (lang) {
    if (lang && POSTER_L[lang]) _psLang = lang;
    _psApplyLabels(); _psFit(); _psMarkLangChips();
  };
  window.__fmxPosterLang = function () { return _psLang; };

  /* === свой фон: серверный url + режим кадрирования (пан/зум) === */
  var _customBg = null;               // {url, kind} — ЗАГРУЖЕННЫЙ на сервер файл своего фона
  var _bgpan = { x: 0, y: 0, s: 1 };  // сдвиг (px в системе постера 540x675) и масштаб своей картинки
  var _bgUploadPending = null;        // промис текущей загрузки файла на сервер (ждём при закрытии/отправке)
  var _bgUploadError = null;          // текст ошибки загрузки своего фона (слишком большой и т.п.)
  var _bgCrop = false;                // включён режим кадрирования фона
  function _isPhotoBg() { var p = el('poster'); return !!(p && /\bbg-photo\b/.test(p.className)); }
  /* Режим кадрирования: поверх постера — прозрачный слой-захват (#fmx-bg-catch). Он ловит
     перетаскивание/щипок/колесо в ЛЮБОМ месте постера, а блоки под ним не мешают и ничего не
     сбрасывают. Вход/выход — кнопкой «Кадрировать фон»/«Готово». Так удобно двигать перекрытый фон. */
  function _setBgCrop(on) {
    on = !!on && _isPhotoBg();
    _bgCrop = on;
    var poster = el('poster'); if (poster) poster.classList.toggle('fmx-bgsel', on);
    var c = el('fmx-bg-catch'); if (c) c.style.display = on ? 'block' : 'none';
    var h = el('fmx-bg-hint'); if (h) h.style.display = on ? 'block' : 'none';
    var btn = el('fmx-ed-bgcrop'); if (btn) { btn.innerHTML = on ? '✓ Готово' : '⤢ Кадрировать фон'; btn.classList.toggle('on', on); }
    if (on && typeof window.selectStk === 'function') { try { window.selectStk(null); } catch (e) {} }
  }
  function _updateBgCropBtn() {
    var btn = el('fmx-ed-bgcrop'); if (btn) btn.style.display = _isPhotoBg() ? 'block' : 'none';
    if (!_isPhotoBg() && _bgCrop) _setBgCrop(false);  // ушли с фото-фона — режим выключаем
  }
  function _bgEls() { var a = [], i = el('bgImg'), v = el('bgVid'); if (i) a.push(i); if (v) a.push(v); return a; }
  function _clampBgpan() {
    var s = Math.max(1, Math.min(+_bgpan.s || 1, 4)); _bgpan.s = s;
    var mx = (s - 1) * 270, my = (s - 1) * 337.5;   // не даём краям картинки вылезти за постер (нет слепых зон)
    _bgpan.x = Math.max(-mx, Math.min(+_bgpan.x || 0, mx));
    _bgpan.y = Math.max(-my, Math.min(+_bgpan.y || 0, my));
  }
  function _applyBgpan() {
    _clampBgpan();
    var photo = _isPhotoBg();
    _updateBgCropBtn();
    var t = 'translate(' + _bgpan.x + 'px,' + _bgpan.y + 'px) scale(' + _bgpan.s + ')';
    _bgEls().forEach(function (e) {
      if (photo) { e.style.transformOrigin = 'center center'; e.style.transform = t; }
      else { e.style.transform = ''; }  // пресетам возвращаем родной CSS (у блюра свой scale)
    });
  }

  function initials(title, username) {
    var s = (title || username || '?').trim();
    var p = s.split(/\s+/).filter(Boolean);
    return ((p.length >= 2 ? p[0].charAt(0) + p[1].charAt(0) : s.slice(0, 2)) || '?').toUpperCase();
  }
  function placeholderAvatar(ini) {
    var c = document.createElement('canvas'); c.width = 300; c.height = 300;
    var x = c.getContext('2d');
    var g = x.createLinearGradient(0, 0, 300, 300);
    g.addColorStop(0, '#16324a'); g.addColorStop(0.55, '#0e1e30'); g.addColorStop(1, '#0a2a22');
    x.fillStyle = g; x.fillRect(0, 0, 300, 300);
    x.fillStyle = '#e8e8ed'; x.font = '700 110px Inter, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(ini, 150, 165);
    return c.toDataURL();
  }

  /* график макета (алгоритм 1:1 с макетом; данные — реальные) */
  function drawChart(series, days) {
    var chart = el('chart');
    var data = (series || []).filter(function (v) { return typeof v === 'number' && isFinite(v); });
    if (data.length < 2) { if (chart) chart.classList.add('hide'); return false; }
    var W = 452, H = 88, min = Math.min.apply(null, data), max = Math.max.apply(null, data);
    var range = max - min, denom = (data.length - 1) || 1;
    var pts = data.map(function (v, i) { return [i * W / denom, range ? 6 + (H - 12) * (1 - (v - min) / range) : 48]; });
    var d = 'M' + pts[0][0] + ',' + pts[0][1];
    for (var i = 1; i < pts.length; i++) {
      var p0 = pts[i - 1], p1 = pts[i], cx = (p0[0] + p1[0]) / 2;
      d += ' C' + cx + ',' + p0[1] + ' ' + cx + ',' + p1[1] + ' ' + p1[0] + ',' + p1[1];
    }
    if (el('line')) el('line').setAttribute('d', d);
    if (el('area')) el('area').setAttribute('d', d + ' L' + W + ',96 L0,96 Z');
    var last = pts[pts.length - 1];
    ['dot', 'dotHalo'].forEach(function (id) { var e = el(id); if (e) { e.setAttribute('cx', last[0]); e.setAttribute('cy', last[1]); } });
    var pct = data[0] ? Math.round((data[data.length - 1] - data[0]) / data[0] * 100) : 0;
    if (el('chartPct')) el('chartPct').textContent = (pct >= 0 ? '▲ +' : '▼ ') + pct + '%';
    var ct = document.querySelector('#chart .ct span'); if (ct) ct.textContent = 'Просмотры · ' + (days || data.length) + ' дн.';
    var cxs = document.querySelectorAll('#chart .cx span');
    if (cxs.length >= 2) { cxs[0].textContent = data[0].toLocaleString('ru-RU'); cxs[1].textContent = data[data.length - 1].toLocaleString('ru-RU'); }
    if (chart) chart.classList.remove('hide');
    return true;
  }

  /* значение метрики или null (нет реальных данных — ячейку скрываем, фейк не рисуем) */
  function metricValue(key, d) {
    if (key === 'subs') return d.subscribers ? fmt(d.subscribers) : null;
    if (key === 'reach') return d.avg_views ? '~' + fmt(d.avg_views) : null;
    if (key === 'er') return (d.er != null && isFinite(d.er)) ? (Math.round(d.er * 10) / 10) + '%' : null;
    if (key === 'cpm') return (d.min_price && d.avg_views) ? fmt(d.min_price * 1000 / d.avg_views) + ' ₽' : null;
    if (key === 'err') { var rr = (d.reach_rate != null) ? d.reach_rate : (d.er != null ? d.er : null); if (rr == null || !isFinite(rr)) return null; return (rr > 100 ? '⚠ ' : '') + Math.round(rr) + '%'; }  /* RR из ядра; >100% = аномалия (охват>подписчиков), не обычный процент */
    if (key === 'grow') return (d.grow != null && isFinite(d.grow)) ? (d.grow >= 0 ? '+' : '') + fmt(d.grow) : null;
    if (key === 'freq') return (d.freq != null && isFinite(d.freq)) ? (Math.round(d.freq * 10) / 10) + '/нед' : null;
    if (key === 'mv') return (d.mv != null && isFinite(d.mv)) ? (d.mv >= 1000 ? fmt(d.mv / 1000) + ' К' : fmt(d.mv)) : null;
    return null;
  }
  var METRIC_KEYS = ['subs', 'reach', 'er', 'cpm', 'err', 'grow', 'freq', 'mv'];
  var _uname = '';
  /* renderQrs макета зашивает подпись «@bh_nlmt» жёстко — переименовываем QR канала после отрисовки */
  function relabelQr(mode) {
    var spans = document.querySelectorAll('#qrs .qrt span');
    var chIdx = (mode === 'both' || mode === 'channel') ? 0 : -1;
    var cardIdx = (mode === 'both') ? 1 : (mode === 'card' ? 0 : -1);
    if (_uname && chIdx >= 0 && spans[chIdx]) spans[chIdx].textContent = '@' + _uname;
    // @-ник, а не «Карточка»: вне Telegram сразу понятно, что это Telegram, ник вбивается руками,
    // и постер попутно рекламирует площадку. Смысл действия даёт «Забронировать ↓» над QR
    if (cardIdx >= 0 && spans[cardIdx]) spans[cardIdx].textContent = '@ForgeMetricsBot';
  }
  function renderQrsSafe(mode) { if (typeof window.renderQrs === 'function') { window.renderQrs(mode); relabelQr(mode); } }

  window.__fmxPosterInit = function (data, api) {
    if (api != null) API = api;
    data = data || {};
    _psAsof = data.asof || null;
    /* нижний блок (цена+CTA+QR) приподнят, под ним — строка-пруф; transform не трогает
       relayout-плотности макета, в плотных состояниях подъём меньше, чтобы не наехать на метрики */
    if (!el('fmx-mkt2')) {
      var ms = document.createElement('style'); ms.id = 'fmx-mkt2';
      ms.textContent = '#poster .price{transform:translateY(-8px);}' +
        '#poster.d2 .price,#poster.d3 .price,#poster.d4 .price{transform:translateY(-5px);}' +
        '#qrChips .chip[data-qr="channel"],#qrChips .chip[data-qr="both"]{display:none;}' +
        '.stk .modes .mdot[data-mode="m-top"]{display:none;}' +
        /* усиленные фоны (вердикт 14.07): «Космос» и «Ультрафиолет» перекрываем поверх эталона */
        '#poster.bg-space .bgWrap{background:radial-gradient(3.2px 3.2px at 432px 88px, rgba(255,255,255,1) 18%, rgba(186,196,255,0.45) 48%, transparent 72%),radial-gradient(2.6px 2.6px at 96px 236px, rgba(255,255,255,0.93) 18%, rgba(186,196,255,0.45) 48%, transparent 72%),radial-gradient(2.2px 2.2px at 268px 484px, rgba(255,255,255,0.96) 18%, rgba(186,196,255,0.45) 48%, transparent 72%),radial-gradient(1.4px 1.4px at 10px 20px, rgba(255,255,255,0.96), transparent),radial-gradient(1.1px 1.1px at 60px 150px, rgba(255,255,255,0.68), transparent),radial-gradient(1.7px 1.7px at 120px 40px, rgba(255,255,255,0.96), transparent),radial-gradient(1.1px 1.1px at 170px 110px, rgba(255,255,255,0.72), transparent),radial-gradient(1.3px 1.3px at 200px 180px, rgba(255,255,255,0.93), transparent),radial-gradient(1.0px 1.0px at 90px 90px, rgba(255,255,255,0.78), transparent),radial-gradient(1.2px 1.2px at 150px 15px, rgba(255,255,255,0.78), transparent),radial-gradient(1.2px 1.2px at 30px 220px, rgba(255,255,255,0.78), transparent),radial-gradient(1.5px 1.5px at 100px 60px, rgba(255,255,255,0.93), transparent),radial-gradient(1.1px 1.1px at 180px 190px, rgba(255,255,255,0.68), transparent),radial-gradient(1.8px 1.8px at 250px 90px, rgba(255,255,255,0.96), transparent),radial-gradient(1.2px 1.2px at 290px 240px, rgba(255,255,255,0.72), transparent),radial-gradient(1.0px 1.0px at 210px 30px, rgba(255,255,255,0.68), transparent),radial-gradient(1.6px 1.6px at 50px 300px, rgba(255,255,255,0.88), transparent),radial-gradient(1.1px 1.1px at 140px 120px, rgba(255,255,255,0.68), transparent),radial-gradient(1.3px 1.3px at 260px 330px, rgba(255,255,255,0.96), transparent),radial-gradient(2.0px 2.0px at 350px 60px, rgba(255,255,255,1), transparent),radial-gradient(1.2px 1.2px at 410px 180px, rgba(255,255,255,0.68), transparent),radial-gradient(1.4px 1.4px at 320px 260px, rgba(255,255,255,0.78), transparent),radial-gradient(1.1px 1.1px at 80px 30px, rgba(255,255,255,0.78), transparent),radial-gradient(70% 45% at 78% 18%, rgba(124,58,237,0.42), transparent 65%),radial-gradient(55% 40% at 15% 45%, rgba(56,189,248,0.20), transparent 65%),radial-gradient(65% 45% at 60% 85%, rgba(217,70,239,0.22), transparent 65%),linear-gradient(115deg, transparent 28%, rgba(148,163,255,0.12) 42%, rgba(226,232,255,0.16) 50%, rgba(148,163,255,0.12) 58%, transparent 72%),radial-gradient(130% 100% at 50% 120%, #16204a 0%, #070b1a 55%, #030512 100%);background-size:100% 100%,100% 100%,100% 100%,233px 197px,233px 197px,233px 197px,233px 197px,233px 197px,233px 197px,233px 197px,317px 263px,317px 263px,317px 263px,317px 263px,317px 263px,317px 263px,439px 353px,439px 353px,439px 353px,439px 353px,439px 353px,439px 353px,439px 353px,100% 100%,100% 100%,100% 100%,100% 100%,100% 100%;background-repeat:no-repeat,no-repeat,no-repeat,repeat,repeat,repeat,repeat,repeat,repeat,repeat,repeat,repeat,repeat,repeat,repeat,repeat,repeat,repeat,repeat,repeat,repeat,repeat,repeat,no-repeat,no-repeat,no-repeat,no-repeat,no-repeat;}' +
        '#poster.bg-g2 .bgWrap{background:radial-gradient(90% 70% at 85% -5%, rgba(168,85,247,0.60), rgba(109,40,217,0.22) 45%, transparent 66%),radial-gradient(100% 80% at -5% 110%, rgba(217,70,239,0.38), transparent 60%),radial-gradient(60% 40% at 50% 115%, rgba(139,92,246,0.28), transparent 62%),radial-gradient(45% 30% at 20% 8%, rgba(88,28,235,0.30), transparent 65%),linear-gradient(170deg, #170433 0%, #0d0224 48%, #060112 100%);}' +
        /* акцент на цену (вердикт 14.07): кнопка шире/выше, цифры крупнее; без !important,
           чтобы инлайн-ужатие длинных цен и переводов продолжало побеждать */
        '#poster .pr{padding:15px 24px;}' +
        '#poster .prv{font-size:24px;}';
      document.head.appendChild(ms);
    }
    // QR: подпись не должна быть шире самого QR (иначе белый блок растягивается — было видно на @ForgeMetricsBot)
    if (!el('fmx-qr-fix')) {
      var qs = document.createElement('style'); qs.id = 'fmx-qr-fix';
      // блоки QR одинаковой ширины (по QR ~80px), подпись мельче — чтобы «@ForgeMetricsBot» влезал целиком и блок не растягивался
      qs.textContent = '#qrs .qrt{width:92px !important;box-sizing:border-box !important;}' +
        '#qrs .qrt span{max-width:86px !important;font-size:7px !important;letter-spacing:0.1px !important;}';
      document.head.appendChild(qs);
    }
    // палитра эмодзи макета создаёт стикеры в режиме «Поверх» (код макета заморожен) —
    // перехватываем появление и переводим в «Слияние», чтобы метрики и QR не перекрывались
    if (!window.__fmxStkNorm && el('poster') && typeof MutationObserver !== 'undefined') {
      window.__fmxStkNorm = new MutationObserver(function (muts) {
        muts.forEach(function (mu) {
          Array.prototype.forEach.call(mu.addedNodes || [], function (nd) {
            if (!nd || nd.nodeType !== 1 || !nd.classList || !nd.classList.contains('stk')) return;
            if (nd.classList.contains('m-top')) {
              nd.classList.remove('m-top'); nd.classList.add('m-blend'); nd.dataset.mode = 'm-blend';
              var dots = nd.querySelectorAll('.mdot');
              Array.prototype.forEach.call(dots, function (d) { d.classList.toggle('on', d.getAttribute('data-mode') === 'm-blend'); });
            }
          });
        });
      });
      window.__fmxStkNorm.observe(el('poster'), { childList: true });
    }
    // строка QR-режимов убрана из пульта (вердикт 14.07): выбора больше нет, QR всегда наш
    var qrRow = el('qrChips');
    if (qrRow) {
      qrRow.style.display = 'none';
      var qrLbl = qrRow.previousElementSibling;
      if (qrLbl && qrLbl.classList && qrLbl.classList.contains('lbl')) qrLbl.style.display = 'none';
    }
    var titleTxt = data.title || data.username || 'Канал';
    if (el('titEl')) el('titEl').textContent = titleTxt;
    // username — текстовый узел перед nicheSep внутри .meta (макет не трогаем)
    var meta = document.querySelector('.meta');
    if (meta && meta.firstChild) meta.firstChild.nodeValue = data.username ? '@' + String(data.username).replace(/^@/, '') : '';
    // ниша: кнопка всегда кликабельна (как в макете); нет ниши — пустой разделитель (без висячей точки)
    var hasNiche = !!(data.niche && String(data.niche).trim());
    _psNiche = hasNiche ? { raw: data.niche, tr: data.niche_tr || null } : null;   // для перевода при смене языка
    if (el('nicheEl')) { el('nicheEl').textContent = data.niche || ''; el('nicheEl').classList.remove('hide'); }
    _psApplyNiche();
    if (el('nicheSep')) { el('nicheSep').textContent = hasNiche ? ' · ' : ''; el('nicheSep').classList.remove('hide'); }
    var nchip = el('nicheChip'); if (nchip) { nchip.classList.add('on'); nchip.style.opacity = ''; nchip.style.pointerEvents = ''; nchip.title = ''; }
    // аватар — РЕАЛЬНЫЙ канала; нет — плейсхолдер с инициалами
    var avImg = el('avImg');
    if (avImg) {
      var src = data.avatar_url ? abs(data.avatar_url) : placeholderAvatar(initials(data.title, data.username));
      if (avImg.getAttribute('data-src') !== src) { avImg.setAttribute('data-src', src); avImg.src = src; }
    }
    // метрики: реальные значения; без данных — прячем ячейку и чип (фейк не рисуем)
    METRIC_KEYS.forEach(function (key) {
      var cell = document.querySelector('.mcell[data-m="' + key + '"]');
      var chip = document.querySelector('#mChips .chip[data-m="' + key + '"]');
      var val = metricValue(key, data);
      // все 8 метрик эталона: чипы всегда кликабельны; нет данных — значение «—»
      // (загорится реальным числом само, когда наполнится База каналов)
      if (cell) { var v = cell.querySelector('.v'); if (v) v.textContent = (val != null ? val : '—'); }
      if (chip) { chip.style.display = ''; chip.style.opacity = ''; chip.style.pointerEvents = ''; chip.title = ''; }
    });
    // цена
    if (el('prInp')) { el('prInp').value = data.min_price || 0; try { el('prInp').dispatchEvent(new Event('input')); } catch (e) {} }
    // QR-ссылки (глобальные var макета) + перерисовка текущего режима
    _uname = (data.username || '').replace(/^@/, '');
    if (_uname) window.QR_CHANNEL_URL = 'https://t.me/' + _uname;
    if (data.id) window.QR_CARD_URL = 'https://t.me/ForgeMetricsBot?startapp=card_' + data.id + (data.ref_code ? '_r_' + data.ref_code : '');
    var qrOn = document.querySelector('#qrChips .chip.on');
    var qmode = _psQr(qrOn ? qrOn.getAttribute('data-qr') : 'card');
    document.querySelectorAll('#qrChips .chip').forEach(function (c) { c.classList.toggle('on', c.getAttribute('data-qr') === qmode); });
    renderQrsSafe(qmode);
    // держим подпись QR канала верной и когда пользователь сам переключает режим в панели
    var qc = el('qrChips');
    if (qc && !qc.__fmxRelabel) { qc.__fmxRelabel = 1; qc.addEventListener('click', function (e) { var b = e.target.closest ? e.target.closest('.chip') : null; if (b) setTimeout(function () { relabelQr(b.getAttribute('data-qr')); }, 0); }); }
    // график
    if (data.chart && data.chart.series) drawChart(data.chart.series, data.chart.days);
    else if (el('chart')) el('chart').classList.add('hide');
    if (typeof window.relayout === 'function') window.relayout();
    // локализация постера: переключатель в пульте, перевод меток/цены, авто-подгонка
    _psEnsurePriceHooks(); _psEnsureLangUI(); _psApplyLabels(); _psFit();
  };

  /* ——— применить цвет к элементу (1:1 с applyColor макета) ——— */
  function applyColorTo(kind, hex) {
    var C = window.COLORS || {};
    function darken(h, k) { var c = window.hex2rgb(h); return window.rgb2hex(Math.round(c[0] * (1 - k)), Math.round(c[1] * (1 - k)), Math.round(c[2] * (1 - k))); }
    function lighten(h, k) { var c = window.hex2rgb(h); return window.rgb2hex(Math.round(c[0] + (255 - c[0]) * k), Math.round(c[1] + (255 - c[1]) * k), Math.round(c[2] + (255 - c[2]) * k)); }
    if (kind === 'tit') { if (el('titEl')) el('titEl').style.color = hex; C.tit = hex; }
    else if (kind === 'niche') { if (el('nicheEl')) el('nicheEl').style.color = hex; C.niche = hex; }
    else if (kind === 'pr') { var pb = el('prBox'); if (pb) { pb.style.background = 'linear-gradient(135deg,' + hex + ',' + darken(hex, 0.22) + ')'; pb.style.boxShadow = '0 12px 30px ' + hex + '59'; } C.pr = hex; }
    else if (kind === 'chart') {
      if (el('gl1')) el('gl1').setAttribute('stop-color', darken(hex, 0.15));
      if (el('gl2')) el('gl2').setAttribute('stop-color', lighten(hex, 0.25));
      if (el('ga1')) el('ga1').setAttribute('stop-color', hex);
      if (el('dot')) el('dot').setAttribute('fill', lighten(hex, 0.25));
      if (el('dotHalo')) el('dotHalo').setAttribute('fill', lighten(hex, 0.25));
      if (el('chartPct')) el('chartPct').style.color = hex;
      C.chart = hex;
    } else if (kind.indexOf('cell:') === 0) {
      var m = kind.slice(5), cell = document.querySelector('.mcell[data-m="' + m + '"]');
      if (cell) { cell.dataset.hex = hex; var v = cell.querySelector('.v'); if (v) v.style.color = hex; }
    }
  }

  function bgName() { var m = (document.getElementById('poster').className || '').match(/bg-(\S+)/); return m ? m[1] : 'blur'; }

  /* ——— стикеры из коллекции бота (url) + эмодзи ——— */
  var _lot = null;
  var _anims = [];  // реестр движущихся элементов для покадрового видео-рендера: {kind:'video',el} | {kind:'lottie',anim}
  function _loadScript(u) { return new Promise(function (r, j) { var sc = document.createElement('script'); sc.src = u; sc.onload = r; sc.onerror = j; document.head.appendChild(sc); }); }
  function _loadLottie() {
    if (_lot) return _lot;
    _lot = Promise.all([
      (typeof pako !== 'undefined') ? Promise.resolve() : _loadScript('https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js'),
      (typeof lottie !== 'undefined') ? Promise.resolve() : _loadScript('https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js')
    ]);
    return _lot;
  }
  function _stickerMedia(glyph, it, opts) {
    opts = opts || {};
    var url = abs(it.url), kind = it.kind || 'webp';
    if (kind === 'webm') {
      var v = document.createElement('video'); v.muted = true; v.loop = true; v.autoplay = true; v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
      v.style.cssText = 'width:100%;height:100%;object-fit:contain;pointer-events:none;'; v.src = url;
      v.addEventListener('loadeddata', function () { if (opts.static) { try { v.pause(); v.currentTime = 0.1; } catch (e) {} } });
      if (v.play) v.play().catch(function () {}); glyph.appendChild(v);
      _anims.push({ kind: 'video', el: v });  // для покадрового видео-рендера
    } else if (kind === 'tgs') {
      _loadLottie().then(function () {
        return fetch(url).then(function (r) { return r.arrayBuffer(); }).then(function (buf) {
          var json = JSON.parse(pako.inflate(new Uint8Array(buf), { to: 'string' }));
          var anim = lottie.loadAnimation({ container: glyph, renderer: 'svg', loop: !opts.static, autoplay: !opts.static, animationData: json });
          if (opts.static) anim.goToAndStop(0, true);
          _anims.push({ kind: 'lottie', anim: anim });  // для покадрового видео-рендера
        });
      }).catch(function () {});
    } else {
      var img = document.createElement('img'); img.style.cssText = 'width:100%;height:100%;object-fit:contain;pointer-events:none;'; img.src = url; glyph.appendChild(img);
    }
  }
  function _spawnSticker(it, opts) {
    var poster = el('poster');
    // «Поверх» (m-top) удалён (вердикт владельца 13.07): стикер не должен закрывать метрики и QR;
    // легаси-сохранения и любые старые значения приводим к «Слиянию»
    var mode = (!it.mode || it.mode === 'm-top') ? 'm-blend' : it.mode;
    var MODES = (window.MODES || [['m-top', 'Поверх'], ['m-blend', 'Слияние'], ['m-bg', 'Задний фон']])
      .filter(function (mm) { return mm[0] !== 'm-top'; });
    var s = document.createElement('div');
    s.className = 'stk ' + mode;
    s.dataset.rot = it.rot || 0; s.dataset.size = it.size || 52; s.dataset.mode = mode;
    if (it.url) { s.dataset.url = it.url; s.dataset.kind = it.kind || 'webp'; }
    s.innerHTML = '<span class="glyph"' + (it.url ? ' style="width:100%;height:100%;display:block;"' : '') + '></span>' +
      '<div class="frame"><div class="hnd h-rot">⟳</div><div class="hnd h-res">⤡</div><div class="hnd h-del">✕</div>' +
      '<div class="modes">' + MODES.map(function (m) { return '<div class="mdot' + (m[0] === mode ? ' on' : '') + '" data-mode="' + m[0] + '" title="' + m[1] + '"></div>'; }).join('') + '</div></div>';
    var glyph = s.querySelector('.glyph');
    if (it.url) _stickerMedia(glyph, it, opts); else glyph.textContent = it.glyph || '';
    // позиция: новый формат left/top(px) ИЛИ старый x/y(центр 0..1) — иначе стикеры падали в угол
    var px = parseInt(s.dataset.size, 10) || 52;
    var left = (it.left != null) ? it.left : (it.x != null ? it.x * 540 - px / 2 : 200);
    var top = (it.top != null) ? it.top : (it.y != null ? it.y * 675 - px / 2 : 260);
    s.style.left = left + 'px'; s.style.top = top + 'px';
    s.style.transform = 'rotate(' + (it.rot || 0) + 'deg)';
    poster.appendChild(s);
    if (typeof window.applySize === 'function') window.applySize(s);
    if (typeof window.bindStk === 'function') window.bindStk(s);
    return s;
  }

  /* режим редактора в приложении: адаптив под телефон, переименование, стикер-пак из бота */
  window.__fmxPosterEditorMode = function (opts) {
    opts = opts || {};
    if (!el('fmx-ed-style')) {
      var st = document.createElement('style'); st.id = 'fmx-ed-style';
      // панель во всю ширину под постером + крупнее контролы (после масштабирования iframe остаются читаемыми)
      // постер вплотную к верху окна, редактор почти вплотную к постеру;
      // min-height:0 + align-content:flex-start убирают распирание flex-строк (иначе огромные
      // пустоты между блоками из-за 100vh); размеры контролов задаёт __fmxPosterPanelScale
      st.textContent = '*{-webkit-tap-highlight-color:transparent !important;}button:focus,.chip:focus{outline:none !important;}' +
        'body{padding:6px 8px 26px !important;gap:10px !important;min-height:0 !important;' +
        'align-items:center !important;align-content:flex-start !important;justify-content:flex-start !important;}' +
        '.poster{box-shadow:0 12px 40px rgba(0,0,0,0.5) !important;}' +
        '.panel{width:540px !important;max-width:540px;margin-top:0 !important;}' +
        /* подсветка выделенного фона: рамка + затемнение подсказки, чтобы было понятно, что фон двигается */
        '.poster.fmx-bgsel::after{content:"";position:absolute;inset:0;border-radius:28px;pointer-events:none;z-index:8;' +
        'box-shadow:inset 0 0 0 2px rgba(93,202,165,0.95), 0 0 0 3px rgba(93,202,165,0.3);}' +
        '#fmx-bg-hint{position:absolute;top:12px;left:50%;transform:translateX(-50%);background:rgba(10,13,24,0.92);' +
        'border:1px solid rgba(93,202,165,0.5);color:#5DCAA5;font-size:11px;font-weight:600;padding:6px 13px;border-radius:999px;' +
        'z-index:9;pointer-events:none;white-space:nowrap;max-width:90%;overflow:hidden;text-overflow:ellipsis;box-shadow:0 6px 20px rgba(0,0,0,0.5);}';
      document.head.appendChild(st);
    }
    var h2 = document.querySelector('.panel h2'); if (h2) h2.textContent = 'Редактор макета';
    // зачем баннер и QR: пояснение в шапке пульта (вердикт 14.07); переводится словарём приложения
    if (h2 && !el('fmx-ed-why')) {
      var why = document.createElement('div'); why.id = 'fmx-ed-why';
      why.textContent = 'Баннер — готовый рекламный креатив твоего канала. Рассылай и размещай его там, где есть рекламодатели: админ-чаты и биржи размещений, форумы, каталоги каналов, сторис соцсетей, личные предложения. QR ведёт на живую карточку канала — рекламодатель сканирует, проверяет метрики и бронирует размещение без лишней переписки. В QR вшита твоя реферальная ссылка: все, кто пришёл с баннера, закрепляются за тобой.';
      why.style.cssText = 'margin:8px 0 14px;padding:11px 13px;border-radius:12px;' +
        'background:linear-gradient(135deg,rgba(93,202,165,0.15),rgba(93,202,165,0.05));' +
        'border:1px solid rgba(93,202,165,0.35);font-size:11.5px;line-height:1.5;color:#c6cdde;';
      h2.parentNode.insertBefore(why, h2.nextSibling);
    }
    // кнопка «Сбросить настройки» прямо под постером
    if (opts.defaultState && !el('fmx-ed-reset')) {
      var poster = el('poster');
      var rb = document.createElement('button');
      rb.id = 'fmx-ed-reset'; rb.type = 'button';
      rb.innerHTML = '↺ Сбросить настройки';
      rb.style.cssText = 'display:block;width:540px;max-width:540px;margin:0 auto;padding:12px;border-radius:12px;background:#141828;border:1px solid rgba(255,255,255,0.14);color:#c9cede;font-weight:600;cursor:pointer;font-family:inherit;';
      rb.addEventListener('click', function () { window.__fmxPosterReset(opts.defaultState); });
      if (poster && poster.parentNode) poster.parentNode.insertBefore(rb, poster.nextSibling);
    }
    // стикер-пак пользователя (до 30 из бота) — добавляем чипы в блок стикеров макета
    if (opts.stickers && opts.stickers.length && !el('fmx-ed-pack')) {
      var box = el('eChips');
      if (box) {
        var pack = document.createElement('div'); pack.id = 'fmx-ed-pack'; pack.className = 'chips';
        pack.style.cssText = 'margin-top:8px;';
        opts.stickers.slice(0, 30).forEach(function (s2) {
          var b = document.createElement('button'); b.className = 'chip'; b.style.cssText = 'width:52px;height:52px;padding:4px;';
          var mediaGlyph = document.createElement('span'); mediaGlyph.style.cssText = 'width:100%;height:100%;display:block;';
          _stickerMedia(mediaGlyph, s2, {}); b.appendChild(mediaGlyph);
          b.addEventListener('click', function () {
            // разные позиции как у эмодзи в макете — чтобы стикеры не стакались в углу
            var it = { url: s2.url, kind: s2.kind, mode: 'm-blend', size: 96, rot: 0,
              left: 120 + Math.floor(Math.random() * 240), top: 150 + Math.floor(Math.random() * 200) };
            var stk = _spawnSticker(it, {});
            if (typeof window.selectStk === 'function') window.selectStk(stk);
          });
          pack.appendChild(b);
        });
        box.parentNode.insertBefore(pack, box.nextSibling);
      }
    }
    // свой фон: загрузка на сервер + пан/зум жестами
    _setupCustomBg();
    /* редизайн пульта (14.07): секции-карточки. Узлы ПЕРЕНОСИМ (append) — слушатели и id
       сохраняются; палитра (.picker) живёт вне панели и не задевается */
    var panelEl = document.querySelector('.panel');
    if (panelEl && !panelEl.querySelector('.fmx-sec')) {
      var kids = Array.prototype.slice.call(panelEl.children);
      var sec = null;
      kids.forEach(function (node) {
        if (node.classList && node.classList.contains('lbl')) {
          sec = document.createElement('div'); sec.className = 'fmx-sec';
          panelEl.insertBefore(sec, node);
          sec.appendChild(node);
        } else if (sec) {
          sec.appendChild(node);
        }
      });
      // карточка целиком из скрытых узлов (например, убранные QR-режимы) — пустую плашку не рисуем
      panelEl.querySelectorAll('.fmx-sec').forEach(function (sc) {
        var vis = Array.prototype.some.call(sc.children, function (ch) { return ch.style.display !== 'none' && getComputedStyle(ch).display !== 'none'; });
        if (!vis) sc.style.display = 'none';
      });
      // иконки секций (макет 14.07): по идентификатору содержимого — не зависят от текста метки
      [['fmxPsLang', '🌐'], ['ordBox', '≡'], ['nicheChip', '◉'], ['bgChips', '◐'], ['chartChip', '▲'],
       ['mChips', '▦'], ['prInp', 'card'], ['eChips', '✦'], ['hookInp', '✎']].forEach(function (mp) {
        var t = document.getElementById(mp[0]); if (!t) return;
        var sc = t.closest ? t.closest('.fmx-sec') : null; if (!sc) return;
        var lb = sc.querySelector('.lbl'); if (lb && !lb.getAttribute('data-ico')) lb.setAttribute('data-ico', mp[1]);
      });
    }
  };

  window.__fmxPosterState = function () {
    var poster = el('poster');
    var st = {};
    var _bn = bgName();
    if (_bn === 'photo') {
      // свой фон: сохраняем ОБЪЕКТ с серверным url (иначе бэкенд не поймёт "photo" и откатит на blur)
      st.bg = (_customBg && _customBg.url) ? { url: _customBg.url, kind: _customBg.kind || 'img' } : 'blur';
      if (typeof st.bg === 'object') st.bgpan = { x: Math.round(_bgpan.x), y: Math.round(_bgpan.y), s: +(+_bgpan.s).toFixed(3) };
    } else {
      st.bg = _bn;
    }
    st.niche = !(el('nicheEl') && el('nicheEl').classList.contains('hide'));
    st.chart = !(el('chart') && el('chart').classList.contains('hide'));
    st.price = {
      on: !(el('prBox') && el('prBox').classList.contains('hide')),
      val: el('prInp') ? parseInt(el('prInp').value, 10) || 0 : 0,
      fmt: el('prFmtInp') ? String(el('prFmtInp').value || '').trim().slice(0, 40) : ''  // формат размещения (необязательно)
    };
    var qrOn = document.querySelector('#qrChips .chip.on'); st.qr = _psQr(qrOn ? qrOn.getAttribute('data-qr') : 'card');
    st.hook = el('hookInp') ? el('hookInp').value : '';
    // метрики: видимые (не hide и есть данные)
    st.metrics = {};
    METRIC_KEYS.forEach(function (k) { var c = document.querySelector('.mcell[data-m="' + k + '"]'); if (c && !c.getAttribute('data-noval')) st.metrics[k] = !c.classList.contains('hide'); });
    // порядок блоков (ORD макета)
    st.order = (window.ORD || []).map(function (o) { return o.key; });
    // цвета
    var C = window.COLORS || {};
    st.colors = { tit: C.tit, niche: C.niche, pr: C.pr, chart: C.chart, cells: {} };
    METRIC_KEYS.forEach(function (k) { var c = document.querySelector('.mcell[data-m="' + k + '"]'); if (c && c.dataset.hex) st.colors.cells[k] = c.dataset.hex; });
    // стикеры (эмодзи или из коллекции бота — url)
    st.stickers = [];
    poster.querySelectorAll('.stk').forEach(function (s) {
      var it = {
        mode: (!s.dataset.mode || s.dataset.mode === 'm-top') ? 'm-blend' : s.dataset.mode,
        size: parseInt(s.dataset.size, 10) || 52,
        rot: parseInt(s.dataset.rot, 10) || 0,
        left: parseFloat(s.style.left) || 0,
        top: parseFloat(s.style.top) || 0
      };
      if (s.dataset.url) { it.url = s.dataset.url; it.kind = s.dataset.kind || 'webp'; }
      else { var glyph = s.querySelector('.glyph'); it.glyph = glyph ? glyph.textContent : ''; }
      st.stickers.push(it);
    });
    st.lang = _psLang;   // язык постера — попадает в кеш серверного PNG (payload = data+state)
    return st;
  };

  function chipToggle(container, dataAttr, val, on) {
    var b = document.querySelector(container + ' [' + dataAttr + '="' + val + '"]');
    if (b) b.classList.toggle('on', !!on);
    return b;
  }

  window.__fmxPosterApply = function (state) {
    if (!state) return;
    if (state.lang && POSTER_L[state.lang]) _psLang = state.lang;   // восстанавливаем язык постера
    var poster = el('poster');
    _anims = [];  // пересобираем реестр движущихся элементов (видео-фон + анимо-стикеры) для видео-рендера
    // фон
    if (state.bg) {
      var name = (typeof state.bg === 'object') ? 'photo' : state.bg;
      poster.className = poster.className.replace(/\bbg-\S+/g, '').replace(/\s+/g, ' ').trim() + ' bg-' + name;
      document.querySelectorAll('#bgChips .chip').forEach(function (c) { c.classList.toggle('on', c.getAttribute('data-bg') === state.bg); });
      if (typeof state.bg === 'object' && state.bg.url) {
        _customBg = { url: state.bg.url, kind: state.bg.kind || 'img' };
        _bgpan = (state.bgpan && typeof state.bgpan === 'object')
          ? { x: +state.bgpan.x || 0, y: +state.bgpan.y || 0, s: +state.bgpan.s || 1 }
          : { x: 0, y: 0, s: 1 };
        var img = el('bgImg'), vid = el('bgVid');
        if (state.bg.kind === 'video') { if (vid) { vid.src = abs(state.bg.url); vid.classList.add('act'); if (img) img.classList.remove('act'); if (vid.play) vid.play().catch(function () {}); _anims.push({ kind: 'video', el: vid }); } }
        else { if (img) { img.src = abs(state.bg.url); img.classList.add('act'); } if (vid) vid.classList.remove('act'); }
      }
    }
    _applyBgpan();
    // ниша: показываем по состоянию (разделитель пуст, когда ниши нет — висячей точки не будет)
    var showN = state.niche !== false;
    if (el('nicheEl')) el('nicheEl').classList.toggle('hide', !showN);
    if (el('nicheSep')) el('nicheSep').classList.toggle('hide', !showN);
    var nch = el('nicheChip'); if (nch) nch.classList.toggle('on', showN);
    // график
    if (el('chart') && state.chart != null) el('chart').classList.toggle('hide', !state.chart);
    var cch = el('chartChip'); if (cch) cch.classList.toggle('on', state.chart !== false);
    // метрики
    if (state.metrics) METRIC_KEYS.forEach(function (k) {
      if (!(k in state.metrics)) return;
      var cell = document.querySelector('.mcell[data-m="' + k + '"]');
      if (cell) cell.classList.toggle('hide', !state.metrics[k]);
      var chip = document.querySelector('#mChips .chip[data-m="' + k + '"]'); if (chip) chip.classList.toggle('on', !!state.metrics[k]);
    });
    // цена
    if (state.price) {
      if (el('prBox')) el('prBox').classList.toggle('hide', !state.price.on);
      var pch = el('prChip'); if (pch) pch.classList.toggle('on', !!state.price.on);
      if (el('prInp') && state.price.val != null) { el('prInp').value = state.price.val; try { el('prInp').dispatchEvent(new Event('input')); } catch (e) {} }
      // формат размещения — после цены: prInp может скрыть подпись, prFmtInp задаёт её текст
      if (el('prFmtInp')) { el('prFmtInp').value = state.price.fmt || ''; try { el('prFmtInp').dispatchEvent(new Event('input')); } catch (e) {} }
    }
    // QR
    if (state.qr) { var q2 = _psQr(state.qr); document.querySelectorAll('#qrChips .chip').forEach(function (c) { c.classList.toggle('on', c.getAttribute('data-qr') === q2); }); renderQrsSafe(q2); }
    // текст
    if (state.hook != null) { if (el('hookInp')) el('hookInp').value = state.hook; if (el('hookText')) el('hookText').textContent = state.hook.trim() ? state.hook : (window.DEFAULT_HOOK || el('hookText').textContent); }
    // порядок блоков
    if (state.order && window.ORD) {
      window.ORD.sort(function (a, b) { return state.order.indexOf(a.key) - state.order.indexOf(b.key); });
      if (typeof window.renderOrd === 'function') window.renderOrd();
    }
    // цвета
    if (state.colors) {
      ['tit', 'niche', 'pr', 'chart'].forEach(function (k) { if (state.colors[k]) applyColorTo(k, state.colors[k]); });
      if (state.colors.cells) Object.keys(state.colors.cells).forEach(function (k) { applyColorTo('cell:' + k, state.colors.cells[k]); });
    }
    // стикеры — воссоздаём как это делает eChips макета, с bindStk/applySize/setMode (глобальные)
    poster.querySelectorAll('.stk').forEach(function (s) { s.remove(); });
    (state.stickers || []).forEach(function (it) { if (it && typeof it === 'object') { try { _spawnSticker(it); } catch (e) {} } });
    if (typeof window.relayout === 'function') window.relayout();
    _psEnsureLangUI(); _psApplyLabels(); _psFit(); _psMarkLangChips();   // язык постера после применения состояния
  };

  /* сброс всех настроек постера к дефолту (кнопка под постером) */
  window.__fmxPosterReset = function (defaultState) {
    // кастомные цвета палитры — к дефолтам макета
    if (el('titEl')) el('titEl').style.color = '';
    if (el('nicheEl')) el('nicheEl').style.color = '';
    document.querySelectorAll('.mcell .v').forEach(function (v) { v.style.color = ''; });
    var pb = el('prBox'); if (pb) { pb.style.background = ''; pb.style.boxShadow = ''; }
    if (el('gl1')) el('gl1').setAttribute('stop-color', '#3fae88');
    if (el('gl2')) el('gl2').setAttribute('stop-color', '#7be3c0');
    if (el('ga1')) el('ga1').setAttribute('stop-color', '#5DCAA5');
    if (el('dot')) el('dot').setAttribute('fill', '#7be3c0');
    if (el('dotHalo')) el('dotHalo').setAttribute('fill', '#7be3c0');
    if (el('chartPct')) el('chartPct').style.color = '';
    document.querySelectorAll('.mcell').forEach(function (c) { delete c.dataset.hex; });
    window.COLORS = { tit: '#e8e8ed', niche: '#5DCAA5', pr: '#5DCAA5', chart: '#5DCAA5' };
    _customBg = null; _bgpan = { x: 0, y: 0, s: 1 };  // свой фон и пан/зум — к дефолту
    _setBgCrop(false);
    window.__fmxPosterApply(defaultState || {});
  };

  /* загрузка своего фона на сервер (иначе картинка живёт лишь в браузере и в чат уходит blur).
     Загрузчик даёт приложение через window.__fmxPosterUploader(file) -> Promise<{url, kind}>. */
  function _uploadCustomBg(f) {
    if (!f || typeof window.__fmxPosterUploader !== 'function') return null;
    var drop = el('drop'), orig = drop ? drop.innerHTML : '';
    if (drop) drop.textContent = 'Загружаю фон на сервер…';
    _bgUploadError = null;                              // новый выбор — прошлую ошибку сбрасываем
    var p = Promise.resolve(window.__fmxPosterUploader(f)).then(function (res) {
      if (res && res.url) { _customBg = { url: res.url, kind: res.kind || 'img' }; _bgUploadError = null; }
      else { _customBg = null; _bgUploadError = 'Не удалось загрузить фон'; }
      if (drop) drop.textContent = (res && res.url) ? 'Фон загружен ✓ — нажмите, чтобы заменить' : 'Не удалось загрузить фон';
      return res;
    }).catch(function (e) {
      _customBg = null;
      // текст с сервера («Файл больше 120 МБ») — чтобы объяснить пользователю, что пошло не так
      _bgUploadError = (e && e.message) ? String(e.message) : 'Не удалось загрузить фон';
      if (drop) { drop.textContent = 'Не удалось загрузить фон — попробуйте ещё раз'; setTimeout(function () { if (drop) drop.innerHTML = orig; }, 2600); }
      throw e;
    });
    _bgUploadPending = p;
    return p;
  }
  window.__fmxPosterBgPending = function () { return _bgUploadPending; };
  /* Пользователь выбрал свой фон, но на сервер он не загрузился (обычно слишком большой).
     Возвращаем текст ошибки — чтобы не отправлять молча постер с дефолтным фоном. */
  window.__fmxPosterBgError = function () {
    return (bgName() === 'photo' && !(_customBg && _customBg.url)) ? (_bgUploadError || 'Фон не загрузился') : null;
  };

  /* обёртка выбора своего фона (setOwnBg макета) + создание кнопки кадрирования и слоя-захвата.
     Вызывается из editorMode. */
  function _setupCustomBg() {
    // подсказка про лимит размера прямо в области выбора: иначе непонятно, почему тяжёлый файл
    // в конструкторе играет (локальное превью), а в постер не попадает (на сервер не влез)
    var drop0 = el('drop');
    if (drop0 && drop0.innerHTML.indexOf('до 64 МБ') < 0) {
      drop0.innerHTML += '<br><span style="opacity:.65;font-size:11px;">Файл до 64 МБ · для видео берётся первый отрезок 20 сек</span>';
    }
    if (!window.__fmxBgWrapped && typeof window.setOwnBg === 'function') {
      window.__fmxBgWrapped = true;
      var origSet = window.setOwnBg;
      window.setOwnBg = function (f) {
        // строгая проверка типа: принимаем только настоящие фото/видео. Через «все файлы» или
        // перетаскиванием можно подсунуть .conf/.bat/что угодно — не пускаем даже в локальное превью.
        var _t = (f && f.type || '').toLowerCase();
        var _ok = _t.indexOf('image/') === 0 || _t === 'video/mp4' || _t === 'video/quicktime';
        if (f && !_ok) {
          var em = 'Можно только фото (JPG, PNG, WebP, GIF) или видео (MP4, MOV). Этот файл не подходит';
          var de = el('drop');
          if (de) { var oo = de.innerHTML; de.textContent = em; setTimeout(function () { if (de) de.innerHTML = oo; }, 3200); }
          try { if (typeof window.__fmxPosterNotify === 'function') window.__fmxPosterNotify(em); } catch (e) {}
          return;
        }
        // большой файл отклоняем СРАЗУ при выборе — не показываем превью, которое всё равно
        // не уйдёт в постер (на сервер не влезет). 64 МБ — синхронно с бэкендом.
        if (f && f.size > 64 * 1024 * 1024) {
          var msg = 'Файл ' + Math.round(f.size / 1048576) + ' МБ — превышен лимит 64 МБ. Выберите файл меньшего размера';
          var d = el('drop');
          if (d) { var o = d.innerHTML; d.textContent = msg; setTimeout(function () { if (d) d.innerHTML = o; }, 3200); }
          // и заметный всплывающий тост поверх студии — текст в области легко пропустить
          try { if (typeof window.__fmxPosterNotify === 'function') window.__fmxPosterNotify(msg); } catch (e) {}
          return;                                          // ни превью, ни загрузки
        }
        try { origSet(f); } catch (e) {}                 // мгновенное локальное превью (blob) — как в макете
        _bgpan = { x: 0, y: 0, s: 1 };                    // свежая картинка — без сдвига
        _updateBgCropBtn();                               // показать кнопку «Кадрировать фон»
        _applyBgpan();
        // кадрирование НЕ включаем автоматически: его слой перекрывает постер и мешает листать
        // студию. Пользователь сам жмёт «Кадрировать фон», когда хочет подвинуть фон.
        _uploadCustomBg(f);                                // грузим на сервер
      };
    }
    // кнопка режима кадрирования — прямо под постером, над «Сбросить настройки» (центрирована, тап-зона ≥40px)
    if (!el('fmx-ed-bgcrop')) {
      var anchor = el('fmx-ed-reset') || el('drop');
      if (anchor && anchor.parentNode) {
        var b = document.createElement('button'); b.id = 'fmx-ed-bgcrop'; b.type = 'button';
        b.innerHTML = '⤢ Кадрировать фон';
        b.style.cssText = 'display:none;width:540px;max-width:540px;margin:0 auto 2px;padding:12px;border-radius:12px;background:#141828;border:1px solid rgba(93,202,165,0.45);color:#5DCAA5;font-weight:600;cursor:pointer;font-family:inherit;';
        b.addEventListener('click', function () { _setBgCrop(!_bgCrop); });
        anchor.parentNode.insertBefore(b, anchor);  // над кнопкой сброса (или перед дропом как запасной вариант)
      }
    }
    _ensureBgOverlay();
    var chips = el('bgChips');
    if (chips && !chips.__fmxHook) { chips.__fmxHook = true; chips.addEventListener('click', function () { setTimeout(_applyBgpan, 0); }); }
    _updateBgCropBtn();
  }

  /* прозрачный слой-захват поверх постера + подсказка. Слой активен только в режиме кадрирования:
     ловит перетаскивание/щипок/колесо в любом месте, а блоки под ним ничего не перехватывают. */
  function _ensureBgOverlay() {
    var poster = el('poster'); if (!poster) return;
    if (!el('fmx-bg-hint')) {
      var h = document.createElement('div'); h.id = 'fmx-bg-hint';
      h.textContent = 'Перетащите или масштабируйте фон';
      h.style.display = 'none'; poster.appendChild(h);
    }
    if (el('fmx-bg-catch')) return;
    var c = document.createElement('div'); c.id = 'fmx-bg-catch';
    c.style.cssText = 'position:absolute;inset:0;z-index:7;display:none;touch-action:none;cursor:move;';
    poster.appendChild(c);
    var ptrs = {}, startPan = null, downXY = null, pinch = null;
    function ids() { return Object.keys(ptrs); }
    c.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
      var list = ids();
      if (list.length === 1) { startPan = { x: _bgpan.x, y: _bgpan.y }; downXY = { x: e.clientX, y: e.clientY }; pinch = null; }
      else if (list.length === 2) {
        var a = ptrs[list[0]], b = ptrs[list[1]];
        pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, s0: _bgpan.s, x0: _bgpan.x, y0: _bgpan.y, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
      }
      try { c.setPointerCapture(e.pointerId); } catch (_) {}
    });
    c.addEventListener('pointermove', function (e) {
      if (!(e.pointerId in ptrs)) return;
      ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
      var list = ids();
      if (list.length >= 2 && pinch) {
        var a = ptrs[list[0]], b = ptrs[list[1]];
        _bgpan.s = pinch.s0 * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.d0);
        var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        _bgpan.x = pinch.x0 + (mx - pinch.mx); _bgpan.y = pinch.y0 + (my - pinch.my);
        _applyBgpan(); e.preventDefault();
      } else if (list.length === 1 && startPan && downXY) {
        _bgpan.x = startPan.x + (e.clientX - downXY.x); _bgpan.y = startPan.y + (e.clientY - downXY.y);
        _applyBgpan(); e.preventDefault();
      }
    });
    function end(e) {
      if (!(e.pointerId in ptrs)) return;
      delete ptrs[e.pointerId];
      try { c.releasePointerCapture(e.pointerId); } catch (_) {}
      var list = ids();
      if (list.length < 2) pinch = null;
      if (list.length === 1) { startPan = { x: _bgpan.x, y: _bgpan.y }; downXY = { x: ptrs[list[0]].x, y: ptrs[list[0]].y }; }
      else if (list.length === 0) { startPan = null; downXY = null; }
    }
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    c.addEventListener('wheel', function (e) { e.preventDefault(); _bgpan.s = _bgpan.s * Math.exp(-e.deltaY * 0.0015); _applyBgpan(); }, { passive: false });
    c.addEventListener('dblclick', function (e) { e.preventDefault(); _bgpan = { x: 0, y: 0, s: 1 }; _applyBgpan(); });  // двойной тап — сброс кадрирования
  }

  /* контролы панели — в НАТИВНОМ размере на экране: iframe масштабируется на k,
     поэтому логические размеры = целевой/к (постер остаётся своим, панель читаемой) */
  window.__fmxPosterPanelScale = function (k) {
    k = (k && k > 0.05) ? k : 1;
    var st = el('fmx-ed-scale');
    if (!st) { st = document.createElement('style'); st.id = 'fmx-ed-scale'; document.head.appendChild(st); }
    function px(v) { return (v / k).toFixed(1) + 'px'; }
    st.textContent =
      '.panel h2{font-size:' + px(16) + ' !important;}' +
      '.panel .sub{font-size:' + px(11.5) + ' !important;}' +
      '.lbl{font-size:' + px(10.5) + ' !important;margin:' + px(14) + ' 0 ' + px(8) + ' !important;}' +
      '.chips{gap:' + px(7) + ' !important;}' +
      '.chip{font-size:' + px(13) + ' !important;padding:' + px(8) + ' ' + px(11) + ' !important;border-radius:' + px(11) + ' !important;}' +
      '.chip.emoji{font-size:' + px(19) + ' !important;padding:' + px(6) + ' ' + px(10) + ' !important;}' +
      'select,input[type=text],input[type=number]{font-size:' + px(14) + ' !important;padding:' + px(11) + ' ' + px(12) + ' !important;border-radius:' + px(11) + ' !important;}' +
      '.ordrow{font-size:' + px(13) + ' !important;padding:' + px(8) + ' ' + px(11) + ' !important;}' +
      '.ordbtn{width:' + px(28) + ' !important;height:' + px(28) + ' !important;font-size:' + px(13) + ' !important;}' +
      '.drop{font-size:' + px(11.5) + ' !important;padding:' + px(13) + ' !important;}' +
      '.genbtn{font-size:' + px(13) + ' !important;padding:' + px(12) + ' !important;}' +
      '.note,.gentip{font-size:' + px(11) + ' !important;}' +
      '#fmx-ed-pack .chip{width:' + px(52) + ' !important;height:' + px(52) + ' !important;padding:' + px(4) + ' !important;}' +
      '#fmx-ed-reset{font-size:' + px(13.5) + ' !important;padding:' + px(12) + ' !important;border-radius:' + px(12) + ' !important;margin:' + px(2) + ' auto ' + px(2) + ' !important;}' +
      '#fmx-ed-bgcrop{font-size:' + px(13.5) + ' !important;padding:' + px(12) + ' !important;border-radius:' + px(12) + ' !important;margin:' + px(2) + ' auto ' + px(2) + ' !important;}' +
      /* палитра цвета: она живёт внутри масштабированного iframe и ужималась вместе с постером.
         Компенсируем — на экране получается нативный размер, квадрат и ползунок нормально ловятся пальцем */
      '.picker{width:' + px(252) + ' !important;padding:' + px(14) + ' !important;border-radius:' + px(14) + ' !important;}' +
      '.pkhead{margin-bottom:' + px(10) + ' !important;}' +
      '.picker .pt{font-size:' + px(12) + ' !important;}' +
      '.pkx{font-size:' + px(13) + ' !important;padding:' + px(2) + ' ' + px(7) + ' !important;border-radius:' + px(7) + ' !important;}' +
      '.picker .sv{height:' + px(130) + ' !important;border-radius:' + px(10) + ' !important;}' +
      '.picker .svdot{width:' + px(14) + ' !important;height:' + px(14) + ' !important;}' +
      '.picker .cap{font-size:' + px(9) + ' !important;}' +
      '.picker .hue{height:' + px(14) + ' !important;margin-top:' + px(10) + ' !important;border-radius:' + px(8) + ' !important;}' +
      '.picker .hue::-webkit-slider-thumb{width:' + px(18) + ' !important;height:' + px(18) + ' !important;}' +
      '.picker .crow{gap:' + px(6) + ' !important;margin-top:' + px(10) + ' !important;}' +
      '.picker .crow input{font-size:' + px(12.5) + ' !important;padding:' + px(8) + ' ' + px(2) + ' !important;border-radius:' + px(9) + ' !important;}' +
      '.picker .preset{margin-top:' + px(10) + ' !important;gap:' + px(6) + ' !important;}' +
      '.picker .pd{width:' + px(22) + ' !important;height:' + px(22) + ' !important;border-radius:' + px(7) + ' !important;}' +
      /* ——— скин пульта по утверждённому макету (14.07): индиго, свечение, иконки секций ——— */
      '.fmx-sec{position:relative;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.09);' +
        'border-radius:' + px(16) + ';padding:' + px(13) + ' ' + px(14) + ';margin:' + px(11) + ' 0;overflow:hidden;' +
        'box-shadow:0 1px 0 rgba(255,255,255,0.05) inset,0 20px 46px -28px rgba(0,0,0,0.85);}' +
      '.fmx-sec::before{content:"";position:absolute;top:-1px;left:12%;right:12%;height:' + px(80) + ';' +
        'pointer-events:none;background:radial-gradient(80% 100% at 50% 0%,rgba(129,140,248,0.13) 0%,transparent 70%);}' +
      '.fmx-sec .lbl{margin-top:0 !important;}' +
      '.lbl{position:relative;display:flex !important;align-items:center;gap:' + px(8) + ';' +
        'color:#9aa0f5 !important;letter-spacing:1.2px !important;}' +
      '.fmx-sec .lbl::before{content:attr(data-ico);width:' + px(26) + ';height:' + px(26) + ';' +
        'border-radius:' + px(8) + ';display:flex;align-items:center;justify-content:center;flex-shrink:0;' +
        'font-size:' + px(13) + ';letter-spacing:0;color:#8b8ff8;border:1px solid rgba(129,140,248,0.42);' +
        'background:linear-gradient(160deg,rgba(129,140,248,0.18),rgba(129,140,248,0.04));' +
        'box-shadow:0 10px 24px -14px rgba(129,140,248,0.4);}' +
      '.fmx-sec .lbl:not([data-ico])::before{display:none;}' +
      '.fmx-sec .lbl[data-ico="card"]::before{content:"";' +
        'background:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%238b8ff8%27 stroke-width=%272%27 stroke-linecap=%27round%27%3E%3Crect x=%272.5%27 y=%275%27 width=%2719%27 height=%2714%27 rx=%273%27/%3E%3Cpath d=%27M2.5 10h19%27/%3E%3C/svg%3E") center/' + px(15) + ' auto no-repeat,' +
        'linear-gradient(160deg,rgba(129,140,248,0.18),rgba(129,140,248,0.04));}' +
      '.chip{background:rgba(255,255,255,0.045) !important;border:1px solid rgba(255,255,255,0.10) !important;' +
        'color:#c6cdde !important;transition:border-color 0.15s,background 0.15s,color 0.15s;}' +
      '.chip.on{background:linear-gradient(135deg,rgba(129,140,248,0.2),rgba(129,140,248,0.06)) !important;' +
        'border-color:rgba(129,140,248,0.42) !important;color:#8b8ff8 !important;' +
        'box-shadow:0 0 12px rgba(129,140,248,0.14);}' +
      '#fmxPsLang{display:grid !important;grid-template-columns:repeat(5,1fr) !important;gap:' + px(7) + ' !important;}' +
      '#fmxPsLang .chip{display:flex !important;align-items:center !important;justify-content:center !important;' +
        'gap:' + px(6) + ';padding:' + px(8) + ' ' + px(4) + ' !important;font-weight:700 !important;}' +
      '#fmxPsLang .chip .flsvg{width:' + px(19) + ';height:' + px(14) + ';border-radius:' + px(3) + ';' +
        'box-shadow:0 0 0 1px rgba(255,255,255,0.18);display:block;flex-shrink:0;}' +
      'input[type=text],input[type=number]{background:rgba(0,0,0,0.30) !important;' +
        'border:1px solid rgba(255,255,255,0.09) !important;color:#e8eaf1 !important;}' +
      'input[type=text]:focus,input[type=number]:focus{border-color:rgba(129,140,248,0.42) !important;' +
        'box-shadow:0 0 0 2px rgba(129,140,248,0.13) !important;outline:none !important;}' +
      '.ordrow{background:rgba(255,255,255,0.04) !important;border:1px solid rgba(255,255,255,0.08) !important;' +
        'border-radius:' + px(12) + ' !important;}' +
      '.ordbtn{border-radius:50% !important;background:rgba(255,255,255,0.07) !important;' +
        'border:1px solid rgba(255,255,255,0.12) !important;}' +
      '.genbtn{background:linear-gradient(135deg,rgba(129,140,248,0.22),rgba(129,140,248,0.08)) !important;' +
        'border:1px solid rgba(129,140,248,0.5) !important;color:#aab2f7 !important;font-weight:700 !important;}' +
      '.drop{border:1px dashed rgba(129,140,248,0.42) !important;background:rgba(129,140,248,0.05) !important;}';
  };

  /* режим рендера: прячем пульт и палитру, ставим постер в угол, сигналим готовность */
  window.__fmxPosterRenderMode = function () {
    var st = document.createElement('style');
    st.textContent = '.panel,.picker{display:none !important;} body{padding:0 !important;margin:0 !important;display:block !important;background:#0a0d18 !important;} .poster{box-shadow:none !important;} .stk .frame{display:none !important;}' +
      '#fmx-bg-catch,#fmx-bg-hint,#fmx-ed-bgcrop{display:none !important;} .poster.fmx-bgsel::after{display:none !important;}';
    document.head.appendChild(st);
    // снять выделение стикеров и рамку кадрирования (не должны попасть в PNG)
    document.querySelectorAll('.stk.sel').forEach(function (s) { s.classList.remove('sel'); });
    var p = el('poster'); if (p) p.classList.remove('fmx-bgsel');
  };

  /* стабилизация текста в ВИДЕО: блоки метрик и график делаем НЕПРОЗРАЧНЫМИ — иначе движущийся фон
     просвечивает сквозь стекло и края букв «кипят»/дрожат кадр-к-кадру. В PNG стекло сохраняется
     (там движения нет). Живой фон остаётся в шапке, промежутках и стикерах. */
  window.__fmxPosterVideoMode = function () {
    var st = document.createElement('style');
    st.textContent = '.mcell,.chart{background-color:rgba(12,15,26,0.99) !important;' +
      'backdrop-filter:none !important;-webkit-backdrop-filter:none !important;}';
    document.head.appendChild(st);
  };

  /* видео-рендер: ждём готовности всех движущихся элементов (видео загрузилось, Lottie построился) */
  window.__fmxPosterAnimsReady = function () {
    return Promise.all(_anims.map(function (a) {
      return new Promise(function (res) {
        var done = false, fin = function () { if (done) return; done = true; res(); };
        if (a.kind === 'video') {
          if (a.el.readyState >= 2) return fin();
          a.el.addEventListener('loadeddata', fin, { once: true });
        } else if (a.kind === 'lottie' && a.anim) {
          if (a.anim.isLoaded) return fin();
          try { a.anim.addEventListener('DOMLoaded', fin); } catch (e) {}
        }
        setTimeout(fin, 5000);  // страховка — не зависаем на битом стикере
      });
    }));
  };

  /* видео-рендер: длительность самого длинного движущегося элемента (сек) — чтобы ролик был длиной с контент.
     Вызывать ПОСЛЕ __fmxPosterAnimsReady (иначе duration видео ещё неизвестна). 0 — анимаций нет. */
  window.__fmxPosterMaxDuration = function () {
    var d = 0;
    _anims.forEach(function (a) {
      if (a.kind === 'video' && a.el && isFinite(a.el.duration) && a.el.duration > 0) d = Math.max(d, a.el.duration);
      else if (a.kind === 'lottie' && a.anim) { try { var ld = a.anim.getDuration(false); if (ld > 0) d = Math.max(d, ld); } catch (e) {} }
    });
    return d;
  };

  /* видео-рендер: детерминированно перематываем ВСЕ движущиеся элементы на время t (мс) и ждём кадр.
     Без этого ролик пришлось бы писать в реальном времени с плавающим FPS. */
  window.__fmxPosterSeek = function (t_ms) {
    var waits = [];
    _anims.forEach(function (a) {
      if (a.kind === 'video') {
        var v = a.el, d = (v.duration && isFinite(v.duration) && v.duration > 0) ? v.duration : 3;
        try { v.pause(); } catch (e) {}
        var tt = (t_ms / 1000) % d;
        waits.push(new Promise(function (res) {
          var done = false, fin = function () { if (done) return; done = true; res(); };
          v.addEventListener('seeked', fin, { once: true });
          setTimeout(fin, 400);
          try { v.currentTime = tt; } catch (e) { fin(); }
        }));
      } else if (a.kind === 'lottie' && a.anim) {
        try {
          var tf = a.anim.totalFrames || 1, fr = a.anim.frameRate || 30;
          a.anim.goToAndStop(((t_ms / 1000) * fr) % tf, true);
        } catch (e) {}
      }
    });
    return Promise.all(waits).then(function () {
      return new Promise(function (res) { requestAnimationFrame(function () { requestAnimationFrame(res); }); });
    });
  };

  /* серверная точка входа: данные + состояние + режим рендера + сигнал готовности */
  window.__fmxPosterRender = function (data, state, api, opts) {
    opts = opts || {};
    try {
      window.__fmxPosterInit(data, api);
      if (state) window.__fmxPosterApply(state);
      if (opts.video) { window.__fmxPosterRenderMode(); window.__fmxPosterVideoMode(); }
      else if (opts.render) window.__fmxPosterRenderMode();
    } catch (e) { if (window.console) console.error('poster render glue error', e); }
    var poster = el('poster');
    var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    var imgs = [];
    if (el('avImg')) imgs.push(el('avImg'));
    if (el('bgImg') && el('bgImg').classList.contains('act')) imgs.push(el('bgImg'));
    var waits = imgs.map(function (im) { return new Promise(function (res) { if (im.complete) return res(); im.onload = res; im.onerror = res; setTimeout(res, 5000); }); });
    Promise.all([Promise.resolve(fontsReady).catch(function () {})].concat(waits)).then(function () {
      requestAnimationFrame(function () { requestAnimationFrame(function () { if (typeof window.relayout === 'function') { try { window.relayout(); } catch (e) {} } try { _psApplyLabels(); _psFit(); } catch (e) {} poster.classList.add('ready'); }); });
    });
    setTimeout(function () { poster.classList.add('ready'); }, 9000);
  };
})();
