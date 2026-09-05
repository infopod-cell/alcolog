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

let entries = JSON.parse(localStorage.getItem('drinkTrackerData')) || [];
let currentProductKey = null;

document.addEventListener('DOMContentLoaded', () => {
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

// Заголовок = название текущего месяца
function setMonthTitle() {
    const name = new Date().toLocaleDateString('ru-RU', { month: 'long' });
    document.getElementById('month-title').textContent =
        name.charAt(0).toUpperCase() + name.slice(1);
}

// ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК
function switchTab(tab) {
    document.getElementById('screen-home').classList.toggle('active', tab === 'home');
    document.getElementById('screen-history').classList.toggle('active', tab === 'history');
    document.getElementById('tab-home').classList.toggle('active', tab === 'home');
    document.getElementById('tab-history').classList.toggle('active', tab === 'history');
    window.scrollTo(0, 0);
}

// ОКНО ВВОДА
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

// СОХРАНЕНИЕ
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

// ОТРИСОВКА
function render() {
    const now = new Date();

    // Записи за текущий месяц
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

    // История (все записи, новые сверху)
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
}
