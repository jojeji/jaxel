import React, { useEffect, useRef, useState } from "react";
import { looksLikeBase64, type DocNode } from "@jaxel/core";
import { useI18n } from "../i18n/index.js";

interface AttributesPanelProps {
  node: DocNode | null;
  /** Value edit / remove (value: null) for the attribute named `name`. */
  onSetAttribute: (name: string, value: string | null, coalesceKey?: string) => void;
  /** Live rename of the attribute at `index` (position + value untouched). */
  onRenameAttribute: (index: number, newName: string, coalesceKey: string) => void;
  /** Creates a new attribute (empty value) as soon as the user starts typing a name. */
  onCreateAttribute: (name: string, coalesceKey: string) => void;
  /** Click on the "base64" badge of an attribute whose value looks like base64 content. */
  onDecodeBase64: (value: string) => void;
}

export function AttributesPanel({
  node,
  onSetAttribute,
  onRenameAttribute,
  onCreateAttribute,
  onDecodeBase64,
}: AttributesPanelProps): React.ReactElement {
  const { t } = useI18n();
  /** Index of a just-created attribute whose name input should grab focus. */
  const [focusIndex, setFocusIndex] = useState<number | null>(null);

  if (!node) {
    return <aside className="attributes-panel attributes-panel--empty">{t("attributes.noSelection")}</aside>;
  }
  const currentNode = node;

  /** One coalesce chain per attribute slot: creating + typing the name = ONE undo step. */
  function nameKey(index: number): string {
    return `attr-name:${currentNode.id}:${index}`;
  }

  function handleCreate(text: string): void {
    if (text.trim() === "") return;
    const index = currentNode.attributes.length;
    onCreateAttribute(text, nameKey(index));
    setFocusIndex(index);
  }

  return (
    <aside className="attributes-panel">
      <h3>{t("attributes.title")}</h3>
      <div className="attributes-panel__node-name">{node.name}</div>
      <table className="attributes-panel__table">
        <tbody>
          {node.attributes.map((attribute, index) => (
            <tr key={index}>
              <td className="attributes-panel__attr-name-cell">
                <AttrNameInput
                  name={attribute.name}
                  autoFocus={focusIndex === index}
                  onFocused={() => setFocusIndex(null)}
                  isDuplicate={(candidate) =>
                    currentNode.attributes.some((a, i) => i !== index && a.name === candidate)
                  }
                  onRename={(newName) => onRenameAttribute(index, newName, nameKey(index))}
                />
              </td>
              <td>
                <input
                  aria-label={`${attribute.name}`}
                  value={attribute.value}
                  onChange={(event) =>
                    onSetAttribute(attribute.name, event.target.value, `attr-value:${node.id}:${index}`)
                  }
                />
              </td>
              <td>
                {looksLikeBase64(attribute.value) && (
                  <button
                    className="tree-row__base64"
                    title={t("base64.decode")}
                    onClick={() => onDecodeBase64(attribute.value)}
                  >
                    base64
                  </button>
                )}
                <button onClick={() => onSetAttribute(attribute.name, null)} title={t("attributes.remove")}>
                  ×
                </button>
              </td>
            </tr>
          ))}
          <tr>
            <td className="attributes-panel__attr-name-cell">
              {/* Typing here immediately creates the attribute; focus then jumps into the
                  freshly created row above (value stays empty until filled in). */}
              <input
                placeholder={t("attributes.newName")}
                value=""
                onChange={(event) => handleCreate(event.target.value)}
              />
            </td>
            <td colSpan={2} />
          </tr>
        </tbody>
      </table>
    </aside>
  );
}

/**
 * Editable attribute name. Keeps local state so the field can be temporarily empty or
 * a would-be duplicate WITHOUT committing an invalid rename; blur snaps back to the
 * last committed name. Valid intermediate names are committed live (coalesced into one
 * undo step by the caller's coalesceKey).
 */
function AttrNameInput({
  name,
  autoFocus,
  onFocused,
  isDuplicate,
  onRename,
}: {
  name: string;
  autoFocus: boolean;
  onFocused: () => void;
  isDuplicate: (candidate: string) => boolean;
  onRename: (newName: string) => void;
}): React.ReactElement {
  const [text, setText] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setText(name);
  }, [name]);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      const el = inputRef.current;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
      onFocused();
    }
  }, [autoFocus, onFocused]);

  function handleChange(next: string): void {
    setText(next);
    const trimmed = next.trim();
    if (trimmed === "" || trimmed === name || isDuplicate(trimmed)) return;
    onRename(trimmed);
  }

  return (
    <input
      ref={inputRef}
      className="attributes-panel__attr-name-input"
      value={text}
      onChange={(event) => handleChange(event.target.value)}
      onBlur={() => setText(name)}
    />
  );
}
