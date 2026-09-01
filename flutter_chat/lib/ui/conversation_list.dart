import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../core/api_client.dart';
import '../core/chat_store.dart';
import '../core/models.dart';
import '../core/text_direction.dart';
import 'brand.dart';
import 'kit.dart';
import 'tokens.dart';

String _cleanUtf16(String input) {
  if (input.isEmpty) return input;
  final codeUnits = input.codeUnits;
  final cleanUnits = <int>[];
  for (var i = 0; i < codeUnits.length; i++) {
    final unit = codeUnits[i];
    if (unit >= 0xD800 && unit <= 0xDBFF) {
      if (i + 1 < codeUnits.length) {
        final next = codeUnits[i + 1];
        if (next >= 0xDC00 && next <= 0xDFFF) {
          cleanUnits.add(unit);
          cleanUnits.add(next);
          i++;
          continue;
        }
      }
      cleanUnits.add(0xFFFD);
    } else if (unit >= 0xDC00 && unit <= 0xDFFF) {
      cleanUnits.add(0xFFFD);
    } else {
      cleanUnits.add(unit);
    }
  }
  return String.fromCharCodes(cleanUnits);
}

/// The left column: who is waiting, and how long they have been waiting.
class ConversationList extends StatefulWidget {
  const ConversationList({super.key, required this.onOpen});

  final void Function(String id) onOpen;

  @override
  State<ConversationList> createState() => _ConversationListState();
}

/// Newest activity first, or the person who has been waiting longest. The
/// second is the one that matters when the queue is behind — the oldest
/// unanswered message is the one about to become a complaint.
enum _Sort { recent, waiting }

class _ConversationListState extends State<ConversationList> {
  final _search = TextEditingController();
  final _scroll = ScrollController();
  String _query = '';
  String _filter = 'all';
  _Sort _sort = _Sort.recent;

  /// Conversations the server found by searching what people actually said.
  ///
  /// The list above these is filtered locally, which is instant and covers
  /// names, numbers and the latest line. It cannot cover anything said before
  /// that line, because the phone only keeps one line per conversation — so
  /// the rest of the thread is searched where it lives.
  List<SearchHit> _hits = const [];
  Timer? _debounce;
  int _searchRun = 0;

  /// The header gives up its greeting and title once the list starts moving,
  /// so scrolling a long queue is not done through a letterbox.
  bool _compact = false;

  @override
  void initState() {
    super.initState();
    _scroll.addListener(() {
      final compact = _scroll.hasClients && _scroll.offset > 24;
      if (compact != _compact) setState(() => _compact = compact);
    });
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    _scroll.dispose();
    super.dispose();
  }

