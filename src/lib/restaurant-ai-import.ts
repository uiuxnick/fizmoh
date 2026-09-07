import { db } from "@/lib/db"
import { getAIConfig, anthropicClient, openaiClient } from "@/lib/ai-provider"

export interface ExtractedMenuItem {
  id?: string | null
  name: string
  nameAr?: string | null
  description?: string | null
  descriptionAr?: string | null
  price: number
  salePrice?: number | null
  allergens?: string | null
  isVegetarian?: boolean
  isVegan?: boolean
  isGlutenFree?: boolean
  prepTimeMinutes?: number | null
  confidence: number // 0.0 to 1.0
  confidenceNote?: string | null
  variants?: Array<{
    id?: string | null
    name: string
    nameAr?: string | null
    price: number
  }>
  modifiers?: Array<{
    id?: string | null
    name: string
    nameAr?: string | null
    required?: boolean
    min?: number | null
    max?: number | null
    options: Array<{ id?: string | null; name: string; nameAr?: string | null; price: number }>
  }>
}

export interface ExtractedCategory {
  id?: string | null
  name: string
  nameAr?: string | null
  description?: string | null
  items: ExtractedMenuItem[]
}

export interface ExtractedMenuResult {
  categories: ExtractedCategory[]
  totalItems: number
  warnings: string[]
  averageConfidence: number
}

const SYSTEM_EXTRACTION_PROMPT = `You are an expert Restaurant Technology & Culinary Menu AI Analyst.
Analyze the provided printed menu image or PDF document. Extract all categories, dishes/items, prices, descriptions, Arabic translations if present, dietary indicators (Vegetarian, Vegan, Gluten-free), allergen warnings, portion variants (Small, Medium, Large, Half, Full), and modifier add-ons.

Return ONLY a valid JSON object matching this exact TypeScript structure:
{
  "categories": [
    {
      "name": "Appetizers / المقبلات",
      "nameAr": "المقبلات",
      "description": "Hot and cold starters",
      "items": [
        {
          "name": "Hummus Bil Lahme",
          "nameAr": "حمص باللحمة",
          "description": "Creamy chickpeas tahini dip topped with spiced minced lamb",
          "descriptionAr": "حمص ناعم مع لحم مفروم متبل",
          "price": 2.500,
          "salePrice": null,
          "allergens": "Sesame, Nuts",
          "isVegetarian": false,
          "isVegan": false,
          "isGlutenFree": true,
          "prepTimeMinutes": 10,
          "confidence": 0.95,
          "confidenceNote": "Clear printed text with unambiguous price",
          "variants": [
            { "name": "Regular", "nameAr": "عادي", "price": 2.500 },
            { "name": "Large", "nameAr": "كبير", "price": 3.800 }
          ],
          "modifiers": [
            {
              "name": "Add Extra",
              "nameAr": "إضافات",
              "required": false,
              "min": 0,
              "max": 2,
              "options": [
                { "name": "Extra Pine Nuts", "nameAr": "صنوبر إضافي", "price": 0.600 },
                { "name": "Extra Bread", "nameAr": "خبز إضافي", "price": 0.200 }
              ]
            }
          ]
        }
      ]
    }
  ],
  "warnings": ["List any items where the price or name was smudged or ambiguous"]
}

Guidelines:
1. Always parse prices as numbers (e.g. 2.5 instead of "2.5 OMR").
2. If English or Arabic name is missing from the scan, generate the appropriate translation so the customer menu is bilingual.
3. If an item has multiple sizes (e.g. Small / Large), record them under "variants" with their exact prices.
4. If an item has optional additions/toppings, record them under "modifiers".
5. Assign a confidence score between 0.0 and 1.0 for each item.
6. Do NOT include markdown formatting like \`\`\`json. Output raw JSON only.`

