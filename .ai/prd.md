# Dokument wymagań produktu (PRD) - 10xFacts
## 1. Przegląd produktu
10xFacts to webowa aplikacja do kolekcjonowania, przeglądania i szybkiego odkrywania ciekawostek w formie fiszek. Produkt ma pomagać użytkownikom „błysnąć” ciekawostką i poszerzać horyzonty bez trybu nauki (brak spaced repetition i treningu pamięci).

MVP koncentruje się na:
- generowaniu pojedynczych fiszek przez AI na podstawie tematu (lub losowej domeny),
- manualnym tworzeniu fiszek,
- porządkowaniu treści w strukturze: kolekcja (kategoria) → temat → fiszki,
- prostym przeglądaniu, wyszukiwaniu, edycji i usuwaniu,
- kontach użytkowników do przechowywania danych,
- podstawowych metrykach jakości i adopcji AI w panelu admina.

Definicje kluczowe:
- Kolekcja (kategoria): najwyższy poziom organizacji, zawiera tematy.
- Temat: należy do jednej kolekcji; posiada edytowalny opis w formie listy zagadnień. Aktualna wersja opisu jest używana przy kolejnych generacjach AI dla tego tematu.
- Fiszka: tytuł (front) + opis (back); brak innych pól treściowych.
- Kolekcja losowa / Temat losowy: systemowa, stała i nieusuwalna kolekcja z tematem, gdzie AI losuje domenę z listy zdefiniowanej po stronie backendu i generuje pojedynczą losową ciekawostkę.

## 2. Problem użytkownika
Tworzenie wysokiej jakości fiszek edukacyjnych i ciekawostek manualnie jest czasochłonne, co zniechęca do regularnego zgłębiania wiedzy na konkretne tematy. Użytkownik potrzebuje prostego sposobu na:
- szybkie uzyskanie krótkiej, zwięzłej ciekawostki na interesujący temat,
- uporządkowanie ciekawostek w kolekcje i tematy,
- łatwe filtrowanie i wyszukiwanie zapisanych treści,
- zachowanie danych na koncie (przenośność między urządzeniami w ramach web).

## 3. Wymagania funkcjonalne
Poniżej wymagania funkcjonalne MVP (bez implementacyjnych szczegółów UI, ale z jednoznacznym zakresem zachowań).

### 3.1 Konta użytkowników i dostęp
1. Rejestracja i logowanie użytkownika e-mail/hasło z wykorzystaniem Supabase Auth.
2. Dane (kolekcje, tematy, fiszki, ulubione) są przypisane do użytkownika i niedostępne dla innych użytkowników.
3. Wylogowanie.
4. Dostęp do panelu admina ograniczony do kont z uprawnieniami admina.

### 3.2 Struktura treści: kolekcje i tematy
1. Użytkownik może tworzyć dowolną liczbę kolekcji.
2. Użytkownik może tworzyć tematy w obrębie kolekcji.
3. Temat ma opis w formie listy zagadnień:
   - opis jest edytowalny,
   - aktualna wersja opisu jest używana przez AI podczas generowania fiszek w danym temacie.
4. Brak zmiany nazw kolekcji i tematów w MVP (nazwy są nieedytowalne po utworzeniu).
5. Usuwanie:
   - usunięcie tematu usuwa wszystkie jego fiszki (hard delete),
   - usunięcie kolekcji usuwa wszystkie tematy i fiszki w kolekcji (hard delete).

### 3.3 Fiszki: tworzenie, edycja, usuwanie, ulubione
1. Format fiszki:
   - tytuł (front), maks. 200 znaków,
   - opis (back), maks. 600 znaków.
2. Manualne tworzenie fiszki w obrębie tematu (formularz).
3. Generowanie AI:
   - generowanie zawsze zwraca dokładnie 1 fiszkę na akcję użytkownika,
   - w tematach użytkownika generacja bazuje na aktualnym opisie tematu,
   - w Temacie losowym AI losuje domenę z backendowej listy i generuje 1 fiszkę.
