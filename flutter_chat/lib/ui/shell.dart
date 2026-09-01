import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/chat_store.dart';
import '../core/notifier.dart';
import 'bookings_screen.dart';
import 'conversation_list.dart';
import 'brand.dart';
import 'tokens.dart';
import 'calls_screen.dart';
import 'details_panel.dart';
import 'people_screen.dart';
import 'profile_screen.dart';
import 'message_thread.dart';

/// The frame around everything.
///
/// One layout on a wide screen, two on a narrow one. The same widgets in both:
/// a phone build and a browser build that drift apart are two apps to maintain
/// and two places for a bug to hide.
class Shell extends StatefulWidget {
  const Shell({super.key, required this.onSignedOut});

  final VoidCallback onSignedOut;

  @override
  State<Shell> createState() => _ShellState();
}

class _ShellState extends State<Shell> {
  bool _showThreadOnNarrow = false;
  bool _askedForNotifications = false;
  int _tab = 0;
  bool _details = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ChatStore>().start();
    });
  }

  Future<void> _enableNotifications() async {
    await Notifier.instance.requestPermission();
    if (mounted) setState(() => _askedForNotifications = true);
  }

  void _open(String id, {required bool narrow}) {
    context.read<ChatStore>().open(id);
    if (narrow) setState(() => _showThreadOnNarrow = true);
  }

  /// One list, used by both layouts. Two lists would eventually disagree.
  static const _sections = [
    (icon: Icons.forum_outlined, active: Icons.forum, label: 'Chats'),
    (icon: Icons.receipt_long_outlined, active: Icons.receipt_long, label: 'Bookings'),
    (icon: Icons.people_outline, active: Icons.people, label: 'Contacts'),
    (icon: Icons.call_outlined, active: Icons.call, label: 'Calls'),
    (icon: Icons.person_outline, active: Icons.person, label: 'Profile'),
  ];

  Widget _section(int index) {
    switch (index) {
      case 1: return const BookingsScreen();
      case 2: return const PeopleScreen();
      case 3: return const CallsScreen();
      case 4: return ProfileScreen(onSignedOut: widget.onSignedOut);
      default: return const SizedBox.shrink();
    }
  }

  @override
  Widget build(BuildContext context) {
    final store = context.watch<ChatStore>();
    final scheme = Theme.of(context).colorScheme;

    return LayoutBuilder(builder: (context, constraints) {
      final wide = constraints.maxWidth >= 900;

      final banner = Notifier.instance.supported
          && !Notifier.instance.granted
          && !_askedForNotifications
          ? MaterialBanner(
              backgroundColor: scheme.primaryContainer,
              content: const Text(
                'Turn on notifications to hear about a message when this window is behind something else.',
                style: TextStyle(fontSize: 13),
              ),
              actions: [
                TextButton(onPressed: () => setState(() => _askedForNotifications = true),
                    child: const Text('Not now')),
                FilledButton(onPressed: _enableNotifications, child: const Text('Turn on')),
              ],
            )
          : null;

      if (wide) {
        return Scaffold(
          body: Column(children: [
            _ConnectionBanner(live: store.live),
            if (banner != null) banner,
            // The inbox brings its own header — brand, connection and compose
            // are part of it. Everywhere else still gets the plain bar.
            if (_tab != 0) _TopBar(live: store.live),
            Expanded(
              child: Row(children: [
                NavigationRail(
                  selectedIndex: _tab,
                  onDestinationSelected: (i) => setState(() => _tab = i),
                  labelType: NavigationRailLabelType.all,
                  destinations: [
                    for (var i = 0; i < _sections.length; i++)
                      NavigationRailDestination(
                        icon: i == 0
                            ? Badge.count(
                                count: store.totalUnread,
                                isLabelVisible: store.totalUnread > 0,
                                child: Icon(_sections[i].icon),
                              )
                            : Icon(_sections[i].icon),
                        selectedIcon: Icon(_sections[i].active),
                        label: Text(_sections[i].label),
                      ),
                  ],
                ),
                Expanded(
                  child: _tab != 0
                      ? _section(_tab)
                      : Row(children: [
                          SizedBox(
                            width: 340,
                            child: Container(
                              decoration: BoxDecoration(
                                color: scheme.surface,
                                border: Border(right: BorderSide(
                                    color: scheme.outlineVariant.withValues(alpha: 0.4))),
                              ),
                              child: ConversationList(onOpen: (id) => _open(id, narrow: false)),
                            ),
                          ),
                          Expanded(
                            child: MessageThread(
                              onShowDetails: () => setState(() => _details = !_details),
                            ),
                          ),
                          // The third pane only earns its space once there is
                          // a conversation to describe, and only on a screen
                          // wide enough to spare it.
                          if (_details && store.openConversationId != null && constraints.maxWidth >= 1180)
                            SizedBox(
                              width: 300,
                              child: Container(
                                decoration: BoxDecoration(
                                  border: Border(left: BorderSide(
                                      color: scheme.outlineVariant.withValues(alpha: 0.4))),
                                ),
                                child: DetailsPanel(onClose: () => setState(() => _details = false)),
                              ),
                            ),
                        ]),
                ),
              ]),
            ),
          ]),
        );
      }

      // Narrow: the list and the thread are separate screens.
      final showingThread = _tab == 0 && _showThreadOnNarrow && store.openConversationId != null;
      return Scaffold(
        body: SafeArea(
          // The inbox header paints its own gradient under the status bar and
          // pads for it internally; every other screen starts below it.
          top: _tab != 0 || showingThread,
          bottom: false,
          child: Column(children: [
            _ConnectionBanner(live: store.live),
            if (banner != null) banner,
            if (!showingThread && _tab != 0) _TopBar(live: store.live),
            Expanded(
              child: showingThread
                  ? GestureDetector(
                      onHorizontalDragUpdate: (details) {
                        if (details.primaryDelta != null && details.primaryDelta! > 12) {
                          setState(() => _showThreadOnNarrow = false);
                        }
                      },
                      child: PopScope(
                        canPop: false,
                        onPopInvokedWithResult: (didPop, _) {
                          if (!didPop) setState(() => _showThreadOnNarrow = false);
                        },
                        child: MessageThread(
                          onBack: () => setState(() => _showThreadOnNarrow = false),
                          onShowDetails: () => showModalBottomSheet<void>(
                            context: context,
                            isScrollControlled: true,
                            showDragHandle: true,
                            builder: (sheetContext) => SizedBox(
                              height: MediaQuery.of(sheetContext).size.height * 0.8,
                              child: const DetailsPanel(),
                            ),
                          ),
                        ),
                      ),
                    )
                  : _tab != 0
                      ? _section(_tab)
                      : Container(
                          color: scheme.surface,
                          child: ConversationList(onOpen: (id) => _open(id, narrow: true)),
                        ),
            ),
          ]),
        ),
        // Hidden while a thread is open: the composer and the keyboard need
        // the room, and a bar under the send button is a mis-tap waiting to
        // happen.
        bottomNavigationBar: showingThread
            ? null
            : _BottomNav(
                sections: _sections,
                index: _tab,
                unread: store.totalUnread,
                onSelect: (i) => setState(() => _tab = i),
              ),
      );
    });
  }
}

