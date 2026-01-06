// ===== PWA =====
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try { await navigator.serviceWorker.register('./sw.js'); } catch {}
    });
}

// ===== DATA (najprościej: localStorage) =====
// (Jeśli iOS zacznie wariować przy większych danych, przejdziemy na IndexedDB/localForage)
const K_MEALS = 'meals_v1';
const K_ING = 'ingredients_v1';
const K_CAT = 'catalog_v1';

const DAYS = ['Poniedziałek','Wtorek','Środa','Czwartek','Piątek','Sobota','Niedziela'];

const uid = () => Math.random().toString(16).slice(2) + Date.now().toString(16);
const norm = (s) => s.trim().toLowerCase();

function load(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
}
function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

// Meals: [{id, dayIndex, name, ingredients:[string], order}]
function getMeals(){ return load(K_MEALS, []); }
function setMeals(v){ save(K_MEALS, v); }

// Ingredients: [{id, name, bought, createdAt}]
function getIngredients(){ return load(K_ING, []); }
function setIngredients(v){ save(K_ING, v); }

// Catalog: [string] (unikalne, do podpowiedzi)
function getCatalog(){ return load(K_CAT, []); }
function setCatalog(v){ save(K_CAT, v); }

// ===== UI refs =====
const screenMeals = document.getElementById('screenMeals');
const screenIngredients = document.getElementById('screenIngredients');
const tabMeals = document.getElementById('tabMeals');
const tabIngredients = document.getElementById('tabIngredients');
const topTitle = document.getElementById('topTitle');
const openAddModalBtn = document.getElementById('openAddModalBtn');

const daysContainer = document.getElementById('daysContainer');
const clearMealsBtn = document.getElementById('clearMealsBtn');

