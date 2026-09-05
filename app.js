// БАЗА ПРОДУКТОВ (Калории на 100 мл / 100 г)
const PRODUCTS = {
    beer:       { name: 'Пиво',      type: 'beer',   kcal: 45,  unit: 'ml', defaultVolume: 500 },
    gin:        { name: 'Джин',      type: 'strong', kcal: 220, unit: 'ml', defaultVolume: 500 },
    rum:        { name: 'Ром',       type: 'strong', kcal: 220, unit: 'ml', defaultVolume: 500 },
    whiskey:    { name: 'Виски',     type: 'strong', kcal: 220, unit: 'ml', defaultVolume: 500 },
    tincture:   { name: 'Настойка',  type: 'strong', kcal: 250, unit: 'ml', defaultVolume: 500 },

    tonic:      { name: 'Тоник',     type: 'mixer',  kcal: 35,  unit: 'ml', defaultVolume: 500 },
    cola:       { name: 'Кола',      type: 'mixer',  kcal: 42,  unit: 'ml', defaultVolume: 500 },
    lemonade:   { name: 'Лимонад',   type: 'mixer',  kcal: 40,  unit: 'ml', defaultVolume: 500 },
    juice:      { name: 'Сок',       type: 'mixer',  kcal: 45,  unit: 'ml', defaultVolume: 500 },

    peanuts:    { name: 'Арахис',    type: 'food',   kcal: 570, unit: 'g',  defaultVolume: 200 },
    other_food: { name: 'Еда',       type: 'food',   kcal: 250, unit: 'g',  defaultVolume: 200 }
};