export async function extractMenuFromMedia(params: {
  tenantId: string
  branchId?: string | null
  fileBuffer: Buffer
  mimeType: string
  fileName: string
  fileUrl: string
}): Promise<{ importRecordId: string; result: ExtractedMenuResult }> {
  const { tenantId, branchId, fileBuffer, mimeType, fileName, fileUrl } = params

  // 1. Create initial import record in DB
  const importRecord = await db.restaurantMenuImport.create({
    data: {
      tenantId,
      branchId: branchId || undefined,
      fileName,
      fileUrl,
      fileType: mimeType,
      fileSize: fileBuffer.length,
      status: "PROCESSING",
    },
  })

  try {
    const aiConfig = await getAIConfig()
    let extractedText = ""

    const isPdf = mimeType === "application/pdf"
    const isImage = mimeType.startsWith("image/")

    if (aiConfig.provider === "openai" && aiConfig.openaiKey) {
      const client = await openaiClient()

      if (isPdf) {
        // 1. First extract text from PDF pages
        let pdfText = ""
        try {
          const { extractText } = await import("unpdf")
          const pdfRes = await extractText(new Uint8Array(fileBuffer))
          const textArray = Array.isArray(pdfRes.text) ? pdfRes.text : [String(pdfRes.text || "")]
          pdfText = textArray.join("\n\n--- Page Break ---\n\n").trim()
        } catch (pdfErr) {
          console.warn("[restaurant-ai-import] unpdf text extraction failed:", pdfErr)
        }

        if (pdfText && pdfText.length > 50) {
          // Send extracted text to ChatGPT
          const completion = await client.chat.completions.create({
            model: aiConfig.model || "gpt-4o",
            messages: [
              { role: "system", content: SYSTEM_EXTRACTION_PROMPT },
              {
                role: "user",
                content: `Please extract all dishes, categories, prices, and dietary options from this restaurant menu PDF document text:\n\n${pdfText.slice(0, 75000)}`,
              },
            ],
            response_format: { type: "json_object" },
            max_tokens: 4096,
          })
          extractedText = completion.choices[0]?.message?.content || ""
        } else {
          // If no embedded text in PDF (e.g. pure scanned photo inside PDF)
          // Try extracting embedded images from PDF pages
          let pageImages: Buffer[] = []
          try {
            const { extractImages } = await import("unpdf")
            const imgRes = await extractImages(new Uint8Array(fileBuffer), 1)
            if (Array.isArray(imgRes) && imgRes.length > 0) {
              pageImages = imgRes.slice(0, 4).map((img: any) => Buffer.from(img.data || img))
            }
          } catch {}

          if (pageImages.length > 0) {
            const imageContents: any[] = pageImages.map((buf) => ({
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${buf.toString("base64")}`, detail: "high" },
            }))

            const completion = await client.chat.completions.create({
              model: aiConfig.model || "gpt-4o",
              messages: [
                {
                  role: "user",
                  content: [
                    { type: "text", text: SYSTEM_EXTRACTION_PROMPT },
                    ...imageContents,
                  ],
                },
              ],
              response_format: { type: "json_object" },
              max_tokens: 4096,
            })
            extractedText = completion.choices[0]?.message?.content || ""
          } else {
            throw new Error("Could not extract legible text or images from this PDF. If this is a photo of a physical menu, please upload it as JPG or PNG images, or use the Direct System Import tab.")
          }
        }
      } else if (isImage) {
        // Optimize image if large before sending to OpenAI
        let imageBuffer = fileBuffer
        try {
          if (fileBuffer.length > 2.5 * 1024 * 1024) {
            const sharp = (await import("sharp")).default
            imageBuffer = await sharp(fileBuffer)
              .resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true })
              .jpeg({ quality: 85 })
              .toBuffer()
          }
        } catch {}

        const base64Data = imageBuffer.toString("base64")
        const mediaUrl = `data:image/jpeg;base64,${base64Data}`

        const completion = await client.chat.completions.create({
          model: aiConfig.model || "gpt-4o",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: SYSTEM_EXTRACTION_PROMPT },
                {
                  type: "image_url",
                  image_url: { url: mediaUrl, detail: "high" },
                },
              ],
            },
          ],
          response_format: { type: "json_object" },
          max_tokens: 4096,
        })
        extractedText = completion.choices[0]?.message?.content || ""
      } else {
        throw new Error(`Unsupported file type: ${mimeType}`)
      }
    } else if (aiConfig.anthropicKey) {
      const client = await anthropicClient()
      const base64Data = fileBuffer.toString("base64")

      const messageContent: any[] = [
        {
          type: isPdf ? "document" : "image",
          source: {
            type: "base64",
            media_type: mimeType as any,
            data: base64Data,
          },
        },
        {
          type: "text",
          text: SYSTEM_EXTRACTION_PROMPT,
        },
      ]

      const response = await client.messages.create({
        model: aiConfig.model || "claude-3-5-sonnet-20241022",
        max_tokens: 4096,
        messages: [{ role: "user", content: messageContent }],
      })

      const block = response.content[0]
      if (block && block.type === "text") {
        extractedText = block.text
      }
    } else {
      throw new Error("AI provider credentials not configured. Please set OpenAI or Anthropic API key in Settings.")
    }

    // Clean JSON markdown tags if model included them
    const cleanJson = extractedText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim()

    const parsed = JSON.parse(cleanJson)
    const rawCategories: ExtractedCategory[] = Array.isArray(parsed.categories) ? parsed.categories : []
    const warnings: string[] = Array.isArray(parsed.warnings) ? parsed.warnings : []

    let totalProducts = 0
    let totalConfidence = 0

    // Normalize categories and items
    const normalizedCategories: ExtractedCategory[] = rawCategories.map((cat, catIdx) => {
      const items: ExtractedMenuItem[] = (cat.items || []).map((item, itemIdx) => {
        totalProducts++
        const conf = typeof item.confidence === "number" ? Math.min(1, Math.max(0, item.confidence)) : 0.85
        totalConfidence += conf

        return {
          id: `item_${catIdx}_${itemIdx}`,
          name: item.name || "Untitled Dish",
          nameAr: item.nameAr || null,
          description: item.description || null,
          descriptionAr: item.descriptionAr || null,
          price: typeof item.price === "number" ? item.price : parseFloat(String(item.price || 0)) || 0,
          salePrice: typeof item.salePrice === "number" ? item.salePrice : null,
          allergens: item.allergens || null,
          isVegetarian: Boolean(item.isVegetarian),
          isVegan: Boolean(item.isVegan),
          isGlutenFree: Boolean(item.isGlutenFree),
          prepTimeMinutes: typeof item.prepTimeMinutes === "number" ? item.prepTimeMinutes : 15,
          confidence: Math.round(conf * 100) / 100,
          confidenceNote: item.confidenceNote || (conf < 0.7 ? "Check price/name against original scan" : "High confidence"),
          variants: Array.isArray(item.variants)
            ? item.variants.map((v: any, vIdx: number) => ({
                id: `v_${vIdx}`,
                name: v.name || "Standard",
                nameAr: v.nameAr || null,
                price: typeof v.price === "number" ? v.price : parseFloat(String(v.price || 0)) || 0,
              }))
            : [],
          modifiers: Array.isArray(item.modifiers)
            ? item.modifiers.map((m: any, mIdx: number) => ({
                id: `m_${mIdx}`,
                name: m.name || "Addons",
                nameAr: m.nameAr || null,
                required: Boolean(m.required),
                min: typeof m.min === "number" ? m.min : 0,
                max: typeof m.max === "number" ? m.max : 5,
                options: Array.isArray(m.options)
                  ? m.options.map((o: any, oIdx: number) => ({
                      id: `opt_${mIdx}_${oIdx}`,
                      name: o.name || "Option",
                      nameAr: o.nameAr || null,
                      price: typeof o.price === "number" ? o.price : parseFloat(String(o.price || 0)) || 0,
                    }))
                  : [],
              }))
            : [],
        }
      })

      return {
        id: `cat_${catIdx}`,
        name: cat.name || "General",
        nameAr: cat.nameAr || null,
        description: cat.description || null,
        items,
      }
    })

    const avgConfidence = totalProducts > 0 ? Math.round((totalConfidence / totalProducts) * 100) / 100 : 1.0

    const finalResult: ExtractedMenuResult = {
      categories: normalizedCategories,
      totalItems: totalProducts,
      warnings,
      averageConfidence: avgConfidence,
    }

    // Update DB record
    await db.restaurantMenuImport.update({
      where: { id: importRecord.id },
      data: {
        status: "READY_FOR_REVIEW",
        extractedCategoriesCount: normalizedCategories.length,
        extractedProductsCount: totalProducts,
        warningsCount: warnings.length,
        extractedDataJson: JSON.stringify(finalResult),
        confidenceReviewJson: JSON.stringify({
          averageConfidence: avgConfidence,
          lowConfidenceCount: normalizedCategories.flatMap((c) => c.items).filter((i) => i.confidence < 0.75).length,
        }),
        warningsJson: JSON.stringify(warnings),
        processedAt: new Date(),
      },
    })

    return { importRecordId: importRecord.id, result: finalResult }
  } catch (err: any) {
    await db.restaurantMenuImport.update({
      where: { id: importRecord.id },
      data: {
        status: "FAILED",
        error: err?.message || "Failed to parse menu with AI",
      },
    })
    throw err
  }
}

/**
 * Parses a direct CSV / TSV / Excel copy-paste text into structured categories and dishes.
 * No AI required. 100% instant, reliable and deterministic.
 */
export function parseDirectMenuSpreadsheet(content: string): ExtractedMenuResult {
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (lines.length === 0) {
    throw new Error("Spreadsheet content is empty. Please provide CSV or table rows.")
  }

  // Detect delimiter: tab (\t), comma (,), semicolon (;), pipe (|)
  const firstLine = lines[0]
  let delimiter = ","
  if (firstLine.includes("\t")) delimiter = "\t"
  else if (firstLine.includes(";") && !firstLine.includes(",")) delimiter = ";"
  else if (firstLine.includes("|") && !firstLine.includes(",")) delimiter = "|"

  // Simple CSV row parser handling quotes
  const parseRow = (line: string): string[] => {
    const row: string[] = []
    let inQuotes = false
    let current = ""
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes
      } else if (char === delimiter && !inQuotes) {
        row.push(current.trim())
        current = ""
      } else {
        current += char
      }
    }
    row.push(current.trim())
    return row.map((cell) => cell.replace(/^["']|["']$/g, "").trim())
  }

  // Check if line 0 is a header
  const headerRow = parseRow(firstLine).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""))
  let startIndex = 0
  let colCategory = -1
  let colName = -1
  let colNameAr = -1
  let colPrice = -1
  let colDesc = -1
  let colDietary = -1
  let colAllergens = -1
  let colVariants = -1
  let colModifiers = -1

  const isHeader = headerRow.some(
    (h) =>
      h.includes("category") ||
      h.includes("item") ||
      h.includes("dish") ||
      h.includes("name") ||
      h.includes("price") ||
      h.includes("desc")
  )

  if (isHeader) {
    startIndex = 1
    headerRow.forEach((col, idx) => {
      if (col.includes("category") || col.includes("group") || col.includes("section")) colCategory = idx
      else if (col.includes("namear") || col.includes("arabic") || col.includes("arab")) colNameAr = idx
      else if (col.includes("name") || col.includes("dish") || col.includes("item") || col.includes("title")) {
        if (colName === -1) colName = idx
      } else if (col.includes("price") || col.includes("cost") || col.includes("rate") || col.includes("amount")) colPrice = idx
      else if (col.includes("desc") || col.includes("detail") || col.includes("ingredient")) colDesc = idx
      else if (col.includes("diet") || col.includes("type") || col.includes("veg")) colDietary = idx
      else if (col.includes("allergen")) colAllergens = idx
      else if (col.includes("variant") || col.includes("size") || col.includes("portion")) colVariants = idx
      else if (col.includes("modifier") || col.includes("addon") || col.includes("topping") || col.includes("extra")) colModifiers = idx
    })
  }

  // Fallbacks if header wasn't standard
  if (colName === -1) colName = 0
  if (colPrice === -1) {
    for (let col = 0; col < 10; col++) {
      if (
        lines.slice(startIndex, startIndex + 5).some((l) => {
          const parts = parseRow(l)
          return parts[col] && /^\$?\s*\d+(\.\d+)?/.test(parts[col])
        })
      ) {
        colPrice = col
        break
      }
    }
  }
  if (colPrice === -1) colPrice = 1

  const categoryMap: Map<string, ExtractedCategory> = new Map()
  let currentCategory = "General Dishes"

  for (let i = startIndex; i < lines.length; i++) {
    const cells = parseRow(lines[i])
    if (cells.length === 0 || cells.every((c) => !c)) continue

    let catName = colCategory >= 0 && cells[colCategory] ? cells[colCategory].trim() : currentCategory
    if (catName) currentCategory = catName
    else catName = currentCategory

    const name = colName >= 0 && cells[colName] ? cells[colName].trim() : ""
    if (!name) continue

    const nameAr = colNameAr >= 0 && cells[colNameAr] ? cells[colNameAr].trim() : null
    const priceRaw = colPrice >= 0 && cells[colPrice] ? cells[colPrice].replace(/[^0-9.]/g, "") : "0"
    const price = parseFloat(priceRaw) || 0
    const description = colDesc >= 0 && cells[colDesc] ? cells[colDesc].trim() : null
    const dietaryRaw = colDietary >= 0 && cells[colDietary] ? cells[colDietary].toLowerCase() : ""
    const allergens = colAllergens >= 0 && cells[colAllergens] ? cells[colAllergens].trim() : null

    const isVegetarian = dietaryRaw.includes("veg") && !dietaryRaw.includes("non")
    const isVegan = dietaryRaw.includes("vegan")
    const isGlutenFree = dietaryRaw.includes("gluten") || dietaryRaw.includes("gf")

    // Parse variants if column present (format: "Small: 1.5 | Large: 2.5")
    const variants: Array<{ name: string; price: number }> = []
    if (colVariants >= 0 && cells[colVariants]) {
      const vParts = cells[colVariants].split(/[|;]/)
      for (const vp of vParts) {
        const [vName, vP] = vp.split(":")
        if (vName && vP) {
          variants.push({ name: vName.trim(), price: parseFloat(vP.replace(/[^0-9.]/g, "")) || price })
        }
      }
    }

    // Parse modifiers if column present (format: "Cheese: 0.5 | Extra Dip: 0.2")
    const modifiers: Array<{ name: string; options: Array<{ name: string; price: number }> }> = []
    if (colModifiers >= 0 && cells[colModifiers]) {
      const mParts = cells[colModifiers].split(/[|;]/)
      const options: Array<{ name: string; price: number }> = []
      for (const mp of mParts) {
        const [mName, mP] = mp.split(":")
        if (mName) {
          options.push({ name: mName.trim(), price: mP ? parseFloat(mP.replace(/[^0-9.]/g, "")) || 0 : 0 })
        }
      }
      if (options.length > 0) {
        modifiers.push({ name: "Add-ons", options })
      }
    }

    if (!categoryMap.has(catName)) {
      categoryMap.set(catName, {
        id: `cat_${categoryMap.size}`,
        name: catName,
        items: [],
      })
    }

    const cat = categoryMap.get(catName)!
    cat.items.push({
      id: `item_${categoryMap.size}_${cat.items.length}`,
      name,
      nameAr,
      description,
      price,
      allergens,
      isVegetarian,
      isVegan,
      isGlutenFree,
      confidence: 1.0,
      confidenceNote: "Direct system import",
      variants: variants.length > 0 ? variants : undefined,
      modifiers: modifiers.length > 0 ? modifiers : undefined,
    })
  }

  const categories = Array.from(categoryMap.values())
  const totalItems = categories.reduce((sum, c) => sum + c.items.length, 0)

  return {
    categories,
    totalItems,
    warnings: totalItems === 0 ? ["No menu items found. Please verify the column headers and row values."] : [],
    averageConfidence: 1.0,
  }
}

/**
 * Commits structured categories and items to the tenant's live digital menu in the database.
 */
export async function commitCategoriesToMenu(params: {
  tenantId: string
  branchId?: string | null
  menuId?: string | null
  categories: ExtractedCategory[]
}) {
  const { tenantId, branchId, menuId, categories } = params

  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { currency: true },
  })
  const currency = tenant?.currency || "OMR"

  let createdCategoriesCount = 0
  let createdItemsCount = 0

  await db.$transaction(async (tx) => {
    for (let catIdx = 0; catIdx < categories.length; catIdx++) {
      const cat = categories[catIdx]

      let categoryRecord = await tx.menuCategory.findFirst({
        where: {
          tenantId,
          name: cat.name,
        },
      })

      if (!categoryRecord) {
        categoryRecord = await tx.menuCategory.create({
          data: {
            tenantId,
            branchId: branchId || undefined,
            menuId: menuId || undefined,
            name: cat.name,
            nameAr: cat.nameAr || undefined,
            description: cat.description || undefined,
            displayOrder: catIdx,
            isActive: true,
          },
        })
        createdCategoriesCount++
      }

      for (let itemIdx = 0; itemIdx < cat.items.length; itemIdx++) {
        const item = cat.items[itemIdx]

        await tx.menuItem.create({
          data: {
            tenantId,
            branchId: branchId || undefined,
            menuId: menuId || undefined,
            categoryId: categoryRecord.id,
            name: item.name,
            nameAr: item.nameAr || undefined,
            description: item.description || undefined,
            descriptionAr: item.descriptionAr || undefined,
            price: item.price,
            salePrice: item.salePrice || undefined,
            currency,
            allergens: item.allergens || undefined,
            isVegetarian: Boolean(item.isVegetarian),
            isVegan: Boolean(item.isVegan),
            isGlutenFree: Boolean(item.isGlutenFree),
            prepTimeMinutes: item.prepTimeMinutes || 15,
            sortOrder: itemIdx,
            variantsJson: item.variants && item.variants.length > 0 ? JSON.stringify(item.variants) : undefined,
            modifiersJson: item.modifiers && item.modifiers.length > 0 ? JSON.stringify(item.modifiers) : undefined,
            isAvailable: true,
          },
        })
        createdItemsCount++
      }
    }
  })

  return {
    success: true,
    createdCategoriesCount,
    createdItemsCount,
  }
}

export async function approveMenuImport(params: {
  tenantId: string
  importId: string
  branchId?: string | null
  menuId?: string | null
  categories: ExtractedCategory[]
}) {
  const { tenantId, importId, branchId, menuId, categories } = params

  const record = await db.restaurantMenuImport.findFirst({
    where: { id: importId, tenantId },
  })
  if (!record) throw new Error("Import record not found")

  const result = await commitCategoriesToMenu({
    tenantId,
    branchId,
    menuId,
    categories,
  })

  await db.restaurantMenuImport.update({
    where: { id: importId },
    data: {
      status: "APPROVED",
      approvedDataJson: JSON.stringify(categories),
      approvedAt: new Date(),
    },
  })

  return result
}
