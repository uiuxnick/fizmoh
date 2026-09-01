import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../core/api_client.dart';
import '../core/models.dart';
import 'theme.dart';
import 'order_sheet.dart';
import 'widgets.dart';
import 'net_image.dart';

const _statusStyles = <String, Color>{
  'PENDING_PAYMENT': F.warning,
  'PAYMENT_SUBMITTED': Color(0xFF0369A1),
  'CONFIRMED': F.success,
  'COMPLETED': Color(0xFF4338CA),
  'CANCELLED': F.danger,
  'CANCELLATION_REQUESTED': Color(0xFFC2410C),
  'REFUNDED': Color(0xFF57534E),
  'NO_SHOW': Color(0xFF57534E),
};

String _label(String status) =>
    status.replaceAll('_', ' ').toLowerCase().replaceFirstMapped(
        RegExp(r'^\w'), (m) => m[0]!.toUpperCase());

/// Bookings, and the payments waiting on somebody to look at them.
class BookingsScreen extends StatefulWidget {
  const BookingsScreen({super.key});

  @override
  State<BookingsScreen> createState() => _BookingsScreenState();
}

class _BookingsScreenState extends State<BookingsScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabs = TabController(length: 2, vsync: this);

  List<Order> _orders = [];
  List<PendingPayment> _payments = [];
  bool _loading = true;
  String? _error;
  String _filter = '';

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

    // Last time's bookings, drawn while this time's are fetched. Only for the
    // unfiltered tab, which is the one the screen opens on.
    if (_orders.isEmpty && _filter.isEmpty) {
      final cached = await api.cachedOrders();
      if (cached.isNotEmpty && mounted) setState(() => _orders = cached);
    }

    setState(() { _loading = _orders.isEmpty; _error = null; });
    try {
      final results = await Future.wait([api.orders(status: _filter), api.pendingPayments()]);
      if (!mounted) return;
      setState(() {
        _orders = results[0] as List<Order>;
        _payments = results[1] as List<PendingPayment>;
      });
    } catch (e) {
      if (mounted) setState(() => _error = 'Could not load bookings');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _act(Order order, String action, String done) async {
    final api = context.read<ApiClient>();
    final messenger = ScaffoldMessenger.of(context);
    try {
      await api.setOrderStatus(order.id, action);
      messenger.showSnackBar(SnackBar(content: Text(done)));
      await _load();
    } catch (e) {
      messenger.showSnackBar(SnackBar(
        content: Text(e is ApiException ? e.message : 'That did not work'),
      ));
    }
  }

  Future<void> _verify(PendingPayment payment, bool approve) async {
    final api = context.read<ApiClient>();
    final messenger = ScaffoldMessenger.of(context);
    try {
      await api.verifyPayment(payment.id, approve: approve);
      messenger.showSnackBar(SnackBar(
        content: Text(approve ? 'Payment approved' : 'Payment rejected'),
      ));
      await _load();
    } catch (e) {
      messenger.showSnackBar(SnackBar(
        content: Text(e is ApiException ? e.message : 'That did not work'),
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Column(children: [
      const FHeader(title: 'Bookings', subtitle: 'Reservations and payments'),
      Container(
        color: scheme.surface,
        child: TabBar(
          controller: _tabs,
          tabs: [
            const Tab(text: 'Bookings'),
            Tab(
              child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                const Text('Payments'),
                if (_payments.isNotEmpty) ...[
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                    decoration: BoxDecoration(
                      color: scheme.error, borderRadius: BorderRadius.circular(10)),
                    child: Text('${_payments.length}',
                        style: TextStyle(color: scheme.onError, fontSize: 11, fontWeight: FontWeight.bold)),
                  ),
                ],
              ]),
            ),
          ],
        ),
      ),
      Expanded(
        child: _loading
            ? ListView(
                padding: const EdgeInsets.all(F.lg),
                children: List.generate(5, (i) => const FSkeleton(height: 116)),
              )
            : _error != null
                ? FEmpty(
                    icon: Icons.cloud_off_rounded,
                    title: 'Could not load bookings',
                    message: _error!,
                    action: 'Try again',
                    onAction: _load,
                  )
                : TabBarView(controller: _tabs, children: [
                    _ordersTab(scheme),
                    _paymentsTab(scheme),
                  ]),
      ),
    ]);
  }

  Widget _ordersTab(ColorScheme scheme) {
    return Column(children: [
      SizedBox(
        height: 52,
        child: ListView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          children: [
            for (final option in const [
              ('', 'All'),
              ('PENDING_PAYMENT', 'Unpaid'),
              ('PAYMENT_SUBMITTED', 'Checking'),
              ('CONFIRMED', 'Confirmed'),
              ('COMPLETED', 'Done'),
            ])
              Padding(
                padding: const EdgeInsets.only(right: 8),
                child: ChoiceChip(
                  label: Text(option.$2),
                  selected: _filter == option.$1,
                  onSelected: (_) { setState(() => _filter = option.$1); _load(); },
                ),
              ),
          ],
        ),
      ),
      Expanded(
        child: _orders.isEmpty
            ? const FEmpty(
                icon: Icons.receipt_long_outlined,
                title: 'No bookings here',
                message: 'Nothing matches this filter yet.',
              )
            : RefreshIndicator(
                onRefresh: _load,
                child: ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  itemCount: _orders.length,
                  itemBuilder: (context, i) => _OrderCard(
                    order: _orders[i],
                    // The card carries what an agent scans; the sheet carries
                    // what they need with a customer on the phone.
                    onOpen: () async {
                      await showOrderDetails(context, _orders[i].id);
                      if (mounted) await _load();
                    },
                    onConfirm: () => _act(_orders[i], 'CONFIRM_PAYMENT', 'Booking confirmed'),
                    onComplete: () => _act(_orders[i], 'COMPLETE_ORDER', 'Marked as completed'),
                  ),
                ),
              ),
      ),
    ]);
  }

  Widget _paymentsTab(ColorScheme scheme) {
    if (_payments.isEmpty) {
      return const FEmpty(
        icon: Icons.task_alt_rounded,
        title: 'Nothing to check',
        message: 'Payments waiting on approval will appear here as customers send proof.',
      );
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: _payments.length,
        itemBuilder: (context, i) {
          final payment = _payments[i];
          return FCard(
            margin: const EdgeInsets.only(bottom: F.md),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(payment.customerName,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                const SizedBox(height: 2),
                Text('${payment.orderNumber} · ${payment.method.replaceAll('_', ' ').toLowerCase()}',
                    style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant)),
                const SizedBox(height: 10),
                Text('${payment.amount.toStringAsFixed(3)} OMR',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                if (payment.proofUrl != null) ...[
                  const SizedBox(height: 12),
                  // The proof is the whole point of the screen: an agent
                  // approving a transfer needs to see the receipt, not a link
                  // to it.
                  ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: cachedNetworkImage(
                      payment.proofUrl!,
                      height: 190, width: double.infinity, fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                        height: 80,
                        alignment: Alignment.center,
                        color: scheme.surfaceContainerHighest,
                        child: const Text('The receipt image could not be loaded'),
                      ),
                    ),
                  ),
                ],
                const SizedBox(height: 12),
                Row(children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => _verify(payment, false),
                      child: const Text('Reject'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: FilledButton(
                      onPressed: () => _verify(payment, true),
                      child: const Text('Approve'),
                    ),
                  ),
                ]),
              ]),
          );
        },
      ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  const _OrderCard({
    required this.order,
    required this.onOpen,
    required this.onConfirm,
    required this.onComplete,
  });

  final Order order;
  final VoidCallback onOpen;
  final VoidCallback onConfirm;
  final VoidCallback onComplete;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final colour = _statusStyles[order.orderStatus] ?? scheme.onSurfaceVariant;

    return FCard(
      margin: const EdgeInsets.only(bottom: F.sm),
      onTap: onOpen,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Expanded(
              child: Text(order.customerName,
                  maxLines: 1, overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15.5, letterSpacing: -0.2)),
            ),
            FBadge(label: _label(order.orderStatus), tone: colour),
          ]),
          const SizedBox(height: 6),
          Text(order.tourName, style: const TextStyle(fontSize: 13.5)),
          const SizedBox(height: 4),
          Text(
            [
              if (order.departsAt != null)
                DateFormat('EEE d MMM').format(order.departsAt!),
              if (order.startTime != null) order.startTime!,
              order.party,
            ].join(' · '),
            style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant),
          ),
          const SizedBox(height: 8),
          Row(children: [
            Text('${order.total.toStringAsFixed(3)} OMR',
                style: const TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(width: 8),
            Text(order.orderNumber,
                style: TextStyle(fontSize: 11, color: scheme.onSurfaceVariant)),
            const Spacer(),
            // Only the action that makes sense for where this booking is.
            if (order.orderStatus == 'PAYMENT_SUBMITTED')
              FilledButton.tonal(
                onPressed: onConfirm,
                style: FilledButton.styleFrom(minimumSize: const Size(0, 34)),
                child: const Text('Confirm'),
              )
            else if (order.orderStatus == 'CONFIRMED')
              OutlinedButton(
                onPressed: onComplete,
                style: OutlinedButton.styleFrom(minimumSize: const Size(0, 38)),
                child: const Text('Complete'),
              ),
          ]),
        ]),
    );
  }
}
