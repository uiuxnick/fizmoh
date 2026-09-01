import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../core/api_client.dart';
import '../core/chat_store.dart';
import '../core/models.dart';
import 'kit.dart';
import 'order_sheet.dart';
import 'widgets.dart';
import 'tokens.dart';
import 'net_image.dart';

/// Who this is, and what can be done about them.
///
/// The reference design shows contact toggles — block, disappearing messages,
/// shared groups. None of those exist on a WhatsApp Business number, so the
/// space carries what an agent here actually needs: what they have bought,
/// what they have sent, who is answering, and how long the reply window has.
class DetailsPanel extends StatefulWidget {
  const DetailsPanel({super.key, this.onClose});

  final VoidCallback? onClose;

  @override
  State<DetailsPanel> createState() => _DetailsPanelState();
}

class _DetailsPanelState extends State<DetailsPanel> {
  CustomerProfile? _profile;
  bool _loading = false;
  String? _loadedFor;

  /// Fetches the customer record behind the open conversation.
  ///
  /// Kept out of the store: it is only ever read here, and putting it there
  /// would have every screen rebuild whenever this panel opened.
  Future<void> _load(String customerId) async {
    _loadedFor = customerId;
    setState(() => _loading = true);
    try {
      final profile = await context.read<ApiClient>().customer(customerId);
      if (mounted) setState(() { _profile = profile; _loading = false; });
    } catch (_) {
      if (mounted) setState(() { _profile = null; _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final store = context.watch<ChatStore>();
    final scheme = Theme.of(context).colorScheme;
    final conversation = store.openConversation;
    if (conversation == null) return const SizedBox.shrink();

    final customerId = conversation.customerId;
    if (customerId != null && customerId != _loadedFor && !_loading) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _load(customerId));
    }

    // Everything the customer has sent that is worth looking at again. Taken
    // from the thread already in memory rather than a second request: this is
    // the media in this conversation, which is what "shared" means here.
    final images = store.messages
        .where((m) => m.isImage && m.resolvedMedia(context.read<ApiClient>().baseUrl) != null)
        .toList()
        .reversed
        .toList();
    final files = store.messages.where((m) => !m.isImage && m.mediaUrl != null).length;

    return Container(
      color: scheme.surface,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(T.s5, T.s4, T.s5, T.s8),
        children: [
          Row(children: [
            Text('Details', style: Type.section(context)),
            const Spacer(),
            if (widget.onClose != null)
              IconAction(
                  icon: Icons.close_rounded, tooltip: 'Close', onPressed: widget.onClose),
          ]),
          const SizedBox(height: T.s3),

          Center(
            child: Column(children: [
              Avatar(name: conversation.customerName, size: 88),
              const SizedBox(height: T.s3),
              Text(conversation.customerName,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, letterSpacing: -0.3)),
              const SizedBox(height: 2),
              Text(conversation.customerPhone, style: Type.secondary(context)),
              if (_profile != null) ...[
                const SizedBox(height: T.s2),
                Wrap(spacing: 6, runSpacing: 6, alignment: WrapAlignment.center, children: [
                  StatusBadge(
                      label: _profile!.loyaltyTier.toLowerCase(), tone: Tone.brand),
                  if (_profile!.preferredLang.toUpperCase() != 'EN')
                    StatusBadge(label: _profile!.preferredLang.toUpperCase()),
                  // Consent is the one tag with consequences: messaging
                  // somebody who opted out is a policy breach, not a mistake.
                  if (_profile!.optedOut)
                    const StatusBadge(label: 'Opted out', tone: Tone.danger),
                  for (final tag in _profile!.tags.take(3)) StatusBadge(label: tag),
                ]),
              ],
            ]),
          ),
          const SizedBox(height: T.s5),

          Row(children: [
            Expanded(
              child: _Action(
                icon: Icons.copy_rounded,
                label: 'Copy',
                onTap: () {
                  Clipboard.setData(ClipboardData(text: conversation.customerPhone));
                  notify(context, 'Number copied');
                },
              ),
            ),
            Expanded(
              child: _Action(
                icon: conversation.botActive ? Icons.smart_toy : Icons.person,
                label: conversation.botActive ? 'Bot on' : 'You reply',
                highlighted: !conversation.botActive,
                onTap: () {
                  final staff = context.read<ApiClient>().staff;
                  if (staff != null && !staff.canToggleBot) {
                    notify(context, 'Bot toggle requires Admin or Owner role');
                    return;
                  }
                  store.setBotActive(!conversation.botActive);
                },
              ),
            ),
            Expanded(
              child: _Action(
                icon: Icons.label_outline_rounded,
                label: 'Tags',
                onTap: () => _manageTags(context),
              ),
            ),
            Expanded(
              child: _Action(
                icon: Icons.note_add_outlined,
                label: 'Note',
                onTap: () => _addNote(context, store),
              ),
            ),
          ]),
          const SizedBox(height: T.s5),

          // What they are worth, and the way into it.
          if (_loading && _profile == null)
            const Skeleton(height: 74, radius: T.rLg)
          else if (_profile != null)
            Panel(
              padding: EdgeInsets.zero,
              onTap: _profile!.orders.isEmpty
                  ? null
                  : () => _showOrders(context, _profile!),
              child: Column(children: [
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: T.s4, vertical: T.s3),
                  child: Row(children: [
                    Expanded(
                      child: _Stat(
                        value: '${_profile!.orders.length}',
                        label: _profile!.orders.length == 1 ? 'booking' : 'bookings',
                      ),
                    ),
                    Container(width: 1, height: 34, color: Theme.of(context).colorScheme.outlineVariant),
                    Expanded(
                      child: _Stat(
                        value: NumberFormat.currency(symbol: 'OMR ', decimalDigits: 3)
                            .format(_profile!.totalSpent),
                        label: 'spent',
                      ),
                    ),
                    Container(width: 1, height: 34, color: Theme.of(context).colorScheme.outlineVariant),
                    Expanded(
                      child: _Stat(
                        value: '${_profile!.loyaltyPoints}',
                        label: 'points',
                      ),
                    ),
                  ]),
                ),
                if (_profile!.orders.isNotEmpty)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: T.s4, vertical: 9),
                    decoration: BoxDecoration(
                      border: Border(top: BorderSide(color: scheme.outlineVariant)),
                    ),
                    child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                      Text('See all bookings',
                          style: TextStyle(
                              fontSize: 13, fontWeight: FontWeight.w600, color: scheme.primary)),
                      const SizedBox(width: 3),
                      Icon(Icons.chevron_right_rounded, size: 18, color: scheme.primary),
                    ]),
                  ),
              ]),
            )
          else if (customerId == null)
            Panel(
              child: Text(
                // A conversation can exist without a customer record — somebody
                // who wrote once and was never saved. Saying so beats an empty
                // panel that looks broken.
                'No customer record yet. One is created the first time they book.',
                style: Type.secondary(context),
              ),
            ),
          const SizedBox(height: T.s5),

          // Shared media.
          Row(children: [
            Text('Shared media', style: Type.label(context)),
            const Spacer(),
            if (images.isNotEmpty)
              Text('${images.length} image${images.length == 1 ? '' : 's'}',
                  style: Type.label(context)),
          ]),
          const SizedBox(height: T.s2),
          if (images.isEmpty)
            Text('Nothing shared in this conversation yet.', style: Type.secondary(context))
          else
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 3, mainAxisSpacing: 6, crossAxisSpacing: 6),
              itemCount: images.length > 9 ? 9 : images.length,
              itemBuilder: (context, i) {
                final url = images[i].resolvedMedia(context.read<ApiClient>().baseUrl)!;
                final last = i == 8 && images.length > 9;
                return GestureDetector(
                  onTap: () => _viewImage(context, url),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(T.rSm),
                    child: Stack(fit: StackFit.expand, children: [
                      cachedNetworkImage(url, fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(
                                color: scheme.surfaceContainerHighest,
                                child: Icon(Icons.broken_image_outlined,
                                    size: 18, color: scheme.onSurfaceVariant),
                              )),
                      if (last)
                        Container(
                          color: Colors.black.withValues(alpha: .55),
                          alignment: Alignment.center,
                          child: Text('+${images.length - 8}',
                              style: const TextStyle(
                                  color: Colors.white, fontWeight: FontWeight.w700)),
                        ),
                    ]),
                  ),
                );
              },
            ),
          if (files > 0) ...[
            const SizedBox(height: T.s2),
            Text('$files other attachment${files == 1 ? '' : 's'} in this thread',
                style: Type.secondary(context)),
          ],
          const SizedBox(height: T.s5),

          // The reply window, which decides whether typing is worth anything.
          Container(
            padding: const EdgeInsets.all(T.s3),
            decoration: BoxDecoration(
              color: store.sessionOpen ? T.brandTint : scheme.errorContainer.withValues(alpha: .5),
              borderRadius: BorderRadius.circular(T.rLg),
            ),
            child: Row(children: [
              Icon(store.sessionOpen ? Icons.schedule : Icons.lock_clock,
                  size: 18, color: store.sessionOpen ? scheme.primary : scheme.error),
              const SizedBox(width: T.s3),
              Expanded(
                child: Text(
                  store.sessionOpen
                      ? 'Reply window open — about ${store.sessionHoursLeft}h left'
                      : 'Reply window closed. Only an approved template will reach them.',
                  style: const TextStyle(fontSize: 12.5, height: 1.35),
                ),
              ),
            ]),
          ),
          const SizedBox(height: T.s5),

          Text('Private notes', style: Type.label(context)),
          const SizedBox(height: T.s2),
          if (store.notes.isEmpty)
            Text('Nothing yet. Notes are only ever seen by staff.',
                style: Type.secondary(context))
          else
            ...store.notes.map((note) => Container(
                  margin: const EdgeInsets.only(bottom: T.s2),
                  padding: const EdgeInsets.all(T.s3),
                  decoration: BoxDecoration(
                    color: scheme.surfaceContainerHighest.withValues(alpha: .5),
                    borderRadius: BorderRadius.circular(T.rMd),
                  ),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(note.content, style: const TextStyle(fontSize: 13.5, height: 1.35)),
                    const SizedBox(height: 4),
                    Text('${note.author} · ${DateFormat.MMMd().add_jm().format(note.createdAt)}',
                        style: Type.label(context)),
                  ]),
                )),
        ],
      ),
    );
  }

  static void _viewImage(BuildContext context, String url) {
    showMediaLightbox(context, url);
  }

  static void _showOrders(BuildContext context, CustomerProfile profile) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (sheet) => SizedBox(
        height: MediaQuery.of(sheet).size.height * .8,
        child: Column(children: [
          PageHeader(
            title: 'Bookings',
            subtitle: '${profile.name} · ${profile.orders.length} in total',
          ),
          Expanded(
            child: ListView.builder(
              itemCount: profile.orders.length,
              itemBuilder: (context, i) => _OrderRow(
                order: profile.orders[i],
                onTap: () => showOrderDetails(context, profile.orders[i].id),
              ),
            ),
          ),
        ]),
      ),
    );
  }

  Future<void> _manageTags(BuildContext context) async {
    final staff = context.read<ApiClient>().staff;
    if (staff != null && !staff.canEditCustomerTags) {
      notify(context, 'Tag management is restricted for your role (${staff.role.toLowerCase()})');
      return;
    }
    final availableTags = ['VIP', 'Hospital Patient', 'Tour Lead', 'Pending Payment', 'Hot Deal', 'Arabic Speaker'];
    final currentTags = Set<String>.from(_profile?.tags ?? []);

    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (sheetCtx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          final scheme = Theme.of(ctx).colorScheme;
          return SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.label_outline_rounded, color: scheme.primary, size: 22),
                      const SizedBox(width: 8),
                      const Text('Customer CRM Tags', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: availableTags.map((tag) {
                      final selected = currentTags.contains(tag);
                      return FilterChip(
                        label: Text(tag),
                        selected: selected,
                        selectedColor: scheme.primary.withValues(alpha: 0.2),
                        checkmarkColor: scheme.primary,
                        onSelected: (val) {
                          setModalState(() {
                            if (val) {
                              currentTags.add(tag);
                            } else {
                              currentTags.remove(tag);
                            }
                          });
                          setState(() {
                            if (_profile != null) {
                              _profile = _profile!.copyWith(tags: currentTags.toList());
                            }
                          });
                        },
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: () => Navigator.pop(sheetCtx),
                      child: const Text('Done'),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  static Future<void> _addNote(BuildContext context, ChatStore store) async {
    final staff = context.read<ApiClient>().staff;
    if (staff != null && !staff.canAddPrivateNotes) {
      notify(context, 'Note creation is restricted for your role (${staff.role.toLowerCase()})');
      return;
    }
    final controller = TextEditingController();
    final text = await showDialog<String>(
      context: context,
      builder: (dialog) => AlertDialog(
        title: const Text('Private note'),
        content: TextField(
          controller: controller,
          autofocus: true,
          maxLines: 3,
          decoration: const InputDecoration(hintText: 'Only staff can see this'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dialog), child: const Text('Cancel')),
          FilledButton(
            onPressed: () => Navigator.pop(dialog, controller.text),
            child: const Text('Save'),
          ),
        ],
      ),
    );
    if (text != null && text.trim().isNotEmpty) await store.addNote(text);
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.value, required this.label});

  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Column(children: [
      Text(value,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, letterSpacing: -0.3)),
      const SizedBox(height: 1),
      Text(label, style: Type.label(context)),
    ]);
  }
}

