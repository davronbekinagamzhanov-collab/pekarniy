(function () {
    'use strict';

    /* ═══════════════════════════════════════
       HELPERS
       ═══════════════════════════════════════ */
    function isoDate(d) {
        var dt = d instanceof Date ? d : new Date(d);
        var y = dt.getFullYear();
        var m = String(dt.getMonth() + 1).padStart(2, '0');
        var day = String(dt.getDate()).padStart(2, '0');
        return y + '-' + m + '-' + day;
    }

    function dateKey(d) { return 'bakery_kassa_' + isoDate(d); }

    function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }

    function isToday(d) { return isoDate(d) === isoDate(new Date()); }

    function money(n) { return n.toLocaleString('ru-RU') + ' ₸'; }

    function plural(n) {
        var m10 = n % 10, m100 = n % 100;
        if (m10 === 1 && m100 !== 11) return n + ' продажа';
        if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return n + ' продажи';
        return n + ' продаж';
    }

    function dateLong(d) {
        return d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
    }

    function dateShort(d) {
        return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    }

    function el(id) { return document.getElementById(id); }

    /* ═══════════════════════════════════════
       DOM
       ═══════════════════════════════════════ */
    var amountInput = el('amountInput');
    var btnKaspi = el('btnKaspi');
    var btnCash = el('btnCash');
    var btnSubmit = el('btnSubmit');
    var txList = el('txList');
    var btnClear = el('btnClear');
    var quickBtns = el('quickBtns');
    var btnGear = el('btnGear');

    var navMain = el('navMain');
    var navReports = el('navReports');
    var pageMain = el('pageMain');
    var pageReports = el('pageReports');

    var headerDate = el('headerDate');
    var headerClock = el('headerClock');

    // Reports
    var dateFrom = el('dateFrom');
    var dateTo = el('dateTo');
    var btnApply = el('btnApply');
    var prToday = el('prToday');
    var prYesterday = el('prYesterday');
    var prWeek = el('prWeek');
    var prMonth = el('prMonth');
    var dateDisplay = el('dateDisplay');
    var rTotal = el('rTotal');
    var rKaspi = el('rKaspi');
    var rCash = el('rCash');
    var rTotalN = el('rTotalN');
    var rKaspiN = el('rKaspiN');
    var rCashN = el('rCashN');
    var periodTag = el('periodTag');
    var donutEmpty = el('donutEmpty');
    var rptTxList = el('rptTxList');
    var rptBadge = el('rptBadge');

    // Modal
    var overlay = el('overlay');
    var modalGrid = el('modalGrid');
    var modalX = el('modalX');
    var modalSave = el('modalSave');
    var modalReset = el('modalReset');

    var toast = el('toast');

    /* ═══════════════════════════════════════
       STATE
       ═══════════════════════════════════════ */
    var DEFAULT_AMOUNTS = [200, 350, 500, 750, 1000, 1500];
    var AMOUNTS_KEY = 'bakery_quick_amounts';
    var selectedType = null;
    var todayTx = [];
    var quickAmounts = [];
    var reportTx = [];
    var barChart = null;
    var donutChart = null;
    var chartsReady = false;

    /* ═══════════════════════════════════════
       INIT
       ═══════════════════════════════════════ */
    loadQuickAmounts();
    renderQuickBtns();
    loadToday();
    renderTxList();
    tick();
    setInterval(tick, 1000);

    dateFrom.value = isoDate(new Date());
    dateTo.value = isoDate(new Date());

    setTimeout(function () { amountInput.focus(); }, 100);

    /* ═══════════════════════════════════════
       CLOCK
       ═══════════════════════════════════════ */
    function tick() {
        var now = new Date();
        headerDate.textContent = now.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
        headerClock.textContent = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    /* ═══════════════════════════════════════
       NAVIGATION
       ═══════════════════════════════════════ */
    navMain.addEventListener('click', function () { showPage('main'); });
    navReports.addEventListener('click', function () { showPage('reports'); });

    function showPage(p) {
        navMain.classList.toggle('active', p === 'main');
        navReports.classList.toggle('active', p === 'reports');
        pageMain.style.display = p === 'main' ? '' : 'none';
        pageReports.style.display = p === 'reports' ? '' : 'none';

        if (p === 'main') {
            setTimeout(function () { amountInput.focus(); }, 50);
        }
        if (p === 'reports') {
            if (!chartsReady) initCharts();
            applyRange();
        }
    }

    /* ═══════════════════════════════════════
       QUICK AMOUNTS
       ═══════════════════════════════════════ */
    function loadQuickAmounts() {
        try {
            var raw = localStorage.getItem(AMOUNTS_KEY);
            quickAmounts = raw ? JSON.parse(raw) : DEFAULT_AMOUNTS.slice();
        } catch (e) {
            quickAmounts = DEFAULT_AMOUNTS.slice();
        }
    }

    function saveQuickAmounts() {
        localStorage.setItem(AMOUNTS_KEY, JSON.stringify(quickAmounts));
    }

    function renderQuickBtns() {
        quickBtns.innerHTML = '';
        quickAmounts.forEach(function (v) {
            if (!v || v <= 0) return;
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'q-btn';
            b.textContent = v.toLocaleString('ru-RU');
            b.addEventListener('click', function () {
                amountInput.value = v;
                amountInput.focus();
                validate();
            });
            quickBtns.appendChild(b);
        });
    }

    /* ═══════════════════════════════════════
       MODAL — quick amounts settings
       ═══════════════════════════════════════ */
    btnGear.addEventListener('click', openModal);
    modalX.addEventListener('click', closeModal);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });
    modalSave.addEventListener('click', saveModal);
    modalReset.addEventListener('click', resetModal);

    function openModal() {
        modalGrid.innerHTML = '';
        for (var i = 0; i < 6; i++) {
            var val = quickAmounts[i] || '';
            var div = document.createElement('div');
            div.className = 'm-field';
            div.innerHTML = '<label>Кнопка ' + (i + 1) + '</label><input type="number" class="m-inp" data-idx="' + i + '" value="' + val + '" placeholder="—" min="0" inputmode="numeric">';
            modalGrid.appendChild(div);
        }
        overlay.style.display = '';
    }

    function closeModal() {
        overlay.style.display = 'none';
    }

    function saveModal() {
        var inputs = modalGrid.querySelectorAll('.m-inp');
        quickAmounts = [];
        inputs.forEach(function (inp) {
            var v = parseInt(inp.value, 10);
            quickAmounts.push(v > 0 ? v : 0);
        });
        saveQuickAmounts();
        renderQuickBtns();
        closeModal();
        showToast('Суммы сохранены', 'ok');
    }

    function resetModal() {
        quickAmounts = DEFAULT_AMOUNTS.slice();
        saveQuickAmounts();
        renderQuickBtns();
        var inputs = modalGrid.querySelectorAll('.m-inp');
        inputs.forEach(function (inp, i) {
            inp.value = DEFAULT_AMOUNTS[i] || '';
        });
        showToast('Сброшено', 'ok');
    }

    /* ═══════════════════════════════════════
       PERSISTENCE
       ═══════════════════════════════════════ */
    function loadToday() {
        try {
            var raw = localStorage.getItem(dateKey(new Date()));
            todayTx = raw ? JSON.parse(raw) : [];
        } catch (e) { todayTx = []; }
    }

    function saveToday() {
        localStorage.setItem(dateKey(new Date()), JSON.stringify(todayTx));
    }

    function getTxForDate(d) {
        try {
            var raw = localStorage.getItem(dateKey(d));
            return raw ? JSON.parse(raw) : [];
        } catch (e) { return []; }
    }

    function getTxForRange(from, to) {
        var all = [];
        var d = new Date(from);
        var end = new Date(to);
        end.setHours(23, 59, 59);
        while (d <= end) {
            var txs = getTxForDate(d);
            var ds = isoDate(d);
            txs.forEach(function (t) { t._day = ds; });
            all = all.concat(txs);
            d.setDate(d.getDate() + 1);
        }
        return all;
    }

    /* ═══════════════════════════════════════
       FORM
       ═══════════════════════════════════════ */
    function validate() {
        var amt = parseFloat(amountInput.value);
        btnSubmit.disabled = !(amt > 0 && selectedType !== null);
    }

    function selectPay(type) {
        selectedType = type;
        btnKaspi.classList.toggle('on', type === 'kaspi');
        btnCash.classList.toggle('on', type === 'cash');
        validate();
    }

    btnKaspi.setAttribute('data-type', 'kaspi');
    btnCash.setAttribute('data-type', 'cash');
    btnKaspi.addEventListener('click', function () { selectPay('kaspi'); });
    btnCash.addEventListener('click', function () { selectPay('cash'); });
    amountInput.addEventListener('input', validate);

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !btnSubmit.disabled) {
            e.preventDefault();
            submit();
        }
    });

    btnSubmit.addEventListener('click', submit);

    function submit() {
        var amt = parseFloat(amountInput.value);
        if (!amt || amt <= 0 || !selectedType) return;

        var tx = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            amount: amt,
            type: selectedType,
            time: new Date().toISOString()
        };

        todayTx.unshift(tx);
        saveToday();
        renderTxList();

        if (pageReports.style.display !== 'none') applyRange();

        amountInput.value = '';
        selectedType = null;
        btnKaspi.classList.remove('on');
        btnCash.classList.remove('on');
        btnSubmit.disabled = true;
        amountInput.focus();

        var lbl = tx.type === 'kaspi' ? 'Kaspi' : 'Наличные';
        showToast('✓ ' + money(tx.amount) + ' — ' + lbl, 'ok');
    }

    /* ═══════════════════════════════════════
       DELETE
       ═══════════════════════════════════════ */
    function delTx(id) {
        todayTx = todayTx.filter(function (t) { return t.id !== id; });
        saveToday();
        renderTxList();
        if (pageReports.style.display !== 'none') applyRange();
        showToast('Удалено', 'err');
    }

    btnClear.addEventListener('click', function () {
        if (!todayTx.length) return;
        if (!confirm('Очистить все продажи за сегодня?')) return;
        todayTx = [];
        saveToday();
        renderTxList();
        if (pageReports.style.display !== 'none') applyRange();
        showToast('Очищено', 'err');
    });

    txList.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-del]');
        if (btn) delTx(btn.getAttribute('data-del'));
    });

    /* ═══════════════════════════════════════
       RENDER — main tx list (max 5, expandable)
       ═══════════════════════════════════════ */
    var txShowCount = 5;

    function renderTxList() {
        txShowCount = 5;
        renderTxListInner();
    }

    function renderTxListInner() {
        if (!todayTx.length) {
            txList.innerHTML = '<li class="tx-empty">Продаж пока нет</li>';
            return;
        }
        var visible = todayTx.slice(0, txShowCount);
        var remaining = todayTx.length - txShowCount;
        var html = '';
        visible.forEach(function (tx) {
            var d = new Date(tx.time);
            var t = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            var lbl = tx.type === 'kaspi' ? 'KASPI' : 'НАЛ';
            html += '<li class="tx-item">' +
                '<div class="tx-left"><span class="tx-tag ' + tx.type + '">' + lbl + '</span><span class="tx-time">' + t + '</span></div>' +
                '<div class="tx-left"><span class="tx-amount">' + money(tx.amount) + '</span>' +
                '<button type="button" class="tx-del" data-del="' + tx.id + '">✕</button></div></li>';
        });
        if (remaining > 0) {
            html += '<li class="tx-more"><button type="button" class="more-btn" id="btnMoreTx">Далее ' + remaining + ' →</button></li>';
        }
        if (todayTx.length > 5) {
            html += '<li class="tx-hint">Подробнее — во вкладке <strong>Отчёты</strong></li>';
        }
        txList.innerHTML = html;

        var moreBtn = document.getElementById('btnMoreTx');
        if (moreBtn) {
            moreBtn.addEventListener('click', function () {
                txShowCount += 5;
                renderTxListInner();
            });
        }
    }

    /* ═══════════════════════════════════════
       REPORTS — date range
       ═══════════════════════════════════════ */
    prToday.addEventListener('click', function () { presetClick(prToday, 0, 0); });
    prYesterday.addEventListener('click', function () { presetClick(prYesterday, -1, -1); });
    prWeek.addEventListener('click', function () { presetClick(prWeek, -6, 0); });
    prMonth.addEventListener('click', function () { presetClick(prMonth, -29, 0); });

    function presetClick(btn, fromOff, toOff) {
        [prToday, prYesterday, prWeek, prMonth].forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        dateFrom.value = isoDate(addDays(new Date(), fromOff));
        dateTo.value = isoDate(addDays(new Date(), toOff));
        applyRange();
    }

    btnApply.addEventListener('click', function () {
        [prToday, prYesterday, prWeek, prMonth].forEach(function (b) { b.classList.remove('active'); });
        applyRange();
    });
    dateFrom.addEventListener('change', function () {
        [prToday, prYesterday, prWeek, prMonth].forEach(function (b) { b.classList.remove('active'); });
        applyRange();
    });
    dateTo.addEventListener('change', function () {
        [prToday, prYesterday, prWeek, prMonth].forEach(function (b) { b.classList.remove('active'); });
        applyRange();
    });

    function applyRange() {
        var f = new Date(dateFrom.value + 'T00:00:00');
        var t = new Date(dateTo.value + 'T00:00:00');
        if (isNaN(f.getTime()) || isNaN(t.getTime())) return;
        if (f > t) { var tmp = dateFrom.value; dateFrom.value = dateTo.value; dateTo.value = tmp; f = new Date(dateFrom.value + 'T00:00:00'); t = new Date(dateTo.value + 'T00:00:00'); }

        reportTx = getTxForRange(f, t);

        if (isoDate(f) === isoDate(t)) {
            var dl = dateLong(f);
            dateDisplay.textContent = dl.charAt(0).toUpperCase() + dl.slice(1);
            periodTag.textContent = isToday(f) ? 'сегодня' : dateShort(f);
        } else {
            dateDisplay.textContent = dateShort(f) + ' — ' + dateShort(t);
            periodTag.textContent = dateShort(f) + ' — ' + dateShort(t);
        }

        renderReportStats();
        renderReportTx(isoDate(f) !== isoDate(t));
        updateCharts();
    }

    function renderReportStats() {
        var kTx = reportTx.filter(function (t) { return t.type === 'kaspi'; });
        var cTx = reportTx.filter(function (t) { return t.type === 'cash'; });
        var tSum = reportTx.reduce(function (s, t) { return s + t.amount; }, 0);
        var kSum = kTx.reduce(function (s, t) { return s + t.amount; }, 0);
        var cSum = cTx.reduce(function (s, t) { return s + t.amount; }, 0);

        setVal(rTotal, money(tSum));
        setVal(rKaspi, money(kSum));
        setVal(rCash, money(cSum));
        rTotalN.textContent = plural(reportTx.length);
        rKaspiN.textContent = plural(kTx.length);
        rCashN.textContent = plural(cTx.length);
    }

    function setVal(el, txt) {
        if (el.textContent !== txt) {
            el.textContent = txt;
            el.classList.remove('val-bump');
            void el.offsetWidth;
            el.classList.add('val-bump');
        }
    }

    function renderReportTx(showDate) {
        rptBadge.textContent = reportTx.length;
        if (!reportTx.length) {
            rptTxList.innerHTML = '<li class="tx-empty">Нет данных за выбранный период</li>';
            return;
        }
        var html = '';
        reportTx.forEach(function (tx) {
            var d = new Date(tx.time);
            var t = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            var lbl = tx.type === 'kaspi' ? 'KASPI' : 'НАЛ';
            var ds = showDate ? '<span class="tx-date">' + dateShort(d) + '</span>' : '';
            html += '<li class="tx-item"><div class="tx-left"><span class="tx-tag ' + tx.type + '">' + lbl + '</span>' + ds + '<span class="tx-time">' + t + '</span></div><div class="tx-left"><span class="tx-amount">' + money(tx.amount) + '</span></div></li>';
        });
        rptTxList.innerHTML = html;
    }

    /* ═══════════════════════════════════════
       CHARTS
       ═══════════════════════════════════════ */
    function initCharts() {
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js not loaded');
            chartsReady = true;
            return;
        }

        Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
        Chart.defaults.font.size = 11;
        Chart.defaults.plugins.legend.display = false;

        var bCtx = document.getElementById('chartBar').getContext('2d');
        barChart = new Chart(bCtx, {
            type: 'bar',
            data: { labels: [], datasets: [] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: {
                        display: true, position: 'top',
                        labels: { usePointStyle: true, pointStyle: 'rectRounded', padding: 12, font: { size: 10, weight: '600' }, color: '#6b7280' }
                    },
                    tooltip: {
                        backgroundColor: '#fff', titleColor: '#111827', bodyColor: '#6b7280',
                        borderColor: '#e5e7eb', borderWidth: 1, cornerRadius: 6, padding: 8, boxPadding: 3, usePointStyle: true,
                        callbacks: { label: function (ctx) { return ' ' + ctx.dataset.label + ': ' + ctx.parsed.y.toLocaleString('ru-RU') + ' ₸'; } }
                    }
                },
                scales: {
                    x: { grid: { display: false }, border: { display: false }, ticks: { color: '#9ca3af', font: { size: 10 } } },
                    y: { grid: { color: '#f3f4f6' }, border: { display: false }, ticks: { color: '#9ca3af', font: { size: 10 }, callback: function (v) { return v >= 1000 ? (v / 1000) + 'к' : v; } }, beginAtZero: true }
                }
            }
        });

        var dCtx = document.getElementById('chartDonut').getContext('2d');
        donutChart = new Chart(dCtx, {
            type: 'doughnut',
            data: { labels: ['Kaspi', 'Наличные'], datasets: [{ data: [0, 0], backgroundColor: ['#f59e0b', '#10b981'], borderWidth: 0, hoverOffset: 5 }] },
            options: {
                responsive: true, maintainAspectRatio: true, cutout: '65%',
                plugins: {
                    legend: { display: true, position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', padding: 12, font: { size: 11, weight: '600' }, color: '#6b7280' } },
                    tooltip: {
                        backgroundColor: '#fff', titleColor: '#111827', bodyColor: '#6b7280',
                        borderColor: '#e5e7eb', borderWidth: 1, cornerRadius: 6, padding: 8,
                        callbacks: { label: function (ctx) { return ' ' + ctx.label + ': ' + ctx.parsed.toLocaleString('ru-RU') + ' ₸'; } }
                    }
                }
            }
        });

        chartsReady = true;
    }

    function updateCharts() {
        if (!chartsReady || !barChart) return;

        // Bar — last 7 days
        var labels = [], kData = [], cData = [];
        var dayN = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
        for (var i = 6; i >= 0; i--) {
            var d = addDays(new Date(), -i);
            labels.push(i === 0 ? 'Сегодня' : i === 1 ? 'Вчера' : dayN[d.getDay()] + ' ' + d.getDate());
            var txs = getTxForDate(d);
            kData.push(txs.filter(function (t) { return t.type === 'kaspi'; }).reduce(function (s, t) { return s + t.amount; }, 0));
            cData.push(txs.filter(function (t) { return t.type === 'cash'; }).reduce(function (s, t) { return s + t.amount; }, 0));
        }
        barChart.data.labels = labels;
        barChart.data.datasets = [
            { label: 'Kaspi', data: kData, backgroundColor: 'rgba(245,158,11,.7)', hoverBackgroundColor: '#f59e0b', borderRadius: 4, borderSkipped: false, barPercentage: .6, categoryPercentage: .7 },
            { label: 'Наличные', data: cData, backgroundColor: 'rgba(16,185,129,.7)', hoverBackgroundColor: '#10b981', borderRadius: 4, borderSkipped: false, barPercentage: .6, categoryPercentage: .7 }
        ];
        barChart.update('none');

        // Donut — current report range
        var kSum = reportTx.filter(function (t) { return t.type === 'kaspi'; }).reduce(function (s, t) { return s + t.amount; }, 0);
        var cSum = reportTx.filter(function (t) { return t.type === 'cash'; }).reduce(function (s, t) { return s + t.amount; }, 0);
        var has = kSum > 0 || cSum > 0;
        donutChart.data.datasets[0].data = [kSum, cSum];
        donutChart.update('none');
        document.getElementById('chartDonut').style.display = has ? '' : 'none';
        donutEmpty.classList.toggle('on', !has);
    }

    /* ═══════════════════════════════════════
       TOAST
       ═══════════════════════════════════════ */
    var toastTimer = null;
    function showToast(msg, type) {
        clearTimeout(toastTimer);
        toast.textContent = msg;
        toast.className = 'toast show ' + (type || 'ok');
        toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2000);
    }

    /* ═══════════════════════════════════════
       DAY BOUNDARY
       ═══════════════════════════════════════ */
    var lastDay = isoDate(new Date());
    setInterval(function () {
        var today = isoDate(new Date());
        if (today !== lastDay) {
            lastDay = today;
            todayTx = [];
            renderTxList();
        }
    }, 30000);

})();
