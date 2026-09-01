import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../core/api_client.dart';
import '../core/appearance.dart';
import '../core/attachments.dart';
import '../core/chat_store.dart';
import '../core/models.dart';
import 'kit.dart';
import 'tokens.dart';

/// Your own account, and how this phone behaves.
///
/// Not role, and not whether the account is active: an account that could
/// promote itself would not really have a role at all. Those stay with an
/// administrator.
class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key, required this.onSignedOut});

  final VoidCallback onSignedOut;

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  Staff? _staff;
  List<NotificationType> _alerts = [];
  List<RegisteredDevice> _devices = [];
  bool _loading = true;
  bool _uploading = false;
  String? _error;

  /// The businesses this person belongs to. Almost always one, in which case
  /// the picker is not drawn at all — a control with a single option is
  /// furniture.
  List<Workspace> _workspaces = [];
  String? _currentWorkspace;

  /// Shown in About. Read from the same place the build number comes from, so
  /// a bug report names a version that exists.
  static const _version = '1.0.0 (1)';

  @override
  void initState() {
    super.initState();
    _load();
  }

  /// Moving to another business.
  ///
  /// Everything already on screen belongs to the one being left, so the app
  /// reloads rather than merging two workspaces' conversations into one list.
  Future<void> _switchTo(Workspace space) async {
    final api = context.read<ApiClient>();
    final store = context.read<ChatStore>();
    await api.useWorkspace(space.slug);
    if (!mounted) return;
    setState(() => _currentWorkspace = space.slug);
    await store.refreshAll();
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Now looking at ${space.name}')),
    );
  }

  Future<void> _load() async {
    final api = context.read<ApiClient>();
    try {
      final staff = await api.profile();
      // The rest is detail: a slow preferences call should not hold up the
      // name and picture at the top of the screen.
      if (mounted) setState(() { _staff = staff; _loading = false; });
      final alerts = await api.notificationTypes();
      final devices = await api.devices();
      final spaces = await api.workspaces();
      if (mounted) {
        setState(() {
          _alerts = alerts;
          _devices = devices;
          _workspaces = spaces.all;
          _currentWorkspace = api.workspace ?? spaces.current;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e is ApiException ? e.message : 'Could not load your profile';
          _loading = false;
        });
      }
    }
  }

  Future<void> _changePicture() async {
    final api = context.read<ApiClient>();
    setState(() => _uploading = true);
    try {
      final file = await Attachments.image(fromCamera: false);
      if (file == null) {
        setState(() => _uploading = false);
        return;
      }
      final url = await api.uploadImage(file.name, file.bytes, file.contentType);
      final staff = await api.updateProfile({'avatar': url});
      if (mounted) setState(() { _staff = staff; _uploading = false; });
    } catch (e) {
      if (mounted) {
        setState(() => _uploading = false);
        notify(context, e is ApiException ? e.message : 'That picture was not saved',
            tone: Tone.danger);
      }
    }
  }

  Future<void> _editDetails() async {
    final staff = _staff;
    if (staff == null) return;
    final updated = await showModalBottomSheet<Staff>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (sheetContext) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(sheetContext).viewInsets.bottom),
        child: _DetailsEditor(staff: staff),
      ),
    );
    if (updated != null && mounted) setState(() => _staff = updated);
  }

  Future<void> _changePassword() async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (sheetContext) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(sheetContext).viewInsets.bottom),
        child: const _PasswordEditor(),
      ),
    );
  }

  Future<void> _toggleAlert(NotificationType type, bool enabled) async {
    // Moved first and put back on failure: a switch that waits on a round trip
    // feels broken, and one that lies about what was saved is worse.
    setState(() {
      _alerts = [
        for (final a in _alerts) a.key == type.key ? a.copyWith(enabled: enabled) : a,
      ];
    });
    try {
      await context.read<ApiClient>().setNotificationType(type.key, enabled);
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _alerts = [
          for (final a in _alerts) a.key == type.key ? a.copyWith(enabled: !enabled) : a,
        ];
      });
      notify(context, 'That preference was not saved', tone: Tone.danger);
    }
  }

  Future<void> _revoke(RegisteredDevice device) async {
    final api = context.read<ApiClient>();
    try {
      await api.revokeDevice(device.id);
      if (mounted) setState(() => _devices = _devices.where((d) => d.id != device.id).toList());
    } catch (_) {
      if (mounted) notify(context, 'That device was not removed', tone: Tone.danger);
    }
  }

  Future<void> _confirmSignOut() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialog) => AlertDialog(
        title: const Text('Sign out?'),
        content: const Text(
          'This phone will stop receiving messages and calls for this account.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dialog, false), child: const Text('Stay')),
          FilledButton(onPressed: () => Navigator.pop(dialog, true), child: const Text('Sign out')),
        ],
      ),
    );
    if (confirmed == true) widget.onSignedOut();
  }

  void _showPlanDetails(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (sheetCtx) {
        final scheme = Theme.of(sheetCtx).colorScheme;
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: scheme.primary.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(Icons.workspace_premium_rounded, color: scheme.primary, size: 24),
                    ),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Pro Plan · Active',
                            style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
                        Text('Full Platform Suite with GCC WhatsApp',
                            style: TextStyle(fontSize: 12.5, color: scheme.onSurfaceVariant)),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                const Text('Included Modules:', style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                const Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    StatusBadge(label: 'WhatsApp Team Inbox', tone: Tone.success),
                    StatusBadge(label: 'AI Chatbot & Flow Automation', tone: Tone.success),
                    StatusBadge(label: 'AmwalPay Card & Apple Pay', tone: Tone.success),
                    StatusBadge(label: 'VoIP Voice Calling & CallKit', tone: Tone.success),
                    StatusBadge(label: 'Tours & Bookings Engine', tone: Tone.success),
                    StatusBadge(label: 'Marketing Broadcasts', tone: Tone.success),
                  ],
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: () => Navigator.pop(sheetCtx),
                    child: const Text('Close'),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showRolePermissions(BuildContext context, Staff? staff) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (sheetCtx) {
        final scheme = Theme.of(sheetCtx).colorScheme;
        final role = (staff?.role ?? 'AGENT').toUpperCase();
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: scheme.primary.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(Icons.admin_panel_settings_rounded, color: scheme.primary, size: 24),
                    ),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('$role Role Access',
                            style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
                        Text('Role-Based Access Control (RBAC)',
                            style: TextStyle(fontSize: 12.5, color: scheme.onSurfaceVariant)),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                _PermRow(label: 'Chat Messages & Voice Notes', allowed: staff?.canSendMessages == true),
                _PermRow(label: 'Generate AmwalPay Payment Links', allowed: staff?.canGeneratePayments == true),
                _PermRow(label: 'Manage Customer CRM Tags', allowed: staff?.canEditCustomerTags == true),
                _PermRow(label: 'Add Internal Staff Notes', allowed: staff?.canAddPrivateNotes == true),
                _PermRow(label: 'Toggle AI Bot & Automations', allowed: staff?.canToggleBot == true),
                _PermRow(label: 'Workspace Billing & Plan Management', allowed: staff?.canManageBilling == true),
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
    );
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final appearance = context.watch<Appearance>();

    if (_loading) {
      return ListView(
        padding: const EdgeInsets.all(T.s4),
        children: List.generate(4, (i) => const Padding(
          padding: EdgeInsets.only(bottom: T.s3),
          child: Skeleton(height: 84, radius: T.rLg),
        )),
      );
    }

    final staff = _staff;

    return ListView(
      padding: const EdgeInsets.fromLTRB(T.s4, T.s4, T.s4, T.s10),
      children: [
        // ── who you are ──
        Panel(
          child: Row(children: [
            Stack(children: [
              Avatar(
                name: staff?.name ?? '?',
                imageUrl: (staff?.avatar?.isNotEmpty ?? false) ? staff!.avatar : null,
                size: 68,
              ),
              Positioned(
                right: -2, bottom: -2,
                child: Material(
                  color: scheme.primary,
                  shape: const CircleBorder(),
                  child: InkWell(
                    customBorder: const CircleBorder(),
                    onTap: _uploading ? null : _changePicture,
                    child: SizedBox(
                      height: 26, width: 26,
                      child: _uploading
                          ? const Padding(
                              padding: EdgeInsets.all(6),
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : Icon(Icons.photo_camera_rounded, size: 14, color: scheme.onPrimary),
                    ),
                  ),
                ),
              ),
            ]),
            const SizedBox(width: T.s4),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(staff?.name ?? '',
                    maxLines: 1, overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontSize: 18, fontWeight: FontWeight.w700, letterSpacing: -0.4)),
                const SizedBox(height: 2),
                Text(staff?.email ?? '',
                    maxLines: 1, overflow: TextOverflow.ellipsis,
                    style: Type.secondary(context)),
                const SizedBox(height: 6),
                StatusBadge(
                  label: (staff?.role ?? '').replaceAll('_', ' ').toLowerCase(),
                  tone: Tone.brand,
                ),
              ]),
            ),
          ]),
        ),
        const SizedBox(height: T.s3),

        if (_workspaces.length > 1) ...[
          _Section(
            title: 'Workspace',
            footer: 'You belong to more than one business. Everything in the '
                'app — conversations, contacts, bookings — is whichever is '
                'chosen here.',
            children: [
              for (final space in _workspaces)
                _Row(
                  icon: space.slug == _currentWorkspace
                      ? Icons.check_circle_rounded
                      : Icons.business_outlined,
                  label: space.name,
                  value: space.suspended
                      ? 'Read-only'
                      : space.role.replaceAll('_', ' ').toLowerCase(),
                  onTap: space.slug == _currentWorkspace
                      ? null
                      : () => _switchTo(space),
                ),
            ],
          ),
          const SizedBox(height: T.s3),
        ],

        _Section(title: 'Account', children: [
          _Row(
            icon: Icons.badge_outlined,
            label: 'Name, email and phone',
            value: staff?.phone?.isNotEmpty == true ? staff!.phone! : 'No phone number',
            onTap: _editDetails,
          ),
          _Row(
            icon: Icons.lock_outline_rounded,
            label: 'Password',
            value: 'Change it',
            onTap: _changePassword,
          ),
        ]),
        const SizedBox(height: T.s3),

        _Section(
          title: 'Subscription & Role Access',
          footer: 'Features and limits are determined by your active workspace subscription plan and account role.',
          children: [
            _Row(
              icon: Icons.workspace_premium_rounded,
              label: 'Workspace Plan',
              value: 'Pro Active',
              onTap: () => _showPlanDetails(context),
            ),
            _Row(
              icon: Icons.admin_panel_settings_outlined,
              label: 'Role Permissions',
              value: '${(staff?.role ?? 'Agent').toUpperCase()} Access',
              onTap: () => _showRolePermissions(context, staff),
            ),
          ],
        ),
        const SizedBox(height: T.s3),

        // ── what interrupts you ──
        _Section(
          title: 'Alerts',
          footer: 'These apply to everyone. Turning one off stops it reaching '
              'any phone or browser.',
          children: [
            if (_alerts.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: T.s4, vertical: T.s3),
                child: Skeleton(height: 18),
              )
            else
              for (final alert in _alerts)
                SwitchListTile(
                  value: alert.enabled,
                  onChanged: (v) => _toggleAlert(alert, v),
                  title: Text(alert.label, style: const TextStyle(fontSize: 14.5)),
                  subtitle: Text(alert.description,
                      style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: T.s4),
                ),
          ],
        ),
        const SizedBox(height: T.s3),

        // ── how it looks ──
        _Section(title: 'Appearance', children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(T.s4, T.s2, T.s4, T.s4),
            child: SegmentedButton<ThemeMode>(
              segments: const [
                ButtonSegment(value: ThemeMode.system, label: Text('Automatic')),
                ButtonSegment(value: ThemeMode.light, label: Text('Light')),
                ButtonSegment(value: ThemeMode.dark, label: Text('Dark')),
              ],
              selected: {appearance.mode},
              showSelectedIcon: false,
              onSelectionChanged: (v) => appearance.set(v.first),
            ),
          ),
        ]),
        const SizedBox(height: T.s3),

        // ── which phones ──
        _Section(
          title: 'Devices',
          footer: 'A phone appears twice because notifications and calls are '
              'registered separately. Removing one stops it being told about '
              'anything until it signs in again.',
          children: [
            if (_devices.isEmpty)
              Padding(
                padding: const EdgeInsets.fromLTRB(T.s4, 0, T.s4, T.s3),
                child: Text(
                  'No device is registered yet. Allow notifications when asked, '
                  'and this phone appears here.',
                  style: Type.secondary(context),
                ),
              )
            else
              for (final device in _devices)
                ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: T.s4),
                  leading: Icon(
                    device.kind == 'VOIP' ? Icons.phone_iphone_rounded : Icons.notifications_active_outlined,
                    size: T.iconMd, color: scheme.primary),
                  title: Text(
                    '${device.platform == 'IOS' ? 'iPhone' : 'Android'} · '
                    '${device.kind == 'VOIP' ? 'calls' : 'notifications'}',
                    style: const TextStyle(fontSize: 14.5),
                  ),
                  subtitle: Text(
                    'Last seen ${DateFormat.MMMd().add_jm().format(device.lastSeenAt)}',
                    style: Type.label(context),
                  ),
                  trailing: IconAction(
                    icon: Icons.close_rounded,
                    tooltip: 'Remove this device',
                    onPressed: () => _revoke(device),
                  ),
                ),
          ],
        ),
        const SizedBox(height: T.s3),

        const _Section(title: 'About', children: [
          _Row(icon: Icons.info_outline_rounded, label: 'Version', value: _version),
          _Row(
            icon: Icons.shield_outlined,
            label: 'Privacy policy',
            value: 'app.fizmoh.cloud/privacy',
          ),
          _Row(
            icon: Icons.description_outlined,
            label: 'Terms',
            value: 'app.fizmoh.cloud/terms',
          ),
        ]),

        if (_error != null) ...[
          const SizedBox(height: T.s3),
          Text(_error!, style: TextStyle(color: scheme.error, fontSize: 13)),
        ],

        const SizedBox(height: T.s5),
        OutlinedButton.icon(
          onPressed: _confirmSignOut,
          style: OutlinedButton.styleFrom(
            foregroundColor: scheme.error,
            side: BorderSide(color: scheme.error.withValues(alpha: .4)),
            minimumSize: const Size.fromHeight(48),
          ),
          icon: const Icon(Icons.logout_rounded, size: 18),
          label: const Text('Sign out'),
        ),
      ],
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.children, this.footer});

  final String title;
  final List<Widget> children;
  final String? footer;

  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(T.s1, 0, T.s1, T.s2),
        child: Text(title.toUpperCase(),
            style: Type.label(context).copyWith(letterSpacing: 0.8, fontWeight: FontWeight.w700)),
      ),
      Panel(
        padding: EdgeInsets.zero,
        child: Column(children: [
          const SizedBox(height: T.s1),
          ...children,
          const SizedBox(height: T.s1),
        ]),
      ),
      if (footer != null)
        Padding(
          padding: const EdgeInsets.fromLTRB(T.s1, 6, T.s1, 0),
          child: Text(footer!, style: Type.label(context)),
        ),
    ]);
  }
}