  /// Waits for the typing to stop before asking.
  ///
  /// A request per keystroke would put eight of them in flight for one word,
  /// and the answers would arrive out of order — which is what `_searchRun`
  /// guards against for the ones that do overlap.
  void _onQueryChanged(String value) {
    setState(() => _query = value);
    _debounce?.cancel();
    final term = value.trim();
    if (term.length < 2) {
      setState(() => _hits = const []);
      return;
    }
    _debounce = Timer(const Duration(milliseconds: 350), () async {
      final run = ++_searchRun;
      try {
        final hits = await context.read<ApiClient>().search(term);
        if (!mounted || run != _searchRun) return;
        setState(() => _hits = hits.where((h) => h.matchedInMessage).toList());
      } catch (_) {
        // A search that fails leaves the local filter's results alone rather
        // than replacing a useful answer with an error.
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final store = context.watch<ChatStore>();
    final scheme = Theme.of(context).colorScheme;

    final needsReply = store.conversations.where((c) => !c.botActive).length;

    final visible = store.conversations.where((c) {
      if (_filter == 'unread' && c.unreadCount == 0) return false;
      if (_filter == 'mine' && c.botActive) return false;
      if (_query.isEmpty) return true;
      final needle = _query.toLowerCase();
      return c.customerName.toLowerCase().contains(needle) ||
          c.customerPhone.contains(needle) ||
          (c.lastMessageText ?? '').toLowerCase().contains(needle);
    }).toList();

    // Server hits for conversations the local filter did not already show.
    // Listing a conversation twice — once because its name matched and once
    // because a message did — is noise, not thoroughness.
    final extra = _query.trim().length >= 2
        ? _hits.where((h) => !visible.any((c) => c.id == h.id)).toList()
        : const <SearchHit>[];

    if (_sort == _Sort.waiting) {
      // Unanswered first, oldest at the top; everything else keeps the order
      // it arrived in.
      visible.sort((a, b) {
        final aw = a.unreadCount > 0, bw = b.unreadCount > 0;
        if (aw != bw) return aw ? -1 : 1;
        final at = a.lastMessageAt, bt = b.lastMessageAt;
        if (at == null || bt == null) return 0;
        return aw ? at.compareTo(bt) : bt.compareTo(at);
      });
    }

    return Column(children: [
      _InboxHeader(
        live: store.live,
        compact: _compact,
        unread: store.totalUnread,
        needsReply: needsReply,
        onCompose: () => showComposeSheet(context, widget.onOpen),
        search: SearchField(
          controller: _search,
          hint: 'Search name, number or message',
          onChanged: _onQueryChanged,
        ),
        sort: _SortButton(sort: _sort, onChanged: (s) => setState(() => _sort = s)),
      ),
      const SizedBox(height: T.s3),

      SizedBox(
        height: 38,
        child: ListView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: T.s4),
          children: [
            FilterPill(label: 'All', count: store.conversations.length,
                selected: _filter == 'all',
                onTap: () { HapticFeedback.selectionClick(); setState(() => _filter = 'all'); }),
            FilterPill(label: 'Unread', count: store.totalUnread,
                selected: _filter == 'unread',
                onTap: () { HapticFeedback.selectionClick(); setState(() => _filter = 'unread'); }),
            // The conversations the bot has stepped out of — the queue an
            // agent is actually answerable for.
            FilterPill(label: 'Needs me', count: needsReply,
                selected: _filter == 'mine',
                onTap: () { HapticFeedback.selectionClick(); setState(() => _filter = 'mine'); }),
          ],
        ),
      ),
      const SizedBox(height: T.s2),

      Expanded(
        child: store.loadingConversations
            ? ListView(children: List.generate(8, (i) => const SkeletonRow()))
            : visible.isEmpty && extra.isEmpty
                ? EmptyState(
                    icon: _query.isNotEmpty ? Icons.search_off_rounded : Icons.forum_outlined,
                    title: _query.isNotEmpty
                        ? 'Nobody matches that'
                        : _filter == 'unread'
                            ? 'Nothing unread'
                            : _filter == 'mine'
                                ? 'Nothing waiting on you'
                                : 'No conversations yet',
                    message: _query.isNotEmpty
                        ? 'Try a number, or part of a message.'
                        : _filter == 'all'
                            ? 'When a customer messages the WhatsApp number, they appear here.'
                            : null,
                  )
                : RefreshIndicator(
                    onRefresh: store.loadConversations,
                    child: ListView.builder(
                      controller: _scroll,
                      padding: const EdgeInsets.only(top: 2, bottom: T.s2),
                      itemCount: visible.length + (extra.isEmpty ? 0 : extra.length + 1),
                      itemBuilder: (context, i) {
                        // Past the end of the local results come the ones only
                        // the server could find, under a heading that says why
                        // they are there.
                        if (i >= visible.length) {
                          final offset = i - visible.length;
                          if (offset == 0) return const _SectionHeading('Found in messages');
                          final hit = extra[offset - 1];
                          return _HitTile(hit: hit, onOpen: widget.onOpen);
                        }
                        final item = visible[i];
                        return Dismissible(
                          key: ValueKey(item.id),
                          direction: DismissDirection.horizontal,
                          confirmDismiss: (direction) async {
                            if (direction == DismissDirection.startToEnd) {
                              // Swipe right: Open & mark read
                              store.open(item.id);
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('Opened conversation with ${item.customerName}'),
                                  duration: const Duration(seconds: 1),
                                ),
                              );
                            } else {
                              // Swipe left: Archive/Mute action
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('Archived conversation with ${item.customerName}'),
                                  duration: const Duration(seconds: 1),
                                ),
                              );
                            }
                            return false; // Return false so tile springs back smoothly
                          },
                          background: Container(
                            margin: const EdgeInsets.fromLTRB(T.s4, 4, T.s4, 4),
                            padding: const EdgeInsets.symmetric(horizontal: 20),
                            decoration: BoxDecoration(
                              color: scheme.primary,
                              borderRadius: BorderRadius.circular(T.rLg),
                            ),
                            alignment: Alignment.centerLeft,
                            child: Row(children: [
                              Icon(item.unreadCount > 0 ? Icons.mark_chat_read : Icons.mark_chat_unread, color: scheme.onPrimary),
                              const SizedBox(width: 8),
                              Text(item.unreadCount > 0 ? 'Mark Read' : 'Unread',
                                  style: TextStyle(color: scheme.onPrimary, fontWeight: FontWeight.bold)),
                            ]),
                          ),
                          secondaryBackground: Container(
                            margin: const EdgeInsets.fromLTRB(T.s4, 4, T.s4, 4),
                            padding: const EdgeInsets.symmetric(horizontal: 20),
                            decoration: BoxDecoration(
                              color: Colors.amber.shade800,
                              borderRadius: BorderRadius.circular(T.rLg),
                            ),
                            alignment: Alignment.centerRight,
                            child: const Row(mainAxisAlignment: MainAxisAlignment.end, children: [
                              Text('Archive', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                              SizedBox(width: 8),
                              Icon(Icons.archive_outlined, color: Colors.white),
                            ]),
                          ),
                          child: _Tile(
                            conversation: item,
                            selected: item.id == store.openConversationId,
                            onTap: () => widget.onOpen(item.id),
                          ),
                        );
                      },
                    ),
                  ),
      ),

      // The one line of reassurance worth the space: people hand over passport
      // numbers and card details in these threads.
      Padding(
        padding: const EdgeInsets.fromLTRB(T.s4, T.s2, T.s4, T.s3),
        child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(Icons.lock_outline_rounded, size: 13, color: scheme.onSurfaceVariant),
          const SizedBox(width: 6),
          Text('Your conversations are secure and encrypted',
              style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant)),
        ]),
      ),
    ]);
  }
}

