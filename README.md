# Optimizacija prijevoza radnih strojeva

**Demo:** https://uprent-routing.vercel.app

Prototip web-aplikacije koja raspoređuje transportne naloge na dva kamiona, određuje redoslijed preuzimanja i isporuka za svaki kamion i traži raspored s najmanjom ukupnom kilometražom, uz poštivanje nosivosti, broja strojeva, radnog vremena i obaveznog povratka u bazu.

**Rezultat za zadane podatke:** svih 10 naloga izvršeno, ukupno **200,1 km** (kamion A 37,2 km, kamion B 162,9 km). Rješenje je dokazano optimalno za zadane pretpostavke (vidi [Optimizacijska logika](#optimizacijska-logika)).

## Pokretanje

Potrebno: Node.js 20.19+ ili 22+ i npm.

```bash
npm install
npm run dev      # aplikacija na http://localhost:5173
npm test         # svi testovi
npm run build    # produkcijska verzija u mapi dist/
```

U aplikaciji klikni **Izračunaj raspored**. Ulazni podaci su u sklopivom panelu na vrhu stranice, a rezultat se prikazuje ispod: sažetak kilometraže, ruta svakog kamiona (redoslijed lokacija, radnja, nalog, dionica, kumulativna kilometraža, opterećenje i broj strojeva nakon svake radnje), iskorišteno radno vrijeme, karta ruta i upozorenja za naloge koje nije moguće izvršiti.

## Tehnologije

- **TypeScript + React + Vite**: jedan jezik za logiku i sučelje, izračun se izvodi u pregledniku (oko 60 ms), bez backenda i vanjskih API-ja.
- **Vitest**: testovi.
- Nije korištena nijedna optimizacijska biblioteka. Za 10 naloga moguće je pronaći egzaktni optimum vlastitim algoritmom, koji je kratak i u potpunosti objašnjiv.

## Struktura projekta

```
src/
  domain/      tipovi, ulazni podaci iz zadatka, euklidska udaljenost
  validator/   neovisna provjera rute i plana (sva poslovna ograničenja)
  solver/      optimizacija i objašnjenje neizvršenih naloga
  ui/          React komponente (ulazni podaci, rezultat, karta)
  App.tsx      povezuje podatke, solver i prikaz
```

Poslovna logika (`domain`, `validator`, `solver`) ne ovisi o Reactu, pa se testira zasebno i može se koristiti s drugim sučeljem. Svi ulazni podaci nalaze se u `src/domain/data.ts`. Dodavanje kamiona, stroja ili naloga svodi se na jedan redak.

## Pretpostavke

Zadatak ostavlja nekoliko stvari otvorenima. Odabrane su sljedeće interpretacije:

1. **Radni dan od 9 sati obuhvaća vožnju i utovar/istovar.** Svaka radnja (svako preuzimanje i svaka isporuka) traje 20 minuta, uključujući radnje u bazi. Vrijeme rute = kilometraža / 60 km/h + broj radnji × 20 min ≤ 540 min. Ovo je konzervativnija interpretacija. Ako se 9 sati odnosi samo na vožnju, mijenja se jedna linija u `src/validator/evaluate.ts` i jedna u `src/solver/solve.ts`.
2. **Svaki kamion vozi jednu turu u jednom danu:** polazi iz baze, odrađuje svoje naloge i vraća se u bazu.
3. **Zaokruživanje:** svaka dionica zaokružuje se na jednu decimalu, a ukupna kilometraža je zbroj zaokruženih dionica.
4. **Cilj optimizacije:** prvo izvršiti što više naloga, zatim minimizirati ukupnu kilometražu oba kamiona. Ravnomjerna raspodjela posla nije cilj. Zato kamion A dobiva jedan nalog, a kamion B devet.
5. **Nalog koji nije moguće izvršiti** ne ruši izračun: ostali nalozi se raspoređuju, a aplikacija jasno navodi koji nalog nije izvršen i zašto (stroj pretežak za sve kamione, ne stane u radni dan, ili ga nije moguće uklopiti uz ostale naloge).

## Optimizacijska logika

Problem je varijanta problema usmjeravanja vozila s preuzimanjem i isporukom (_pickup and delivery problem_) s ograničenim kapacitetom. Rješava se egzaktno, dinamičkim programiranjem u dvije razine.

**1. Najkraća ruta za jedan kamion i svaki podskup naloga.** Stanje pretrage je status svakog naloga (netaknut, na kamionu ili isporučen) i zadnja odrađena radnja. Iz stanja su dopuštene samo valjane radnje: preuzimanje ako stroj stane na kamion po težini i broju strojeva, te isporuka ako je stroj već na tom kamionu. Time su nosivost, broj strojeva, redoslijed (preuzimanje prije isporuke) i pravilo "isti kamion" ugrađeni u samu pretragu, a ne provjeravaju se naknadno. Za svaki podskup naloga pamti se najkraća ruta s povratkom u bazu, a podskupovi koji ne stanu u radni dan odbacuju se. Za fiksni skup naloga vrijeme utovara je stalno, pa je dovoljno provjeriti najkraću rutu.

**2. Podjela naloga među kamionima.** Za svaki podskup naloga traži se najbolja podjela na kamione, uz cilj iz pretpostavke 4.

**Zašto je rezultat optimalan:** stanje sadrži sve informacije koje utječu na nastavak rute, pa pretraga ne odbacuje nijednu valjanu mogućnost. Dodatno je provjereno usporedbom s potpunim isprobavanjem svih redoslijeda i podjela na manjim primjerima (4 i 5 naloga), gdje se rezultati podudaraju.

**Složenost i ograničenje:** broj stanja raste kao 3ⁿ × 2n po kamionu (za 10 naloga oko 1,2 milijuna stanja, izračun oko 60 ms). Algoritam je zato ograničen na 11 naloga i za veći ulaz javlja grešku. Za stvarnu primjenu s desecima ili stotinama naloga trebao bi heuristički pristup (npr. Google OR-Tools ili lokalna pretraga), koji više ne jamči optimum, ali skalira.

**Dvostruka zaštita:** rezultat solvera uvijek prolazi kroz neovisni evaluator (`src/validator/evaluate.ts`) koji iznova provjerava sva ograničenja i računa kilometražu. Ako se rezultati ne slažu, aplikacija prijavljuje grešku umjesto da prikaže pogrešan raspored.

## Rezultat za zadane podatke

| Kamion                  | Nalozi            | Kilometraža  | Vrijeme (od 540 min) |
| ----------------------- | ----------------- | ------------ | -------------------- |
| A (3 500 kg, 2 stroja)  | N03               | 37,2 km      | 77,2 min             |
| B (10 000 kg, 3 stroja) | N01, N02, N04–N10 | 162,9 km     | 522,9 min            |
| **Ukupno**              | **10 / 10**       | **200,1 km** |                      |

Strojevi M06–M10 teži su od nosivosti kamiona A, pa ih može prevesti samo kamion B. Kamion B je zbog toga blizu granice radnog vremena, što je u ovom primjeru glavno ograničenje. Detaljan redoslijed s opterećenjem nakon svake radnje prikazuje aplikacija.

## Testovi

`npm test` pokreće testove po područjima:

- **Poslovna ograničenja** (`src/validator/evaluate.test.ts`): prekoračenje nosivosti kamiona A, stroj M10 ne može dijeliti kamion B s drugim strojem, najviše 3 stroja na kamionu B, isporuka prije preuzimanja, preuzimanje i isporuka istim kamionom, prekoračenje radnog dana.
- **Solver** (`src/solver/solve.test.ts`): svih 10 naloga izvršeno uz valjan plan, teški strojevi nikad na kamionu A, upozorenje za stroj pretežak za sve kamione, djelomično rješenje kad radni dan nije dovoljan, usporedba s potpunim isprobavanjem.
- **Objašnjenja neizvršenih naloga** (`src/solver/explain.test.ts`) i **sučelje** (`src/ui/ui.test.tsx`): prikaz svih ulaznih podataka, ruta oba kamiona i upozorenja.
- **Ulazni podaci i udaljenosti** (`src/domain/domain.test.ts`): zaokruživanje dionica, simetričnost, konzistentnost naloga.

## Korištenje AI alata

Za razvoj je korišten Claude (Anthropic) kao sugovornik i generator koda. Rad je tekao korak po korak: model podataka, evaluator, solver, sučelje, dokumentacija. Svaki dio je pokrenut i provjeren prije sljedećeg.

Rezultati AI-ja provjeravani su na sljedeće načine:

- **Evaluator je napisan prije solvera** i neovisan je o njemu, pa se svaki raspored koji solver vrati iznova provjerava.
- **Usporedba s potpunim isprobavanjem** na manjim primjerima potvrdila je da solver nalazi stvarni optimum, a ne samo dobro rješenje.
- **Ručna provjera:** ulazni podaci uspoređeni su s PDF-om zadatka, a dio udaljenosti i ruta provjeren je izračunom na papiru.
- **Testovi poslovnih ograničenja** namjerno konstruiraju nevaljane rute i provjeravaju da ih evaluator odbija.

## Utrošeno vrijeme

~3h

## Moguća poboljšanja

- Uređivanje ulaznih podataka u sučelju, uz ponovni izračun.
