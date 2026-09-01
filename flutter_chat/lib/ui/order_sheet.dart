import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../core/api_client.dart';
import '../core/models.dart';
import 'kit.dart';
import 'tokens.dart';
import 'net_image.dart';

/// One booking, in full.
///
/// Opened from anywhere a booking is listed. The list rows carry what an agent
/// scans past; this carries what they need with a customer on the phone — what
/// was paid and what is still owed, who is coming, where they are collected,
/// the voucher, and who changed what.
Future<void> showOrderDetails(BuildContext context, String orderId) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (sheetContext) => SizedBox(
      height: MediaQuery.of(sheetContext).size.height * .9,
      child: _OrderSheet(orderId: orderId),
    ),
  );
}

class _OrderSheet extends StatefulWidget {
  const _OrderSheet({required this.orderId});

  final String orderId;

  @override
  State<_OrderSheet> createState() => _OrderSheetState();
}

class _OrderSheetState extends State<_OrderSheet> {
  OrderDetail? _order;
  bool _loading = true;
  String? _error;

  static final _money = NumberFormat.currency(symbol: 'OMR ', decimalDigits: 3);

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final order = await context.read<ApiClient>().order(widget.orderId);
      if (mounted) setState(() { _order = order; _loading = false; });
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e is ApiException ? e.message : 'That booking could not be loaded';
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return ListView(
        padding: const EdgeInsets.all(T.s4),
        children: const [
          Skeleton(height: 28, width: 180),
          SizedBox(height: T.s4),
          Skeleton(height: 90, radius: T.rLg),
          SizedBox(height: T.s3),
          Skeleton(height: 120, radius: T.rLg),
          SizedBox(height: T.s3),
          Skeleton(height: 120, radius: T.rLg),
        ],
      );
    }
    if (_error != null || _order == null) {
      return EmptyState(
        icon: Icons.cloud_off_rounded,
        title: _error ?? 'That booking could not be loaded',
        actionLabel: 'Try again',
        onAction: _load,
      );
    }

    final order = _order!;
    final scheme = Theme.of(context).colorScheme;
    final cancelled = order.orderStatus.toUpperCase().contains('CANCEL');

    return ListView(
      padding: const EdgeInsets.fromLTRB(T.s4, 0, T.s4, T.s8),
      children: [
        Row(
          children: [
            IconButton(
              icon: const Icon(Icons.arrow_back_rounded),
              tooltip: 'Back',
              onPressed: () => Navigator.of(context).maybePop(),
            ),
            const SizedBox(width: 4),
            Text(
              'Booking Details',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: scheme.onSurfaceVariant,
              ),
            ),
            const Spacer(),
            IconButton(
              icon: const Icon(Icons.close_rounded),
              tooltip: 'Close',
              onPressed: () => Navigator.of(context).maybePop(),
            ),
          ],
        ),
        const SizedBox(height: T.s2),
        Row(children: [
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(order.tourName,
                  style: const TextStyle(
                      fontSize: 20, height: 1.2, fontWeight: FontWeight.w800, letterSpacing: -0.5)),
              const SizedBox(height: 3),
              Row(children: [
                Text(order.orderNumber, style: Type.secondary(context)),
                const SizedBox(width: 6),
                IconAction(
                  icon: Icons.copy_rounded,
                  tooltip: 'Copy booking number',
                  onPressed: () {
                    Clipboard.setData(ClipboardData(text: order.orderNumber));
                    notify(context, 'Booking number copied');
                  },
                ),
              ]),
            ]),
          ),
        ]),
        const SizedBox(height: T.s2),
        Wrap(spacing: 6, runSpacing: 6, children: [
          StatusBadge(
            label: _label(order.orderStatus),
            tone: cancelled ? Tone.danger : _statusTone(order.orderStatus),
          ),
          StatusBadge(
            label: order.paymentStatus.toLowerCase(),
            tone: _paid(order.paymentStatus) ? Tone.success : Tone.pending,
          ),
          StatusBadge(label: 'via ${order.channel.toLowerCase()}'),
        ]),
        if (cancelled && order.cancelReason != null) ...[
          const SizedBox(height: T.s3),
          Panel(
            child: Text('Cancelled: ${order.cancelReason}',
                style: TextStyle(fontSize: 13.5, height: 1.35, color: scheme.error)),
          ),
        ],
        const SizedBox(height: T.s4),

        // ── the trip ──
        Panel(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            _Line(
              icon: Icons.event_rounded,
              label: 'Departs',
              value: order.departsAt == null
                  ? 'Date not set'
                  : [
                      DateFormat('EEEE d MMMM y').format(order.departsAt!),
                      if (order.startTime != null) order.startTime!,
                      if (order.endTime != null) '– ${order.endTime}',
                    ].join(' · '),
            ),
            _Line(
              icon: Icons.groups_rounded,
              label: 'Party',
              // Infants are counted but hold no seat, which is the distinction
              // that matters at the meeting point.
              value: '${order.party}  ·  ${order.seats} seat${order.seats == 1 ? '' : 's'}',
            ),
            if (order.tourCity != null)
              _Line(icon: Icons.place_outlined, label: 'City', value: order.tourCity!),
            if (order.pickupLocation != null && order.pickupLocation!.isNotEmpty)
              _Line(
                  icon: Icons.directions_car_outlined,
                  label: 'Pickup',
                  value: order.pickupLocation!),
            if (order.specialRequests != null && order.specialRequests!.isNotEmpty)
              _Line(
                  icon: Icons.sticky_note_2_outlined,
                  label: 'Requests',
                  value: order.specialRequests!),
          ]),
        ),
        const SizedBox(height: T.s3),

        // ── who ──
        Panel(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Avatar(name: order.customerName, size: 40),
              const SizedBox(width: T.s3),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(order.customerName,
                      maxLines: 1, overflow: TextOverflow.ellipsis,
                      style: Type.body(context).copyWith(fontWeight: FontWeight.w700)),
                  Text(
                    [
                      order.customerPhone,
                      if (order.customerEmail != null && order.customerEmail!.isNotEmpty)
                        order.customerEmail!,
                    ].join(' · '),
                    maxLines: 1, overflow: TextOverflow.ellipsis,
                    style: Type.secondary(context),
                  ),
                ]),
              ),
              IconAction(
                icon: Icons.copy_rounded,
                tooltip: 'Copy number',
                onPressed: () {
                  Clipboard.setData(ClipboardData(text: order.customerPhone));
                  notify(context, 'Number copied');
                },
              ),
            ]),
          ]),
        ),
        const SizedBox(height: T.s3),

        // ── money ──
        Panel(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Money', style: Type.label(context)),
            const SizedBox(height: T.s2),
            _Money(label: 'Subtotal', value: _money.format(order.subtotal)),
            if (order.discount > 0)
              _Money(
                label: order.couponCode == null ? 'Discount' : 'Discount (${order.couponCode})',
                value: '−${_money.format(order.discount)}',
              ),
            if (order.tax > 0) _Money(label: 'VAT', value: _money.format(order.tax)),
            const Divider(height: T.s4),
            _Money(label: 'Total', value: _money.format(order.total), strong: true),
            _Money(label: 'Paid', value: _money.format(order.paid)),
            if (order.outstanding > 0.0005)
              // The number an agent is actually asked about on the phone.
              _Money(
                label: 'Outstanding',
                value: _money.format(order.outstanding),
                strong: true,
                tone: scheme.error,
              ),
            const SizedBox(height: T.s2),
            Text('Paid by ${order.paymentMethod.replaceAll('_', ' ').toLowerCase()}',
                style: Type.label(context)),
          ]),
        ),
        const SizedBox(height: T.s3),

        if (order.payments.isNotEmpty) ...[
          Text('Payments', style: Type.label(context)),
          const SizedBox(height: T.s2),
          for (final payment in order.payments)
            Panel(
              margin: const EdgeInsets.only(bottom: T.s2),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Expanded(
                    child: Text(_money.format(payment.amount),
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                  ),
                  StatusBadge(
                    label: payment.status.toLowerCase(),
                    tone: _paid(payment.status)
                        ? Tone.success
                        : payment.status.toUpperCase() == 'REJECTED'
                            ? Tone.danger
                            : Tone.pending,
                  ),
                ]),
                const SizedBox(height: 3),
                Text(
                  [
                    payment.method.replaceAll('_', ' ').toLowerCase(),
                    if (payment.bankName != null) payment.bankName!,
                    DateFormat.yMMMd().add_jm().format(payment.createdAt),
                  ].join(' · '),
                  style: Type.secondary(context),
                ),
                if (payment.reference != null && payment.reference!.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text('Ref ${payment.reference}', style: Type.label(context)),
                ],
                if (payment.rejectionReason != null) ...[
                  const SizedBox(height: 4),
                  Text(payment.rejectionReason!,
                      style: TextStyle(fontSize: 12.5, color: scheme.error)),
                ],
                if (payment.proofUrl != null) ...[
                  const SizedBox(height: T.s2),
                  // The receipt is evidence, so it is shown rather than linked.
                  GestureDetector(
                    onTap: () => _viewImage(context, _absolute(context, payment.proofUrl!)),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(T.rSm),
                      child: cachedNetworkImage(
                        _absolute(context, payment.proofUrl!),
                        height: 160, width: double.infinity, fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Container(
                          height: 60,
                          alignment: Alignment.center,
                          color: scheme.surfaceContainerHighest,
                          child: Text('The receipt could not be loaded',
                              style: Type.secondary(context)),
                        ),
                      ),
                    ),
                  ),
                ],
              ]),
            ),
          const SizedBox(height: T.s1),
        ],

        if (order.vouchers.isNotEmpty) ...[
          Text('Voucher', style: Type.label(context)),
          const SizedBox(height: T.s2),
          for (final voucher in order.vouchers)
            Panel(
              margin: const EdgeInsets.only(bottom: T.s2),
              onTap: () {
                Clipboard.setData(ClipboardData(text: voucher.code));
                notify(context, 'Voucher code copied');
              },
              child: Row(children: [
                Icon(Icons.confirmation_number_outlined, size: T.iconMd, color: scheme.primary),
                const SizedBox(width: T.s3),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(voucher.code,
                        style: const TextStyle(
                            fontSize: 15, fontWeight: FontWeight.w700, letterSpacing: 0.5)),
                    if (voucher.checkedInAt != null)
                      Text('Checked in ${DateFormat.yMMMd().add_jm().format(voucher.checkedInAt!)}',
                          style: Type.label(context)),
                  ]),
                ),
                StatusBadge(
                  label: voucher.status.toLowerCase(),
                  tone: voucher.status.toUpperCase() == 'VALID'
                      ? Tone.success
                      : voucher.status.toUpperCase() == 'USED'
                          ? Tone.neutral
                          : Tone.danger,
                ),
              ]),
            ),
          const SizedBox(height: T.s1),
        ],

        // ── what happened ──
        Text('History', style: Type.label(context)),
        const SizedBox(height: T.s2),
        Panel(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            _Event(label: 'Booked', at: order.createdAt),
            if (order.confirmedAt != null) _Event(label: 'Confirmed', at: order.confirmedAt!),
            if (order.completedAt != null) _Event(label: 'Completed', at: order.completedAt!),
            if (order.cancelledAt != null) _Event(label: 'Cancelled', at: order.cancelledAt!),
            for (final event in order.history.take(8))
              _Event(
                label: event.action.replaceAll('_', ' ').toLowerCase(),
                at: event.at,
                by: event.by,
              ),
          ]),
        ),
      ],
    );
  }

  String _absolute(BuildContext context, String url) =>
      url.startsWith('http') ? url : '${context.read<ApiClient>().baseUrl}$url';

  static void _viewImage(BuildContext context, String url) {
    showDialog<void>(
      context: context,
      builder: (dialog) => Dialog(
        backgroundColor: Colors.black,
        insetPadding: const EdgeInsets.all(T.s3),
        child: Stack(children: [
          InteractiveViewer(
            maxScale: 5,
            child: Center(child: cachedNetworkImage(url, fit: BoxFit.contain)),
          ),
          Positioned(
            top: 0, right: 0,
            child: IconButton(
              icon: const Icon(Icons.close_rounded, color: Colors.white),
              onPressed: () => Navigator.pop(dialog),
            ),
          ),
        ]),
      ),
    );
  }

  static bool _paid(String status) =>
      const {'PAID', 'VERIFIED', 'APPROVED'}.contains(status.toUpperCase());

  static Tone _statusTone(String status) => switch (status.toUpperCase()) {
        'CONFIRMED' => Tone.success,
        'COMPLETED' => Tone.brand,
        'NO_SHOW' => Tone.danger,
        _ => Tone.pending,
      };

  static String _label(String status) => switch (status.toUpperCase()) {
        'PENDING_PAYMENT' => 'awaiting payment',
        'PAYMENT_SUBMITTED' => 'checking payment',
        'CANCELLATION_REQUESTED' => 'cancellation asked',
        _ => status.toLowerCase().replaceAll('_', ' '),
      };
}