4. Podgląd wygenerowanej fiszki ma akcje:
   - Zapisz: tworzy rekord fiszki i liczy się jako akceptacja,
   - Odrzuć: nie tworzy fiszki i liczy się jako odrzucenie,
   - brak akcji: traktowane jako pominięcie (nie wliczane do metryk akceptacji).
5. Edycja fiszki:
   - użytkownik może edytować wyłącznie tytuł i opis,
   - źródło fiszki (manualna vs AI) jest niezmienne,
   - istnieje flaga edited_by_user do metryk.
6. Usuwanie fiszki (hard delete).
7. Ulubione:
   - przełącznik ulubionych na fiszce,
   - możliwość filtrowania ulubionych w obrębie tematu,
   - możliwość filtrowania ulubionych w obrębie kategorii,
   - dashboard może wyświetlać losowe ulubione globalnie (bez mechanizmu anty-powtórzeń).

### 3.4 Przeglądanie, wyszukiwanie i filtrowanie
1. Nawigacja list:
   - lista kolekcji, z wyszukiwaniem po nazwie,
   - lista tematów w kolekcji, z wyszukiwaniem po nazwie,
   - lista fiszek w temacie, z wyszukiwaniem po tytule i opisie.
2. Wyszukiwanie jest proste (strict):
   - brak normalizacji diakrytyków (np. Slowo nie równa się Słowo),
   - brak tolerancji literówek.
3. Filtrowanie fiszek w temacie:
   - filtr ulubionych (is_favorite),
   - filtr źródła: manually_created vs auto_generated.

### 3.5 Systemowa losowość
1. W aplikacji istnieje systemowa, stała, nieusuwalna kolekcja Kolekcja losowa zawierająca temat Temat losowy.
2. Temat losowy nie ma filtrów losowości widocznych dla użytkownika.
3. Backend utrzymuje ukrytą listę domen/obszarów, z której wybierany jest temat do losowania.

### 3.6 Limity generacji AI
1. Limit dzienny generacji AI jest liczony łącznie per użytkownik (w całej aplikacji).
2. Limit resetuje się o 00:00 UTC.
3. Wartość limitu X jest konfigurowalna po stronie backendu.
4. Limit jest sprawdzany i egzekwowany po stronie backendu w standardowych scenariuszach użycia.
5. MVP nie gwarantuje ścisłej odporności na równoległe żądania generacji (np. wielokrotne szybkie kliknięcia); UI powinno minimalizować przypadkowe powtórzenia przez blokadę akcji generowania na czas trwania żądania.

### 3.7 Metryki i panel admina
1. W aplikacji dostępny jest panel admina widoczny wyłącznie dla administratorów.
2. Panel admina pokazuje metryki:
   - stosunek akceptacji do odrzuceń fiszek generowanych przez AI,
   - stosunek auto_generated do manually_created.
3. Definicja akceptacji/odrzucenia dla AI:
   - akceptacja: akcja Zapisz na podglądzie wygenerowanej fiszki,
   - odrzucenie: akcja Odrzuć,
   - pominięcie: zamknięcie/opuszczenie widoku bez akcji (nie wliczane do wskaźnika akceptacji).

## 4. Granice produktu
### 4.1 Poza zakresem MVP (nie implementujemy)
1. Udostępnianie i współdzielenie kolekcji/tematów/fiszek między użytkownikami.
2. Integracje z innymi platformami edukacyjnymi.
3. Aplikacje mobilne natywne (start: tylko web).
4. Tryb nauki i mechanizmy powtórek (spaced repetition), quizy, testy wiedzy.
5. Zaawansowane wyszukiwanie (tolerancja literówek, normalizacja diakrytyków, stemming).
6. Rozbudowane mechanizmy jakości, cytowania źródeł i weryfikacji faktów (start: minimalne podejście).
7. Zmiana nazw kolekcji i tematów po utworzeniu.
8. Zagnieżdżanie kolekcji, tagi, dodatkowe poziomy hierarchii.

