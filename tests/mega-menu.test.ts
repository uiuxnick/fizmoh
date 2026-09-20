import { expect, test } from "bun:test"
import { readFileSync, existsSync } from "node:fs"
import { RESOURCE_PAGES } from "../src/lib/resource-pages"
import { SOLUTION_PAGES } from "../src/lib/solution-pages"
import { INDUSTRY_PAGES } from "../src/lib/marketing/industries"
import { PRODUCT_PAGES } from "../src/lib/marketing/products"

test("every mega-menu destination resolves to a public page", () => {
  const header = readFileSync(new URL("../src/components/site-header.tsx", import.meta.url), "utf8")
  const hrefs = [...header.matchAll(/href: "([^"]+)"/g)].map(match => match[1])
  expect(hrefs.length).toBeGreaterThan(35)
  for (const href of hrefs) {
    const [group, slug] = href.slice(1).split("/")
    if (group === "resources") expect(RESOURCE_PAGES.some(page => page.slug === slug)).toBe(true)
    else if (group === "solutions") expect([...SOLUTION_PAGES, ...INDUSTRY_PAGES].some(page => page.slug === slug)).toBe(true)
    else if (group === "product") expect(PRODUCT_PAGES.some(page => page.slug === slug)).toBe(true)
    else expect(existsSync(new URL(`../src/app${href}/page.tsx`, import.meta.url))).toBe(true)
  }
})
test("resource guides have unique paths and usable destinations", () => {
  expect(new Set(RESOURCE_PAGES.map(page => page.slug)).size).toBe(RESOURCE_PAGES.length)
  for (const page of RESOURCE_PAGES) {
    expect(page.sections.length).toBeGreaterThanOrEqual(3)
    for (const section of page.sections) if (section.href) expect(section.label?.length).toBeGreaterThan(0)
  }
})