class _PermRow extends StatelessWidget {
  const _PermRow({required this.label, required this.allowed});

  final String label;
  final bool allowed;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(
            allowed ? Icons.check_circle_rounded : Icons.cancel_rounded,
            size: 18,
            color: allowed ? scheme.primary : scheme.error.withValues(alpha: 0.7),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 13.5,
                color: allowed ? scheme.onSurface : scheme.onSurfaceVariant.withValues(alpha: 0.6),
                decoration: allowed ? null : TextDecoration.lineThrough,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({required this.icon, required this.label, required this.value, this.onTap});

  final IconData icon;
  final String label;
  final String value;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: T.s4),
      leading: Icon(icon, size: T.iconMd, color: scheme.onSurfaceVariant),
      title: Text(label, style: const TextStyle(fontSize: 14.5)),
      subtitle: Text(value, maxLines: 1, overflow: TextOverflow.ellipsis,
          style: Type.label(context)),
      trailing: onTap == null
          ? null
          : Icon(Icons.chevron_right_rounded, size: 20, color: scheme.onSurfaceVariant),
      onTap: onTap,
    );
  }
}

/// Name, email and phone.
class _DetailsEditor extends StatefulWidget {
  const _DetailsEditor({required this.staff});

  final Staff staff;

  @override
  State<_DetailsEditor> createState() => _DetailsEditorState();
}