### 4.2 Założenia i ograniczenia
1. Struktura danych jest płaska i stała: kolekcja → temat → fiszka; brak innych poziomów.
2. Fiszka ma wyłącznie tytuł i opis; limity znaków obowiązują zarówno dla manualnych, jak i AI.
3. Hard delete jest świadomą decyzją MVP; aplikacja powinna ostrzegać o nieodwracalności operacji usuwania.
4. Losowość dla Tematu losowego jest „pełna” z perspektywy użytkownika, ale może być ograniczana ukrytą listą domen po stronie backendu.

## 5. Historyjki użytkowników
Poniższe historyjki obejmują scenariusze podstawowe, alternatywne i skrajne. Każda historyjka jest testowalna i ma jednoznaczne kryteria akceptacji.

### US-001 Rejestracja konta
Opis: Jako nowy użytkownik chcę założyć konto (e-mail/hasło), aby móc przechowywać własne kolekcje, tematy i fiszki.
Kryteria akceptacji:
- Użytkownik może podać e-mail i hasło oraz utworzyć konto.
- Po udanej rejestracji użytkownik jest zalogowany lub otrzymuje jasną informację o kolejnym kroku (zgodnie z konfiguracją Supabase).
- Przy niepoprawnych danych (np. pusty e-mail/hasło) aplikacja blokuje wysłanie lub pokazuje komunikat błędu.
- Przy e-mailu już użytym aplikacja pokazuje komunikat błędu i nie tworzy drugiego konta.

### US-002 Logowanie
Opis: Jako użytkownik chcę zalogować się e-mail/hasło, aby uzyskać dostęp do moich danych.
Kryteria akceptacji:
- Użytkownik może zalogować się poprawnymi danymi.
- Przy błędnym haśle lub nieistniejącym koncie aplikacja pokazuje komunikat błędu i nie loguje użytkownika.
- Po zalogowaniu użytkownik widzi swoje kolekcje i nie widzi danych innych użytkowników.

### US-003 Wylogowanie
Opis: Jako użytkownik chcę się wylogować, aby zakończyć sesję na urządzeniu współdzielonym.
Kryteria akceptacji:
- Użytkownik może się wylogować z aplikacji.
- Po wylogowaniu zasoby wymagające sesji są niedostępne, a próba wejścia przekierowuje do logowania.

### US-004 Dostęp do panelu admina (autoryzacja)
Opis: Jako administrator chcę mieć dostęp do panelu admina, aby oglądać metryki produktu, a jako zwykły użytkownik nie chcę mieć do niego dostępu.
Kryteria akceptacji:
- Konto z uprawnieniami admina może otworzyć panel admina.
- Konto bez uprawnień admina nie widzi linku do panelu admina lub otrzymuje błąd braku dostępu.
- Próba bezpośredniego wejścia na URL panelu admina przez użytkownika bez uprawnień jest blokowana i przekierowuje do dashboardu (jeśli użytkownik jest zalogowany).

### US-005 Utworzenie kolekcji
Opis: Jako użytkownik chcę utworzyć kolekcję, aby pogrupować tematy.
Kryteria akceptacji:
- Użytkownik może utworzyć kolekcję podając nazwę.
- Nowa kolekcja pojawia się na liście kolekcji użytkownika.
- Użytkownik nie może utworzyć kolekcji bez nazwy (walidacja).

### US-006 Przeglądanie listy kolekcji
Opis: Jako użytkownik chcę widzieć listę moich kolekcji, aby szybko przejść do interesujących tematów.
Kryteria akceptacji:
- Lista kolekcji pokazuje wyłącznie kolekcje zalogowanego użytkownika oraz systemową Kolekcję losową.
- Kolekcja losowa jest widoczna zawsze.

### US-007 Wyszukiwanie kolekcji po nazwie
Opis: Jako użytkownik chcę wyszukać kolekcję po nazwie, aby szybciej ją znaleźć.
Kryteria akceptacji:
- Pole wyszukiwania filtruje listę kolekcji po nazwie.
- Wyszukiwanie działa w trybie strict (bez normalizacji diakrytyków i bez tolerancji literówek).

