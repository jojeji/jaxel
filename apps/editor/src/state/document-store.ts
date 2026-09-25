import { useState, useSyncExternalStore } from "react";
import { getJaxelHost } from "../host.js";
import { Workspace, type OpenDocumentState, type TabState, type WorkspaceHost } from "./workspace.js";

/**
 * React adapter for the `Workspace` (every open document and tab, see workspace.ts): one
 * workspace per mounted App, rendered through `useSyncExternalStore`. All behaviour lives in the
 * workspace; this hook only exposes its snapshot plus the derived active tab/document.
 */
export function useJaxelDocuments(host: WorkspaceHost = getJaxelHost()): Pick<
  Workspace,
  | "openFile"
  | "saveFile"
  | "saveFileAs"
  | "convertSaveAs"
  | "newDocument"
  | "closeTab"
  | "reorderTabs"
  | "activate"
  | "openFocusTab"
  | "retargetFocusTab"
  | "acknowledgeExternalChange"
  | "acknowledgeSaved"
  | "reloadFile"
> & {
  docs: OpenDocumentState[];
  tabs: TabState[];
  activeTab: TabState | null;
  activeDoc: OpenDocumentState | null;
  revision: number;
} {
  const [workspace] = useState(() => new Workspace(host));
  const snapshot = useSyncExternalStore(workspace.subscribe, workspace.getSnapshot);
  const { tab: activeTab, doc: activeDoc } = Workspace.active(snapshot);
  return {
    docs: snapshot.docs,
    tabs: snapshot.tabs,
    activeTab,
    activeDoc,
    revision: snapshot.revision,
    openFile: workspace.openFile,
    saveFile: workspace.saveFile,
    saveFileAs: workspace.saveFileAs,
    convertSaveAs: workspace.convertSaveAs,
    newDocument: workspace.newDocument,
    closeTab: workspace.closeTab,
    reorderTabs: workspace.reorderTabs,
    activate: workspace.activate,
    openFocusTab: workspace.openFocusTab,
    retargetFocusTab: workspace.retargetFocusTab,
    acknowledgeExternalChange: workspace.acknowledgeExternalChange,
    acknowledgeSaved: workspace.acknowledgeSaved,
    reloadFile: workspace.reloadFile,
  };
}
