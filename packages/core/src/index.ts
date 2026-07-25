// Public API of @jaxel/core. See docs/architektur.md for the layering this package sits in.

export type { DocAttribute, DocNode, JsonPrimitiveType } from "./model/node.js";
export { cloneSubtree, createNode, createNodeId } from "./model/node.js";

export type { DocFormat, JaxelDocument, XmlFraming } from "./model/document.js";
export { createDocument } from "./model/document.js";

export type { Command } from "./commands/command.js";
export { CommandBus } from "./commands/command-bus.js";
export { createCompositeCommand } from "./commands/composite.js";
// captureByteRanges/clearByteRanges/restoreByteRanges are CommandBus-internal (it owns all
// byteRange invalidation/restoration via Command.byteRangeChain, see command-bus.ts) and
// intentionally not part of the public API. syncByteRangesAfterSave is the one byteRange
// helper callers (document-store.ts) still need directly, after a save completes.
export { syncByteRangesAfterSave } from "./commands/byte-range.js";
export { createRenameCommand } from "./commands/rename.js";
export { createSetValueCommand } from "./commands/set-value.js";
export { createSetAttributeCommand } from "./commands/set-attribute.js";
export { createRenameAttributeCommand } from "./commands/rename-attribute.js";
export { createInsertNodeCommand } from "./commands/insert-node.js";
export { createRemoveNodeCommand } from "./commands/remove-node.js";
export type { DropPosition, MovePlan } from "./commands/move-node.js";
export { createMoveNodeCommand, planMove } from "./commands/move-node.js";
export type { ReplaceAllResult } from "./commands/replace-all.js";
export { createReplaceAllCommand } from "./commands/replace-all.js";
export type { SiblingSlot, InsertPlan } from "./commands/sibling-slot.js";
export { findSiblingSlot, planInsertRelativeToRow } from "./commands/sibling-slot.js";
export type { BulkRow } from "./commands/bulk.js";
export {
  createBulkDuplicateCommand,
  createBulkInsertCommand,
  createBulkMoveCommand,
  createBulkRemoveCommand,
  topmostRows,
} from "./commands/bulk.js";

export type { ParseXmlResult } from "./format/xml-import.js";
export { parseXml } from "./format/xml-import.js";
export { serializeXml, serializeXmlMinimal } from "./format/xml-export.js";
export type { ParsedDocument } from "./format/document.js";
export { parseDocument, serializeDocument } from "./format/document.js";
export { parseFragments, serializeFragments } from "./format/fragments.js";
export type { ConvertParams } from "./format/convert.js";
export { convertDocument, isValidXmlName, InvalidXmlNameError } from "./format/convert.js";
export type { DecodedBase64, DecodedContentKind } from "./format/base64.js";
export { decodeBase64, looksLikeBase64 } from "./format/base64.js";
export { parseJson } from "./format/json-import.js";
export type { JsonExportDoc } from "./format/json-export.js";
export { serializeJson } from "./format/json-export.js";
export type { PathSegment, TruncatePathOptions } from "./format/path.js";
export {
  computePaths,
  findAncestorChain,
  findNodeById,
  formatFullPath,
  formatIndexedPath,
  formatStaticPath,
  getPathSegments,
  pathSegmentsOf,
  resolveNodeBySegments,
  truncatePathLabels,
} from "./format/path.js";

export type { PlannedReplacement, SearchMatch, SearchOptions, SearchScope } from "./search/search.js";
export { findAll, planReplacements } from "./search/search.js";

export type { ChangeBaseline, ChangeBaselineNode, ChangeSet, Tombstone } from "./changes/diff.js";
export { captureChangeBaseline, computeChanges } from "./changes/diff.js";
