import { expect, test, describe } from "bun:test"
import { chunkText, htmlToText, pageTitle } from "../src/lib/knowledge"

describe("chunking", () => {
  test("short text stays whole", () => {
    expect(chunkText("A short policy.")).toEqual(["A short policy."])
  })

  test("empty input produces nothing rather than one empty passage", () => {
    // An empty chunk would be embedded, stored and could be retrieved as an
    // answer — a citation to nothing.
    expect(chunkText("")).toEqual([])
    expect(chunkText("   \n\n  ")).toEqual([])
  })

  test("long text is split, and every passage carries content", () => {
    const paragraph = "Cancellations made more than 48 hours before departure receive a full refund. "
    const chunks = chunkText(paragraph.repeat(60))
    expect(chunks.length).toBeGreaterThan(1)
    for (const chunk of chunks) {
      expect(chunk.trim().length).toBeGreaterThan(0)
      expect(chunk.length).toBeLessThanOrEqual(1100)
    }
  })

  test("nothing is lost at the seams", () => {
    // A sentence that fell into the gap between two passages would be
    // unanswerable, and nobody would ever know which sentence it was.
    const text = Array.from({ length: 80 }, (_, i) => `Sentence number ${i} explains a rule.`).join(" ")
    const joined = chunkText(text).join(" ")
    for (const i of [0, 25, 50, 79]) {
      expect(joined).toContain(`Sentence number ${i}`)
    }
  })

  test("passages overlap, so a rule split across a boundary is still findable", () => {
    const text = Array.from({ length: 60 }, (_, i) => `Rule ${i} applies to bookings.`).join(" ")
    const chunks = chunkText(text)
    expect(chunks.length).toBeGreaterThan(1)
    // The end of one passage should reappear at the start of the next.
    const tail = chunks[0].slice(-60)
    expect(chunks[1].includes(tail.trim().split(" ").slice(-3).join(" "))).toBe(true)
  })

  test("a run of newlines does not create empty passages", () => {
    const chunks = chunkText("First part.\n\n\n\n\n\nSecond part.")
    expect(chunks.every(c => c.trim().length > 0)).toBe(true)
  })
})

describe("headings stay with their section", () => {
  test("a heading leads the passage it describes", () => {
    // A heading merged onto the end of the previous passage made that passage
    // promise advice it did not contain, and left the advice itself in a
    // passage with no heading to be found by.
    const doc = [
      "Cancellation policy.",
      "Cancel more than 48 hours ahead for a full refund to the original card.",
      "What to bring on a desert tour.",
      "Closed shoes, a hat, sunglasses and sunscreen. Bring extra water in summer.",
    ].join("\n\n")

    const chunks = chunkText(doc, 200, 40)
    const packing = chunks.find(c => c.includes("Closed shoes"))
    expect(packing).toBeDefined()
    expect(packing).toContain("What to bring")

    // And the heading must not also be trailing the refund passage.
    const refunds = chunks.find(c => c.includes("full refund"))
    expect(refunds).toBeDefined()
    expect(refunds!.includes("What to bring")).toBe(false)
  })

  test("two topics do not end up in one passage", () => {
    const doc = [
      "Refunds.",
      "Cancel 48 hours ahead for a full refund.",
      "Children.",
      "Infants under three travel free but must be declared at booking.",
    ].join("\n\n")

    const chunks = chunkText(doc, 120, 20)
    const infants = chunks.find(c => c.includes("Infants"))
    expect(infants).toBeDefined()
    // Blending the two averages their meaning into something that matches
    // neither question well.
    expect(infants!.includes("full refund")).toBe(false)
  })
})

describe("reading a web page", () => {
  test("scripts and styles never reach the index", () => {
    // Indexed CSS would be retrieved and quoted at a customer as policy.
    const html = `<html><head><style>.a{color:red}</style><script>var x=1</script></head>
      <body><p>Children under 12 travel free.</p></body></html>`
    const text = htmlToText(html)
    expect(text).toContain("Children under 12 travel free.")
    expect(text).not.toContain("color:red")
    expect(text).not.toContain("var x")
  })

  test("block elements become line breaks, so paragraphs do not run together", () => {
    const text = htmlToText("<p>First rule.</p><p>Second rule.</p>")
    expect(text).toContain("First rule.")
    expect(text).toContain("Second rule.")
    expect(text).not.toContain("First rule.Second rule.")
  })

  test("entities are decoded", () => {
    expect(htmlToText("<p>Terms &amp; conditions &quot;apply&quot;</p>")).toContain('Terms & conditions "apply"')
  })

  test("navigation chrome is dropped", () => {
    const html = "<nav><a href='/'>Home</a></nav><p>The real content.</p><footer>Copyright</footer>"
    const text = htmlToText(html)
    expect(text).toContain("The real content.")
    expect(text).not.toContain("Copyright")
  })

  test("the title is found, or absent without throwing", () => {
    expect(pageTitle("<html><head><title>Cancellation Policy</title></head></html>")).toBe("Cancellation Policy")
    expect(pageTitle("<html><body>no title here</body></html>")).toBe(null)
  })
})
