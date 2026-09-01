import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/api_client.dart';
import '../core/models.dart';
import 'theme.dart';
import 'widgets.dart';

/// Subscribers and labels — who can be messaged, and how they are grouped.
///
/// A label is not a table anywhere: it is a string on a conversation or a
/// customer. The list is therefore derived from what is actually in use, so it
/// can never show a group that nothing belongs to.
class PeopleScreen extends StatefulWidget {
  const PeopleScreen({super.key});

  @override
  State<PeopleScreen> createState() => _PeopleScreenState();
}

class _PeopleScreenState extends State<PeopleScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabs = TabController(length: 2, vsync: this);

  List<Subscriber> _subscribers = [];
  List<Label> _labels = [];
  bool _loading = true;
  String? _error;
  String _search = '';
  String _activeLabel = '';

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
    setState(() { _loading = true; _error = null; });
    final api = context.read<ApiClient>();
    try {
      final results = await Future.wait([api.subscribers(), api.labels()]);
      if (!mounted) return;
      setState(() {
        _subscribers = results[0] as List<Subscriber>;
        _labels = results[1] as List<Label>;
      });
    } catch (e) {
      if (mounted) setState(() => _error = 'Could not load contacts');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<Subscriber> get _visible {
    final term = _search.trim().toLowerCase();
    return _subscribers.where((s) {
      if (_activeLabel.isNotEmpty && !s.tags.contains(_activeLabel)) return false;
      if (term.isEmpty) return true;
      return s.name.toLowerCase().contains(term) ||
          s.phone.contains(term) ||
          (s.email ?? '').toLowerCase().contains(term);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Column(children: [
      FHeader(
        title: 'Contacts',
        subtitle: '${_subscribers.length} people · ${_labels.length} labels',
        trailing: IconButton(
          tooltip: 'Add subscriber',
          icon: const Icon(Icons.person_add_alt_1_rounded, size: 22),
          onPressed: () => _edit(null),
        ),
      ),
      Container(
        color: scheme.surface,
        child: TabBar(controller: _tabs, tabs: const [
          Tab(text: 'Subscribers'),
          Tab(text: 'Labels'),
        ]),
      ),
      Expanded(
        child: _loading
            ? ListView(
                padding: const EdgeInsets.all(F.lg),
                children: List.generate(6, (i) => const FSkeleton(height: 72)),
              )
            : _error != null
                ? FEmpty(
                    icon: Icons.cloud_off_rounded,
                    title: 'Could not load contacts',
                    message: _error!,
                    action: 'Try again',
                    onAction: _load,
                  )
                : TabBarView(controller: _tabs, children: [
                    _subscriberTab(scheme),
                    _labelTab(scheme),
                  ]),
      ),
    ]);
  }

  Widget _subscriberTab(ColorScheme scheme) {
    final visible = _visible;
    return Column(children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(12, 12, 12, 6),
        child: TextField(
          onChanged: (v) => setState(() => _search = v),
          decoration: const InputDecoration(
            hintText: 'Name, number or email',
            prefixIcon: Icon(Icons.search, size: 20),
            isDense: true,
          ),
        ),
      ),
      if (_activeLabel.isNotEmpty)
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Row(children: [
            Chip(
              label: Text(_activeLabel),
              onDeleted: () => setState(() => _activeLabel = ''),
              visualDensity: VisualDensity.compact,
            ),
          ]),
        ),
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        child: Row(children: [
          Text('${visible.length} of ${_subscribers.length}',
              style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant)),
          const Spacer(),
          Text('${_subscribers.where((s) => s.whatsappOptIn).length} opted in to WhatsApp',
              style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant)),
        ]),
      ),
      Expanded(
        child: visible.isEmpty
            ? const FEmpty(
                icon: Icons.person_search_outlined,
                title: 'Nobody matches',
                message: 'Try a number, or part of a name.',
              )
            : RefreshIndicator(
                onRefresh: _load,
                child: ListView.builder(
                  padding: const EdgeInsets.fromLTRB(F.lg, 0, F.lg, F.lg),
                  itemCount: visible.length,
                  itemBuilder: (context, i) {
                    final s = visible[i];
                    return FCard(
                      margin: const EdgeInsets.only(bottom: F.sm),
                      padding: const EdgeInsets.symmetric(horizontal: F.md, vertical: F.md),
                      onTap: () => _edit(s),
                      child: Row(children: [
                        FAvatar(
                          initials: s.name.isEmpty ? '?' : s.name.substring(0, 1).toUpperCase(),
                          size: 42,
                        ),
                        const SizedBox(width: F.md),
                        Expanded(
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(s.name, maxLines: 1, overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14.5)),
                            const SizedBox(height: 2),
                            Text(
                              [s.phone, if (s.email != null && s.email!.isNotEmpty) s.email!].join(' · '),
                              maxLines: 1, overflow: TextOverflow.ellipsis,
                              style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant),
                            ),
                            if (s.tags.isNotEmpty) ...[
                              const SizedBox(height: 6),
                              Wrap(spacing: 4, runSpacing: 4, children: [
                                for (final tag in s.tags.take(3))
                                  FBadge(label: tag, tone: F.brand),
                              ]),
                            ],
                          ]),
                        ),
                        // Opt-in decides whether this person may be messaged at
                        // all, so it is stated rather than implied by colour.
                        Column(children: [
                          FBadge(
                            label: s.whatsappOptIn ? 'WhatsApp' : 'No WhatsApp',
                            tone: s.whatsappOptIn ? F.success : scheme.outline,
                            icon: s.whatsappOptIn ? Icons.check_rounded : Icons.block_rounded,
                          ),
                        ]),
                      ]),
                    );
                  },
                ),
              ),
      ),
    ]);
  }

  /// Adds a subscriber, or changes one.
  ///
  /// The phone number is the identity — everything else is editable, and it is
  /// not, because changing it would silently point the record at a different
  /// person and orphan every message already in the thread.
  Future<void> _edit(Subscriber? subscriber) async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (sheetContext) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(sheetContext).viewInsets.bottom),
        child: _SubscriberEditor(
          subscriber: subscriber,
          // The labels already in use, offered rather than retyped: a label is
          // a string, and "VIP" and "vip" are two different groups.
          knownLabels: _labels.map((l) => l.name).toList(),
        ),
      ),
    );
    if (saved == true) await _load();
  }

  Widget _labelTab(ColorScheme scheme) {
    if (_labels.isEmpty) {
      return const FEmpty(
        icon: Icons.label_outline_rounded,
        title: 'No labels yet',
        message: 'Labels group contacts — VIP, repeat guest, awaiting documents. '
            'Add one to a contact and it appears here.',
      );
    }

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: _labels.length,
        itemBuilder: (context, i) {
          final label = _labels[i];
          return FCard(
            margin: const EdgeInsets.only(bottom: F.sm),
            padding: const EdgeInsets.symmetric(horizontal: F.md, vertical: F.md),
            onTap: () {
              setState(() => _activeLabel = label.name);
              _tabs.animateTo(0);
            },
            child: Row(children: [
              Container(
                height: 42, width: 42,
                decoration: BoxDecoration(
                  color: scheme.primary.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(F.rMd),
                ),
                child: Icon(Icons.label_rounded, color: scheme.primary, size: 20),
              ),
              const SizedBox(width: F.md),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(label.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14.5)),
                  const SizedBox(height: 2),
                  Text(
                    '${label.customers} contact${label.customers == 1 ? '' : 's'}'
                    ' · ${label.conversations} conversation${label.conversations == 1 ? '' : 's'}',
                    style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant),
                  ),
                ]),
              ),
              Icon(Icons.chevron_right_rounded, size: 20, color: scheme.onSurfaceVariant),
            ]),
          );
        },
      ),
    );
  }
}


