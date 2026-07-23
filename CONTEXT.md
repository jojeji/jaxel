# Jaxel

Plattformunabhängiger XML/JSON-Editor. Ein geparster Baum (`DocNode`) ist die einzige
Wahrheit; jede Mutation läuft als Command über den CommandBus (siehe `CLAUDE.md`).

## Language

**Dirty**:
Ein Dokument, dessen aktueller Baum von dem Stand abweicht, der zuletzt gespeichert wurde.
Bestimmt sich aus der Baseline (siehe unten), nicht daraus, ob jemals ein Command lief.
_Avoid_: ungespeichert (als Adjektiv für den Code-State — im UI-Text weiterhin "ungespeichert").

**Baseline**:
Die Position im Undo-Stack eines Dokuments, die dem zuletzt gespeicherten Stand entspricht.
Dirty = aktuelle Stack-Position weicht von der Baseline ab. Undo zurück bis exakt zur Baseline
macht ein Dokument wieder sauber (nicht dirty), auch ohne erneutes Speichern.
_Avoid_: Speicherpunkt, Save-Marker.

**Änderungsmarker**:
Ein optisches Signal an einer Baumzeile, das anzeigt, dass der Knoten (oder ein Nachfahre)
sich seit der Baseline verändert hat. Drei Ausprägungen: *geändert* (Wert/Attribut/Name eines
bestehenden Knotens), *neu* (Knoten existierte bei der Baseline nicht) und *enthält Änderung*
(blasse Variante an einem zugeklappten Vorfahren, dessen Nachfahre einen Marker trägt).
_Avoid_: Diff-Marker, Change-Flag.

**Tombstone**:
Eine Geister-Zeile im Baum, die einen seit der Baseline gelöschten Knoten an seiner
ursprünglichen Position repräsentiert (ausgegraut/durchgestrichen, rein informativ — kein
Klick-Verhalten). Wird beim nächsten Speichern entfernt. Bei Löschung eines ganzen Teilbaums
gibt es genau eine Tombstone-Zeile für dessen Wurzel, keine für einzelne Nachfahren.
_Avoid_: Geister-Knoten (ok als Umgangssprache, aber Tombstone ist der kanonische Begriff),
gelöschter Knoten (mehrdeutig — ein "gelöschter Knoten" hat keine Zeile mehr, es sei denn
als Tombstone).

**Anker-Geschwister**:
Das Geschwister, unmittelbar vor dem ein Tombstone positioniert wird (bzw. Tombstone steht
an erster Stelle, falls der gelöschte Knoten das erste Kind war). Bleibt auch dann stabil,
wenn andere Geschwister danach noch verschoben werden — die Tombstone-Position ist relativ
zum Anker-Geschwister, nicht ein fixer numerischer Index.
_Avoid_: Ursprungsposition, Index-Anker.
