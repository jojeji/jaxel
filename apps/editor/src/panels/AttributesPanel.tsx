import React, { useState } from "react";
import type { DocNode } from "@jaxel/core";
import { useI18n } from "../i18n/index.js";

interface AttributesPanelProps {
  node: DocNode | null;
  onSetAttribute: (name: string, value: string | null) => void;
}

export function AttributesPanel({ node, onSetAttribute }: AttributesPanelProps): React.ReactElement {
  const { t } = useI18n();
  const [newName, setNewName] = useState("");
  const [newValue, setNewValue] = useState("");

  if (!node) {
    return <aside className="attributes-panel attributes-panel--empty">{t("attributes.noSelection")}</aside>;
  }

  function addAttribute(): void {
    const name = newName.trim();
    if (!name) return;
    onSetAttribute(name, newValue);
    setNewName("");
    setNewValue("");
  }

  return (
    <aside className="attributes-panel">
      <h3>{t("attributes.title")}</h3>
      <div className="attributes-panel__node-name">{node.name}</div>
      <table className="attributes-panel__table">
        <tbody>
          {node.attributes.map((attribute) => (
            <tr key={attribute.name}>
              <td className="attributes-panel__attr-name">{attribute.name}</td>
              <td>
                <input
                  value={attribute.value}
                  onChange={(event) => onSetAttribute(attribute.name, event.target.value)}
                />
              </td>
              <td>
                <button onClick={() => onSetAttribute(attribute.name, null)} title={t("attributes.remove")}>
                  ×
                </button>
              </td>
            </tr>
          ))}
          <tr>
            <td>
              <input
                placeholder={t("attributes.newName")}
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && addAttribute()}
              />
            </td>
            <td>
              <input
                placeholder={t("attributes.newValue")}
                value={newValue}
                onChange={(event) => setNewValue(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && addAttribute()}
              />
            </td>
            <td>
              <button onClick={addAttribute} title={t("attributes.add")}>
                +
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </aside>
  );
}