const MONTH_NAMES = ['Январь','Февраль','Март','Апрель','Май','Июнь',
                     'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

let entries = JSON.parse(localStorage.getItem('drinkTrackerData')) || [];
let currentProductKey = null;

// Состояние календаря
let viewYear, viewMonth;
let selectedDayKey = null;

document.addEventListener('DOMContentLoaded', () => {
    const now = new Date();
    viewYear = now.getFullYear();
    viewMonth = now.getMonth();

    setMonthTitle();
    render();

    document.getElementById('clear-history-btn').addEventListener('click', () => {
        if (confirm('Удалить всю историю? Это действие нельзя отменить.')) {
            entries = [];
            saveData();
            render();
        }
    });

    document.getElementById('input-volume').addEventListener('input', updateModalCalories);
});

function setMonthTitle() {
    const name = new Date().toLocaleDateString('ru-RU', { month: 'long' });
    document.getElementById('month-title').textContent =
        name.charAt(0).toUpperCase() + name.slice(1);
}

// ВКЛАДКИ
function switchTab(tab) {
    ['home', 'calendar', 'history'].forEach(t => {
        document.getElementById('screen-' + t).classList.toggle('active', t === tab);
        document.getElementById('tab-' + t).classList.toggle('active', t === tab);
    });
    window.scrollTo(0, 0);
}

// ========== КАЛЕНДАРЬ ==========

function dateKey(y, m, d) { return y + '-' + m + '-' + d; }

function getMarkerMap() {
    const map = {};
    entries.forEach(e => {
        if (e.type !== 'beer' && e.type !== 'strong') return;
        const d = new Date(e.timestamp);
        const key = dateKey(d.getFullYear(), d.getMonth(), d.getDate());
        if (!map[key]) map[key] = { beer: false, strong: false };
        if (e.type === 'beer') map[key].beer = true;
        else map[key].strong = true;
    });
    return map;
}

function changeMonth(delta) {
    viewMonth += delta;
    if (viewMonth < 0) { viewMonth = 11; viewYear--; }
    if (viewMonth > 11) { viewMonth = 0; viewYear++; }
    selectedDayKey = null;
    renderCalendar();
    renderDayDetails();
}

function renderCalendar() {
    document.getElementById('cal-title').textContent =
        MONTH_NAMES[viewMonth] + ' ' + viewYear;

    const grid = document.getElementById('cal-grid');
    grid.innerHTML = '';

    const firstDow = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7; // неделя с Пн
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const markerMap = getMarkerMap();
    const now = new Date();

    for (let i = 0; i < firstDow; i++) {
        const empty = document.createElement('span');
        empty.className = 'day-empty';
        grid.appendChild(empty);
    }

    let drinkingDays = 0;

    for (let d = 1; d <= daysInMonth; d++) {
        const key = dateKey(viewYear, viewMonth, d);
        const marker = markerMap[key];
        if (marker) drinkingDays++;

        const btn = document.createElement('button');
        btn.className = 'day-tile';

        if (now.getFullYear() === viewYear && now.getMonth() === viewMonth && now.getDate() === d) {
            btn.classList.add('today');
        }
        if (selectedDayKey === key) btn.classList.add('selected');

        let dot = 'none';
        if (marker) dot = (marker.beer && marker.strong) ? 'both' : (marker.beer ? 'beer' : 'strong');

        btn.innerHTML = '<span class="day-num">' + d + '</span><span class="day-bar ' + dot + '"></span>';
        btn.onclick = () => selectDay(key);
        grid.appendChild(btn);
    }

    // Счётчик дней: пил / трезвых (для текущего месяца — по сегодня)
    const isCurrent = viewYear === now.getFullYear() && viewMonth === now.getMonth();
    const isFuture = viewYear > now.getFullYear() || (viewYear === now.getFullYear() && viewMonth > now.getMonth());
    const elapsed = isFuture ? 0 : (isCurrent ? now.getDate() : daysInMonth);
    const sober = Math.max(0, elapsed - drinkingDays);

    document.getElementById('month-summary').innerHTML =
        'Дней с алкоголем: <b>' + drinkingDays + '</b> · Трезвых: <b>' + sober + '</b>';
}

function selectDay(key) {
    selectedDayKey = (selectedDayKey === key) ? null : key;
    renderCalendar();
    renderDayDetails();
}

function renderDayDetails() {
    const box = document.getElementById('day-details');

    if (!selectedDayKey) {
        box.innerHTML = '<div class="day-hint">Нажми на день, чтобы посмотреть, что было выпито</div>';
        return;
    }

    const parts = selectedDayKey.split('-').map(Number);
    const y = parts[0], m = parts[1], d = parts[2];

    const dayEntries = entries.filter(e => {
        const dt = new Date(e.timestamp);
        return dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d;
    });

    let title = new Date(y, m, d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' });
    title = title.charAt(0).toUpperCase() + title.slice(1);

    if (!dayEntries.length) {
        box.innerHTML = '<h2>' + title + '</h2><div class="day-hint">В этот день записей нет.</div>';
        return;
    }

    let money = 0, cal = 0, items = '';
    dayEntries.forEach(e => {
        money += e.price;
        cal += e.calories;
        items += '<li class="history-item"><div class="history-details">' +
            '<span class="history-name">' + e.name + ', ' + e.volume + ' ' + e.unit + '</span>' +
            '<span class="history-meta">' + formatNumber(e.price) + ' ₽ · ' + formatNumber(e.calories) + ' ккал</span>' +
            '</div></li>';
    });

    box.innerHTML = '<h2>' + title + '</h2>' +
        '<ul class="day-list">' + items + '</ul>' +
        '<div class="day-totals">Итого: ' + formatNumber(money) + ' ₽ · ' + formatNumber(cal) + ' ккал</div>';
}

// ========== ОКНО ВВОДА ==========

function openModal(key) {
    currentProductKey = key;
    const product = PRODUCTS[key];

    document.getElementById('modal-title').innerText = product.name;
    document.getElementById('input-volume').value = product.defaultVolume;
    document.getElementById('volume-label').innerText =
        product.unit === 'g' ? 'Вес (г)' : 'Объем (мл)';
    document.getElementById('input-price').value = '';

    updateModalCalories();
    document.getElementById('modal-overlay').style.display = 'flex';
}

function closeModal() {
    document.getElementById('modal-overlay').style.display = 'none';
    currentProductKey = null;
}

function updateModalCalories() {
    if (!currentProductKey) return;
    const product = PRODUCTS[currentProductKey];
    const volume = parseFloat(document.getElementById('input-volume').value) || 0;
    document.getElementById('modal-calories').innerText =
        Math.round((volume / 100) * product.kcal);
}

function saveEntry() {
    const volume = parseFloat(document.getElementById('input-volume').value) || 0;
    const price = parseFloat(document.getElementById('input-price').value) || 0;

    if (volume <= 0) {
        alert('Объем должен быть больше нуля');
        return;
    }

    const product = PRODUCTS[currentProductKey];

    entries.push({
        id: Date.now(),
        timestamp: new Date().toISOString(),
        name: product.name,
        type: product.type,
        volume: volume,
        unit: product.unit,
        price: price,
        calories: Math.round((volume / 100) * product.kcal)
    });

    saveData();
    render();
    closeModal();
}

function deleteEntry(id) {
    entries = entries.filter(e => e.id !== id);
    saveData();
    render();
}

function saveData() {
    localStorage.setItem('drinkTrackerData', JSON.stringify(entries));
}

function formatNumber(n) {
    return Math.round(n).toLocaleString('ru-RU');
}

// ========== ОТРИСОВКА ==========

function render() {
    const now = new Date();

    const monthEntries = entries.filter(entry => {
        const d = new Date(entry.timestamp);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    let stats = { money: 0, calories: 0, strongLiters: 0, beerLiters: 0 };

    monthEntries.forEach(entry => {
        stats.money += entry.price;
        stats.calories += entry.calories;
        if (entry.type === 'strong') stats.strongLiters += entry.volume;
        if (entry.type === 'beer') stats.beerLiters += entry.volume;
    });

    document.getElementById('stat-money').textContent = formatNumber(stats.money) + ' ₽';
    document.getElementById('stat-calories').textContent = formatNumber(stats.calories) + ' ккал';
    document.getElementById('stat-strong').textContent = (stats.strongLiters / 1000).toFixed(2) + ' л';
    document.getElementById('stat-beer').textContent = (stats.beerLiters / 1000).toFixed(2) + ' л';

    // История
    const list = document.getElementById('history-list');
    list.innerHTML = '';

    const sorted = [...entries].reverse();
    document.getElementById('history-empty').style.display = sorted.length ? 'none' : 'block';

    sorted.forEach(entry => {
        const date = new Date(entry.timestamp);
        const dateStr = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) +
            ' ' + date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

        const li = document.createElement('li');
        li.className = 'history-item';
        li.innerHTML = `
            <div class="history-details">
                <span class="history-name">${entry.name}, ${entry.volume} ${entry.unit}</span>
                <span class="history-meta">${dateStr} · ${formatNumber(entry.price)} ₽ · ${formatNumber(entry.calories)} ккал</span>
            </div>
            <button class="delete-btn" onclick="deleteEntry(${entry.id})">×</button>
        `;
        list.appendChild(li);
    });

    // Календарь
    renderCalendar();
    renderDayDetails();
}
