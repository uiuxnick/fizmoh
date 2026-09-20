import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../core/api_client.dart';
import '../core/models.dart';
import 'theme.dart';
import 'widgets.dart';

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

  @override
  Widget build(BuildContext context) {
    final pendingWaiterCount = _waiterCalls.where((w) => w.status == 'PENDING').length;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Restaurant & Dining', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
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
                      color: Colors.emerald,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      '${_orders.where((o) => ['PENDING', 'ACCEPTED', 'PREPARING'].contains(o.status)).length}',
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
    if (_orders.isEmpty) {
      return RefreshIndicator(
        onRefresh: _load,
        child: const Center(
          child: Text('No active kitchen orders'),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.all(12),
        itemCount: _orders.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (context, idx) {
          final order = _orders[idx];
          final timeStr = order.createdAt != null
              ? DateFormat('HH:mm').format(order.createdAt!)
              : '';

          return Card(
            elevation: 0.5,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: BorderSide(color: Colors.grey.shade200),
            ),
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.between,
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
                              color: Colors.grey.shade100,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              order.orderType == 'DINE_IN' && order.tableNumber != null
                                  ? 'Table ${order.tableNumber}'
                                  : order.orderType == 'ROOM_SERVICE' && order.roomNumber != null
                                      ? 'Room ${order.roomNumber}'
                                      : order.orderType,
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      ),
                      Text(timeStr, style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  ...order.items.map((item) => Padding(
                        padding: const EdgeInsets.symmetric(vertical: 2),
                        child: Row(
                          children: [
                            Text(
                              '${item.qty}x',
                              style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.teal),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                item.name,
                                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                              ),
                            ),
                            Text(
                              '${order.currency} ${(item.price * item.qty).toStringAsFixed(2)}',
                              style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
                            ),
                          ],
                        ),
                      )),
                  const Divider(height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.between,
                    children: [
                      Text(
                        'Total: ${order.currency} ${order.totalAmount.toStringAsFixed(2)}',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                      Row(
                        children: [
                          if (order.status == 'PENDING' || order.status == 'ACCEPTED')
                            ElevatedButton(
                              onPressed: () => _updateStatus(order.id, 'PREPARING'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.amber.shade700,
                                foregroundColor: Colors.white,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              ),
                              child: const Text('Start Cooking', style: TextStyle(fontSize: 11)),
                            ),
                          if (order.status == 'PREPARING')
                            ElevatedButton(
                              onPressed: () => _updateStatus(order.id, 'READY'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.green.shade600,
                                foregroundColor: Colors.white,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              ),
                              child: const Text('Mark Ready', style: TextStyle(fontSize: 11)),
                            ),
                          if (order.status == 'READY')
                            OutlinedButton(
                              onPressed: () => _updateStatus(order.id, 'COMPLETED'),
                              style: OutlinedButton.styleFrom(
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              ),
                              child: const Text('Served', style: TextStyle(fontSize: 11)),
                            ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
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
