# Suchfokus und schwebende Meldungen — Design

**Datum:** 2026-07-21
**Status:** Vom PO im Dialog freigegeben

## Ziel

Zwei Fokusprobleme der Editor-Oberfläche werden gemeinsam behoben:

1. `Strg+F`/`Cmd+F` bringt den Nutzer bei einem geöffneten Dokument zuverlässig in das Suchfeld,
   unabhängig davon, ob gerade Baum, Eigenschaften-Panel, ein anderes normales Textfeld oder das
   bereits geöffnete Suchpanel fokussiert ist.
2. Kurzlebige Fehler- und Statusmeldungen verschieben den Editor nicht mehr. Sie erscheinen als
   schließbare, automatisch ausblendende Toasts über dem Layout.

## Suchfokus

- Der globale Shortcut wird vor der allgemeinen Regel „Shortcuts in Textfeldern ignorieren"
  behandelt.
- Voraussetzung ist ein aktives Dokument. Auf dem Startscreen bleibt `Strg+F` wirkungslos.
- Modale Dialoge haben Vorrang: Solange Einstellungen, Neues Dokument, Reload, Schließen, Über oder
  Base64-Vorschau offen sind, übernimmt `Strg+F` den Fokus nicht.
- Ist das Suchpanel geschlossen, wird es geöffnet und sein Suchfeld nach dem Mount fokussiert.
- Ist es bereits geöffnet, bleibt sein kompletter lokaler Zustand erhalten; ein neuer Fokus-Request
  fokussiert das vorhandene Eingabefeld erneut.
- Vorhandener Suchtext wird bei jedem Shortcut vollständig markiert. Direktes Tippen ersetzt ihn.
- Die Umsetzung erfolgt über einen monotonen Fokus-Request in `App` und eine Input-Ref in
  `SearchPanel`; ein Remount des Panels ist ausdrücklich ausgeschlossen, weil er Suchbegriff,
  Optionen und Treffer verlieren würde.

## Toasts

- Die bestehenden Kanäle `error` und `status` bleiben getrennt und können gleichzeitig sichtbar
  sein. Neuere Meldungen stehen im Stapel oben.
- Ein fest positionierter Container sitzt oben mittig knapp unter der Toolbar. Er gehört nicht zum
  normalen Flex-Layout und verursacht daher weder Größen- noch Positionsänderungen im Editor.
- Der Container selbst nimmt keine Pointer-Ereignisse an; die sichtbaren Toast-Karten schon.
- Toasts sind leicht transparent, behalten aber in allen vorhandenen Themes ausreichend Kontrast.
- Jeder Toast hat einen zugänglichen `×`-Button. Deutsch und Englisch erhalten eine passende
  Beschriftung für Screenreader/Tooltip.
- Normale Statusmeldungen verschwinden nach **4 Sekunden**, Fehler nach **8 Sekunden**.
- Hover pausiert den Timer. Beim Verlassen läuft exakt die verbleibende Zeit weiter, nicht die volle
  Dauer von vorn.
- Eine neue Meldung desselben Kanals ersetzt die alte und startet deren Timer neu.
- Das manuelle Schließen löscht nur den betroffenen Kanal.

## Komponenten und Datenfluss

### `SearchPanel`

Eine neue Prop `focusRequest: number` signalisiert ausschließlich einen Fokuswunsch. Eine Ref zeigt
auf das Suchfeld. Ein Effect reagiert auf Änderungen der Prop, ruft `focus()` und anschließend
`select()` auf. Alle bestehenden Suchzustände bleiben lokal im Panel.

### `App`

`App` hält den Fokus-Request als Zähler. Der globale Keydown-Handler prüft bei `Strg+F` zuerst das
aktive Dokument und verhindert dann die Browser-Suche. Bei offenem Modal bleibt es dabei;
andernfalls öffnet er das Panel und erhöht den Zähler.
Die beiden Meldungskanäle halten kleine Einträge `{ id, message, kind }`; eine monoton steigende ID
macht auch identische Folgemeldungen zu neuen Ereignissen und bestimmt die kanalübergreifende
Reihenfolge. Kleine Setter-Helfer ersetzen die bisherigen String-Setter an den bestehenden
Aufrufstellen. Der Toast-Container rendert die aktiven Einträge nach absteigender ID statt als Banner
im Dokumentfluss.

### `Toast`

Eine neue, UI-lokale Komponente erhält Variante, Text, Dauer und `onClose`. Sie kapselt Timer,
Restzeitberechnung, Hover-/Fokus-Pause, Close-Button und barrierefreie Live-Region-Semantik. Fehler nutzen
eine assertive, Statusmeldungen eine höfliche Ankündigung. Die Komponente enthält keine
Domänenlogik und keinen globalen Store.

## Fehler- und Randfälle

- Verschwindet eine Meldung automatisch, wird nur dann geschlossen, wenn sie noch dieselbe Meldung
  repräsentiert; ein alter Timer darf keine neuere Meldung desselben Kanals löschen.
- Unmount räumt jeden Timer auf.
- Wiederholtes `Strg+F` erzeugt keinen zweiten Suchzustand und löscht keine Treffer.
- Ein modaler Dialog behält Fokusfalle und Escape-Verhalten; der Suchshortcut öffnet dort weder die
  Jaxel- noch die native Webview-Suche.
- Toast-Hover beeinflusst nicht den Fokus des darunterliegenden Editors. Die Karte kann Inhalte
  optisch überdecken, verschiebt sie aber nie.

## Teststrategie

- `SearchPanel`-/App-Tests: Öffnen und Autofokus; erneutes `Strg+F`; Aufruf aus einem anderen
  Texteingabefeld; vollständige Textauswahl; Suchzustand bleibt erhalten; modaler Dialog blockiert;
  Startscreen bleibt unverändert.
- Toast-Komponententests mit Fake Timers: Status nach 4 s, Fehler nach 8 s, manuelles Schließen,
  Restzeit bei Hover und Tastaturfokus, Timer-Neustart bei neuer Meldung und Cleanup beim Unmount.
- App-Integrationstest: Fehler und Status gleichzeitig, getrennt schließbar, fester Toast-Container
  statt Banner im Flex-Layout.
- Abschluss gemäß Projektvorgabe: `npm test`, `npm run typecheck`, `npm run dev` aus dem Root und
  visueller Check im echten Tauri-Fenster, soweit die Umgebung Mausinteraktion erlaubt.

## Nicht im Umfang

- Kein globaler Notification-Service, keine Queue mit Meldungshistorie und kein allgemeines
  Modal-/Focus-Framework.
- Keine Änderung an fachlichen Dialogen oder Logging-Regeln.
- Keine Einstellungsoptionen für Position oder Dauer der Toasts.