/// The inbox header.
///
/// Brand, connection, compose, greeting, title and search in one panel rather
/// than a plain bar stacked on a plain title: the top of the screen is the one
/// piece of the app every session starts with, and it should look like
/// somebody built it on purpose.
///
/// It sheds the greeting and the title as soon as the list moves, so a long
/// queue is not scrolled through a letterbox.
class _InboxHeader extends StatelessWidget {
  const _InboxHeader({
    required this.live,
    required this.compact,
    required this.unread,
    required this.needsReply,
    required this.onCompose,
    required this.search,
    required this.sort,
  });

  final bool live;
  final bool compact;
  final int unread;
  final int needsReply;
  final VoidCallback onCompose;
  final Widget search;
  final Widget sort;

  static String _greeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final dark = Theme.of(context).brightness == Brightness.dark;
    final staff = context.read<ApiClient>().staff;
    final first = (staff?.name ?? '').trim().split(RegExp(r'\s+')).first;

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: dark
              ? [const Color(0xFF141C2B), scheme.surface]
              : [const Color(0xFFE6EEFF), const Color(0xFFF7FAFF)],
        ),
        borderRadius: const BorderRadius.vertical(bottom: Radius.circular(26)),
        boxShadow: T.shadow(1, dark: dark),
      ),
      child: Stack(children: [
        // A soft brand bloom behind the corner. Decoration, so it is drawn at
        // low contrast and never sits under text that has to be read.
        Positioned(
          right: -40, top: -50,
          child: Container(
            height: 160, width: 160,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: scheme.primary.withValues(alpha: dark ? .10 : .07),
            ),
          ),
        ),
        Padding(
          padding: EdgeInsets.fromLTRB(
              T.s4, MediaQuery.of(context).padding.top + T.s2, T.s3, T.s4),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              const FizmohLogo(size: 42),
              const Spacer(),
              LiveBadge(live: live),
              const SizedBox(width: T.s2),
              Semantics(
                button: true,
                label: 'New message',
                child: Tooltip(
                  message: 'New message',
                  child: Material(
                    color: scheme.primary,
                    borderRadius: BorderRadius.circular(T.rLg),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(T.rLg),
                      onTap: onCompose,
                      child: SizedBox(
                        height: T.tapMin, width: T.tapMin,
                        child: Icon(Icons.edit_outlined, size: 19, color: scheme.onPrimary),
                      ),
                    ),
                  ),
                ),
              ),
            ]),

            AnimatedSize(
              duration: T.motion(context, T.normal),
              curve: T.enter,
              alignment: Alignment.topCenter,
              child: compact
                  ? const SizedBox(width: double.infinity, height: T.s3)
                  : Padding(
                      padding: const EdgeInsets.only(top: T.s3, bottom: T.s3),
                      // No page title: the tab bar already says which screen
                      // this is, and a heading that repeats it costs a third of
                      // the space above the fold to say nothing.
                      child: Row(children: [
                        Expanded(
                          child: Text(
                            first.isEmpty ? _greeting() : '${_greeting()}, $first',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 19, height: 1.2, fontWeight: FontWeight.w700,
                              letterSpacing: -0.4, color: scheme.onSurface),
                          ),
                        ),
                        // The number that decides whether this screen needs
                        // attention.
                        if (unread > 0)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
                            decoration: BoxDecoration(
                              color: scheme.primary,
                              borderRadius: BorderRadius.circular(T.rFull),
                            ),
                            child: Text('$unread new',
                                style: TextStyle(
                                  fontSize: 12, fontWeight: FontWeight.w700,
                                  color: scheme.onPrimary)),
                          )
                        else if (needsReply > 0)
                          StatusBadge(label: '$needsReply handed to you', tone: Tone.brand),
                      ]),
                    ),
            ),

            Row(children: [
              Expanded(child: search),
              const SizedBox(width: T.s2),
              sort,
            ]),
          ]),
        ),
      ]),
    );
  }
}