### US-008 Utworzenie tematu w kolekcji
Opis: Jako użytkownik chcę utworzyć temat w wybranej kolekcji, aby grupować fiszki w ramach jednego zagadnienia.
Kryteria akceptacji:
- Użytkownik może utworzyć temat w konkretnej kolekcji.
- Nowy temat pojawia się na liście tematów w tej kolekcji.
- Użytkownik nie może utworzyć tematu bez nazwy (walidacja).

### US-009 Uzupełnienie opisu tematu (lista zagadnień)
Opis: Jako użytkownik chcę dodać opis tematu w formie listy zagadnień, aby ukierunkować generacje AI.
Kryteria akceptacji:
- Użytkownik może zapisać opis tematu.
- Po zapisaniu opis jest widoczny przy ponownym otwarciu tematu.
- Opis może być pusty, ale aplikacja komunikuje, że wpływa to na jakość generacji (np. krótką wskazówką).

### US-010 Edycja opisu tematu
Opis: Jako użytkownik chcę edytować opis tematu, aby zmienić kierunek kolejnych generacji AI.
Kryteria akceptacji:
- Użytkownik może zmienić zapisany opis tematu.
- Kolejna generacja AI w tym temacie bazuje na aktualnym opisie (nie na wersji historycznej).

### US-011 Brak możliwości zmiany nazwy tematu i kolekcji (ograniczenie MVP)
Opis: Jako użytkownik chcę rozumieć, że w MVP nie mogę zmienić nazwy kolekcji ani tematu, aby nie szukać tej opcji bezskutecznie.
Kryteria akceptacji:
- UI nie udostępnia opcji zmiany nazwy kolekcji ani tematu.
- Jeśli użytkownik próbuje wykonać taką akcję (np. przez pola edycyjne), nie jest ona dostępna.

### US-012 Przeglądanie listy tematów w kolekcji
Opis: Jako użytkownik chcę przeglądać tematy w kolekcji, aby wejść do fiszek.
Kryteria akceptacji:
- Użytkownik widzi listę tematów wybranej kolekcji.
- Lista zawiera tylko tematy tej kolekcji i tylko dane użytkownika (z wyjątkiem systemowego Tematu losowego w Kolekcji losowej).

### US-013 Wyszukiwanie tematów po nazwie
Opis: Jako użytkownik chcę wyszukać temat po nazwie, aby szybciej go znaleźć.
Kryteria akceptacji:
- Pole wyszukiwania filtruje listę tematów po nazwie.
- Wyszukiwanie jest strict (bez normalizacji diakrytyków, bez literówek).

### US-014 Manualne dodanie fiszki do tematu
Opis: Jako użytkownik chcę ręcznie dodać fiszkę do tematu, aby zapisać ciekawostkę bez użycia AI.
Kryteria akceptacji:
- Użytkownik może dodać fiszkę z tytułem i opisem.
- Walidacja ograniczeń: tytuł maks. 200 znaków, opis maks. 600 znaków.
- Po zapisaniu fiszka pojawia się na liście fiszek w temacie.
- Źródło fiszki jest oznaczone jako manually_created.

### US-015 Walidacja długości pól fiszki (skrajne przypadki)
Opis: Jako użytkownik chcę dostać jasny komunikat, gdy przekroczę limit znaków, aby poprawić treść.
Kryteria akceptacji:
- Gdy tytuł ma 201+ znaków, zapis jest zablokowany i wyświetla się komunikat walidacyjny.
- Gdy opis ma 601+ znaków, zapis jest zablokowany i wyświetla się komunikat walidacyjny.
- Gdy tytuł/opis mieszczą się w limitach, zapis jest możliwy.

### US-016 Przeglądanie listy fiszek w temacie
Opis: Jako użytkownik chcę widzieć listę fiszek w temacie, aby czytać zapisane ciekawostki.
Kryteria akceptacji:
- Lista fiszek pokazuje wszystkie fiszki przypisane do tematu.
- Każda fiszka pokazuje co najmniej tytuł oraz możliwość wejścia w szczegóły/podgląd.

