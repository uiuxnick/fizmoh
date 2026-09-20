export function canReceiveRestaurantOrder(
  scope: { tenantId: string | null; orderId: string | null; tableId: string | null },
  event: { tenantId?: string; orderId: string; tableId?: string },
): boolean {
  if (!scope.tenantId || event.tenantId !== scope.tenantId) return false
  if (scope.orderId) return event.orderId === scope.orderId
  return !!scope.tableId && event.tableId === scope.tableId
}