class _DetailsEditorState extends State<_DetailsEditor> {
  late final _name = TextEditingController(text: widget.staff.name);
  late final _email = TextEditingController(text: widget.staff.email);
  late final _phone = TextEditingController(text: widget.staff.phone ?? '');
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _phone.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final api = context.read<ApiClient>();
    setState(() { _saving = true; _error = null; });
    try {
      final staff = await api.updateProfile({
        'name': _name.text.trim(),
        'email': _email.text.trim(),
        'phone': _phone.text.trim(),
      });
      if (mounted) Navigator.of(context).pop(staff);
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e is ApiException ? e.message : 'Those changes were not saved';
          _saving = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return SafeArea(
      top: false,
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(T.s4, 0, T.s4, T.s4),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Your details', style: Type.section(context)),
          const SizedBox(height: T.s4),
          TextField(
            controller: _name,
            textCapitalization: TextCapitalization.words,
            decoration: const InputDecoration(labelText: 'Name'),
          ),
          const SizedBox(height: T.s3),
          TextField(
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            decoration: const InputDecoration(
              labelText: 'Email',
              // Changing it changes how you sign in, including with Google.
              helperText: 'You sign in with this address',
            ),
          ),
          const SizedBox(height: T.s3),
          TextField(
            controller: _phone,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(
              labelText: 'Phone',
              helperText: 'Where a one-time sign-in code is sent',
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: T.s3),
            Text(_error!, style: TextStyle(fontSize: 12.5, color: scheme.error)),
          ],
          const SizedBox(height: T.s4),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: _saving ? null : _save,
              child: Text(_saving ? 'Saving' : 'Save'),
            ),
          ),
        ]),
      ),
    );
  }
}

