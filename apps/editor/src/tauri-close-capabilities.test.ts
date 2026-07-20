/**
 * Regressions-Wächter für den Beenden-Bug (identisch zum bereits behobenen Fall
 * in xdp-designer, apps/designer/tests/tauri-close-capabilities.test.ts): Der
 * Close-Flow in App.tsx ruft `getCurrentWindow().onCloseRequested(...)` und bei
 * fehlenden ungespeicherten Änderungen intern `close()`/`destroy()` auf. Beide
 * Fenster-Operationen sind in Tauri v2 durch die Capability-ACL gesperrt —
 * `core:window:default` (Teil von `core:default`) enthält WEDER `allow-close`
 * NOCH `allow-destroy`. Fehlen sie, wird der Aufruf still abgewiesen und das
 * Fenster schließt NIE (kein Dialog, kein Fehler — genau das PO-Symptom).
 *
 * Dieser Test liest die tatsächlich ausgelieferte Capability-Datei und stellt
 * sicher, dass beide Berechtigungen dauerhaft vergeben bleiben. Er läuft
 * headless (nur Datei-Lektüre) und braucht keine Tauri-Laufzeit.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const CAP_PATH = join(__dirname, '..', 'src-tauri', 'capabilities', 'default.json');

interface Capability {
  permissions: Array<string | { identifier: string }>;
}

function permissionIds(cap: Capability): string[] {
  return cap.permissions.map((p) => (typeof p === 'string' ? p : p.identifier));
}

describe('Tauri-Capabilities: Fenster schließen', () => {
  const cap = JSON.parse(readFileSync(CAP_PATH, 'utf8')) as Capability;
  const ids = permissionIds(cap);

  it('erlaubt getCurrentWindow().close() (core:window:allow-close)', () => {
    expect(ids).toContain('core:window:allow-close');
  });

  it('erlaubt das interne destroy() des onCloseRequested-Wrappers (core:window:allow-destroy)', () => {
    expect(ids).toContain('core:window:allow-destroy');
  });
});
