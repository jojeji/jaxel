import { describe, expect, it } from "vitest";
import { createNode } from "../src/model/node.js";
import { findAll, planReplacements, type SearchOptions } from "../src/search/search.js";

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

describe("planReplacements", () => {
  it("plans only the case-sensitive match, without mutating the tree", () => {
    const { root, personOne, personTwo } = buildCatalog();

    const plans = planReplacements(
      root,
      options({ query: "Anna", scope: "value", caseSensitive: true }),
      "Anne",
    );

    expect(plans).toHaveLength(1);
    expect(plans[0]).toMatchObject({ before: "Anna Müller", after: "Anne Müller", count: 1 });
    // Nothing mutated — planning is read-only.
    expect(personOne.children[0]?.value).toBe("Anna Müller");
    expect(personTwo.children[0]?.value).toBe("anna schmidt");
  });

  it("supports regex backreferences in the planned replacement", () => {
    const { root, personOne } = buildCatalog();
    const emailNode = personOne.children[1]!;

    const plans = planReplacements(
      root,
      options({
        query: "(\\w+)@example\\.com",
        scope: "value",
        useRegex: true,
        caseSensitive: true,
      }),
      "$1@new-domain.com",
    );

    expect(plans).toHaveLength(1);
    expect(plans[0]?.node).toBe(emailNode);
    expect(plans[0]?.after).toBe("contact@new-domain.com");
    expect(emailNode.value).toBe("contact@example.com"); // unmutated
  });

  it("counts all occurrences within the same field as one planned entry", () => {
    const node = createNode({ name: "note", value: "foo foo" });
    const root = createNode({ name: "root", children: [node] });

    const plans = planReplacements(root, options({ query: "foo", scope: "value" }), "bar");

    expect(plans).toHaveLength(1);
    expect(plans[0]).toMatchObject({ node, kind: "value", after: "bar bar", count: 2 });
  });

  it("does not crash on value:null nodes and skips them", () => {
    const { root, personOne, personTwo } = buildCatalog();

    const plans = planReplacements(
      root,
      options({ query: "person", scope: "all", caseSensitive: false }),
      "customer",
    );

    const nodes = plans.map((p) => p.node);
    expect(nodes).toContain(personOne);
    expect(nodes).toContain(personTwo);
    expect(plans.every((p) => p.after === "customer")).toBe(true);
  });
});