class _TopBar extends StatelessWidget {
  const _TopBar({required this.live});

  final bool live;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.fromLTRB(T.s4, T.s2, T.s3, T.s2),
      decoration: BoxDecoration(
        color: scheme.surface,
        border: Border(bottom: BorderSide(color: scheme.outlineVariant)),
      ),
      child: Row(children: [
        const FizmohLogo(size: 36),
        const Spacer(),
        LiveBadge(live: live),
        // Signing out lives on the Profile tab now, next to the account it
        // belongs to, rather than one stray tap from the conversation list.
      ]),
    );
  }
}

/// The bottom bar.
///
/// Contained rather than edge-to-edge, and 60pt tall including the label —
/// enough for a 44pt target with the text under it, without eating the screen.
/// It sits above the home indicator rather than behind it.
class _BottomNav extends StatelessWidget {
  const _BottomNav({
    required this.sections,
    required this.index,
    required this.unread,
    required this.onSelect,
  });

  final List<({IconData icon, IconData active, String label})> sections;
  final int index;
  final int unread;
  final ValueChanged<int> onSelect;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final dark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      decoration: BoxDecoration(
        color: scheme.surface,
        border: Border(top: BorderSide(color: scheme.outlineVariant)),
        boxShadow: T.shadow(1, dark: dark),
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 58,
          child: Row(children: [
            for (var i = 0; i < sections.length; i++)
              Expanded(
                child: Semantics(
                  button: true,
                  selected: i == index,
                  label: i == 0 && unread > 0
                      ? '${sections[i].label}, $unread unread'
                      : sections[i].label,
                  child: InkWell(
                    onTap: () => onSelect(i),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Stack(clipBehavior: Clip.none, children: [
                          AnimatedSwitcher(
                            duration: T.motion(context, T.fast),
                            child: Icon(
                              i == index ? sections[i].active : sections[i].icon,
                              key: ValueKey(i == index),
                              size: 23,
                              color: i == index ? scheme.primary : scheme.onSurfaceVariant,
                            ),
                          ),
                          if (i == 0 && unread > 0)
                            Positioned(
                              right: -7, top: -3,
                              child: Container(
                                constraints: const BoxConstraints(minWidth: 16),
                                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                decoration: BoxDecoration(
                                  color: scheme.primary,
                                  borderRadius: BorderRadius.circular(T.rFull),
                                  border: Border.all(color: scheme.surface, width: 1.5),
                                ),
                                child: Text(
                                  unread > 99 ? '99' : '$unread',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    fontSize: 9.5, height: 1.2,
                                    fontWeight: FontWeight.w800, color: scheme.onPrimary),
                                ),
                              ),
                            ),
                        ]),
                        const SizedBox(height: 3),
                        Text(
                          sections[i].label,
                          style: TextStyle(
                            fontSize: 10.5,
                            fontWeight: i == index ? FontWeight.w700 : FontWeight.w500,
                            color: i == index ? scheme.primary : scheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
          ]),
        ),
      ),
    );
  }
}

class _ConnectionBanner extends StatelessWidget {
  const _ConnectionBanner({required this.live});

  final bool live;

  @override
  Widget build(BuildContext context) {
    if (live) return const SizedBox.shrink();

    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      color: Colors.amber.shade900,
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 12),
      child: const SafeArea(
        bottom: false,
        top: false,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            SizedBox(
              height: 12, width: 12,
              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
            ),
            SizedBox(width: 8),
            Text(
              'Connecting to WhatsApp server…',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white),
            ),
          ],
        ),
      ),
    );
  }
}
