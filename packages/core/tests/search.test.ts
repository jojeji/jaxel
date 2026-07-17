import { describe, expect, it } from "vitest";
import { createNode } from "../src/model/node.js";
import { findAll, replaceAll, type SearchOptions } from "../src/search/search.js";

function buildCatalog() {
  const personOne = createNode({
    name: "person",
    attributes: [{ name: "id", value: "P-100" }],
    value: null,
    children: [
      createNode({ name: "name", value: "Anna Müller" }),
      // Deliberately does NOT contain "anna" as a substring, so scope:"value" search for
      // "anna" only ever matches the "name" children below, not this one.
      createNode({ name: "email", value: "contact@example.com" }),
    ],
  });
  const personTwo = createNode({
    name: "person",
    attributes: [{ name: "id", value: "P-200" }],
    value: null,
    children: [createNode({ name: "name", value: "anna schmidt" })],
  });
  const root = createNode({
    name: "catalog",
    children: [personOne, personTwo],
  });
  return { root, personOne, personTwo };
}

function options(overrides: Partial<SearchOptions>): SearchOptions {
  return {
    query: "",
    scope: "value",
    caseSensitive: false,
    useRegex: false,
    ...overrides,
  };
}

describe("findAll", () => {
  it("finds both name values case-insensitively, excluding the email", () => {
    const { root } = buildCatalog();

    const matches = findAll(root, options({ query: "anna", scope: "value", caseSensitive: false }));

    expect(matches).toHaveLength(2);
    expect(matches.every((m) => m.matchedIn === "value")).toBe(true);
    const values = matches.map((m) => m.node.value);
    expect(values).toContain("Anna Müller");
    expect(values).toContain("anna schmidt");
    expect(values).not.toContain("contact@example.com");
  });

  it("respects caseSensitive: true, matching only the exact-case value", () => {
    const { root } = buildCatalog();

    const matches = findAll(root, options({ query: "Anna", scope: "value", caseSensitive: true }));

    expect(matches).toHaveLength(1);
    expect(matches[0]?.node.value).toBe("Anna Müller");
  });

  it("finds exactly one attribute match with the correct attributeName", () => {
    const { root, personOne } = buildCatalog();

    const matches = findAll(root, options({ query: "P-1", scope: "attribute", useRegex: false }));

    expect(matches).toHaveLength(1);
    expect(matches[0]?.node).toBe(personOne);
    expect(matches[0]?.attributeName).toBe("id");
    expect(matches[0]?.matchedIn).toBe("attribute");
  });

  it("finds both person nodes by name via regex", () => {
    const { root, personOne, personTwo } = buildCatalog();

    const matches = findAll(root, options({ query: "^person$", scope: "name", useRegex: true }));

    expect(matches).toHaveLength(2);
    expect(matches.every((m) => m.matchedIn === "name")).toBe(true);
    expect(matches.map((m) => m.node)).toEqual([personOne, personTwo]);
  });

  it("scope 'all' produces separate matches for name and value on the same node", () => {
    const node = createNode({ name: "anna", value: "anna's note" });
    const root = createNode({ name: "root", children: [node] });

    const matches = findAll(root, options({ query: "anna", scope: "all", caseSensitive: false }));

    const forNode = matches.filter((m) => m.node === node);
    expect(forNode).toHaveLength(2);
    const matchedKinds = forNode.map((m) => m.matchedIn).sort();
    expect(matchedKinds).toEqual(["name", "value"]);
  });

  it("throws a clear Error on invalid regex", () => {
    const { root } = buildCatalog();

    expect(() => findAll(root, options({ query: "(", scope: "value", useRegex: true }))).toThrow(
      Error,
    );
  });

  it("skips value scope for nodes with value === null without crashing", () => {
    const { root, personOne, personTwo } = buildCatalog();

    const matches = findAll(root, options({ query: "person", scope: "all", caseSensitive: false }));

    // personOne/personTwo have value === null; they must not appear as "value" matches.
    const valueMatchesOnPersons = matches.filter(
      (m) => (m.node === personOne || m.node === personTwo) && m.matchedIn === "value",
    );
    expect(valueMatchesOnPersons).toHaveLength(0);
    // But their names ("person") should still match.
    const nameMatches = matches.filter((m) => m.matchedIn === "name");
    expect(nameMatches).toHaveLength(2);
  });
});

describe("replaceAll", () => {
  it("replaces only the case-sensitive match, returns count 1", () => {
    const { root, personOne, personTwo } = buildCatalog();

    const count = replaceAll(
      root,
      options({ query: "Anna", scope: "value", caseSensitive: true }),
      "Anne",
    );

    expect(count).toBe(1);
    expect(personOne.children[0]?.value).toBe("Anne Müller");
    expect(personTwo.children[0]?.value).toBe("anna schmidt");
  });

  it("supports regex backreferences in the replacement", () => {
    const { root, personOne } = buildCatalog();
    const emailNode = personOne.children[1]!;

    const count = replaceAll(
      root,
      options({
        query: "(\\w+)@example\\.com",
        scope: "value",
        useRegex: true,
        caseSensitive: true,
      }),
      "$1@new-domain.com",
    );

    expect(count).toBe(1);
    expect(emailNode.value).toBe("contact@new-domain.com");
  });

  it("replaces all occurrences within the same field", () => {
    const node = createNode({ name: "note", value: "foo foo" });
    const root = createNode({ name: "root", children: [node] });

    const count = replaceAll(root, options({ query: "foo", scope: "value" }), "bar");

    expect(count).toBe(2);
    expect(node.value).toBe("bar bar");
  });

  it("does not crash on value:null nodes and skips them", () => {
    const { root, personOne, personTwo } = buildCatalog();

    const count = replaceAll(
      root,
      options({ query: "person", scope: "all", caseSensitive: false }),
      "customer",
    );

    expect(personOne.name).toBe("customer");
    expect(personTwo.name).toBe("customer");
    expect(count).toBeGreaterThanOrEqual(2);
  });

  it("clears byteRange on every node it actually mutates, so minimal-invasive save re-serializes it", () => {
    const node = createNode({ name: "note", value: "foo", byteRange: [0, 10] });
    const untouched = createNode({ name: "other", value: "bar", byteRange: [10, 20] });
    const root = createNode({ name: "root", children: [node, untouched], byteRange: [0, 20] });

    replaceAll(root, options({ query: "foo", scope: "value" }), "baz");

    expect(node.byteRange).toBeUndefined();
    expect(untouched.byteRange).toEqual([10, 20]);
  });
});