class _OrderRow extends StatelessWidget {
  const _OrderRow({required this.order, required this.onTap});

  final Order order;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final paid = order.paymentStatus.toUpperCase() == 'PAID';
    final cancelled = order.orderStatus.toUpperCase().contains('CANCEL');

    return ListRow(
      onTap: onTap,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(
            child: Text(order.tourName,
                maxLines: 1, overflow: TextOverflow.ellipsis,
                style: Type.body(context).copyWith(fontWeight: FontWeight.w600)),
          ),
          const SizedBox(width: T.s2),
          Text(
            NumberFormat.currency(symbol: 'OMR ', decimalDigits: 3).format(order.total),
            style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700),
          ),
        ]),
        const SizedBox(height: 3),
        Text(
          [
            order.orderNumber,
            if (order.departsAt != null) DateFormat.yMMMd().format(order.departsAt!),
            order.party,
          ].join(' · '),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(fontSize: 12.5, color: scheme.onSurfaceVariant),
        ),
        const SizedBox(height: 6),
        Row(children: [
          StatusBadge(
            label: order.orderStatus.toLowerCase().replaceAll('_', ' '),
            tone: cancelled ? Tone.danger : Tone.neutral,
          ),
          const SizedBox(width: 5),
          StatusBadge(
            label: paid ? 'paid' : order.paymentStatus.toLowerCase(),
            tone: paid ? Tone.success : Tone.pending,
          ),
        ]),
      ]),
    );
  }
}

class _Action extends StatelessWidget {
  const _Action({
    required this.icon,
    required this.label,
    required this.onTap,
    this.highlighted = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool highlighted;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Semantics(
      button: true,
      label: label,
      child: InkWell(
        borderRadius: BorderRadius.circular(T.rLg),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 2, vertical: T.s2),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            AnimatedContainer(
              duration: T.motion(context, T.fast),
              height: 40, width: 40,
              decoration: BoxDecoration(
                color: highlighted ? scheme.primary : scheme.primary.withValues(alpha: .12),
                borderRadius: BorderRadius.circular(T.rLg),
              ),
              child: Icon(icon, size: 20,
                  color: highlighted ? scheme.onPrimary : scheme.primary),
            ),
            const SizedBox(height: 5),
            Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w500),
            ),
          ]),
        ),
      ),
    );
  }
}