const addModal = document.getElementById('addModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const closeModalBackdrop = document.getElementById('closeModalBackdrop');

const daySelect = document.getElementById('daySelect');
const mealNameInput = document.getElementById('mealNameInput');

const ingredientInputModal = document.getElementById('ingredientInputModal');
const addIngredientModalBtn = document.getElementById('addIngredientModalBtn');
const modalIngredientsList = document.getElementById('modalIngredientsList');
const suggestModal = document.getElementById('suggestModal');

const saveMealBtn = document.getElementById('saveMealBtn');

const ingredientInputMain = document.getElementById('ingredientInputMain');
const addIngredientMainBtn = document.getElementById('addIngredientMainBtn');
const ingredientsList = document.getElementById('ingredientsList');
const suggestMain = document.getElementById('suggestMain');

// ===== NAV =====
function setScreen(name){
    const isMeals = name === 'meals';

    screenMeals.classList.toggle('screen--active', isMeals);
    screenIngredients.classList.toggle('screen--active', !isMeals);

    tabMeals.classList.toggle('tab--active', isMeals);
    tabIngredients.classList.toggle('tab--active', !isMeals);

    topTitle.textContent = isMeals ? 'Lista dań' : 'Lista składników';
    // przycisk Dodaj tylko na ekranie dań (wg canvas)
    openAddModalBtn.style.display = isMeals ? 'inline-block' : 'none';
}
tabMeals.addEventListener('click', () => setScreen('meals'));
tabIngredients.addEventListener('click', () => setScreen('ingredients'));

// ===== MODAL =====
let modalIngredients = []; // tymczasowa lista składników dla dania

function openModal(){
    addModal.classList.add('modal--open');
    addModal.setAttribute('aria-hidden','false');
    mealNameInput.value = '';
    ingredientInputModal.value = '';
    modalIngredients = [];
    renderModalIngredients();
    // domyślnie: dzisiaj
    daySelect.value = String(new Date().getDay() === 0 ? 6 : new Date().getDay()-1);
    mealNameInput.focus();
}

function closeModal(){
    addModal.classList.remove('modal--open');
    addModal.setAttribute('aria-hidden','true');
    hideSuggest(suggestModal);
}

openAddModalBtn.addEventListener('click', openModal);
closeModalBtn.addEventListener('click', closeModal);
closeModalBackdrop.addEventListener('click', closeModal);

// ===== DAYS select =====
function initDaySelect(){
    daySelect.innerHTML = '';
    DAYS.forEach((d, i) => {
        const opt = document.createElement('option');
        opt.value = String(i);
        opt.textContent = d;
        daySelect.appendChild(opt);
    });
}

// ===== RENDER meals =====
function renderMeals(){
    const meals = getMeals();

    daysContainer.innerHTML = '';
    DAYS.forEach((dayName, dayIndex) => {
        const card = document.createElement('div');
        card.className = 'dayCard';

        const header = document.createElement('div');
        header.className = 'dayHeader';

        const title = document.createElement('div');
        title.className = 'dayTitle';
        title.textContent = dayName;

        const hint = document.createElement('div');
        hint.className = 'dayHint';
        hint.textContent = 'Przeciąganie dodamy w kolejnym kroku';

        header.appendChild(title);
        header.appendChild(hint);

        card.appendChild(header);

        const dayMeals = meals
            .filter(m => m.dayIndex === dayIndex)
            .sort((a,b) => (a.order ?? 0) - (b.order ?? 0));

        dayMeals.forEach(m => {
            const row = document.createElement('div');
            row.className = 'mealRow';

            const left = document.createElement('div');
            left.className = 'mealName';
            left.textContent = m.name;

            const actions = document.createElement('div');
            actions.className = 'mealActions';

            const handle = document.createElement('div');
            handle.className = 'handle';
            handle.textContent = '≡'; // uchwyt (na razie tylko wizualnie)

            const del = document.createElement('button');
            del.className = 'deleteBtn';
            del.textContent = '🗑';
            del.addEventListener('click', (e) => {
                e.stopPropagation();
                const next = getMeals().filter(x => x.id !== m.id);
                setMeals(next);
                renderMeals();
            });

            actions.appendChild(handle);
            actions.appendChild(del);

            row.appendChild(left);
            row.appendChild(actions);
            card.appendChild(row);
        });

        daysContainer.appendChild(card);
    });
}

// ===== CLEAR meals =====
clearMealsBtn.addEventListener('click', () => {
    const ok = confirm('Wyczyścić wszystkie dania z tygodnia?');
    if (!ok) return;
    setMeals([]);
    renderMeals();
});

// ===== AUTOCOMPLETE (prosty) =====
function showSuggest(box, items, onPick){
    box.innerHTML = '';
    items.slice(0, 6).forEach(name => {
        const div = document.createElement('div');
        div.className = 'suggest__item';
        div.textContent = name;
        div.addEventListener('click', () => onPick(name));
        box.appendChild(div);
    });
    box.style.display = items.length ? 'block' : 'none';
}

function hideSuggest(box){
    box.style.display = 'none';
    box.innerHTML = '';
}

function suggestFor(query){
    const q = norm(query);
    if (q.length < 3) return [];
    const cat = getCatalog();
    return cat
        .filter(x => norm(x).includes(q))
        .slice(0, 6);
}

function bindSuggest(inputEl, boxEl, onPick){
    inputEl.addEventListener('input', () => {
        const list = suggestFor(inputEl.value);
        showSuggest(boxEl, list, (picked) => {
            inputEl.value = picked;
            hideSuggest(boxEl);
            onPick?.(picked);
        });
    });
    inputEl.addEventListener('blur', () => {
        // małe opóźnienie, żeby klik w sugestię zadziałał
        setTimeout(() => hideSuggest(boxEl), 120);
    });
}

bindSuggest(ingredientInputModal, suggestModal);
bindSuggest(ingredientInputMain, suggestMain);

// ===== MODAL ingredients list =====
function renderModalIngredients(){
    modalIngredientsList.innerHTML = '';
    modalIngredients.forEach((name, idx) => {
        const li = document.createElement('li');
        li.className = 'li';

        const left = document.createElement('span');
        left.textContent = name;

        const btn = document.createElement('button');
        btn.className = 'smallBtn';
        btn.textContent = '✕';
        btn.addEventListener('click', () => {
            modalIngredients = modalIngredients.filter((_, i) => i !== idx);
            renderModalIngredients();
        });

        li.appendChild(left);
        li.appendChild(btn);
        modalIngredientsList.appendChild(li);
    });
}

function addToCatalog(name){
    const n = name.trim();
    if (!n) return;
    const key = norm(n);
    const cat = getCatalog();
    const exists = cat.some(x => norm(x) === key);
    if (!exists) {
        cat.unshift(n);
        setCatalog(cat);
    }
}

function addIngredientToModal(){
    const value = ingredientInputModal.value.trim();
    if (!value) return;

    // unikamy duplikatów w obrębie jednego dania
    if (!modalIngredients.some(x => norm(x) === norm(value))) {
        modalIngredients.push(value);
    }

    addToCatalog(value);

    ingredientInputModal.value = '';
    renderModalIngredients();
    ingredientInputModal.focus();
}

addIngredientModalBtn.addEventListener('click', addIngredientToModal);
ingredientInputModal.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addIngredientToModal();
});

