import { expect, test } from "bun:test"
import { canReceiveRestaurantOrder } from "@/lib/restaurant-stream-scope"

const event = { tenantId: "a", orderId: "order-a", tableId: "table-a" }
test("missing or unresolved token scope cannot receive events", () => {
  expect(canReceiveRestaurantOrder({ tenantId: null, orderId: null, tableId: null }, event)).toBe(false)
  expect(canReceiveRestaurantOrder({ tenantId: "a", orderId: null, tableId: null }, event)).toBe(false)
})
test("order tracking requires the exact tenant and order", () => {
  const scope = { tenantId: "a", orderId: "order-a", tableId: null }
  expect(canReceiveRestaurantOrder(scope, event)).toBe(true)
  expect(canReceiveRestaurantOrder(scope, { ...event, tenantId: "b" })).toBe(false)
  expect(canReceiveRestaurantOrder(scope, { ...event, tenantId: undefined })).toBe(false)
  expect(canReceiveRestaurantOrder(scope, { ...event, orderId: "other" })).toBe(false)
})
test("table tracking cannot receive another table's orders", () => {
  const scope = { tenantId: "a", orderId: null, tableId: "table-a" }
  expect(canReceiveRestaurantOrder(scope, event)).toBe(true)
  expect(canReceiveRestaurantOrder(scope, { ...event, tableId: "table-b" })).toBe(false)
  expect(canReceiveRestaurantOrder(scope, { ...event, tableId: undefined })).toBe(false)
})
