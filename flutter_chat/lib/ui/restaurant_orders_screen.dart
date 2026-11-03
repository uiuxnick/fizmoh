import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:provider/provider.dart';
import '../core/api_client.dart';
import '../core/models.dart';

class RestaurantOrdersScreen extends StatefulWidget {
  const RestaurantOrdersScreen({super.key});

  @override
  State<RestaurantOrdersScreen> createState() => _RestaurantOrdersScreenState();
}

class _RestaurantOrdersScreenState extends State<RestaurantOrdersScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs = TabController(length: 2, vsync: this);

  List<RestaurantOrder> _orders = [];
  List<WaiterRequest> _waiterCalls = [];
  bool _loading = true;
  String? _error;
  String _statusFilter = 'ALL';

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final api = context.read<ApiClient>();
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final results = await Future.wait([
        api.restaurantOrders(),
        api.waiterRequests(),
      ]);

      if (mounted) {
        setState(() {
          _orders = results[0] as List<RestaurantOrder>;
          _waiterCalls = results[1] as List<WaiterRequest>;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Failed to load restaurant data: $e';
          _loading = false;
        });
      }
    }
  }

  Future<void> _updateStatus(String orderId, String nextStatus) async {
    final api = context.read<ApiClient>();
    try {
      await api.updateRestaurantOrderStatus(orderId, nextStatus);
      _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to update: $e')),
        );
      }
    }
  }

  Future<void> _resolveWaiter(String requestId) async {
    final api = context.read<ApiClient>();
    try {
      await api.resolveWaiterRequest(requestId);
      _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to resolve: $e')),
        );
      }
    }
  }

  void _openOrderDetails(RestaurantOrder order) {
    showDialog<void>(
      context: context,
      barrierDismissible: true,
      builder: (ctx) => _OrderDetailsDialog(
        order: order,
        onStatusChange: (newStatus) async {
          Navigator.pop(ctx);
          await _updateStatus(order.id, newStatus);
        },
        onEdit: () {
          Navigator.pop(ctx);
          _openEditOrder(order);
        },
        onPrintReceipt: () => _printReceipt(order),
        onPrintKOT: () => _printKOT(order),
      ),
    );
  }

  void _openEditOrder(RestaurantOrder order) {
    showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => _EditOrderDialog(
        order: order,
        onSaved: () {
          Navigator.pop(ctx);
          _load();
        },
      ),
    );
  }

  Future<void> _printReceipt(RestaurantOrder order) async {
    final doc = pw.Document();
    final timeStr = order.createdAt != null
        ? DateFormat('dd MMM yyyy, HH:mm').format(order.createdAt!)
        : DateFormat('dd MMM yyyy, HH:mm').format(DateTime.now());

    doc.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.roll80,
        margin: const pw.EdgeInsets.all(12),
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Center(
                child: pw.Text(
                  order.branchName ?? 'FIZMOH RESTAURANT',
                  style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 16),
                ),
              ),
              pw.Center(
                child: pw.Text(
                  'Tax Invoice / Customer Receipt',
                  style: const pw.TextStyle(fontSize: 10),
                ),
              ),
              pw.SizedBox(height: 8),
              pw.Divider(thickness: 1),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('Order: ${order.orderNumber}', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 11)),
                  pw.Text(order.orderType, style: const pw.TextStyle(fontSize: 10)),
                ],
              ),
              if (order.tableNumber != null)
                pw.Text('Table: ${order.tableNumber}', style: const pw.TextStyle(fontSize: 10)),
              if (order.roomNumber != null)
                pw.Text('Room: ${order.roomNumber}', style: const pw.TextStyle(fontSize: 10)),
              if (order.customerName != null && order.customerName!.isNotEmpty)
                pw.Text('Customer: ${order.customerName}', style: const pw.TextStyle(fontSize: 10)),
              if (order.customerPhone != null && order.customerPhone!.isNotEmpty)
                pw.Text('Phone: ${order.customerPhone}', style: const pw.TextStyle(fontSize: 10)),
              pw.Text('Date: $timeStr', style: const pw.TextStyle(fontSize: 9)),
              pw.Divider(thickness: 0.5),
              pw.SizedBox(height: 4),

              // Items
              pw.Row(
                children: [
                  pw.Expanded(flex: 5, child: pw.Text('Item', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 9))),
                  pw.Expanded(flex: 2, child: pw.Text('Qty', textAlign: pw.TextAlign.center, style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 9))),
                  pw.Expanded(flex: 3, child: pw.Text('Total (${order.currency})', textAlign: pw.TextAlign.right, style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 9))),
                ],
              ),
              pw.Divider(thickness: 0.5),
              ...order.items.map((item) => pw.Padding(
                    padding: const pw.EdgeInsets.symmetric(vertical: 2),
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Row(
                          children: [
                            pw.Expanded(flex: 5, child: pw.Text(item.name, style: const pw.TextStyle(fontSize: 9))),
                            pw.Expanded(flex: 2, child: pw.Text('${item.qty}', textAlign: pw.TextAlign.center, style: const pw.TextStyle(fontSize: 9))),
                            pw.Expanded(flex: 3, child: pw.Text((item.price * item.qty).toStringAsFixed(2), textAlign: pw.TextAlign.right, style: const pw.TextStyle(fontSize: 9))),
                          ],
                        ),
                        if (item.variant != null)
                          pw.Padding(
                            padding: const pw.EdgeInsets.only(left: 4),
                            child: pw.Text('(${item.variant})', style: const pw.TextStyle(fontSize: 8)),
                          ),
                        if (item.modifiers.isNotEmpty)
                          pw.Padding(
                            padding: const pw.EdgeInsets.only(left: 4),
                            child: pw.Text('+ ${item.modifiers.join(', ')}', style: const pw.TextStyle(fontSize: 8)),
                          ),
                      ],
                    ),
                  )),
              pw.Divider(thickness: 1),

              // Totals
              if (order.subtotalAmount != null)
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text('Subtotal:', style: const pw.TextStyle(fontSize: 9)),
                    pw.Text('${order.currency} ${order.subtotalAmount!.toStringAsFixed(2)}', style: const pw.TextStyle(fontSize: 9)),
                  ],
                ),
              if (order.discountAmount != null && order.discountAmount! > 0)
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text('Discount:', style: const pw.TextStyle(fontSize: 9)),
                    pw.Text('- ${order.currency} ${order.discountAmount!.toStringAsFixed(2)}', style: const pw.TextStyle(fontSize: 9)),
                  ],
                ),
              if (order.taxAmount != null && order.taxAmount! > 0)
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text('Tax / VAT:', style: const pw.TextStyle(fontSize: 9)),
                    pw.Text('${order.currency} ${order.taxAmount!.toStringAsFixed(2)}', style: const pw.TextStyle(fontSize: 9)),
                  ],
                ),
              pw.SizedBox(height: 4),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('GRAND TOTAL:', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 12)),
                  pw.Text('${order.currency} ${order.totalAmount.toStringAsFixed(2)}', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 12)),
                ],
              ),
              pw.SizedBox(height: 4),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('Payment Status:', style: const pw.TextStyle(fontSize: 9)),
                  pw.Text(order.paymentStatus, style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 9)),
                ],
              ),
              if (order.paymentMethod != null)
                pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text('Payment Method:', style: const pw.TextStyle(fontSize: 9)),
                    pw.Text(order.paymentMethod!, style: const pw.TextStyle(fontSize: 9)),
                  ],
                ),
              if (order.specialNotes != null && order.specialNotes!.isNotEmpty) ...[
                pw.SizedBox(height: 6),
                pw.Text('Notes: ${order.specialNotes}', style: const pw.TextStyle(fontSize: 8)),
              ],
              pw.SizedBox(height: 12),
              pw.Center(
                child: pw.Text('Thank you for dining with us!', style: const pw.TextStyle(fontSize: 9)),
              ),
              pw.Center(
                child: pw.Text('Powered by Fizmoh Cloud', style: const pw.TextStyle(fontSize: 7)),
              ),
            ],
          );
        },
      ),
    );

    await Printing.layoutPdf(onLayout: (PdfPageFormat format) async => doc.save());
  }

  Future<void> _printKOT(RestaurantOrder order) async {
    final doc = pw.Document();
    final timeStr = order.createdAt != null
        ? DateFormat('HH:mm').format(order.createdAt!)
        : DateFormat('HH:mm').format(DateTime.now());

    doc.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.roll80,
        margin: const pw.EdgeInsets.all(12),
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Center(
                child: pw.Text('KITCHEN ORDER TICKET (KOT)', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 14)),
              ),
              pw.SizedBox(height: 6),
              pw.Divider(thickness: 1.5),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('ORDER: ${order.orderNumber}', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 14)),
                  pw.Text(timeStr, style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 12)),
                ],
              ),
              pw.SizedBox(height: 4),
              pw.Container(
                padding: const pw.EdgeInsets.all(4),
                decoration: pw.BoxDecoration(border: pw.Border.all(width: 1)),
                child: pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text(
                      order.tableNumber != null
                          ? 'TABLE: ${order.tableNumber}'
                          : order.roomNumber != null
                              ? 'ROOM: ${order.roomNumber}'
                              : order.orderType,
                      style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 12),
                    ),
                    pw.Text('Type: ${order.orderType}', style: const pw.TextStyle(fontSize: 10)),
                  ],
                ),
              ),
              pw.SizedBox(height: 8),
              pw.Divider(thickness: 1),
              ...order.items.map((item) => pw.Padding(
                    padding: const pw.EdgeInsets.symmetric(vertical: 4),
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Row(
                          children: [
                            pw.Text('${item.qty} x ', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 13)),
                            pw.Expanded(
                              child: pw.Text(item.name, style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 12)),
                            ),
                          ],
                        ),
                        if (item.variant != null)
                          pw.Padding(
                            padding: const pw.EdgeInsets.only(left: 20),
                            child: pw.Text('Option: ${item.variant}', style: const pw.TextStyle(fontSize: 10)),
                          ),
                        if (item.modifiers.isNotEmpty)
                          pw.Padding(
                            padding: const pw.EdgeInsets.only(left: 20),
                            child: pw.Text('Mods: ${item.modifiers.join(", ")}', style: const pw.TextStyle(fontSize: 10)),
                          ),
                        if (item.notes != null && item.notes!.isNotEmpty)
                          pw.Padding(
                            padding: const pw.EdgeInsets.only(left: 20),
                            child: pw.Text('Note: ${item.notes}', style: const pw.TextStyle(fontSize: 10)),
                          ),
                      ],
                    ),
                  )),
              pw.Divider(thickness: 1.5),
              if (order.specialNotes != null && order.specialNotes!.isNotEmpty) ...[
                pw.SizedBox(height: 4),
                pw.Text('SPECIAL INSTRUCTIONS:', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10)),
                pw.Text(order.specialNotes!, style: const pw.TextStyle(fontSize: 10)),
                pw.SizedBox(height: 8),
              ],
            ],
          );
        },
      ),
    );

    await Printing.layoutPdf(onLayout: (PdfPageFormat format) async => doc.save());
  }

  @override
  Widget build(BuildContext context) {
    final pendingWaiterCount = _waiterCalls.where((w) => w.status == 'PENDING').length;
    final activeOrdersCount = _orders.where((o) => ['PENDING', 'ACCEPTED', 'PREPARING'].contains(o.status)).length;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Restaurant & Dining', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        actions: [
          IconButton(
            tooltip: 'Refresh orders',
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _load,
          ),
          const SizedBox(width: 8),
        ],
        bottom: TabBar(
          controller: _tabs,
          tabs: [
            Tab(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text('Kitchen Orders'),
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFF10B981),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      '$activeOrdersCount',
                      style: const TextStyle(fontSize: 10, color: Colors.white, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
            ),
            Tab(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text('Waiter Calls'),
                  if (pendingWaiterCount > 0) ...[
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.amber.shade700,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        '$pendingWaiterCount',
                        style: const TextStyle(fontSize: 10, color: Colors.white, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!))
              : TabBarView(
                  controller: _tabs,
                  children: [
                    _buildOrdersList(),
                    _buildWaiterList(),
                  ],
                ),
    );
  }

  Widget _buildOrdersList() {
    final filtered = _statusFilter == 'ALL'
        ? _orders
        : _orders.where((o) => o.status == _statusFilter).toList();

    return Column(
      children: [
        // Filter chips bar
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          child: Row(
            children: [
              _filterChip('ALL', 'All (${_orders.length})'),
              const SizedBox(width: 6),
              _filterChip('PENDING', 'Pending (${_orders.where((o) => o.status == "PENDING").length})'),
              const SizedBox(width: 6),
              _filterChip('ACCEPTED', 'Accepted (${_orders.where((o) => o.status == "ACCEPTED").length})'),
              const SizedBox(width: 6),
              _filterChip('PREPARING', 'Cooking (${_orders.where((o) => o.status == "PREPARING").length})'),
              const SizedBox(width: 6),
              _filterChip('READY', 'Ready (${_orders.where((o) => o.status == "READY").length})'),
              const SizedBox(width: 6),
              _filterChip('SERVED', 'Served (${_orders.where((o) => o.status == "SERVED").length})'),
              const SizedBox(width: 6),
              _filterChip('COMPLETED', 'Completed (${_orders.where((o) => o.status == "COMPLETED").length})'),
            ],
          ),
        ),
        Expanded(
          child: filtered.isEmpty
              ? RefreshIndicator(
                  onRefresh: _load,
                  child: const Center(
                    child: Text('No orders in this category'),
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(12, 4, 12, 16),
                    itemCount: filtered.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, idx) {
                      final order = filtered[idx];
                      return _buildOrderCard(order);
                    },
                  ),
                ),
        ),
      ],
    );
  }

  Widget _filterChip(String status, String label) {
    final isSelected = _statusFilter == status;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return ChoiceChip(
      label: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
          color: isSelected ? Colors.white : (isDark ? const Color(0xFFCBD5E1) : const Color(0xFF334155)),
        ),
      ),
      selected: isSelected,
      selectedColor: Theme.of(context).primaryColor,
      backgroundColor: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
      side: BorderSide(
        color: isSelected
            ? Theme.of(context).primaryColor
            : (isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
      ),
      showCheckmark: false,
      onSelected: (_) => setState(() => _statusFilter = status),
      visualDensity: VisualDensity.compact,
    );
  }

  Widget _buildOrderCard(RestaurantOrder order) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final timeStr = order.createdAt != null
        ? DateFormat('HH:mm').format(order.createdAt!)
        : '';

    Color statusColor = Colors.grey;
    if (order.status == 'PENDING') statusColor = Colors.orange;
    if (order.status == 'ACCEPTED') statusColor = Colors.blue;
    if (order.status == 'PREPARING') statusColor = Colors.amber.shade800;
    if (order.status == 'READY') statusColor = Colors.green;
    if (order.status == 'SERVED') statusColor = Colors.teal;
    if (order.status == 'COMPLETED') statusColor = Colors.purple;

    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: () => _openOrderDetails(order),
      child: Card(
        elevation: isDark ? 0 : 0.5,
        color: isDark ? const Color(0xFF161E2E) : Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: isDark ? const Color(0xFF26334A) : Colors.grey.shade200),
        ),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Text(
                        order.orderNumber,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF1E293B) : Colors.grey.shade100,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          order.orderType == 'DINE_IN' && order.tableNumber != null
                              ? 'Table ${order.tableNumber}'
                              : order.orderType == 'ROOM_SERVICE' && order.roomNumber != null
                                  ? 'Room ${order.roomNumber}'
                                  : order.orderType,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: isDark ? const Color(0xFFE2E8F0) : const Color(0xFF334155),
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: statusColor.withValues(alpha: isDark ? 0.25 : 0.15),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          order.status,
                          style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: statusColor),
                        ),
                      ),
                    ],
                  ),
                  Row(
                    children: [
                      Text(timeStr, style: TextStyle(fontSize: 12, color: isDark ? const Color(0xFF94A3B8) : Colors.grey.shade500)),
                      const SizedBox(width: 4),
                      IconButton(
                        icon: const Icon(Icons.more_vert_rounded, size: 20),
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                        tooltip: 'Order options',
                        onPressed: () => _openOrderDetails(order),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 6),

              // Customer / Guest Info if available
              if (order.customerName != null && order.customerName!.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Row(
                    children: [
                      Icon(Icons.person_outline_rounded, size: 14, color: isDark ? const Color(0xFF94A3B8) : Colors.grey.shade600),
                      const SizedBox(width: 4),
                      Text(
                        '${order.customerName} ${order.customerPhone != null ? "(${order.customerPhone})" : ""}',
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark ? const Color(0xFFCBD5E1) : Colors.grey.shade700,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),

              // Items
              ...order.items.map((item) => Padding(
                    padding: const EdgeInsets.symmetric(vertical: 2.5),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${item.qty}x',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: isDark ? const Color(0xFF2DD4BF) : Colors.teal,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                item.name,
                                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                              ),
                              if (item.variant != null || item.modifiers.isNotEmpty)
                                Text(
                                  [
                                    if (item.variant != null) item.variant,
                                    if (item.modifiers.isNotEmpty) ...item.modifiers,
                                  ].join(' · '),
                                  style: TextStyle(fontSize: 11, color: isDark ? const Color(0xFF94A3B8) : Colors.grey.shade600),
                                ),
                              if (item.notes != null && item.notes!.isNotEmpty)
                                Text(
                                  'Note: ${item.notes}',
                                  style: TextStyle(fontSize: 11, color: Colors.orange.shade400, fontStyle: FontStyle.italic),
                                ),
                            ],
                          ),
                        ),
                        Text(
                          '${order.currency} ${(item.price * item.qty).toStringAsFixed(2)}',
                          style: TextStyle(fontSize: 12, color: isDark ? const Color(0xFFCBD5E1) : Colors.grey.shade700),
                        ),
                      ],
                    ),
                  )),

              if (order.specialNotes != null && order.specialNotes!.isNotEmpty) ...[
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF3B2D14) : Colors.orange.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: isDark ? const Color(0xFF784D12) : Colors.orange.shade200),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.notes_rounded, size: 14, color: isDark ? Colors.orange.shade300 : Colors.orange.shade800),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          order.specialNotes!,
                          style: TextStyle(fontSize: 11.5, color: isDark ? Colors.orange.shade200 : Colors.orange.shade900),
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              Divider(height: 18, color: isDark ? const Color(0xFF26334A) : null),

              // Bottom Actions Row
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Total: ${order.currency} ${order.totalAmount.toStringAsFixed(2)}',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5),
                      ),
                      Text(
                        'Payment: ${order.paymentStatus}',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: order.paymentStatus == 'PAID'
                              ? (isDark ? const Color(0xFF4ADE80) : Colors.green)
                              : (isDark ? const Color(0xFF94A3B8) : Colors.grey.shade600),
                        ),
                      ),
                    ],
                  ),
                  Row(
                    children: [
                      // Print KOT
                      IconButton(
                        tooltip: 'Print Kitchen Ticket',
                        icon: const Icon(Icons.receipt_long_rounded, size: 19),
                        onPressed: () => _printKOT(order),
                      ),
                      // Print Receipt
                      IconButton(
                        tooltip: 'Print Customer Receipt',
                        icon: const Icon(Icons.print_rounded, size: 19),
                        onPressed: () => _printReceipt(order),
                      ),
                      // Edit Order
                      IconButton(
                        tooltip: 'Edit Order',
                        icon: const Icon(Icons.edit_note_rounded, size: 21),
                        onPressed: () => _openEditOrder(order),
                      ),
                      const SizedBox(width: 4),

                      // Status Quick Transitions
                      if (order.status == 'PENDING')
                        ElevatedButton(
                          onPressed: () => _updateStatus(order.id, 'ACCEPTED'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.blue.shade600,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          ),
                          child: const Text('Accept', style: TextStyle(fontSize: 11)),
                        ),
                      if (order.status == 'ACCEPTED')
                        ElevatedButton(
                          onPressed: () => _updateStatus(order.id, 'PREPARING'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.amber.shade700,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          ),
                          child: const Text('Start Cooking', style: TextStyle(fontSize: 11)),
                        ),
                      if (order.status == 'PREPARING')
                        ElevatedButton(
                          onPressed: () => _updateStatus(order.id, 'READY'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.green.shade600,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          ),
                          child: const Text('Mark Ready', style: TextStyle(fontSize: 11)),
                        ),
                      if (order.status == 'READY')
                        OutlinedButton(
                          onPressed: () => _updateStatus(order.id, 'SERVED'),
                          style: OutlinedButton.styleFrom(
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          ),
                          child: const Text('Served', style: TextStyle(fontSize: 11)),
                        ),
                      if (order.status == 'SERVED')
                        FilledButton(
                          onPressed: () => _updateStatus(order.id, 'COMPLETED'),
                          style: FilledButton.styleFrom(
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          ),
                          child: const Text('Complete', style: TextStyle(fontSize: 11)),
                        ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildWaiterList() {
    if (_waiterCalls.isEmpty) {
      return RefreshIndicator(
        onRefresh: _load,
        child: const Center(
          child: Text('No waiter assistance calls'),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.all(12),
        itemCount: _waiterCalls.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (context, idx) {
          final call = _waiterCalls[idx];
          final isPending = call.status == 'PENDING';

          return Card(
            elevation: 0.5,
            color: isPending ? Colors.amber.shade50 : Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: BorderSide(
                color: isPending ? Colors.amber.shade300 : Colors.grey.shade200,
              ),
            ),
            child: ListTile(
              title: Text(
                call.roomNumber != null ? 'Room ${call.roomNumber}' : 'Table ${call.tableNumber ?? "-"}',
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
              subtitle: Text(
                'Request: ${call.requestType}${call.message != null ? " - ${call.message}" : ""}',
                style: const TextStyle(fontSize: 12),
              ),
              trailing: isPending
                  ? ElevatedButton(
                      onPressed: () => _resolveWaiter(call.id),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.teal,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      child: const Text('Resolve', style: TextStyle(fontSize: 11)),
                    )
                  : const Text('Resolved', style: TextStyle(fontSize: 11, color: Colors.grey)),
            ),
          );
        },
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDER DETAILS DIALOG
// ─────────────────────────────────────────────────────────────────────────────
class _OrderDetailsDialog extends StatelessWidget {
  const _OrderDetailsDialog({
    required this.order,
    required this.onStatusChange,
    required this.onEdit,
    required this.onPrintReceipt,
    required this.onPrintKOT,
  });

  final RestaurantOrder order;
  final ValueChanged<String> onStatusChange;
  final VoidCallback onEdit;
  final VoidCallback onPrintReceipt;
  final VoidCallback onPrintKOT;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final timeStr = order.createdAt != null
        ? DateFormat('dd MMM yyyy, HH:mm').format(order.createdAt!)
        : 'Recently';

    final surfaceColor = isDark ? const Color(0xFF131B2E) : Colors.white;
    final boxBgColor = isDark ? const Color(0xFF1A2338) : Colors.grey.shade50;
    final billBgColor = isDark ? const Color(0xFF1E293B) : Colors.grey.shade100;
    final borderColor = isDark ? const Color(0xFF28354E) : Colors.grey.shade200;
    final subtitleColor = isDark ? const Color(0xFF94A3B8) : Colors.grey.shade600;
    final bodyColor = isDark ? const Color(0xFFCBD5E1) : Colors.grey.shade700;

    return Dialog(
      backgroundColor: surfaceColor,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: BorderSide(color: borderColor),
      ),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 580, maxHeight: 720),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Order ${order.orderNumber}',
                        style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                      ),
                      Text(
                        'Placed at $timeStr',
                        style: TextStyle(fontSize: 12.5, color: subtitleColor),
                      ),
                    ],
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              Divider(height: 24, color: borderColor),

              // Content scrollable
              Expanded(
                child: ListView(
                  children: [
                    // Meta badges
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _badge(Icons.dining_rounded, order.orderType, Colors.blue),
                        if (order.tableNumber != null)
                          _badge(Icons.table_restaurant_rounded, 'Table ${order.tableNumber}', Colors.teal),
                        if (order.roomNumber != null)
                          _badge(Icons.hotel_rounded, 'Room ${order.roomNumber}', Colors.indigo),
                        _badge(Icons.info_outline_rounded, 'Status: ${order.status}', Colors.orange),
                        _badge(Icons.payments_outlined, 'Payment: ${order.paymentStatus}',
                            order.paymentStatus == 'PAID' ? Colors.green : Colors.amber.shade700),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Customer details
                    if (order.customerName != null || order.customerPhone != null || order.customerEmail != null) ...[
                      const Text('Customer Details', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      const SizedBox(height: 6),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: boxBgColor,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: borderColor),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (order.customerName != null)
                              Text('Name: ${order.customerName}', style: TextStyle(fontSize: 13, color: bodyColor)),
                            if (order.customerPhone != null)
                              Text('Phone: ${order.customerPhone}', style: TextStyle(fontSize: 13, color: bodyColor)),
                            if (order.customerEmail != null)
                              Text('Email: ${order.customerEmail}', style: TextStyle(fontSize: 13, color: bodyColor)),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],

                    // Order items list
                    const Text('Ordered Items', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    const SizedBox(height: 8),
                    Container(
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF161F33) : Colors.white,
                        border: Border.all(color: borderColor),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Column(
                        children: [
                          for (int i = 0; i < order.items.length; i++) ...[
                            ListTile(
                              dense: true,
                              leading: CircleAvatar(
                                radius: 14,
                                backgroundColor: isDark ? const Color(0xFF134E48) : Colors.teal.shade50,
                                child: Text('${order.items[i].qty}x',
                                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: isDark ? const Color(0xFF2DD4BF) : Colors.teal)),
                              ),
                              title: Text(order.items[i].name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5)),
                              subtitle: (order.items[i].variant != null || order.items[i].modifiers.isNotEmpty || order.items[i].notes != null)
                                  ? Text(
                                      [
                                        if (order.items[i].variant != null) 'Option: ${order.items[i].variant}',
                                        if (order.items[i].modifiers.isNotEmpty) 'Mods: ${order.items[i].modifiers.join(", ")}',
                                        if (order.items[i].notes != null) 'Note: ${order.items[i].notes}',
                                      ].join(' · '),
                                      style: TextStyle(fontSize: 11.5, color: subtitleColor),
                                    )
                                  : null,
                              trailing: Text(
                                '${order.currency} ${(order.items[i].price * order.items[i].qty).toStringAsFixed(2)}',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                              ),
                            ),
                            if (i < order.items.length - 1) Divider(height: 1, color: borderColor),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Bill Summary
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: billBgColor,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: borderColor),
                      ),
                      child: Column(
                        children: [
                          if (order.subtotalAmount != null)
                            _amountRow('Subtotal', '${order.currency} ${order.subtotalAmount!.toStringAsFixed(2)}'),
                          if (order.discountAmount != null && order.discountAmount! > 0)
                            _amountRow('Discount', '- ${order.currency} ${order.discountAmount!.toStringAsFixed(2)}'),
                          if (order.taxAmount != null && order.taxAmount! > 0)
                            _amountRow('Tax / VAT', '${order.currency} ${order.taxAmount!.toStringAsFixed(2)}'),
                          Divider(height: 14, color: borderColor),
                          _amountRow('Total Amount', '${order.currency} ${order.totalAmount.toStringAsFixed(2)}', isBold: true),
                        ],
                      ),
                    ),

                    if (order.specialNotes != null && order.specialNotes!.isNotEmpty) ...[
                      const SizedBox(height: 16),
                      const Text('Kitchen Instructions', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      const SizedBox(height: 6),
                      Text(order.specialNotes!, style: TextStyle(color: bodyColor, fontSize: 13)),
                    ],
                  ],
                ),
              ),

              Divider(height: 24, color: borderColor),

              // Bottom Actions
              Wrap(
                spacing: 10,
                runSpacing: 10,
                alignment: WrapAlignment.end,
                children: [
                  OutlinedButton.icon(
                    onPressed: onPrintKOT,
                    icon: const Icon(Icons.receipt_long_rounded, size: 18),
                    label: const Text('Print KOT'),
                  ),
                  OutlinedButton.icon(
                    onPressed: onPrintReceipt,
                    icon: const Icon(Icons.print_rounded, size: 18),
                    label: const Text('Print Receipt'),
                  ),
                  OutlinedButton.icon(
                    onPressed: onEdit,
                    icon: const Icon(Icons.edit_note_rounded, size: 18),
                    label: const Text('Edit Order'),
                  ),
                  PopupMenuButton<String>(
                    tooltip: 'Change Status',
                    onSelected: onStatusChange,
                    itemBuilder: (_) => const [
                      PopupMenuItem(value: 'PENDING', child: Text('Mark PENDING')),
                      PopupMenuItem(value: 'ACCEPTED', child: Text('Mark ACCEPTED')),
                      PopupMenuItem(value: 'PREPARING', child: Text('Mark PREPARING')),
                      PopupMenuItem(value: 'READY', child: Text('Mark READY')),
                      PopupMenuItem(value: 'SERVED', child: Text('Mark SERVED')),
                      PopupMenuItem(value: 'COMPLETED', child: Text('Mark COMPLETED')),
                      PopupMenuItem(value: 'CANCELLED', child: Text('Mark CANCELLED')),
                    ],
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: Theme.of(context).primaryColor,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text('Update Status', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                          SizedBox(width: 4),
                          Icon(Icons.arrow_drop_down, color: Colors.white, size: 18),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _badge(IconData icon, String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 5),
          Text(text, style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold, color: color)),
        ],
      ),
    );
  }

  Widget _amountRow(String title, String val, {bool isBold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2.5),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(title, style: TextStyle(fontSize: isBold ? 14 : 12.5, fontWeight: isBold ? FontWeight.bold : FontWeight.normal)),
          Text(val, style: TextStyle(fontSize: isBold ? 14 : 12.5, fontWeight: isBold ? FontWeight.bold : FontWeight.normal)),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EDIT ORDER DIALOG
// ─────────────────────────────────────────────────────────────────────────────
class _EditOrderDialog extends StatefulWidget {
  const _EditOrderDialog({required this.order, required this.onSaved});

  final RestaurantOrder order;
  final VoidCallback onSaved;

  @override
  State<_EditOrderDialog> createState() => _EditOrderDialogState();
}

class _EditOrderDialogState extends State<_EditOrderDialog> {
  late final TextEditingController _tableCtrl;
  late final TextEditingController _roomCtrl;
  late final TextEditingController _customerNameCtrl;
  late final TextEditingController _customerPhoneCtrl;
  late final TextEditingController _notesCtrl;
  late String _status;
  late String _paymentStatus;
  late String _orderType;
  late List<String> _statusOptions;
  late List<String> _paymentStatusOptions;
  late List<String> _orderTypeOptions;
  late List<Map<String, dynamic>> _editableItems;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _tableCtrl = TextEditingController(text: widget.order.tableNumber ?? '');
    _roomCtrl = TextEditingController(text: widget.order.roomNumber ?? '');
    _customerNameCtrl = TextEditingController(text: widget.order.customerName ?? '');
    _customerPhoneCtrl = TextEditingController(text: widget.order.customerPhone ?? '');
    _notesCtrl = TextEditingController(text: widget.order.specialNotes ?? '');
    
    _status = widget.order.status;
    _paymentStatus = widget.order.paymentStatus;
    _orderType = widget.order.orderType;

    const baseStatuses = ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED'];
    _statusOptions = List<String>.from(baseStatuses);
    if (!_statusOptions.contains(_status)) {
      _statusOptions.add(_status);
    }

    const basePaymentStatuses = ['UNPAID', 'PENDING', 'PAID', 'REFUNDED'];
    _paymentStatusOptions = List<String>.from(basePaymentStatuses);
    if (!_paymentStatusOptions.contains(_paymentStatus)) {
      _paymentStatusOptions.add(_paymentStatus);
    }

    const baseOrderTypes = ['DINE_IN', 'TAKEAWAY', 'ROOM_SERVICE', 'DELIVERY', 'ONLINE'];
    _orderTypeOptions = List<String>.from(baseOrderTypes);
    if (!_orderTypeOptions.contains(_orderType)) {
      _orderTypeOptions.add(_orderType);
    }

    _editableItems = widget.order.items.map((i) => {
      'name': i.name,
      'qty': i.qty,
      'price': i.price,
      'notes': i.notes,
    }).toList();
  }

  @override
  void dispose() {
    _tableCtrl.dispose();
    _roomCtrl.dispose();
    _customerNameCtrl.dispose();
    _customerPhoneCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  double get _calculatedTotal {
    return _editableItems.fold<double>(0.0, (acc, item) {
      final q = (item['qty'] as num?)?.toInt() ?? 1;
      final p = (item['price'] as num?)?.toDouble() ?? 0.0;
      return acc + (q * p);
    });
  }

  Future<void> _save() async {
    setState(() {
      _saving = true;
      _error = null;
    });

    final api = context.read<ApiClient>();
    try {
      await api.editRestaurantOrder({
        'id': widget.order.id,
        'tableNumber': _tableCtrl.text.trim().isEmpty ? null : _tableCtrl.text.trim(),
        'roomNumber': _roomCtrl.text.trim().isEmpty ? null : _roomCtrl.text.trim(),
        'customerName': _customerNameCtrl.text.trim().isEmpty ? null : _customerNameCtrl.text.trim(),
        'customerPhone': _customerPhoneCtrl.text.trim().isEmpty ? null : _customerPhoneCtrl.text.trim(),
        'specialNotes': _notesCtrl.text.trim(),
        'status': _status,
        'paymentStatus': _paymentStatus,
        'orderType': _orderType,
        'items': _editableItems,
      });

      widget.onSaved();
    } catch (e) {
      setState(() {
        _saving = false;
        _error = '$e';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surfaceColor = isDark ? const Color(0xFF131B2E) : Colors.white;
    final cardBgColor = isDark ? const Color(0xFF1A2338) : Colors.grey.shade50;
    final borderColor = isDark ? const Color(0xFF28354E) : Colors.grey.shade200;

    return Dialog(
      backgroundColor: surfaceColor,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: BorderSide(color: borderColor),
      ),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 580, maxHeight: 750),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Edit Order ${widget.order.orderNumber}',
                      style: const TextStyle(fontSize: 19, fontWeight: FontWeight.bold)),
                  IconButton(
                    icon: const Icon(Icons.close_rounded),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              Divider(height: 20, color: borderColor),

              if (_error != null) ...[
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF451A1A) : Colors.red.shade50,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(_error!, style: TextStyle(color: isDark ? Colors.red.shade200 : Colors.red.shade900, fontSize: 12)),
                ),
                const SizedBox(height: 10),
              ],

              // Form fields
              Expanded(
                child: ListView(
                  children: [
                    // Status & Payment & Type row
                    Row(
                      children: [
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            initialValue: _status,
                            decoration: const InputDecoration(labelText: 'Order Status', border: OutlineInputBorder()),
                            items: _statusOptions.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
                            onChanged: (v) => setState(() => _status = v!),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            initialValue: _paymentStatus,
                            decoration: const InputDecoration(labelText: 'Payment Status', border: OutlineInputBorder()),
                            items: _paymentStatusOptions.map((p) => DropdownMenuItem(value: p, child: Text(p))).toList(),
                            onChanged: (v) => setState(() => _paymentStatus = v!),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    Row(
                      children: [
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            initialValue: _orderType,
                            decoration: const InputDecoration(labelText: 'Order Type', border: OutlineInputBorder()),
                            items: _orderTypeOptions.map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
                            onChanged: (v) => setState(() => _orderType = v!),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: TextField(
                            controller: _tableCtrl,
                            decoration: const InputDecoration(labelText: 'Table Number', border: OutlineInputBorder()),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: TextField(
                            controller: _roomCtrl,
                            decoration: const InputDecoration(labelText: 'Room Number', border: OutlineInputBorder()),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    // Customer details
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _customerNameCtrl,
                            decoration: const InputDecoration(labelText: 'Customer Name', border: OutlineInputBorder()),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: TextField(
                            controller: _customerPhoneCtrl,
                            decoration: const InputDecoration(labelText: 'Customer Phone', border: OutlineInputBorder()),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    // Kitchen notes
                    TextField(
                      controller: _notesCtrl,
                      maxLines: 2,
                      decoration: const InputDecoration(labelText: 'Kitchen / Special Instructions', border: OutlineInputBorder()),
                    ),
                    const SizedBox(height: 18),

                    // Ordered Items edit section
                    const Text('Edit Items & Quantities', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    const SizedBox(height: 8),

                    ...List.generate(_editableItems.length, (idx) {
                      final item = _editableItems[idx];
                      return Card(
                        color: cardBgColor,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                          side: BorderSide(color: borderColor),
                        ),
                        margin: const EdgeInsets.only(bottom: 8),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          child: Row(
                            children: [
                              Expanded(
                                flex: 4,
                                child: Text(item['name']?.toString() ?? '', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                              ),
                              Row(
                                children: [
                                  IconButton(
                                    icon: const Icon(Icons.remove_circle_outline, size: 20),
                                    onPressed: () {
                                      final cur = (item['qty'] as num?)?.toInt() ?? 1;
                                      if (cur > 1) {
                                        setState(() => item['qty'] = cur - 1);
                                      } else {
                                        setState(() => _editableItems.removeAt(idx));
                                      }
                                    },
                                  ),
                                  Text('${item['qty']}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                  IconButton(
                                    icon: const Icon(Icons.add_circle_outline, size: 20),
                                    onPressed: () {
                                      final cur = (item['qty'] as num?)?.toInt() ?? 1;
                                      setState(() => item['qty'] = cur + 1);
                                    },
                                  ),
                                ],
                              ),
                              const SizedBox(width: 8),
                              Text(
                                '${widget.order.currency} ${(((item['price'] as num?)?.toDouble() ?? 0.0) * ((item['qty'] as num?)?.toInt() ?? 1)).toStringAsFixed(2)}',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                              ),
                            ],
                          ),
                        ),
                      );
                    }),
                  ],
                ),
              ),

              Divider(height: 24, color: borderColor),

              // Save button and live total
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Updated Total: ${widget.order.currency} ${_calculatedTotal.toStringAsFixed(2)}',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                  Row(
                    children: [
                      TextButton(
                        onPressed: _saving ? null : () => Navigator.pop(context),
                        child: const Text('Cancel'),
                      ),
                      const SizedBox(width: 12),
                      FilledButton(
                        onPressed: _saving ? null : _save,
                        child: _saving
                            ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                            : const Text('Save Changes'),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
