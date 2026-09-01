import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../core/api_client.dart';
import '../core/models.dart';
import 'theme.dart';
import 'widgets.dart';

/// Call history, and whether calling is available at all.
///
/// WhatsApp voice calling needs the number to be verified and calling switched
/// on by Meta. This screen reports what Meta actually says rather than showing
/// a call button that fails when pressed.
class CallsScreen extends StatefulWidget {
  const CallsScreen({super.key});

  @override
  State<CallsScreen> createState() => _CallsScreenState();
}

class _CallsScreenState extends State<CallsScreen> {
  List<CallRecord> _calls = [];
  CallingStatus? _status;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final result = await context.read<ApiClient>().calls();
      if (!mounted) return;
      setState(() { _calls = result.calls; _status = result.status; });
    } catch (_) {
      // The list is a convenience; a failure here should not blank the screen.
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    if (_loading) {
      return ListView(
        padding: const EdgeInsets.all(F.lg),
        children: List.generate(5, (i) => const FSkeleton(height: 72)),
      );
    }

    final status = _status;
    final ready = status?.enabled == true;

    return Column(children: [
      const FHeader(title: 'Calls', subtitle: 'Incoming WhatsApp calls'),
      Container(
        margin: const EdgeInsets.fromLTRB(F.lg, 0, F.lg, F.md),
        padding: const EdgeInsets.all(F.lg),
        decoration: BoxDecoration(
          color: ready
              ? scheme.primary.withValues(alpha: 0.08)
              : scheme.surfaceContainerHighest.withValues(alpha: 0.7),
          borderRadius: BorderRadius.circular(F.rLg),
        ),
        child: Row(children: [
          Container(
            height: 42, width: 42,
            decoration: BoxDecoration(
              color: (ready ? scheme.primary : scheme.onSurfaceVariant).withValues(alpha: 0.14),
              borderRadius: BorderRadius.circular(F.rMd),
            ),
            child: Icon(ready ? Icons.phone_in_talk_rounded : Icons.phone_disabled_rounded,
                size: 20, color: ready ? scheme.primary : scheme.onSurfaceVariant),
          ),
          const SizedBox(width: F.md),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(ready ? 'Calling is switched on' : 'Calling is not available yet',
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14.5)),
              const SizedBox(height: 3),
              Text(
                ready
                    // Even with calling enabled, a business may only ring
                    // somebody who has asked to be rung.
                    ? 'Customers can call this number, and their calls appear here. '
                      'Calling a customer needs their permission first — they grant it by '
                      'tapping call in the chat.'
                    : status?.reason ?? 'The number needs to be verified with calling enabled.',
                style: TextStyle(fontSize: 12, height: 1.35, color: scheme.onSurfaceVariant),
              ),
            ]),
          ),
        ]),
      ),
      Expanded(
        child: RefreshIndicator(
          onRefresh: _load,
          child: _calls.isEmpty
              ? ListView(
                  children: const [
                    SizedBox(height: 60),
                    FEmpty(
                      icon: Icons.phone_missed_rounded,
                      title: 'No calls yet',
                      message: 'Incoming WhatsApp calls will be listed here as they happen.',
                    ),
                  ],
                )
              : ListView.builder(
                  padding: const EdgeInsets.fromLTRB(F.lg, 0, F.lg, F.lg),
                  itemCount: _calls.length,
                  itemBuilder: (context, i) {
                    final call = _calls[i];
                    return FCard(
                      margin: const EdgeInsets.only(bottom: F.sm),
                      padding: const EdgeInsets.symmetric(horizontal: F.md, vertical: F.md),
                      child: Row(children: [
                        Container(
                          height: 42, width: 42,
                          decoration: BoxDecoration(
                            color: (call.inbound ? F.success : F.brand).withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(F.rMd),
                          ),
                          child: Icon(
                            call.inbound ? Icons.call_received_rounded : Icons.call_made_rounded,
                            size: 19, color: call.inbound ? F.success : F.brand,
                          ),
                        ),
                        const SizedBox(width: F.md),
                        Expanded(
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(call.customerName,
                                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14.5)),
                            const SizedBox(height: 2),
                            Text(
                              '${call.summary} · ${DateFormat.MMMd().add_jm().format(call.at)}',
                              maxLines: 1, overflow: TextOverflow.ellipsis,
                              style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant),
                            ),
                          ]),
                        ),
                        IconButton(
                          tooltip: 'Copy number',
                          icon: const Icon(Icons.copy_rounded, size: 17),
                          onPressed: () {
                            Clipboard.setData(ClipboardData(text: call.customerPhone));
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Number copied')));
                          },
                        ),
                      ]),
                    );
                  },
                ),
              ),
      ),
    ]);
  }
}
