# Entscheidungslog — Jaxel

Maßgeblich bei Widersprüchen zu anderen Dokumenten. Neue Entscheidungen werden unten angehängt
(nicht editiert), mit Datum und Begründung.

## 2026-07-17 — Kickoff-Grilling (Interview mit dem PO vor Projektstart)

1. **Round-Trip: format-erhaltend, best effort — kein hartes Byte-Identität-Invariant.**
   Unveränderte Bereiche (Kommentare, PIs, CDATA, Attributreihenfolge, Whitespace) bleiben
   byte-identisch; nur tatsächlich bearbeitete Knoten werden nach einer konfigurierbaren
   Einrückungsregel neu geschrieben. Anders als bei xdp-designer (dort: strikte
   Byte-Identität-Invariante mit Fixture-Test-Suite), weil Jaxel ein General-Purpose-Editor für
   beliebige XML/JSON-Dateien ist — die Dateivielfalt ist zu groß für einen engen, garantierten
   Fixture-Korpus.

2. **Stack: Tauri 2 + Rust-Kern + React 18 + TypeScript + Vite** (identisch zu xdp-designer).
   Begründung: kleine Binärgröße, geringer RAM-Verbrauch, natives Rust-Parsing für große Dateien
   deutlich schneller als reines Node/JS. Toolchain lokal verifiziert (Node 18.19.1, rustc 1.97.0,
   webkit2gtk-4.1 vorhanden) — anders als bei xdp-designer, wo Rust in der Umgebung zeitweise fehlte.

3. **Große Dateien: Streaming-Parse + Byte-Offset-Index, ganze Datei im RAM, virtualisierte
   Baumansicht.** Kein Editieren von Dateien größer als der verfügbare RAM — das wäre ein deutlich
   höherer Implementierungsaufwand (Undo/Redo, Suche, Speichern müssten alle mit Teildaten
   arbeiten) und war laut PO nicht der eigentliche Bedarf ("mehrere 100 MB", nicht "größer als RAM").

4. **XML↔JSON-Vereinheitlichung: eigene einfache Konvention statt Badgerfish o.ä.**
   Gemeinsames Node-Modell `{name, attributes[], value, children[]}`. JSON-Objekt → Knoten mit
   einem Kindknoten je Property; JSON-Array → mehrere gleichnamige Kindknoten (daraus ergibt sich
   automatisch der gewünschte indizierte Pfad `a.b[0].c`); JSON-Primitive → Textwert. Etablierte
   Konventionen wie Badgerfish (`@attr`, `$`) wurden bewusst verworfen, weil sie für
   XML→JSON-Konvertierung gemacht sind und in der Baumansicht künstliche Präfixe erzeugen würden,
   die es im echten JSON nicht gibt — die Anzeige ist wichtiger als Standardkonformität.

5. **Multi-Window: Tabs als Standard, echte OS-Fenster über Einstellung optional.**
   Begründung: entspricht dem Alltagsverhalten moderner Editoren (VS Code, Notepad++); deckt aber
   den vom PO gewünschten Fenster-Modus als Option ab.

6. **Namespaces: V1 erhält sie nur korrekt (xmlns als Attribut, Prefixe bleiben erhalten).**
   Ein dedizierter "Namespaces verwalten"-Dialog (siehe Easy-XML-Screenshot) ist bewusst auf eine
   spätere Ausbaustufe verschoben, um den Kernumfang von V1 nicht zu sprengen.

7. **Plattform-Reihenfolge: Linux zuerst, dann Windows, macOS optional zuletzt.**
   Linux ist das akute Problem des PO (kein Easy-XML für Linux). Tauri baut dieselbe Codebasis für
   alle Plattformen; Windows-Build folgt sobald der Kern-Editor stabil läuft. macOS erfordert
   Code-Signing/Notarization ohne vorhandenen Apple-Dev-Account und ist daher nachrangig.

8. **Pakete: Linux = AppImage (portabel) + .deb/.rpm (installierbar); Windows = portable .exe +
   .msi/NSIS (installierbar).** Deckt beide vom PO geforderten Distributionsformen pro Plattform ab,
   alle vier nativ über Tauri-Bundle-Konfiguration.

9. **Kodierung: UTF-8/UTF-16 nativ + Auto-Erkennung von ISO-8859-1/Windows-1252 über die
   XML-Deklaration, via `encoding_rs`.** Begründung: Business-/SAP-nahe XML-Dateien (z.B.
   Reportwriter-Exporte) nutzen häufig Alt-Encodings. Ursprungskodierung wird beim Speichern
   beibehalten, sofern nicht explizit geändert.

10. **Keine XSD/DTD-Schemavalidierung — auch nicht als spätere Ausbaustufe.** Bewusst außerhalb des
    Projektumfangs; explizit vom PO so entschieden (nicht nur "später", sondern "nicht relevant").

11. **UI-Sprache: Deutsch + Englisch von Anfang an** (anders als xdp-designer, das rein Deutsch ist).
    Eigener schlanker i18n-Layer (kein schweres Framework wie react-i18next nötig für zwei Sprachen).

12. **Produktname: Jaxel** (JSON + XML). Slogan „Ein Baum, zwei Formate". Optionales Maskottchen
    später: Jaxolotl (Axolotl). Rein kosmetisch, jederzeit änderbar.

13. **Arbeitsmodus: autonom bis zum ersten lauffähigen Linux-Editor** (AP0–AP5), keine
    Zwischenabnahmen pro Arbeitspaket. Packaging (AP6/AP7) danach.

## 2026-07-17 — Bekannte Einschränkung der JSON-Array-Konvention (entdeckt bei der Implementierung von AP1)

Aus Entscheidung #4 ("JSON-Array → mehrere gleichnamige Geschwisterknoten") folgt eine bewusst in
Kauf genommene Nebenwirkung: Ein Array mit genau einem Element ist im Baum nicht von einem
nackten Einzelwert zu unterscheiden. `{"tags": ["x"]}` und `{"tags": "x"}` erzeugen denselben
Baum (ein Knoten `tags` mit Wert `"x"`) und `serializeJson` gibt beim Speichern in beiden Fällen
`{"tags": "x"}` zurück — das Array-Wrapping eines Einzelelements geht verloren. Ebenso erzeugt ein
leeres Array als Property-Wert (`{"tags": []}`) null Kindknoten, wodurch der Schlüssel `tags` beim
erneuten Speichern komplett verschwindet statt als `[]` zu erscheinen.

Das ist keine Bug, sondern eine unmittelbare Konsequenz der in #4 gewählten, absichtlich einfachen
Konvention (kein Wrapper-Knoten pro Array). Betrifft nur JSON-Dokumente, deren Struktur sich exakt
auf diese Randfälle stützt (Ein-Element-Arrays, leere Arrays als Property-Wert). Falls das in der
Praxis stört, wäre die Abhilfe ein optionales `arrayHint`-Flag am Knoten (Property war im Original
ein Array) — bewusst nicht in V1 gebaut, da es die Konvention verkompliziert, ohne dass ein
konkreter Bedarf danach besteht.

## Ausdrücklich NICHT geplant (damit es nicht versehentlich nachgebaut wird)

- XSD/DTD-Validierung.
- Bearbeiten von Dateien größer als der verfügbare RAM.
- Byte-identisches Round-Trip-Invariant mit Test-Suite (wie bei xdp-designer).