class _Tile extends StatelessWidget {
  const _Tile({required this.conversation, required this.selected, required this.onTap});

  final Conversation conversation;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final unread = conversation.unreadCount > 0;
    final preview = conversation.lastMessageText ?? '';

    return Panel(
      onTap: onTap,
      // Unread reads as selected on purpose: both mean "this is the one to
      // look at", and two different highlights on one list is noise.
      selected: selected || unread,
      margin: const EdgeInsets.fromLTRB(T.s4, 4, T.s4, 4),
      padding: const EdgeInsets.symmetric(horizontal: T.s3, vertical: T.s3),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Avatar(
          name: conversation.customerName,
          size: 46,
          // The channel mark, so a mixed inbox stays readable at a glance.
          badge: Container(
            height: 17, width: 17,
            decoration: BoxDecoration(
              color: const Color(0xFF25D366),
              shape: BoxShape.circle,
              border: Border.all(color: scheme.surface, width: 2),
            ),
            child: const Icon(Icons.call, size: 8, color: Colors.white),
          ),
        ),
        const SizedBox(width: T.s3),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(children: [
                Expanded(
                  child: Text.rich(
                    TextSpan(children: [
                      TextSpan(
                        text: _cleanUtf16(conversation.customerName),
                        style: TextStyle(
                          fontSize: 15.5,
                          height: 1.25,
                          letterSpacing: -0.3,
                          fontWeight: FontWeight.w700,
                          color: scheme.onSurface,
                        ),
                      ),
                      if (conversation.customerPhone.isNotEmpty && conversation.customerPhone != conversation.customerName)
                        TextSpan(
                          text: _cleanUtf16('  ${conversation.customerPhone}'),
                          style: TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w500,
                            color: scheme.onSurfaceVariant.withValues(alpha: 0.75),
                          ),
                        ),
                    ]),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: T.s2),
                Text(
                  _stamp(conversation.lastMessageAt),
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: unread ? FontWeight.w700 : FontWeight.w500,
                    color: unread ? scheme.primary : scheme.onSurfaceVariant,
                  ),
                ),
              ]),
              const SizedBox(height: 4),
              Row(children: [
                Expanded(
                  child: Directionality(
                    // A preview of an Arabic message must read the way the
                    // message does, or the first words shown are the last ones
                    // written.
                    textDirection: Script.of(preview),
                    child: Text(
                      preview.isEmpty ? 'No messages yet' : preview,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 14,
                        height: 1.3,
                        color: unread ? scheme.onSurface : scheme.onSurfaceVariant,
                        fontWeight: unread ? FontWeight.w500 : FontWeight.w400,
                      ),
                    ),
                  ),
                ),
                if (unread) ...[
                  const SizedBox(width: T.s2),
                  Container(
                    constraints: const BoxConstraints(minWidth: 22),
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                    decoration: BoxDecoration(
                      color: scheme.primary,
                      borderRadius: BorderRadius.circular(T.rFull),
                    ),
                    child: Text(
                      conversation.unreadCount > 99 ? '99+' : '${conversation.unreadCount}',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: scheme.onPrimary, fontSize: 11.5,
                        height: 1.2, fontWeight: FontWeight.w700),
                    ),
                  ),
                ],
              ]),
              // The bot has stepped out of this one, so nothing happens here
              // until a person replies. Said plainly, on its own line.
              if (!conversation.botActive) ...[
                const SizedBox(height: 6),
                const StatusBadge(label: 'Needs reply', tone: Tone.brand),
              ],
            ],
          ),
        ),
      ]),
    );
  }

  /// Time today, weekday this week, date beyond — the shorthand people read
  /// without thinking about it.
  static String _stamp(DateTime? at) {
    if (at == null) return '';
    final now = DateTime.now();
    if (at.year == now.year && at.month == now.month && at.day == now.day) {
      return DateFormat.jm().format(at);
    }
    if (now.difference(at).inDays < 7) return DateFormat.E().format(at);
    return DateFormat('d MMM').format(at);
  }
}

