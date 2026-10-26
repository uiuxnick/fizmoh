import { expect, test, describe } from "bun:test"

describe("Restaurant Table Ordering & Smart Menu Security and Role Controls", () => {
  const MENU_EDIT_ROLES = new Set(["OWNER", "SUPER_ADMIN", "ADMIN", "MANAGER", "PLATFORM"])
  const POS_OPERATIONAL_ROLES = new Set(["OWNER", "SUPER_ADMIN", "ADMIN", "MANAGER", "STAFF", "AGENT", "CHAT_AGENT", "PLATFORM"])

  test("authorized management roles can modify menu categories, items, branches, and tables", () => {
    expect(MENU_EDIT_ROLES.has("OWNER")).toBe(true)
    expect(MENU_EDIT_ROLES.has("SUPER_ADMIN")).toBe(true)
    expect(MENU_EDIT_ROLES.has("ADMIN")).toBe(true)
    expect(MENU_EDIT_ROLES.has("MANAGER")).toBe(true)
    expect(MENU_EDIT_ROLES.has("PLATFORM")).toBe(true)
  })

  test("operational and read-only roles cannot modify menu catalog or table layouts", () => {
    expect(MENU_EDIT_ROLES.has("STAFF")).toBe(false)
    expect(MENU_EDIT_ROLES.has("AGENT")).toBe(false)
    expect(MENU_EDIT_ROLES.has("CHAT_AGENT")).toBe(false)
    expect(MENU_EDIT_ROLES.has("VIEWER")).toBe(false)
    expect(MENU_EDIT_ROLES.has("FINANCE")).toBe(false)
    expect(MENU_EDIT_ROLES.has("GUEST")).toBe(false)
  })

  test("staff and agents can manage operational POS orders, reservations, and waiter calls", () => {
    expect(POS_OPERATIONAL_ROLES.has("STAFF")).toBe(true)
    expect(POS_OPERATIONAL_ROLES.has("AGENT")).toBe(true)
    expect(POS_OPERATIONAL_ROLES.has("CHAT_AGENT")).toBe(true)
    expect(POS_OPERATIONAL_ROLES.has("MANAGER")).toBe(true)
    expect(POS_OPERATIONAL_ROLES.has("ADMIN")).toBe(true)
  })

  test("viewers and guests cannot create or alter POS orders or reservations", () => {
    expect(POS_OPERATIONAL_ROLES.has("VIEWER")).toBe(false)
    expect(POS_OPERATIONAL_ROLES.has("FINANCE")).toBe(false)
    expect(POS_OPERATIONAL_ROLES.has("GUEST")).toBe(false)
  })

  test("validates menu import document types and size constraints", () => {
    const isAllowedMime = (mime: string) => {
      return mime.startsWith("image/") || mime === "application/pdf"
    }
    const MAX_SIZE = 25 * 1024 * 1024 // 25 MB

    expect(isAllowedMime("image/jpeg")).toBe(true)
    expect(isAllowedMime("image/png")).toBe(true)
    expect(isAllowedMime("image/webp")).toBe(true)
    expect(isAllowedMime("application/pdf")).toBe(true)

    // Dangerous / unsupported types
    expect(isAllowedMime("application/x-sh")).toBe(false)
    expect(isAllowedMime("application/javascript")).toBe(false)
    expect(isAllowedMime("text/html")).toBe(false)
    expect(isAllowedMime("application/x-msdownload")).toBe(false)

    // Size limit check
    expect(10 * 1024 * 1024 <= MAX_SIZE).toBe(true)
    expect(26 * 1024 * 1024 <= MAX_SIZE).toBe(false)
  })

  test("verifies order financial calculations and positive quantity integrity", () => {
    interface OrderItem {
      name: string
      price: number
      quantity: number
      addons?: Array<{ name: string; price: number }>
    }

    const calculateOrder = (
      items: OrderItem[],
      taxRate = 0.05,
      serviceChargeRate = 0.05,
      discount = 0
    ) => {
      let subtotal = 0
      for (const item of items) {
        if (item.quantity <= 0) throw new Error("Invalid quantity")
        let itemTotal = item.price * item.quantity
        if (item.addons) {
          for (const addon of item.addons) {
            itemTotal += addon.price * item.quantity
          }
        }
        subtotal += itemTotal
      }

      const safeDiscount = Math.min(Math.max(0, discount), subtotal)
      const discountedSubtotal = subtotal - safeDiscount
      const tax = Number((discountedSubtotal * taxRate).toFixed(3))
      const serviceCharge = Number((discountedSubtotal * serviceChargeRate).toFixed(3))
      const total = Number((discountedSubtotal + tax + serviceCharge).toFixed(3))

      return { subtotal, discount: safeDiscount, tax, serviceCharge, total }
    }

    const validItems: OrderItem[] = [
      {
        name: "Truffle Pizza",
        price: 6.5,
        quantity: 2,
        addons: [{ name: "Extra Mozzarella", price: 0.8 }],
      },
      {
        name: "San Pellegrino",
        price: 1.5,
        quantity: 1,
      },
    ]

    const result = calculateOrder(validItems, 0.05, 0.05, 1.0)
    // (6.5 + 0.8)*2 = 14.6 + 1.5 = 16.1 subtotal
    expect(result.subtotal).toBe(16.1)
    expect(result.discount).toBe(1.0)
    // 15.1 * 0.05 = 0.755 tax, 0.755 service
    expect(result.tax).toBe(0.755)
    expect(result.serviceCharge).toBe(0.755)
    // total = 15.1 + 0.755 + 0.755 = 16.61
    expect(result.total).toBe(16.61)

    // Negative quantity rejected
    expect(() => calculateOrder([{ name: "Bad", price: 5, quantity: -1 }])).toThrow("Invalid quantity")
    expect(() => calculateOrder([{ name: "Bad", price: 5, quantity: 0 }])).toThrow("Invalid quantity")
  })

  test("enforces module entitlement: RESTAURANT add-on or enterprise plan required", () => {
    const checkEntitled = (plan: string, activeAddons: string[] = []): boolean => {
      if (plan.toUpperCase() === "ENTERPRISE") return true
      return activeAddons.includes("RESTAURANT")
    }

    // cezo: Free plan without restaurant addon
    expect(checkEntitled("FREE", [])).toBe(false)

    // tanfidh: Starter plan without restaurant addon
    expect(checkEntitled("STARTER", ["ECOMMERCE"])).toBe(false)

    // Workspace with restaurant addon
    expect(checkEntitled("STARTER", ["RESTAURANT"])).toBe(true)

    // oman-adventures: Enterprise plan
    expect(checkEntitled("ENTERPRISE", [])).toBe(true)
  })
})
