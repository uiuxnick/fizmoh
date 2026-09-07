import { NextRequest, NextResponse } from "next/server"
import { raw } from "@/lib/db"
import { currentTenant } from "@/lib/tenant"
import { withErrors } from "@/lib/api-handler"
import { withModule } from "@/lib/entitlements"

export const POST = withErrors(withModule("RESTAURANT", async () => {
  const tenant = currentTenant()
  const tenantId = tenant?.tenantId
  if (!tenantId) return NextResponse.json({ error: "Unauthorized workspace" }, { status: 401 })

  // 1. Seed Restaurant Tables if none exist
  const existingTablesCount = await raw.restaurantTable.count({ where: { tenantId } })
  if (existingTablesCount === 0) {
    const demoTables = [
      { number: "T-01", name: "Window Table 1", capacity: 2, section: "MAIN", status: "AVAILABLE" },
      { number: "T-02", name: "Window Table 2", capacity: 4, section: "MAIN", status: "OCCUPIED" },
      { number: "T-03", name: "Center Table", capacity: 6, section: "MAIN", status: "AVAILABLE" },
      { number: "TR-01", name: "Garden Terrace 1", capacity: 4, section: "TERRACE", status: "RESERVED" },
      { number: "TR-02", name: "Garden Terrace 2", capacity: 4, section: "TERRACE", status: "AVAILABLE" },
      { number: "VIP-01", name: "Royal VIP Lounge", capacity: 10, section: "VIP", status: "AVAILABLE" },
    ]
    for (const t of demoTables) {
      await raw.restaurantTable.create({
        data: { tenantId, ...t },
      })
    }
  }

  // 2. Seed Menu Categories & Dishes with Addons & Images
  const demoCategories = [
    {
      name: "🍕 Gourmet Pizzas",
      description: "Artisanal hand-tossed wood-fired pizzas",
      displayOrder: 1,
      items: [
        {
          name: "Truffle Mushroom & Mozzarella Pizza",
          description: "Black truffle cream base, wild mushrooms, fresh mozzarella, and aromatic thyme.",
          price: 6.500,
          imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&auto=format&fit=crop",
          prepTimeMinutes: 18,
          isVegetarian: true,
          isGlutenFree: false,
          addonsJson: JSON.stringify([
            { name: "Extra Buffalo Mozzarella", price: 0.800, imageUrl: "https://images.unsplash.com/photo-1589881133595-a3c085cf731d?w=200&auto=format&fit=crop" },
            { name: "Add Black Truffle Oil Drizzle", price: 0.500, imageUrl: "https://images.unsplash.com/photo-1608897013039-887f21d8c804?w=200&auto=format&fit=crop" },
            { name: "Gluten-Free Cauliflower Crust", price: 1.000, imageUrl: "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=200&auto=format&fit=crop" },
          ]),
        },
        {
          name: "Spicy Wagyu Pepperoni Feast",
          description: "Premium Wagyu beef pepperoni, jalapeños, spicy tomato sugo, and hot honey drizzle.",
          price: 7.200,
          imageUrl: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=800&auto=format&fit=crop",
          prepTimeMinutes: 15,
          isVegetarian: false,
          isGlutenFree: false,
          addonsJson: JSON.stringify([
            { name: "Extra Wagyu Pepperoni", price: 1.200 },
            { name: "Add Jalapeños & Hot Honey", price: 0.400 },
            { name: "Garlic Butter Dip", price: 0.300 },
          ]),
        },
      ],
    },
    {
      name: "🍔 Artisan Burgers & Sandwiches",
      description: "Grass-fed beef & crispy chicken served with seasoned fries",
      displayOrder: 2,
      items: [
        {
          name: "Smash Angus Bacon Cheeseburger",
          description: "Double Angus beef patty, melted cheddar, crispy turkey bacon, caramelized onions, house sauce.",
          price: 5.800,
          imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop",
          prepTimeMinutes: 12,
          isVegetarian: false,
          isGlutenFree: false,
          addonsJson: JSON.stringify([
            { name: "Extra Angus Patty", price: 1.500, imageUrl: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=200&auto=format&fit=crop" },
            { name: "Add Fried Egg", price: 0.400 },
            { name: "Upgrade to Truffle Fries", price: 0.800, imageUrl: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=200&auto=format&fit=crop" },
            { name: "Extra Cheddar Cheese Slice", price: 0.300 },
          ]),
        },
        {
          name: "Crispy Buttermilk Chicken Zinger Burger",
          description: "Fried buttermilk chicken breast, spicy coleslaw, pickles, and chipotle mayo.",
          price: 4.900,
          imageUrl: "https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?w=800&auto=format&fit=crop",
          prepTimeMinutes: 14,
          isVegetarian: false,
          isGlutenFree: false,
          addonsJson: JSON.stringify([
            { name: "Add Crispy Bacon", price: 0.600 },
            { name: "Extra Chipotle Dip", price: 0.250 },
          ]),
        },
      ],
    },
    {
      name: "🥗 Fresh Salads & Starters",
      description: "Healthy greens, dips, and warm appetizers",
      displayOrder: 3,
      items: [
        {
          name: "Grilled Chicken Caesar Salad",
          description: "Crisp romaine, char-grilled herb chicken breast, parmesan shavings, and house croutons.",
          price: 4.200,
          imageUrl: "https://images.unsplash.com/photo-1546793665-c74683f339c1?w=800&auto=format&fit=crop",
          prepTimeMinutes: 10,
          isVegetarian: false,
          isGlutenFree: true,
          addonsJson: JSON.stringify([
            { name: "Add Grilled Tiger Prawns (3 pcs)", price: 1.800 },
            { name: "Add Extra Avocado Slices", price: 0.600, imageUrl: "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=200&auto=format&fit=crop" },
          ]),
        },
        {
          name: "Mediterranean Hummus & Warm Pita",
          description: "Creamy chickpeas, tahini, olive oil, roasted pine nuts, served with fresh warm pita bread.",
          price: 3.200,
          imageUrl: "https://images.unsplash.com/photo-1541518763669-27fef04b14ea?w=800&auto=format&fit=crop",
          prepTimeMinutes: 5,
          isVegetarian: true,
          isVegan: true,
          isGlutenFree: false,
          addonsJson: JSON.stringify([
            { name: "Extra Warm Pita Bread", price: 0.300 },
            { name: "Add Spicy Falafel (4 pcs)", price: 0.800 },
          ]),
        },
      ],
    },
    {
      name: "🍹 Signature Cocktails & Coffees",
      description: "Cold-pressed juices, specialty coffees, and mocktails",
      displayOrder: 4,
      items: [
        {
          name: "Fresh Mango Passionfruit Mojito",
          description: "Freshly crushed Omani mango, passionfruit pulp, mint leaves, lime juice, and soda.",
          price: 2.800,
          imageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&auto=format&fit=crop",
          prepTimeMinutes: 5,
          isVegetarian: true,
          isVegan: true,
          isGlutenFree: true,
          addonsJson: JSON.stringify([
            { name: "Add Chia Seeds", price: 0.200 },
            { name: "Extra Mint & Lime", price: 0.150 },
          ]),
        },
        {
          name: "Iced Spanish Vanilla Latte",
          description: "Double shot espresso, condensed milk, Madagascar vanilla, and cold milk over ice.",
          price: 2.400,
          imageUrl: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=800&auto=format&fit=crop",
          prepTimeMinutes: 5,
          isVegetarian: true,
          isGlutenFree: true,
          addonsJson: JSON.stringify([
            { name: "Substitute Oat Milk", price: 0.300, imageUrl: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=200&auto=format&fit=crop" },
            { name: "Extra Espresso Shot", price: 0.400 },
          ]),
        },
      ],
    },
  ]

  for (const catData of demoCategories) {
    let cat = await raw.menuCategory.findFirst({
      where: { tenantId, name: catData.name },
    })

    if (!cat) {
      cat = await raw.menuCategory.create({
        data: {
          tenantId,
          name: catData.name,
          description: catData.description,
          displayOrder: catData.displayOrder,
        },
      })
    }

    for (const item of catData.items) {
      const exists = await raw.menuItem.findFirst({
        where: { tenantId, categoryId: cat.id, name: item.name },
      })
      if (!exists) {
        await raw.menuItem.create({
          data: {
            tenantId,
            categoryId: cat.id,
            name: item.name,
            description: item.description,
            price: item.price,
            imageUrl: item.imageUrl,
            prepTimeMinutes: item.prepTimeMinutes,
            isVegetarian: item.isVegetarian,
            isVegan: Boolean((item as any).isVegan),
            isGlutenFree: item.isGlutenFree,
            addonsJson: item.addonsJson,
          },
        })
      } else {
        // Update existing with images if missing
        await raw.menuItem.update({
          where: { id: exists.id },
          data: {
            imageUrl: item.imageUrl,
            addonsJson: item.addonsJson,
          },
        })
      }
    }
  }

  return NextResponse.json({ success: true, message: "Demo menu, images and addons seeded successfully" })
}))