### US-017 Wyszukiwanie fiszek po tytule i opisie
Opis: Jako użytkownik chcę wyszukiwać fiszki po słowach kluczowych, aby znaleźć konkretną ciekawostkę.
Kryteria akceptacji:
- Wyszukiwanie filtruje fiszki po tytule i opisie.
- Wyszukiwanie jest strict (bez normalizacji diakrytyków i bez tolerancji literówek).

### US-018 Filtrowanie fiszek po ulubionych w temacie
Opis: Jako użytkownik chcę filtrować fiszki po ulubionych, aby szybko zobaczyć najciekawsze.
Kryteria akceptacji:
- Użytkownik może włączyć filtr pokazujący tylko ulubione fiszki w temacie.
- Wyłączenie filtra pokazuje wszystkie fiszki w temacie.

### US-019 Filtrowanie fiszek po źródle (manual vs AI)
Opis: Jako użytkownik chcę filtrować fiszki po źródle, aby rozróżnić treści manualne i wygenerowane.
Kryteria akceptacji:
- Użytkownik może ustawić filtr: tylko manually_created.
- Użytkownik może ustawić filtr: tylko auto_generated.
- Użytkownik może wyczyścić filtr i zobaczyć wszystkie fiszki.

### US-020 Oznaczenie fiszki jako ulubionej
Opis: Jako użytkownik chcę oznaczać fiszki jako ulubione, aby łatwo do nich wracać.
Kryteria akceptacji:
- Użytkownik może przełączyć is_favorite na fiszce.
- Stan ulubionych jest zapisywany i zachowany po odświeżeniu.

### US-021 Dashboard: losowe ulubione globalnie
Opis: Jako użytkownik chcę zobaczyć losowe ulubione fiszki na dashboardzie, aby szybko trafić na ciekawostkę.
Kryteria akceptacji:
- Dashboard może wyświetlać losowy zestaw ulubionych fiszek z całego konta (w tym z Kolekcji losowej).
- Mechanizm może powtarzać fiszki (brak anty-powtórzeń w MVP).

### US-022 Generowanie AI w temacie użytkownika (podstawowy scenariusz)
Opis: Jako użytkownik chcę wygenerować jedną fiszkę przez AI w wybranym temacie, aby szybko uzyskać ciekawostkę zgodną z opisem tematu.
Kryteria akceptacji:
- Użytkownik może uruchomić generowanie w obrębie tematu.
- Generowanie zwraca dokładnie 1 propozycję fiszki.
- Treść generacji respektuje limity: tytuł do 200 znaków, opis do 600 znaków (po stronie systemu).
- Podgląd pokazuje akcje Zapisz oraz Odrzuć.

### US-023 Zapisz wygenerowaną fiszkę (akceptacja)
Opis: Jako użytkownik chcę zapisać wygenerowaną fiszkę, aby dodać ją do mojej kolekcji.
Kryteria akceptacji:
- Kliknięcie Zapisz tworzy rekord fiszki w temacie.
- Fiszka ma źródło auto_generated.
- Zdarzenie jest liczone jako akceptacja AI.
- Po zapisie fiszka jest widoczna na liście fiszek.

### US-024 Odrzuć wygenerowaną fiszkę (odrzucenie)
Opis: Jako użytkownik chcę odrzucić wygenerowaną fiszkę, aby nie trafiała do moich danych.
Kryteria akceptacji:
- Kliknięcie Odrzuć nie tworzy fiszki.
- Zdarzenie jest liczone jako odrzucenie AI.
- Użytkownik może wygenerować kolejną fiszkę (o ile limit na to pozwala).