/// The form behind adding or changing a subscriber.
class _SubscriberEditor extends StatefulWidget {
  const _SubscriberEditor({required this.subscriber, required this.knownLabels});

  final Subscriber? subscriber;
  final List<String> knownLabels;

  @override
  State<_SubscriberEditor> createState() => _SubscriberEditorState();
}

class _SubscriberEditorState extends State<_SubscriberEditor> {
  late final _name = TextEditingController(text: widget.subscriber?.name ?? '');
  late final _phone = TextEditingController(text: widget.subscriber?.phone ?? '');
  late final _email = TextEditingController(text: widget.subscriber?.email ?? '');
  late final _newLabel = TextEditingController();

  late List<String> _tags = [...?widget.subscriber?.tags];
  late String _lang = widget.subscriber?.preferredLang ?? 'en';
  late bool _whatsappOptIn = widget.subscriber?.whatsappOptIn ?? true;

  bool _saving = false;
  String? _error;

  bool get _isNew => widget.subscriber == null;

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _email.dispose();
    _newLabel.dispose();
    super.dispose();
  }

  /// Digits and a leading +, which is what WhatsApp accepts. A number typed
  /// with spaces or brackets is the same number and should not be refused.
  String get _cleanPhone {
    final raw = _phone.text.trim().replaceAll(RegExp(r'[^0-9+]'), '');
    return raw.startsWith('+') ? raw : raw;
  }

  bool get _valid => _name.text.trim().isNotEmpty && _cleanPhone.replaceAll('+', '').length >= 8;

  void _addLabel(String value) {
    final label = value.trim();
    if (label.isEmpty || _tags.contains(label)) return;
    setState(() { _tags = [..._tags, label]; _newLabel.clear(); });
  }

  Future<void> _save() async {
    final api = context.read<ApiClient>();
    setState(() { _saving = true; _error = null; });
    try {
      if (_isNew) {
        await api.createCustomer(
          name: _name.text.trim(),
          phone: _cleanPhone,
          email: _email.text.trim(),
          preferredLang: _lang,
          tags: _tags,
        );
      } else {
        await api.updateCustomer(widget.subscriber!.id, {
          'name': _name.text.trim(),
          'email': _email.text.trim(),
          'preferredLang': _lang,
          'tags': _tags,
          'whatsappOptIn': _whatsappOptIn,
        });
      }
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e is ApiException ? e.message : 'That could not be saved';
          _saving = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final suggestions = widget.knownLabels.where((l) => !_tags.contains(l)).toList();

    return SafeArea(
      top: false,
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(F.lg, 0, F.lg, F.lg),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(_isNew ? 'New subscriber' : 'Edit subscriber',
              style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
          const SizedBox(height: F.lg),

          TextField(
            controller: _name,
            textCapitalization: TextCapitalization.words,
            onChanged: (_) => setState(() {}),
            decoration: const InputDecoration(labelText: 'Name'),
          ),
          const SizedBox(height: F.md),
          TextField(
            controller: _phone,
            keyboardType: TextInputType.phone,
            // The number identifies the record and every message on it.
            enabled: _isNew,
            onChanged: (_) => setState(() {}),
            decoration: InputDecoration(
              labelText: 'Phone, with country code',
              helperText: _isNew ? '+968…' : 'A number cannot be changed once messages exist',
            ),
          ),
          const SizedBox(height: F.md),
          TextField(
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            decoration: const InputDecoration(labelText: 'Email (optional)'),
          ),
          const SizedBox(height: F.md),

          Row(children: [
            const Text('Writes in', style: TextStyle(fontSize: 13)),
            const SizedBox(width: F.md),
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'en', label: Text('English')),
                ButtonSegment(value: 'ar', label: Text('العربية')),
              ],
              selected: {_lang},
              onSelectionChanged: (v) => setState(() => _lang = v.first),
            ),
          ]),
          const SizedBox(height: F.md),

          if (!_isNew)
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              value: _whatsappOptIn,
              onChanged: (v) => setState(() => _whatsappOptIn = v),
              title: const Text('Can be messaged on WhatsApp', style: TextStyle(fontSize: 14)),
              // Turning this off is a consent decision, and it is logged as one.
              subtitle: Text(
                _whatsappOptIn
                    ? 'Opted in. Campaigns and templates may reach them.'
                    : 'Opted out. Nothing marketing may be sent.',
                style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant),
              ),
            ),
          const SizedBox(height: F.sm),

          const Text('Labels', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
          const SizedBox(height: F.sm),
          Wrap(spacing: 6, runSpacing: 6, children: [
            for (final tag in _tags)
              Chip(
                label: Text(tag),
                onDeleted: () => setState(() => _tags = _tags.where((t) => t != tag).toList()),
                visualDensity: VisualDensity.compact,
              ),
          ]),
          if (suggestions.isNotEmpty) ...[
            const SizedBox(height: F.sm),
            Wrap(spacing: 6, runSpacing: 6, children: [
              for (final label in suggestions.take(8))
                ActionChip(
                  label: Text(label),
                  visualDensity: VisualDensity.compact,
                  onPressed: () => _addLabel(label),
                ),
            ]),
          ],
          const SizedBox(height: F.sm),
          TextField(
            controller: _newLabel,
            textInputAction: TextInputAction.done,
            onSubmitted: _addLabel,
            decoration: InputDecoration(
              labelText: 'Add a label',
              suffixIcon: IconButton(
                icon: const Icon(Icons.add_rounded),
                onPressed: () => _addLabel(_newLabel.text),
              ),
            ),
          ),

          if (_error != null) ...[
            const SizedBox(height: F.md),
            Text(_error!, style: TextStyle(fontSize: 12.5, color: scheme.error)),
          ],
          const SizedBox(height: F.lg),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: _valid && !_saving ? _save : null,
              child: Text(_saving ? 'Saving' : _isNew ? 'Add subscriber' : 'Save changes'),
            ),
          ),
        ]),
      ),
    );
  }
}