/// The control beside the search box. One decision, not a drawer of them.
class _SortButton extends StatelessWidget {
  const _SortButton({required this.sort, required this.onChanged});

  final _Sort sort;
  final ValueChanged<_Sort> onChanged;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      height: 44, width: 44,
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(T.rMd),
        border: Border.all(color: scheme.outlineVariant),
      ),
      child: PopupMenuButton<_Sort>(
        tooltip: 'Sort conversations',
        initialValue: sort,
        onSelected: onChanged,
        icon: Icon(Icons.tune_rounded, size: 19,
            // Tinted while the order is not the default, so a list that looks
            // wrong has a visible reason.
            color: sort == _Sort.recent ? scheme.onSurfaceVariant : scheme.primary),
        itemBuilder: (context) => const [
          PopupMenuItem(value: _Sort.recent, child: Text('Newest first')),
          PopupMenuItem(value: _Sort.waiting, child: Text('Waiting longest first')),
        ],
      ),
    );
  }
}

/// The connection indicator. Quiet when things are fine, explicit when not.
class LiveBadge extends StatelessWidget {
  const LiveBadge({super.key, required this.live});

  final bool live;

  @override
  Widget build(BuildContext context) {
    if (live) {
      return Semantics(
        label: 'Connected',
        child: Tooltip(
          message: 'Connected — messages arrive as they are sent',
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: T.successTint,
              borderRadius: BorderRadius.circular(T.rFull),
            ),
            child: const Row(mainAxisSize: MainAxisSize.min, children: [
              SizedBox(
                height: 7, width: 7,
                child: DecoratedBox(
                    decoration: BoxDecoration(color: T.success, shape: BoxShape.circle)),
              ),
              SizedBox(width: 6),
              Text('Live',
                  style: TextStyle(
                      fontSize: 12.5, fontWeight: FontWeight.w700, color: T.success)),
            ]),
          ),
        ),
      );
    }
    return Semantics(
      label: 'Reconnecting',
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: const BoxDecoration(
          color: T.pendingTint,
          borderRadius: BorderRadius.all(Radius.circular(T.rFull)),
        ),
        child: const Row(mainAxisSize: MainAxisSize.min, children: [
          SizedBox(
            height: 10, width: 10,
            child: CircularProgressIndicator(strokeWidth: 1.5, color: T.pending),
          ),
          SizedBox(width: 6),
          Text('Reconnecting',
              style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: T.pending)),
        ]),
      ),
    );
  }
}

/// The compose button's sheet.
///
/// WhatsApp does not let a business open a conversation with free text — the
/// customer has to write first, or the business has to send an approved
/// template. So this picks up an existing thread rather than pretending a new
/// one can be started from here, and says so for anybody it cannot open.
Future<void> showComposeSheet(BuildContext context, void Function(String id) onOpen) {
  final store = context.read<ChatStore>();
  final api = context.read<ApiClient>();

  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (sheetContext) => SizedBox(
      height: MediaQuery.of(sheetContext).size.height * .8,
      child: _ComposeSheet(store: store, api: api, onOpen: onOpen),
    ),
  );
}