// ===== SAVE meal =====
function ensureIngredientsAdded(ingredientNames){
    const list = getIngredients();
    const map = new Map(list.map(i => [norm(i.name), i]));

    ingredientNames.forEach(name => {
        const key = norm(name);
        if (!key) return;
        if (!map.has(key)) {
            list.unshift({ id: uid(), name: name.trim(), bought: false, createdAt: Date.now() });
            map.set(key, true);
        }
    });

    setIngredients(list);
}

saveMealBtn.addEventListener('click', () => {
    const dayIndex = Number(daySelect.value);
    const mealName = mealNameInput.value.trim();

    if (!mealName) {
        alert('Wpisz nazwę dania.');
        mealNameInput.focus();
        return;
    }

    // dodaj do listy dań
    const meals = getMeals();
    const nextOrder = meals.filter(m => m.dayIndex === dayIndex).length;

    meals.push({
        id: uid(),
        dayIndex,
        name: mealName,
        ingredients: [...modalIngredients],
        order: nextOrder
    });

    setMeals(meals);

    // składniki z modala trafiają na listę składników
    if (modalIngredients.length) {
        ensureIngredientsAdded(modalIngredients);
    }

    closeModal();
    renderMeals();
    renderIngredients();
});

// ===== INGREDIENTS screen =====
function renderIngredients(){
    const list = getIngredients().slice();

    // niekupione na górze, kupione na dole
    list.sort((a,b) => Number(a.bought) - Number(b.bought));

    ingredientsList.innerHTML = '';
    list.forEach(item => {
        const li = document.createElement('li');
        li.className = 'li';

        const left = document.createElement('div');
        left.style.display = 'flex';
        left.style.gap = '10px';
        left.style.alignItems = 'center';

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = !!item.bought;

        const name = document.createElement('span');
        name.textContent = item.name;
        if (item.bought) name.className = 'liStrike';

        cb.addEventListener('change', () => {
            const all = getIngredients();
            const idx = all.findIndex(x => x.id === item.id);
            if (idx >= 0) {
                all[idx].bought = cb.checked;
                setIngredients(all);
                renderIngredients();
            }
        });

        left.appendChild(cb);
        left.appendChild(name);

        li.appendChild(left);
        ingredientsList.appendChild(li);
    });
}

function addIngredientFromMain(){
    const value = ingredientInputMain.value.trim();
    if (!value) return;

    addToCatalog(value);

    const list = getIngredients();
    const exists = list.some(x => norm(x.name) === norm(value));
    if (!exists) {
        list.unshift({ id: uid(), name: value, bought: false, createdAt: Date.now() });
        setIngredients(list);
        renderIngredients();
    }

    ingredientInputMain.value = '';
    ingredientInputMain.focus();
}

addIngredientMainBtn.addEventListener('click', addIngredientFromMain);
ingredientInputMain.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addIngredientFromMain();
});

// ===== INIT =====
initDaySelect();
setScreen('meals');
renderMeals();
renderIngredients();
