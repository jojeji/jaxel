// Public API of @jaxel/core. See docs/architektur.md for the layering this package sits in.

export type { DocAttribute, DocNode, JsonPrimitiveType } from "./model/node.js";
export { cloneSubtree, createNode, createNodeId } from "./model/node.js";

export type { DocFormat, JaxelDocument } from "./model/document.js";
export { createDocument } from "./model/document.js";

export type { Command } from "./commands/command.js";
export { CommandBus } from "./commands/command-bus.js";
export { createCompositeCommand } from "./commands/composite.js";
export { captureByteRanges, clearByteRanges, restoreByteRanges } from "./commands/byte-range.js";
export { createRenameCommand } from "./commands/rename.js";
export { createSetValueCommand } from "./commands/set-value.js";
export { createSetAttributeCommand } from "./commands/set-attribute.js";
export { createRenameAttributeCommand } from "./commands/rename-attribute.js";
export { createInsertNodeCommand } from "./commands/insert-node.js";
export { createRemoveNodeCommand } from "./commands/remove-node.js";
export { createMoveNodeCommand } from "./commands/move-node.js";

export type { ParseXmlResult } from "./format/xml-import.js";
export { parseXml } from "./format/xml-import.js";
export { serializeXml, serializeXmlMinimal } from "./format/xml-export.js";
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
  resolveNodeBySegments,
  truncatePathLabels,
} from "./format/path.js";

export type { SearchMatch, SearchOptions, SearchScope } from "./search/search.js";
export { findAll, replaceAll } from "./search/search.js";