class _Line extends StatelessWidget {
  const _Line({required this.icon, required this.label, required this.value});

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: T.s3),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(icon, size: 17, color: scheme.onSurfaceVariant),
        const SizedBox(width: T.s3),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(label, style: Type.label(context)),
            const SizedBox(height: 1),
            Text(value, style: const TextStyle(fontSize: 14, height: 1.35)),
          ]),
        ),
      ]),
    );
  }
}

class _Money extends StatelessWidget {
  const _Money({required this.label, required this.value, this.strong = false, this.tone});

  final String label;
  final String value;
  final bool strong;
  final Color? tone;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(children: [
        Expanded(
          child: Text(label,
              style: TextStyle(
                fontSize: 13.5,
                fontWeight: strong ? FontWeight.w700 : FontWeight.w400,
                color: tone ?? (strong ? scheme.onSurface : scheme.onSurfaceVariant),
              )),
        ),
        Text(value,
            style: TextStyle(
              fontSize: strong ? 15 : 13.5,
              fontWeight: strong ? FontWeight.w700 : FontWeight.w500,
              color: tone ?? scheme.onSurface,
              // Tabular figures, so a column of amounts lines up.
              fontFeatures: const [FontFeature.tabularFigures()],
            )),
      ]),
    );
  }
}

class _Event extends StatelessWidget {
  const _Event({required this.label, required this.at, this.by});

  final String label;
  final DateTime at;
  final String? by;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(children: [
        Container(
          height: 6, width: 6,
          margin: const EdgeInsets.only(right: T.s3),
          decoration: BoxDecoration(color: scheme.primary, shape: BoxShape.circle),
        ),
        Expanded(
          child: Text(by == null ? label : '$label · $by',
              maxLines: 1, overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 13.5)),
        ),
        Text(DateFormat.MMMd().add_jm().format(at), style: Type.label(context)),
      ]),
    );
  }
}