class _PasswordEditor extends StatefulWidget {
  const _PasswordEditor();

  @override
  State<_PasswordEditor> createState() => _PasswordEditorState();
}

class _PasswordEditorState extends State<_PasswordEditor> {
  final _current = TextEditingController();
  final _next = TextEditingController();
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _current.dispose();
    _next.dispose();
    super.dispose();
  }

  bool get _valid => _current.text.isNotEmpty && _next.text.length >= 8;

  Future<void> _save() async {
    final api = context.read<ApiClient>();
    setState(() { _saving = true; _error = null; });
    try {
      await api.updateProfile({
        'currentPassword': _current.text,
        'newPassword': _next.text,
      });
      if (mounted) {
        Navigator.of(context).pop();
        notify(context, 'Password changed', tone: Tone.success);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e is ApiException ? e.message : 'The password was not changed';
          _saving = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return SafeArea(
      top: false,
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(T.s4, 0, T.s4, T.s4),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Change password', style: Type.section(context)),
          const SizedBox(height: T.s4),
          TextField(
            controller: _current,
            obscureText: true,
            onChanged: (_) => setState(() {}),
            decoration: const InputDecoration(labelText: 'Current password'),
          ),
          const SizedBox(height: T.s3),
          TextField(
            controller: _next,
            obscureText: true,
            onChanged: (_) => setState(() {}),
            decoration: const InputDecoration(
              labelText: 'New password',
              helperText: 'Eight characters or more',
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: T.s3),
            Text(_error!, style: TextStyle(fontSize: 12.5, color: scheme.error)),
          ],
          const SizedBox(height: T.s4),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: _valid && !_saving ? _save : null,
              child: Text(_saving ? 'Changing' : 'Change password'),
            ),
          ),
        ]),
      ),
    );
  }
}