### US-025 Pominięcie wygenerowanej fiszki (brak akcji)
Opis: Jako użytkownik chcę móc opuścić podgląd bez podejmowania decyzji, a system nie powinien tego liczyć jako akceptację ani odrzucenie.
Kryteria akceptacji:
- Zamknięcie/opuszczenie widoku podglądu bez kliknięcia Zapisz lub Odrzuć nie tworzy fiszki.
- Zdarzenie jest rejestrowane jako pominięcie lub nie jest rejestrowane w metryce akceptacji (nie wpływa na wskaźnik akceptacji).

### US-026 Egzekwowanie limitu dziennego generacji (podstawowy)
Opis: Jako użytkownik chcę rozumieć, że mam limit generacji dziennie, aby planować korzystanie z AI.
Kryteria akceptacji:
- Gdy użytkownik ma dostępne generacje, generowanie działa.
Na podstawie opisu MVP z @prd.md oraz stacku technologicznego z @tech-stack.md przygotuj prompt dla generatora proof of concept, który pozwoli nam zweryfikować podstawową funkcjonalność aplikacji czyli {{KEYFEATURE}}. Wyklucz wszystkie nadmiarowe funkcje. Zaznacz, aby generator rozplanował pracę i uzyskał moją akceptację zanim przejdzie do tworzenia PoC.
- Gdy limit jest wykorzystany, generowanie jest zablokowane i pokazuje komunikat o limicie oraz informację o resecie o 00:00 UTC.


### US-027 Reset limitu o północy UTC
Opis: Jako użytkownik chcę, aby limit generacji resetował się o 00:00 UTC, aby codziennie mieć nowe generacje.
Kryteria akceptacji:
- Po zmianie daty UTC na nową dobę użytkownik może generować ponownie aż do limitu X.
- Reset jest liczony według UTC, nie lokalnej strefy czasu użytkownika.

### US-028 Generowanie w Temacie losowym
Opis: Jako użytkownik chcę wygenerować losową ciekawostkę w Temacie losowym, aby szybko odkrywać nowe obszary.
Kryteria akceptacji:
- Temat losowy jest dostępny zawsze w Kolekcji losowej.
- Kliknięcie generowania zwraca dokładnie 1 propozycję fiszki.
- Domeny do losowania są niewidoczne dla użytkownika i pochodzą z backendowej listy.
- Podgląd umożliwia Zapisz i Odrzuć, identycznie jak w tematach użytkownika.

### US-030 Ochrona systemowej Kolekcji losowej przed usunięciem
Opis: Jako użytkownik nie chcę przypadkowo usunąć systemowej Kolekcji losowej ani Tematu losowego.
Kryteria akceptacji:
- UI nie pozwala usunąć Kolekcji losowej.
- UI nie pozwala usunąć Tematu losowego.
- Próby takich operacji po stronie API są blokowane (jeśli użytkownik spróbuje wymusić żądanie).

### US-031 Edycja fiszki (zarówno manualnej, jak i AI)
Opis: Jako użytkownik chcę edytować tytuł i opis fiszki, aby poprawić treść.
Kryteria akceptacji:
- Użytkownik może zmienić tytuł i/lub opis fiszki z walidacją limitów 200/600.
- Źródło fiszki (manualna vs AI) nie zmienia się po edycji.
- Jeśli edytowana jest fiszka, flaga edited_by_user jest ustawiona na true.

### US-032 Usunięcie fiszki
Opis: Jako użytkownik chcę usunąć fiszkę, aby pozbyć się niepotrzebnej treści.
Kryteria akceptacji:
- Użytkownik może usunąć fiszkę.
- Po usunięciu fiszka nie jest widoczna na liście.
- Operacja jest nieodwracalna (hard delete) i aplikacja wyświetla potwierdzenie przed usunięciem.

### US-033 Usunięcie tematu z kaskadowym usunięciem fiszek
Opis: Jako użytkownik chcę usunąć temat, aby uporządkować kolekcję, rozumiejąc że wszystkie fiszki z tematu znikną.
Kryteria akceptacji:
- Przed usunięciem temat wymaga potwierdzenia zawierającego informację o usunięciu wszystkich fiszek.
- Po usunięciu tematu nie jest on widoczny w kolekcji.
- Fiszki przypisane do tematu są usunięte (hard delete).

