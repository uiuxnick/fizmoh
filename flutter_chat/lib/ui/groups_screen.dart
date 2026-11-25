import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../core/api_client.dart';
import '../core/chat_store.dart';
import '../core/models.dart';
import 'tokens.dart';

class GroupsScreen extends StatefulWidget {
  const GroupsScreen({super.key});

  @override
  State<GroupsScreen> createState() => _GroupsScreenState();
}

class _GroupsScreenState extends State<GroupsScreen> {
  List<WaGroup> _groups = [];
  WaGroup? _selected;
  bool _loading = true;
  String? _error;
  String _search = '';
  final _msgController = TextEditingController();
  bool _sending = false;

  ApiClient get _api => context.read<ChatStore>().api;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _msgController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final list = await _api.whatsappGroups();
      if (!mounted) return;
      setState(() {
        _groups = list;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  Future<void> _openGroup(WaGroup group) async {
    setState(() => _selected = group);
    try {
      final detail = await _api.whatsappGroupDetail(group.id);
      if (!mounted) return;
      setState(() => _selected = detail);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Future<void> _showCreateDialog() async {
    final subjectCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    var mode = 'auto_approve';

    final created = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => AlertDialog(
          title: const Text('Create WhatsApp Group'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Requires an Official Business Account (OBA). Max 8 participants join via invite link.',
                  style: TextStyle(fontSize: 12, color: T.ink500),
                ),
                const SizedBox(height: T.s3),
                TextField(
                  controller: subjectCtrl,
                  maxLength: 128,
                  decoration: const InputDecoration(labelText: 'Group Subject', border: OutlineInputBorder()),
                ),
                const SizedBox(height: T.s2),
                TextField(
                  controller: descCtrl,
                  maxLines: 2,
                  decoration: const InputDecoration(labelText: 'Description (optional)', border: OutlineInputBorder()),
                ),
                const SizedBox(height: T.s3),
                DropdownButtonFormField<String>(
                  initialValue: mode,
                  decoration: const InputDecoration(labelText: 'Join Approval Mode', border: OutlineInputBorder()),
                  items: const [
                    DropdownMenuItem(value: 'auto_approve', child: Text('Auto Approve')),
                    DropdownMenuItem(value: 'approval_required', child: Text('Approval Required')),
                  ],
                  onChanged: (v) => setModalState(() => mode = v ?? 'auto_approve'),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
            FilledButton(
              onPressed: () async {
                if (subjectCtrl.text.trim().isEmpty) return;
                try {
                  final g = await _api.createWhatsAppGroup(
                    subject: subjectCtrl.text.trim(),
                    description: descCtrl.text.trim(),
                    joinApprovalMode: mode,
                  );
                  if (ctx.mounted) Navigator.pop(ctx, true);
                  if (mounted) _openGroup(g);
                } catch (e) {
                  if (ctx.mounted) {
                    ScaffoldMessenger.of(ctx).showSnackBar(SnackBar(content: Text(e.toString())));
                  }
                }
              },
              child: const Text('Create'),
            ),
          ],
        ),
      ),
    );

    if (created == true) await _load();
  }

  Future<void> _showInviteDialog(WaGroup group) async {
    final phoneCtrl = TextEditingController();
    await showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Send Group Invite Template'),
        content: TextField(
          controller: phoneCtrl,
          keyboardType: TextInputType.phone,
          decoration: const InputDecoration(
            labelText: 'Customer E.164 Phone (e.g. 96891234567)',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () async {
              if (phoneCtrl.text.trim().isEmpty) return;
              try {
                await _api.sendGroupInviteTemplate(group.id, phoneCtrl.text.trim());
                if (ctx.mounted) Navigator.pop(ctx);
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Invite template sent')),
                  );
                  _openGroup(group);
                }
              } catch (e) {
                if (ctx.mounted) {
                  ScaffoldMessenger.of(ctx).showSnackBar(SnackBar(content: Text(e.toString())));
                }
              }
            },
            child: const Text('Send Invite'),
          ),
        ],
      ),
    );
  }

  Future<void> _sendMessage() async {
    final g = _selected;
    final text = _msgController.text.trim();
    if (g == null || text.isEmpty || _sending) return;
    setState(() => _sending = true);
    try {
      await _api.sendWhatsAppGroupMessage(g.id, type: 'text', body: text);
      _msgController.clear();
      await _openGroup(g);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _groups
        .where((g) => _search.isEmpty || g.subject.toLowerCase().contains(_search.toLowerCase()))
        .toList();

    return LayoutBuilder(
      builder: (context, constraints) {
        final wide = constraints.maxWidth >= 820;

        final listPane = Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(T.s3),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      onChanged: (v) => setState(() => _search = v),
                      decoration: InputDecoration(
                        hintText: 'Search groups...',
                        prefixIcon: const Icon(Icons.search, size: 18),
                        isDense: true,
                        filled: true,
                        fillColor: T.canvas,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(T.rMd),
                          borderSide: const BorderSide(color: T.line),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: T.s2),
                  FilledButton.icon(
                    onPressed: _showCreateDialog,
                    icon: const Icon(Icons.add, size: 18),
                    label: const Text('New'),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _error != null
                      ? Center(
                          child: Padding(
                            padding: const EdgeInsets.all(T.s4),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: T.danger)),
                                const SizedBox(height: T.s2),
                                OutlinedButton(onPressed: _load, child: const Text('Retry')),
                              ],
                            ),
                          ),
                        )
                      : filtered.isEmpty
                          ? Center(
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.groups_outlined, size: 44, color: T.ink500),
                                  const SizedBox(height: T.s2),
                                  const Text('No active WhatsApp groups', style: TextStyle(color: T.ink600)),
                                  const SizedBox(height: T.s2),
                                  FilledButton(onPressed: _showCreateDialog, child: const Text('Create Group')),
                                ],
                              ),
                            )
                          : RefreshIndicator(
                              onRefresh: _load,
                              child: ListView.separated(
                                itemCount: filtered.length,
                                separatorBuilder: (_, __) => const Divider(height: 1),
                                itemBuilder: (_, i) {
                                  final g = filtered[i];
                                  final active = _selected?.id == g.id;
                                  return ListTile(
                                    selected: active,
                                    selectedTileColor: T.brandTint,
                                    leading: const CircleAvatar(
                                      backgroundColor: T.successTint,
                                      child: Icon(Icons.groups, color: T.brandGreen),
                                    ),
                                    title: Text(g.subject, maxLines: 1, overflow: TextOverflow.ellipsis),
                                    subtitle: Text(
                                      '${g.participantCount}/8 · ${g.joinApprovalMode}',
                                      style: const TextStyle(fontSize: 12),
                                    ),
                                    onTap: () => _openGroup(g),
                                  );
                                },
                              ),
                            ),
            ),
          ],
        );

        final detailPane = _selected == null
            ? const Center(
                child: Text('Select or create a WhatsApp group', style: TextStyle(color: T.ink500)),
              )
            : Column(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: T.s4, vertical: T.s3),
                    decoration: const BoxDecoration(
                      color: T.surface,
                      border: Border(bottom: BorderSide(color: T.line)),
                    ),
                    child: Row(
                      children: [
                        if (!wide)
                          IconButton(
                            icon: const Icon(Icons.arrow_back),
                            onPressed: () => setState(() => _selected = null),
                          ),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(_selected!.subject, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                              Text(
                                '${_selected!.participants.where((p) => p.status == "joined").length}/8 joined · ${_selected!.joinApprovalMode}',
                                style: const TextStyle(fontSize: 12, color: T.ink500),
                              ),
                            ],
                          ),
                        ),
                        if (_selected!.inviteLink != null)
                          IconButton(
                            tooltip: 'Copy invite link',
                            icon: const Icon(Icons.link),
                            onPressed: () {
                              Clipboard.setData(ClipboardData(text: _selected!.inviteLink!));
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Invite link copied')),
                              );
                            },
                          ),
                        IconButton(
                          tooltip: 'Send invite template',
                          icon: const Icon(Icons.person_add_alt_1_outlined),
                          onPressed: () => _showInviteDialog(_selected!),
                        ),
                        IconButton(
                          tooltip: 'Sync',
                          icon: const Icon(Icons.refresh),
                          onPressed: () => _openGroup(_selected!),
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                    child: _selected!.messages.isEmpty
                        ? const Center(child: Text('No group messages yet', style: TextStyle(color: T.ink500)))
                        : ListView.builder(
                            padding: const EdgeInsets.all(T.s4),
                            itemCount: _selected!.messages.length,
                            itemBuilder: (_, i) {
                              final m = _selected!.messages[i];
                              return Align(
                                alignment: m.isOutbound ? Alignment.centerRight : Alignment.centerLeft,
                                child: Container(
                                  margin: const EdgeInsets.only(bottom: T.s2),
                                  padding: const EdgeInsets.symmetric(horizontal: T.s3, vertical: T.s2),
                                  constraints: const BoxConstraints(maxWidth: 320),
                                  decoration: BoxDecoration(
                                    color: m.isOutbound ? T.brandDeep : T.surface,
                                    borderRadius: BorderRadius.circular(T.rMd),
                                    border: m.isOutbound ? null : Border.all(color: T.line),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      if (m.senderWaId != null && !m.isOutbound)
                                        Text(
                                          '+${m.senderWaId}',
                                          style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: T.brandGreen),
                                        ),
                                      Text(
                                        m.body ?? '[${m.type}]',
                                        style: TextStyle(color: m.isOutbound ? Colors.white : T.ink900),
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
                  ),
                  Container(
                    padding: const EdgeInsets.all(T.s3),
                    decoration: const BoxDecoration(
                      color: T.surface,
                      border: Border(top: BorderSide(color: T.line)),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _msgController,
                            onSubmitted: (_) => _sendMessage(),
                            decoration: InputDecoration(
                              hintText: 'Message group...',
                              isDense: true,
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(T.rMd)),
                            ),
                          ),
                        ),
                        const SizedBox(width: T.s2),
                        FilledButton(
                          onPressed: _sending ? null : _sendMessage,
                          child: const Icon(Icons.send, size: 18),
                        ),
                      ],
                    ),
                  ),
                ],
              );

        if (!wide) {
          return _selected == null ? listPane : detailPane;
        }
        return Row(
          children: [
            SizedBox(width: 320, child: listPane),
            const VerticalDivider(width: 1),
            Expanded(child: detailPane),
          ],
        );
      },
    );
  }
}
