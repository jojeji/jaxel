import React, { useEffect, useRef, useState } from "react";
import { Copy } from "@phosphor-icons/react";
import { looksLikeBase64, type DocNode } from "@jaxel/core";
import { useI18n } from "../i18n/index.js";

interface AttributesPanelProps {
  /** The single selected node — null when nothing OR several nodes are selected. */
  node: DocNode | null;
  /** How many nodes are selected. Only consulted when `node` is null, to tell "nothing
   * selected" apart from "several selected" (attributes are edited one node at a time). */
  selectionCount: number;
  /** Value edit / remove (value: null) for the attribute named `name`. */
  onSetAttribute: (name: string, value: string | null, coalesceKey?: string) => void;
  /** Live edit of the selected node's direct text value. */
  onSetValue: (value: string, coalesceKey: string) => void;
  /** Copy the selected node's direct text value. */
  onCopyValue: (value: string) => void;
  /** Avoid presenting a second value editor while the tree's inline editor is active. */
  hideNodeValue?: boolean;
  /** Live rename of the attribute at `index` (position + value untouched). */
  onRenameAttribute: (index: number, newName: string, coalesceKey: string) => void;
  /** Creates a new attribute (empty value) as soon as the user starts typing a name. */
  onCreateAttribute: (name: string, coalesceKey: string) => void;
  /** Click on the "base64" badge of an attribute whose value looks like base64 content. */
  onDecodeBase64: (value: string) => void;
  /** Shown but not editable: the node sits inside a commented-out subtree (or is a comment),
   * whose saved form is the comment's raw text — an edit here would be lost on save. */
  readOnly?: boolean;
}

export function AttributesPanel({
  node,
  selectionCount,
  onSetAttribute,
  onSetValue,
  onCopyValue,
  hideNodeValue = false,
  onRenameAttribute,
  onCreateAttribute,
  onDecodeBase64,
  readOnly = false,
}: AttributesPanelProps): React.ReactElement {
  const { t } = useI18n();
  /** Index of a just-created attribute whose name input should grab focus. */
  const [focusIndex, setFocusIndex] = useState<number | null>(null);

  if (!node) {
    return (
      <aside className="attributes-panel attributes-panel--empty">
        {selectionCount > 1
          ? t("attributes.multiSelection").replace("{n}", String(selectionCount))
          : t("attributes.noSelection")}
      </aside>
    );
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
      <div className="attributes-panel__node-name">{node.name}</div>
      {readOnly && <p className="attributes-panel__read-only">{t("attributes.readOnly")}</p>}
      {!hideNodeValue && (node.kind === "comment" || node.children.length === 0) && (
        <div className="attributes-panel__value">
          <div className="attributes-panel__value-heading">
            <label htmlFor="attributes-node-value">{t("attributes.nodeValue")}</label>
            <button
              type="button"
              className="attributes-panel__copy-value"
              aria-label={t("attributes.copyNodeValue")}
              title={t("attributes.copyNodeValue")}
              disabled={!node.value}
              onClick={() => onCopyValue(node.value ?? "")}
            >
              <Copy size={14} weight="regular" aria-hidden />
            </button>
          </div>
          <textarea
            id="attributes-node-value"
            className="attributes-panel__value-editor"
            aria-label={t("attributes.nodeValue")}
            value={node.value ?? ""}
            readOnly={readOnly}
            rows={3}
            onChange={(event) => onSetValue(event.target.value, `node-value:${node.id}`)}
          />
        </div>
      )}
      <h3>{t("attributes.title")}</h3>
      <table className="attributes-panel__table">
        <tbody>
          {node.attributes.map((attribute, index) => (
            <tr key={index}>
              <td className="attributes-panel__attr-name-cell">
                <AttrNameInput
                  name={attribute.name}
                  readOnly={readOnly}
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
                  readOnly={readOnly}
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
                {!readOnly && (
                  <button onClick={() => onSetAttribute(attribute.name, null)} title={t("attributes.remove")}>
                    ×
                  </button>
                )}
              </td>
            </tr>
          ))}
          {!readOnly && (
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
          )}
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
  readOnly,
  autoFocus,
  onFocused,
  isDuplicate,
  onRename,
}: {
  name: string;
  readOnly: boolean;
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
      readOnly={readOnly}
      onChange={(event) => handleChange(event.target.value)}
      onBlur={() => setText(name)}
    />
  );
}