class _ComposeSheet extends StatefulWidget {
  const _ComposeSheet({required this.store, required this.api, required this.onOpen});

  final ChatStore store;
  final ApiClient api;
  final void Function(String id) onOpen;

  @override
  State<_ComposeSheet> createState() => _ComposeSheetState();
}

class _ComposeSheetState extends State<_ComposeSheet> {
  final _search = TextEditingController();
  List<Subscriber> _people = [];
  bool _loading = true;
  String _query = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final people = await widget.api.subscribers();
      if (mounted) setState(() { _people = people; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  /// Phone numbers arrive with and without punctuation depending on where they
  /// were entered, so they are compared by digits alone.
  static String _digits(String s) => s.replaceAll(RegExp(r'\D'), '');

  Conversation? _threadFor(Subscriber person) {
    final wanted = _digits(person.phone);
    if (wanted.isEmpty) return null;
    for (final c in widget.store.conversations) {
      if (_digits(c.customerPhone) == wanted) return c;
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final term = _query.trim().toLowerCase();
    final visible = _people
        .where((p) => term.isEmpty ||
            p.name.toLowerCase().contains(term) ||
            p.phone.contains(term))
        .toList();

    return Column(children: [
      const PageHeader(title: 'New message', subtitle: 'Pick who to write to'),
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: T.s4),
        child: SearchField(
          controller: _search,
          hint: 'Search name or number',
          onChanged: (v) => setState(() => _query = v),
        ),
      ),
      const SizedBox(height: T.s2),
      Expanded(
        child: _loading
            ? ListView(children: List.generate(6, (i) => const SkeletonRow()))
            : visible.isEmpty
                ? const EmptyState(
                    icon: Icons.person_search_outlined,
                    title: 'Nobody matches that',
                  )
                : ListView.builder(
                    itemCount: visible.length,
                    itemBuilder: (context, i) {
                      final person = visible[i];
                      final thread = _threadFor(person);
                      return ListRow(
                        onTap: () {
                          Navigator.of(context).pop();
                          if (thread != null) {
                            widget.onOpen(thread.id);
                          } else {
                            notify(context,
                                '${person.name} has no open chat. WhatsApp only lets '
                                'you start one with an approved template.',
                                tone: Tone.pending);
                          }
                        },
                        child: Row(children: [
                          Avatar(name: person.name, size: 40),
                          const SizedBox(width: T.s3),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(person.name,
                                    maxLines: 1, overflow: TextOverflow.ellipsis,
                                    style: Type.body(context)
                                        .copyWith(fontWeight: FontWeight.w600)),
                                Text(person.phone, style: Type.secondary(context)),
                              ],
                            ),
                          ),
                          if (thread == null)
                            const StatusBadge(label: 'Template only', tone: Tone.pending),
                        ]),
                      );
                    },
                  ),
      ),
    ]);
  }
}


/// A heading between the conversations the phone matched and the ones the
/// server did.
class _SectionHeading extends StatelessWidget {
  const _SectionHeading(this.label);

  final String label;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(T.s4, T.s4, T.s4, T.s2),
        child: Text(
          label.toUpperCase(),
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.6,
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
      );
}

/// A conversation found by what was said in it.
///
/// Deliberately plainer than a real tile: the phone does not hold this
/// conversation, so there is no unread count, no avatar and no timestamp to
/// show, and inventing them would be a lie about what is known.
class _HitTile extends StatelessWidget {
  const _HitTile({required this.hit, required this.onOpen});

  final SearchHit hit;
  final void Function(String id) onOpen;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return ListTile(
      leading: CircleAvatar(
        backgroundColor: scheme.primary.withValues(alpha: 0.10),
        child: Icon(Icons.search_rounded, size: 18, color: scheme.primary),
      ),
      title: Text(hit.title, maxLines: 1, overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14.5)),
      subtitle: Text(hit.subtitle, maxLines: 2, overflow: TextOverflow.ellipsis,
          style: TextStyle(fontSize: 12.5, color: scheme.onSurfaceVariant)),
      onTap: () => onOpen(hit.id),
    );
  }
}