### US-034 Usunięcie kolekcji z kaskadowym usunięciem tematów i fiszek
Opis: Jako użytkownik chcę usunąć kolekcję, aby pozbyć się całego obszaru treści, rozumiejąc konsekwencje.
Kryteria akceptacji:
- Przed usunięciem kolekcja wymaga potwierdzenia zawierającego informację o usunięciu wszystkich tematów i fiszek.
- Po usunięciu kolekcji nie jest ona widoczna na liście.
- Tematy i fiszki w kolekcji są usunięte (hard delete).

### US-035 Izolacja danych między użytkownikami (bezpieczeństwo)
Opis: Jako użytkownik chcę mieć pewność, że inni użytkownicy nie zobaczą moich kolekcji, tematów i fiszek.
Kryteria akceptacji:
- Po zalogowaniu użytkownik widzi wyłącznie swoje dane oraz systemową Kolekcję losową.
- Próba odczytu zasobów innego użytkownika przez API jest odrzucona.

### US-036 Panel admina: metryka akceptacji AI
Opis: Jako administrator chcę zobaczyć wskaźnik akceptacji AI, aby mierzyć jakość generowanych fiszek.
Kryteria akceptacji:
- Panel admina pokazuje liczbę akceptacji i odrzuceń AI oraz wyliczony wskaźnik akceptacji: akceptacje / (akceptacje + odrzucenia).
- Pominięcia nie są wliczane do mianownika wskaźnika.

### US-037 Panel admina: udział AI vs manual
Opis: Jako administrator chcę zobaczyć udział fiszek tworzonych przez AI względem manualnych, aby mierzyć adopcję AI.
Kryteria akceptacji:
- Panel admina pokazuje liczbę fiszek auto_generated i manually_created oraz ich udział procentowy.
- Dane są prezentowane na podstawie niezmiennego źródła fiszki.

### US-038 Błędy generowania AI (alternatywny scenariusz)
Opis: Jako użytkownik chcę dostać jasny komunikat, gdy generowanie się nie powiedzie, abym mógł spróbować ponownie.
Kryteria akceptacji:
- Gdy backend zwraca błąd generowania, UI pokazuje komunikat o błędzie i nie tworzy fiszki.
- Użytkownik może ponowić generowanie.
- Nieudane generacje nie powinny tworzyć wpisów fiszki.

## 6. Metryki sukcesu
Metryki sukcesu MVP (docelowo widoczne w panelu admina):

1. Jakość generacji AI (akceptacja):
   - cel: co najmniej 75% fiszek wygenerowanych przez AI jest akceptowanych przez użytkownika,
   - definicja: accept_rate = liczba akceptacji / (liczba akceptacji + liczba odrzuceń),
   - uwaga: pominięcia nie są wliczane do wskaźnika.

2. Adopcja AI w tworzeniu treści:
   - cel: użytkownicy tworzą co najmniej 75% fiszek z wykorzystaniem AI,
   - definicja: ai_share = liczba auto_generated / (liczba auto_generated + liczba manually_created).

3. Metryka operacyjna (kontrolna, bez celu liczbowego w PRD):
   - odsetek prób generowania zablokowanych limitem (monitorowanie kosztów i dopasowania X).

Lista kontrolna po PRD:
- Każdą historię użytkownika można przetestować: tak, każda ma kryteria akceptacji oparte o obserwowalne wyniki.
- Kryteria akceptacji są jasne i konkretne: tak, opisują warunki sukcesu/porażki i zachowanie systemu.
- Jest wystarczająco dużo historyjek użytkownika do zbudowania w pełni funkcjonalnego MVP: tak, obejmują konta, strukturę treści, fiszki, generowanie AI, limity, losowość, wyszukiwanie, ulubione, usuwanie, admin metryki oraz scenariusze alternatywne/skrajne.
- Uwzględniono uwierzytelnianie i autoryzację: tak, ujęto rejestrację, logowanie, wylogowanie, izolację danych oraz ograniczenie panelu admina.
