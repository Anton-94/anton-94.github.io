# TODO — Plan dań PWA

Lista zadań do wykonania w projekcie.

## 🔥 Priorytet wysoki

### Funkcjonalność

- [ ] **Edycja dań** — możliwość edycji nazwy i składników istniejącego dania
- [ ] **Usuwanie składnika z listy zakupów** — przycisk usuń obok składnika
- [ ] **Walidacja inputów** — sprawdzanie długości, znaków specjalnych
- [ ] **Obsługa błędów** — lepsze komunikaty błędów dla użytkownika

### Techniczne

- [ ] **Error handling** — try/catch w krytycznych miejscach

### UX

- [ ] **Potwierdzenie przed usunięciem dania** — dialog "Czy na pewno?"
- [ ] **Toast notifications** — powiadomienia o sukcesie/błędzie
- [ ] **Empty states** — komunikaty gdy brak dań/składników
- [ ] **Skeleton loading** — placeholder podczas ładowania

---

## 📌 Priorytet średni

### Funkcjonalność

- [ ] **Wyszukiwanie dań** — input do filtrowania dań
- [ ] **Historia tygodni** — przeglądanie poprzednich tygodni

### Techniczne

- [ ] **Migracja na IndexedDB** — większe limity niż localStorage

### UX

- [ ] **Animacje** — smooth transitions między ekranami
- [ ] **Drag & drop feedback** — lepsza wizualizacja podczas przeciągania
- [ ] **Swipe gestures** — przesuwanie palcem do usunięcia
- [ ] **Pull to refresh** — odświeżanie przez pociągnięcie w dół

---

## 💡 Priorytet niski

### Funkcjonalność

- [ ] **Statystyki** — najczęściej używane składniki, dania
- [ ] **Kalorie** — obliczanie kalorii dla dań
- [ ] **Ulubione dania** — lista ulubionych dań do szybkiego dodania

### Techniczne

coś z tego zapytaj mnie
- [ ] **Framework** — React/Vue dla lepszej skalowalności
- [ ] **Modularyzacja** — podział app.js na moduły
- [ ] **Build tool** — Vite/Rollup dla bundlingu

---

## 🔄 Refactoring

### Struktura kodu

- [ ] **Podział app.js** — rozbicie na moduły:
  - [ ] `core/storage.js` — localStorage operations
  - [ ] `core/utils.js` — helper functions
  - [ ] `models/Meal.js` — Meal model & operations
  - [ ] `models/Ingredient.js` — Ingredient model & operations
  - [ ] `models/Catalog.js` — Catalog model & operations
  - [ ] `components/MealsList.js` — rendering meals
  - [ ] `components/IngredientsList.js` — rendering ingredients
  - [ ] `components/Modal.js` — modal management
  - [ ] `components/Autocomplete.js` — autocomplete logic
  - [ ] `components/DragDrop.js` — drag & drop handlers
  - [ ] `screens/MealsScreen.js` — screen 1 logic
  - [ ] `screens/IngredientsScreen.js` — screen 2 logic
  - [ ] `app.js` — main entry point
---

## 🚀 Features (pomysły na przyszłość)

### Synchronizacja

trzeba pomyśleć jak
- [ ] **Współdzielenie** — udostępnianie planu rodzinie
---

## 🐛 Znane problemy

### Wysokie

- [ ] **Drag & drop na mobile** — może wymagać dodatkowych touch handlers
- [ ] **localStorage limit** — brak obsługi przekroczenia limitu
- [ ] **Brak backupu** — utrata danych przy wyczyszczeniu przeglądarki

### Średnie

- [ ] **Walidacja danych** — brak sprawdzania poprawności danych z localStorage
- [ ] **Error handling** — minimalna obsługa błędów
- [ ] **Performance** — full re-render przy każdej zmianie

### Niskie

- [ ] **Accessibility** — brak ARIA labels
- [ ] **Keyboard navigation** — ograniczona obsługa klawiatury
- [ ] **Browser compatibility** — nie testowane na starszych przeglądarkach

- **Ostatnia aktualizacja:** 2026-02-18
