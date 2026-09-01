import 'dart:async';
import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher_string.dart';
import '../core/api_client.dart';
import '../core/attachments.dart';
import '../core/text_direction.dart';
import 'kit.dart';
import 'tokens.dart';
import 'attachment_sheet.dart';
import 'reply_library.dart';
import 'widgets.dart';
import 'theme.dart';
import '../core/chat_store.dart';
import '../core/models.dart';
import 'net_image.dart';

/// The conversation itself.
class MessageThread extends StatefulWidget {
  const MessageThread({super.key, this.onBack, this.onShowDetails});

  final VoidCallback? onBack;
  final VoidCallback? onShowDetails;

  @override
  State<MessageThread> createState() => _MessageThreadState();
}

class _MessageThreadState extends State<MessageThread> {
  final _composer = TextEditingController();
  final _scroll = ScrollController();
  final _composerFocus = FocusNode();
  final _searchCtrl = TextEditingController();
  bool _searching = false;
  String _searchQuery = '';
  int _lastCount = 0;

  /// Which conversation the scroll position belongs to.
  String? _shown;

  @override
  void dispose() {
    _composer.dispose();
    _scroll.dispose();
    _composerFocus.dispose();
    _searchCtrl.dispose();
    super.dispose();
  }

  /// Keeps the newest message in view as it arrives.
  ///
  /// Only when the operator is already near the bottom: yanking the view down
  /// while somebody is reading back through the history is worse than letting
  /// a new message wait.
  void _followTail(String conversationId, int count) {
    if (conversationId != _shown) {
      _shown = conversationId;
      _lastCount = count;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_scroll.hasClients) {
          _scroll.jumpTo(0.0);
        }
      });
      return;
    }
    if (count == _lastCount) return;
    _lastCount = count;

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scroll.hasClients) return;
      if (_scroll.position.pixels < 240) {
        _scroll.animateTo(
          0.0,
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOut,
        );
      }
    });
  }

  /// Drops a saved reply into the message box, where the agent can change it.
  Future<void> _openReplies({bool templatesFirst = false}) async {
    final text = await showReplyLibrary(context, templatesFirst: templatesFirst);
    if (text == null || !mounted) return;
    final existing = _composer.text.trimRight();
    _composer.text = existing.isEmpty ? text : '$existing\n$text';
    _composer.selection = TextSelection.collapsed(offset: _composer.text.length);
    _composerFocus.requestFocus();
    setState(() {});
  }

  Future<void> _send(ChatStore store) async {
    final text = _composer.text;
    if (text.trim().isEmpty) return;
    HapticFeedback.lightImpact();
    _composer.clear();
    await store.send(text);
    // Keep the keyboard up: an agent usually sends several in a row.
    _composerFocus.requestFocus();
  }

  @override
  Widget build(BuildContext context) {
    final store = context.watch<ChatStore>();
    final scheme = Theme.of(context).colorScheme;
    final conversation = store.openConversation;

    if (conversation == null) {
      return Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Icon(Icons.forum_outlined, size: 48, color: scheme.onSurfaceVariant.withValues(alpha: 0.4)),
          const SizedBox(height: 12),
          Text('Pick a conversation', style: TextStyle(color: scheme.onSurfaceVariant)),
        ]),
      );
    }

    _followTail(conversation.id, store.messages.length);

    final filteredMessages = _searchQuery.isEmpty
        ? store.messages
        : store.messages.where((m) => m.content.toLowerCase().contains(_searchQuery)).toList();

    final showTyping = store.customerTyping && _searchQuery.isEmpty;
    final itemCount = filteredMessages.length + (showTyping ? 1 : 0);

    return Column(children: [
      if (_searching)
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: scheme.surfaceContainerHighest.withValues(alpha: 0.7),
            border: Border(bottom: BorderSide(color: scheme.outlineVariant.withValues(alpha: 0.4))),
          ),
          child: Row(children: [
            Icon(Icons.search_rounded, size: 20, color: scheme.primary),
            const SizedBox(width: 8),
            Expanded(
              child: TextField(
                controller: _searchCtrl,
                autofocus: true,
                style: const TextStyle(fontSize: 13),
                decoration: const InputDecoration(
                  hintText: 'Search messages, orders, phone…',
                  border: InputBorder.none,
                  isDense: true,
                  contentPadding: EdgeInsets.zero,
                ),
                onChanged: (v) => setState(() => _searchQuery = v.trim().toLowerCase()),
              ),
            ),
            if (_searchQuery.isNotEmpty)
              Text(
                '${filteredMessages.length} found',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: scheme.primary),
              ),
            IconButton(
              icon: const Icon(Icons.close_rounded, size: 20),
              onPressed: () => setState(() {
                _searching = false;
                _searchQuery = '';
                _searchCtrl.clear();
              }),
            ),
          ]),
        )
      else
        _Header(
          conversation: conversation,
          onBack: widget.onBack,
          onShowDetails: widget.onShowDetails,
          onSearch: () => setState(() => _searching = true),
        ),
      Expanded(
        child: store.loadingMessages
            ? const Center(child: CircularProgressIndicator())
            : ListView.builder(
                controller: _scroll,
                reverse: true,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                itemCount: itemCount,
                itemBuilder: (context, i) {
                  if (showTyping && i == 0) {
                    return const _TypingBubble();
                  }
                  final msgIndex = showTyping ? i - 1 : i;
                  final listIdx = filteredMessages.length - 1 - msgIndex;
                  final message = filteredMessages[listIdx];
                  final previous = listIdx > 0 ? filteredMessages[listIdx - 1] : null;
                  return _Bubble(
                    message: message,
                    showDate: _newDay(previous, message),
                    highlightQuery: _searchQuery,
                  );
                },
              ),
      ),
      if (!store.sessionOpen)
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
          color: scheme.errorContainer,
          child: Row(children: [
            Icon(Icons.lock_clock, size: 16, color: scheme.onErrorContainer),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                // Meta drops a freeform reply sent outside the window without
                // reporting it, so silence is the only symptom otherwise.
                'More than 24 hours since they wrote. A typed reply will not be delivered.',
                style: TextStyle(fontSize: 11.5, height: 1.3, color: scheme.onErrorContainer),
              ),
            ),
            const SizedBox(width: 8),
            // The way out, next to the problem, rather than a sentence telling
            // the agent to go and find it.
            TextButton(
              onPressed: () => _openReplies(templatesFirst: true),
              child: const Text('Send a template'),
            ),
          ]),
        ),
      if (context.read<ApiClient>().staff?.isViewer == true)
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: scheme.surfaceContainerHighest.withValues(alpha: 0.5),
            border: Border(top: BorderSide(color: scheme.outlineVariant.withValues(alpha: 0.4))),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.visibility_outlined, size: 16, color: scheme.onSurfaceVariant),
              const SizedBox(width: 8),
              Text(
                'Read-only view · Your role (viewer) cannot send messages',
                style: TextStyle(fontSize: 12.5, color: scheme.onSurfaceVariant, fontWeight: FontWeight.w500),
              ),
            ],
          ),
        )
      else
        _Composer(
          controller: _composer,
          focusNode: _composerFocus,
          sending: store.sending,
          onSend: () => _send(store),
          onReplies: () => _openReplies(),
        ),
    ]);
  }

  static bool _newDay(Message? previous, Message current) {
    if (previous == null) return true;
    return previous.createdAt.day != current.createdAt.day ||
        previous.createdAt.month != current.createdAt.month;
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.conversation, this.onBack, this.onShowDetails, this.onSearch});

  final Conversation conversation;
  final VoidCallback? onBack;
  final VoidCallback? onShowDetails;
  final VoidCallback? onSearch;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: scheme.surface,
        border: Border(bottom: BorderSide(color: scheme.outlineVariant.withValues(alpha: 0.4))),
      ),
      child: Row(children: [
        if (onBack != null)
          IconButton(icon: const Icon(Icons.arrow_back), onPressed: onBack),
        Expanded(
          child: InkWell(
            borderRadius: BorderRadius.circular(F.rSm),
            onTap: onShowDetails,
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 4),
              child: Row(children: [
                FAvatar(initials: conversation.initials, size: 40),
                const SizedBox(width: F.md),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text.rich(
                      TextSpan(children: [
                        TextSpan(
                          text: _cleanUtf16(conversation.customerName),
                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16, letterSpacing: -0.3),
                        ),
                        if (conversation.customerPhone.isNotEmpty && conversation.customerPhone != conversation.customerName)
                          TextSpan(
                            text: _cleanUtf16('  ${conversation.customerPhone}'),
                            style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w500, color: scheme.onSurfaceVariant.withValues(alpha: 0.8)),
                          ),
                      ]),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 1),
                    Row(children: [
                      Icon(conversation.botActive ? Icons.smart_toy_outlined : Icons.person_outline,
                          size: 12, color: scheme.onSurfaceVariant),
                      const SizedBox(width: 4),
                      Flexible(
                        child: Text(
                          conversation.botActive ? 'Bot is replying' : 'You are replying',
                          maxLines: 1, overflow: TextOverflow.ellipsis,
                          style: TextStyle(fontSize: 11.5, color: scheme.onSurfaceVariant),
                        ),
                      ),
                    ]),
                  ]),
                ),
              ]),
            ),
          ),
        ),
        if (onSearch != null)
          IconButton(
            tooltip: 'Search in conversation',
            icon: const Icon(Icons.search_rounded, size: 20),
            onPressed: onSearch,
          ),
        IconButton(
          tooltip: 'Copy number',
          icon: const Icon(Icons.copy_rounded, size: 18),
          onPressed: () {
            Clipboard.setData(ClipboardData(text: conversation.customerPhone));
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Number copied'), duration: Duration(seconds: 2)),
            );
          },
        ),
        if (onShowDetails != null)
          IconButton(
            tooltip: 'Details',
            icon: const Icon(Icons.info_outline, size: 19),
            onPressed: onShowDetails,
          ),
      ]),
    );
  }
}

class _Bubble extends StatelessWidget {
  const _Bubble({required this.message, required this.showDate, this.highlightQuery = ''});

  final Message message;
  final bool showDate;
  final String highlightQuery;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final store = context.watch<ChatStore>();
    final mine = message.isMine;
    final media = message.resolvedMedia(context.read<ApiClient>().baseUrl);
    final busy = store.translating.contains(message.id);
    final failed = message.status == 'FAILED';
    final pending = message.status == 'PENDING';
    // Typed, saved, and waiting for a connection. Distinct from PENDING, which
    // means the server has it and has not answered yet — and the difference
    // matters to the person watching, because one of the two is their problem
    // to wait out and the other is not.
    final queued = message.status == 'QUEUED';

    return Column(children: [
      if (showDate)
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Text(
            _dayLabel(message.createdAt),
            style: TextStyle(fontSize: 11.5, color: scheme.onSurfaceVariant),
          ),
        ),
      Align(
        alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 460),
          child: Dismissible(
            key: ValueKey('msg_${message.id}_${message.createdAt.millisecondsSinceEpoch}'),
            direction: DismissDirection.startToEnd,
            confirmDismiss: (direction) async {
              // Swipe-to-reply action
              HapticFeedback.lightImpact();
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Replying to "${message.content.length > 30 ? '${message.content.substring(0, 30)}...' : message.content}"'),
                  duration: const Duration(seconds: 1),
                ),
              );
              return false; // Spring back
            },
            background: Container(
              alignment: Alignment.centerLeft,
              padding: const EdgeInsets.only(left: 12),
              child: Icon(Icons.reply_rounded, color: scheme.primary, size: 22),
            ),
            child: GestureDetector(
              onLongPress: () => _messageMenu(context, store, message),
              child: Container(
            margin: const EdgeInsets.symmetric(vertical: 3),
            padding: const EdgeInsets.fromLTRB(14, 10, 14, 8),
            decoration: BoxDecoration(
              color: failed
                  ? scheme.errorContainer
                  : mine
                      ? scheme.primary.withValues(alpha: 0.10)
                      : scheme.surface,
              borderRadius: BorderRadius.only(
                topLeft: const Radius.circular(16),
                topRight: const Radius.circular(16),
                bottomLeft: Radius.circular(mine ? 16 : 4),
                bottomRight: Radius.circular(mine ? 4 : 16),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
                  blurRadius: 6,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              if (media != null && message.isImage) ...[
                ClipRRect(
                  borderRadius: BorderRadius.circular(F.rSm),
                  child: GestureDetector(
                    onTap: () => showMediaLightbox(context, media),
                    child: cachedNetworkImage(
                      media,
                      width: 240,
                      fit: BoxFit.cover,
                      loadingBuilder: (context, child, progress) => progress == null
                          ? child
                          : const SizedBox(
                              height: 140, width: 240,
                              child: Center(child: CircularProgressIndicator(strokeWidth: 2))),
                      errorBuilder: (_, __, ___) => const _MediaNote(
                        icon: Icons.broken_image_outlined, label: 'Image could not be loaded'),
                    ),
                  ),
                ),
                if (message.content.isNotEmpty) const SizedBox(height: 6),
              ] else if (message.mediaUrl != null && media == null) ...[
                // A bare WhatsApp media id from before attachments were
                // downloaded. There is nothing to fetch, and saying so beats
                // a spinner that never resolves.
                const _MediaNote(icon: Icons.image_not_supported_outlined,
                    label: 'Attachment was not saved'),
                if (message.content.isNotEmpty) const SizedBox(height: 6),
              ] else if (media != null) ...[
                if (message.isAudio)
                  _AudioPlayerBubble(url: media)
                else if (message.isVideo)
                  _VideoBubble(url: media)
                else
                  _MediaNote(
                    icon: Icons.description_outlined,
                    label: 'Open Document',
                    onTap: () async {
                      try {
                        if (await canLaunchUrlString(media)) {
                          await launchUrlString(media, mode: LaunchMode.externalApplication);
                        }
                      } catch (_) {}
                    },
                  ),
                if (message.content.isNotEmpty) const SizedBox(height: 6),
              ],
              if (message.isTemplate)
                _TemplateContent(message: message)
              else if (message.content.isNotEmpty)
                Directionality(
                  textDirection: Script.of(message.content),
                  child: _LinkableText(
                    text: message.content,
                    textAlign: Script.alignFor(message.content),
                    style: const TextStyle(fontSize: 15, height: 1.42),
                  ),
                ),

              // The translation sits under the original, never in place of
              // it: an agent who reads Arabic should not be made to read a
              // machine's version of what they can already understand.
              if (message.translation != null) ...[
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.only(left: 8),
                  decoration: BoxDecoration(
                    border: Border(left: BorderSide(color: scheme.primary, width: 2)),
                  ),
                  child: Directionality(
                    textDirection: Script.of(message.translation!),
                    child: Text(
                      message.translation!,
                      textAlign: Script.alignFor(message.translation!),
                      style: TextStyle(fontSize: 13.5, height: 1.38, color: scheme.onSurfaceVariant),
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 3),
              Row(mainAxisSize: MainAxisSize.min, children: [
                if (message.direction == MessageDirection.bot) ...[
                  Icon(Icons.smart_toy_outlined, size: 11, color: scheme.onSurfaceVariant),
                  const SizedBox(width: 4),
                ],
                Text(
                  DateFormat.jm().format(message.createdAt),
                  style: TextStyle(fontSize: 10.5, color: scheme.onSurfaceVariant),
                ),
                if (mine) ...[
                  const SizedBox(width: 4),
                  Icon(
                    failed
                        ? Icons.error_outline
                        : queued
                            ? Icons.cloud_off_rounded
                            : pending
                                ? Icons.schedule
                                : Icons.done_all,
                    size: 12,
                    color: failed ? scheme.error : scheme.onSurfaceVariant,
                  ),
                ] else if (message.content.trim().length > 1) ...[
                  const SizedBox(width: 6),
                  InkWell(
                    onTap: () => store.toggleTranslation(message.id),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.translate_rounded,
                          size: 12,
                          color: message.translation != null ? scheme.primary : scheme.onSurfaceVariant.withValues(alpha: 0.7),
                        ),
                        const SizedBox(width: 2),
                        Text(
                          message.translation != null ? 'Hide' : 'Translate',
                          style: TextStyle(
                            fontSize: 10,
                            color: message.translation != null ? scheme.primary : scheme.onSurfaceVariant.withValues(alpha: 0.7),
                            fontWeight: message.translation != null ? FontWeight.bold : FontWeight.normal,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ]),
              if (failed)
                Text('Not sent', style: TextStyle(fontSize: 10.5, color: scheme.error)),
              // Said plainly, because the alternative reading of a message
              // that has not moved is that it was lost.
              if (queued)
                Text('Waiting to send',
                    style: TextStyle(fontSize: 10.5, color: scheme.onSurfaceVariant)),
              // Translating used to be a link under every single message,
              // which turned a thread into a column of the same word repeated.
              // It lives in the long-press menu now; only a message currently
              // showing one says anything about it.
              if (busy)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    const SizedBox(height: 9, width: 9,
                        child: CircularProgressIndicator(strokeWidth: 1.4)),
                    const SizedBox(width: 5),
                    Text('Translating', style: Type.label(context)),
                  ]),
                ),
            ]),
            ),
          ),
        ),
      ),
      ),
    ]);
  }

  /// What can be done with one message.
  ///
  /// A sheet rather than a row of links under every bubble: the actions are
  /// occasional, and repeating them on all forty messages in a thread turns
  /// the conversation into a column of the same three words.
  static Future<void> _messageMenu(BuildContext context, ChatStore store, Message message) async {
    final translated = message.translation != null;
    await showModalBottomSheet<void>(
      context: context,
      builder: (sheet) => SafeArea(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          if (message.content.trim().length > 1)
            ListTile(
              leading: const Icon(Icons.translate_rounded, size: T.iconMd),
              title: Text(translated ? 'Hide translation' : 'Translate'),
              subtitle: translated ? null : const Text('Into English'),
              onTap: () {
                Navigator.pop(sheet);
                store.toggleTranslation(message.id);
              },
            ),
          if (message.content.isNotEmpty)
            ListTile(
              leading: const Icon(Icons.copy_rounded, size: T.iconMd),
              title: const Text('Copy text'),
              onTap: () {
                Clipboard.setData(ClipboardData(text: message.content));
                Navigator.pop(sheet);
                notify(context, 'Copied');
              },
            ),
          ListTile(
            leading: const Icon(Icons.schedule_rounded, size: T.iconMd),
            title: Text(DateFormat.yMMMEd().add_jm().format(message.createdAt)),
            subtitle: Text(
              '${message.direction == MessageDirection.inbound ? "From the customer" : message.direction == MessageDirection.bot ? "Sent by the bot" : "Sent by an agent"}'
              ' · ${message.status.toLowerCase()}',
            ),
          ),
        ]),
      ),
    );
  }

  static String _dayLabel(DateTime at) {
    final now = DateTime.now();
    if (at.year == now.year && at.month == now.month && at.day == now.day) return 'Today';
    final yesterday = now.subtract(const Duration(days: 1));
    if (at.year == yesterday.year && at.month == yesterday.month && at.day == yesterday.day) {
      return 'Yesterday';
    }
    return DateFormat.yMMMd().format(at);
  }
}

/// A named stand-in for media that cannot be shown inline.
///
/// Better than an empty bubble or a spinner that never resolves: it says what
/// the attachment is and, when it cannot be fetched at all, that it was not
/// saved rather than pretending it is still loading.
class _MediaNote extends StatelessWidget {
  const _MediaNote({required this.icon, required this.label, this.onTap});

  final IconData icon;
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(F.rSm),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: F.md, vertical: 10),
        decoration: BoxDecoration(
          color: scheme.surfaceContainerHighest.withValues(alpha: 0.7),
          borderRadius: BorderRadius.circular(F.rSm),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, size: 17, color: scheme.onSurfaceVariant),
          const SizedBox(width: F.sm),
          Text(label, style: TextStyle(fontSize: 13, color: scheme.onSurfaceVariant)),
        ]),
      ),
    );
  }
}

/// The three dots, so a reply that is coming does not look like silence.
class _TypingBubble extends StatefulWidget {
  const _TypingBubble();

  @override
  State<_TypingBubble> createState() => _TypingBubbleState();
}

class _TypingBubbleState extends State<_TypingBubble> with SingleTickerProviderStateMixin {
  late final AnimationController _controller =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 1100))..repeat();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: scheme.surface,
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(16), topRight: Radius.circular(16),
            bottomRight: Radius.circular(16), bottomLeft: Radius.circular(4),
          ),
        ),
        child: AnimatedBuilder(
          animation: _controller,
          builder: (context, _) => Row(mainAxisSize: MainAxisSize.min, children: List.generate(3, (i) {
            // Each dot lags the one before it, which reads as a wave.
            final t = (_controller.value - i * 0.15) % 1.0;
            final lift = (t < 0.5 ? t : 1 - t) * 2;
            return Padding(
              padding: const EdgeInsets.symmetric(horizontal: 2.5),
              child: Transform.translate(
                offset: Offset(0, -3 * lift),
                child: Container(
                  height: 7, width: 7,
                  decoration: BoxDecoration(
                    color: scheme.onSurfaceVariant.withValues(alpha: 0.35 + 0.4 * lift),
                    shape: BoxShape.circle,
                  ),
                ),
              ),
            );
          })),
        ),
      ),
    );
  }
}

class _Composer extends StatefulWidget {
  const _Composer({
    required this.controller,
    required this.focusNode,
    required this.sending,
    required this.onSend,
    required this.onReplies,
  });

  final TextEditingController controller;
  final FocusNode focusNode;
  final bool sending;
  final VoidCallback onSend;
  final VoidCallback onReplies;

  @override
  State<_Composer> createState() => _ComposerState();
}

class _ComposerState extends State<_Composer> {
  final VoiceRecorder _recorder = VoiceRecorder();
  bool _recording = false;
  Timer? _tick;
  Duration _elapsed = Duration.zero;

  @override
  void dispose() {
    _tick?.cancel();
    _recorder.dispose();
    super.dispose();
  }

  Future<void> _attach() async {
    final choice = await showAttachmentSheet(context);
    if (choice == null || !mounted) return;

    final store = context.read<ChatStore>();
    final messenger = ScaffoldMessenger.of(context);

    try {
      switch (choice) {
        case 'camera':
        case 'gallery':
          final file = await Attachments.image(fromCamera: choice == 'camera');
          if (file != null) await store.sendAttachment(file, 'IMAGE');
        case 'document':
          final file = await Attachments.document();
          if (file != null) await store.sendAttachment(file, 'DOCUMENT');
        case 'location':
          final place = await Attachments.location();
          if (place != null) await store.sendLocation(place.lat, place.lng);
        case 'payment':
          final paymentMsg = await _showPaymentLinkDialog(context);
          if (paymentMsg != null && paymentMsg.isNotEmpty) {
            await store.send(paymentMsg);
          }
      }
    } on AttachmentRefused catch (e) {
      // A refusal has a reason, and the reason is the useful part.
      messenger.showSnackBar(SnackBar(content: Text(e.message)));
    } catch (e) {
      messenger.showSnackBar(const SnackBar(content: Text('That attachment could not be sent')));
    }
  }

  Future<String?> _showPaymentLinkDialog(BuildContext context) async {
    final staff = context.read<ApiClient>().staff;
    if (staff != null && !staff.canGeneratePayments) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Payment link generation requires Finance, Agent or Admin role (${staff.role.toLowerCase()})'),
        ),
      );
      return null;
    }
    final amountCtrl = TextEditingController();
    final descCtrl = TextEditingController(text: 'Service & Booking Payment');
    final formKey = GlobalKey<FormState>();

    return showDialog<String>(
      context: context,
      builder: (dialogCtx) {
        final scheme = Theme.of(dialogCtx).colorScheme;
        return AlertDialog(
          title: Row(
            children: [
              Icon(Icons.payment_rounded, color: scheme.primary, size: 24),
              const SizedBox(width: 8),
              const Text('Generate Payment Link', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ],
          ),
          content: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(
                  controller: amountCtrl,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  autofocus: true,
                  decoration: const InputDecoration(
                    labelText: 'Amount (OMR)',
                    hintText: 'e.g. 25.000',
                    prefixText: 'OMR ',
                  ),
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) return 'Enter an amount';
                    final n = double.tryParse(v.trim());
                    if (n == null || n <= 0) return 'Enter a valid amount';
                    return null;
                  },
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: descCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Description / Reference',
                    hintText: 'e.g. Desert Safari Deposit',
                  ),
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Enter a description' : null,
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogCtx),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () {
                if (formKey.currentState?.validate() ?? false) {
                  final amount = double.parse(amountCtrl.text.trim()).toStringAsFixed(3);
                  final desc = descCtrl.text.trim();
                  final ref = 'PAY-${DateTime.now().millisecondsSinceEpoch.toString().substring(5)}';
                  final url = 'https://app.fizmoh.cloud/api/amwalpay/hosted-checkout?ref=$ref&amount=$amount';
                  final msg = '💳 *Payment Request from Fizmoh*\n\n'
                      '• *Description:* $desc\n'
                      '• *Amount Due:* $amount OMR\n'
                      '• *Reference:* #$ref\n\n'
                      '👉 *Tap here to pay securely via AmwalPay (Card / Apple Pay):*\n$url';
                  Navigator.pop(dialogCtx, msg);
                }
              },
              child: const Text('Send Link'),
            ),
          ],
        );
      },
    );
  }

  Future<void> _startRecording() async {
    final started = await _recorder.start();
    if (!started) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Microphone permission is off. Turn it on in Settings.')));
      }
      return;
    }
    setState(() { _recording = true; _elapsed = Duration.zero; });
    _tick = Timer.periodic(const Duration(milliseconds: 200), (_) {
      if (mounted) setState(() => _elapsed = _recorder.elapsed);
    });
  }

  Future<void> _finishRecording({required bool send}) async {
    _tick?.cancel();
    if (!_recording) return;
    setState(() => _recording = false);

    if (!send) {
      await _recorder.cancel();
      return;
    }
    final file = await _recorder.stop();
    if (file == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Too short — hold the button to record')));
      }
      return;
    }
    if (mounted) await context.read<ChatStore>().sendAttachment(file, 'AUDIO');
  }

  static const _slashCommands = [
    (cmd: '/welcome', title: 'Welcome', text: 'Hello! Thank you for contacting Fizmoh. How can we assist you today? 😊'),
    (cmd: '/bank', title: 'Payment Info', text: 'You can complete your payment securely using Debit/Credit Card or Apple Pay via AmwalPay.'),
    (cmd: '/hours', title: 'Working Hours', text: 'Our team is available Sunday to Thursday, 8:30 AM to 5:30 PM (GST).'),
    (cmd: '/location', title: 'Location', text: 'Our office is located in Muscat, Sultanate of Oman. Google Maps: https://maps.google.com/?q=Muscat'),
    (cmd: '/safari', title: 'Wahiba Safari', text: 'Wahiba Sands Desert Safari includes 4x4 dune bashing, camel rides, Bedouin camp visit, and sunset dinner. Pickup at 6:00 AM.'),
    (cmd: '/thanks', title: 'Thank You', text: 'Thank you for choosing Fizmoh! Please feel free to reach out anytime.'),
  ];

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final currentText = widget.controller.text;
    final hasText = currentText.trim().isNotEmpty;
    final isSlash = currentText.startsWith('/');
    final slashMatches = isSlash
        ? _slashCommands
            .where((s) =>
                s.cmd.startsWith(currentText.toLowerCase()) ||
                s.title.toLowerCase().contains(currentText.substring(1).toLowerCase()))
            .toList()
        : const <({String cmd, String text, String title})>[];

    return Container(
      padding: const EdgeInsets.fromLTRB(F.sm, F.xs, F.sm, F.md),
      decoration: BoxDecoration(
        color: scheme.surface,
        border: Border(top: BorderSide(color: scheme.outlineVariant)),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (isSlash && slashMatches.isNotEmpty)
              Container(
                margin: const EdgeInsets.only(bottom: F.xs),
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                height: 38,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: slashMatches.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 6),
                  itemBuilder: (context, idx) {
                    final item = slashMatches[idx];
                    return ActionChip(
                      avatar: Icon(Icons.bolt_rounded, size: 16, color: scheme.primary),
                      label: Text('${item.cmd} · ${item.title}',
                          style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: scheme.onSurface)),
                      backgroundColor: scheme.primary.withValues(alpha: 0.08),
                      side: BorderSide(color: scheme.primary.withValues(alpha: 0.3)),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      onPressed: () {
                        HapticFeedback.lightImpact();
                        widget.controller.text = item.text;
                        widget.controller.selection =
                            TextSelection.collapsed(offset: item.text.length);
                        setState(() {});
                      },
                    );
                  },
                ),
              ),
            _recording
            ? _RecordingBar(
                elapsed: _elapsed,
                onCancel: () => _finishRecording(send: false),
                onSend: () => _finishRecording(send: true),
              )
            : Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
                IconButton(
                  tooltip: 'Attach',
                  icon: const Icon(Icons.add_circle_outline, size: 26),
                  color: scheme.onSurfaceVariant,
                  onPressed: widget.sending ? null : _attach,
                ),
                IconButton(
                  tooltip: 'Saved replies and templates',
                  icon: const Icon(Icons.bolt_outlined, size: 24),
                  color: scheme.onSurfaceVariant,
                  onPressed: widget.sending ? null : widget.onReplies,
                ),
                Expanded(
                  child: Shortcuts(
                    shortcuts: const {
                      // Enter sends; Shift+Enter starts a new line. The other
                      // way round surprises everyone who has used a chat app.
                      SingleActivator(LogicalKeyboardKey.enter): _SendIntent(),
                    },
                    child: Actions(
                      actions: {
                        _SendIntent: CallbackAction<_SendIntent>(
                            onInvoke: (_) { widget.onSend(); return null; }),
                      },
                      child: TextField(
                        controller: widget.controller,
                        focusNode: widget.focusNode,
                        minLines: 1,
                        maxLines: 5,
                        textInputAction: TextInputAction.newline,
                        onChanged: (_) => setState(() {}),
                        decoration: const InputDecoration(hintText: 'Message…'),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: F.sm),
                // The button changes job with the field: send when there is
                // something to send, record when there is not.
                AnimatedSwitcher(
                  duration: F.quick,
                  child: hasText || widget.sending
                      ? _RoundButton(
                          key: const ValueKey('send'),
                          icon: Icons.arrow_upward_rounded,
                          busy: widget.sending,
                          onTap: widget.sending ? null : widget.onSend,
                        )
                      : GestureDetector(
                          key: const ValueKey('mic'),
                          onLongPressStart: (_) => _startRecording(),
                          onLongPressEnd: (_) => _finishRecording(send: true),
                          child: _RoundButton(icon: Icons.mic_none_rounded, onTap: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Hold to record a voice note'),
                                duration: Duration(seconds: 2),
                              ));
                          }),
                        ),
                ),
              ]),
          ],
        ),
      ),
    );
  }
}

class _RoundButton extends StatelessWidget {
  const _RoundButton({super.key, required this.icon, this.onTap, this.busy = false});

  final IconData icon;
  final VoidCallback? onTap;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Material(
      color: onTap == null && !busy ? scheme.surfaceContainerHighest : scheme.primary,
      shape: const CircleBorder(),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        // 48 keeps it past the 44pt minimum with room to spare.
        child: SizedBox(
          height: 48, width: 48,
          child: busy
              ? const Padding(
                  padding: EdgeInsets.all(14),
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : Icon(icon, color: scheme.onPrimary, size: 22),
        ),
      ),
    );
  }
}

/// What the composer becomes while recording.
class _RecordingBar extends StatelessWidget {
  const _RecordingBar({required this.elapsed, required this.onCancel, required this.onSend});

  final Duration elapsed;
  final VoidCallback onCancel;
  final VoidCallback onSend;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final seconds = elapsed.inSeconds;
    return Row(children: [
      IconButton(
        tooltip: 'Discard',
        icon: Icon(Icons.delete_outline, color: scheme.error),
        onPressed: onCancel,
      ),
      Container(
        height: 10, width: 10,
        decoration: const BoxDecoration(color: Color(0xFFDC2626), shape: BoxShape.circle),
      ),
      const SizedBox(width: F.md),
      Text(
        '${(seconds ~/ 60).toString().padLeft(2, '0')}:${(seconds % 60).toString().padLeft(2, '0')}',
        // Tabular figures, so the timer does not jitter as digits change.
        style: const TextStyle(
          fontSize: 16, fontWeight: FontWeight.w600,
          fontFeatures: [FontFeature.tabularFigures()],
        ),
      ),
      const Spacer(),
      Text('Release to send', style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant)),
      const SizedBox(width: F.md),
      _RoundButton(icon: Icons.arrow_upward_rounded, onTap: onSend),
    ]);
  }
}

class _SendIntent extends Intent {
  const _SendIntent();
}

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

class _LinkableText extends StatelessWidget {
  const _LinkableText({required this.text, required this.style, this.textAlign});

  final String text;
  final TextStyle style;
  final TextAlign? textAlign;

  static final _urlRegExp = RegExp(
    r'(https?://[^\s]+|www\.[^\s]+)',
    caseSensitive: false,
  );

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final cleanText = _cleanUtf16(text);
    final defaultLinkStyle = style.copyWith(
      color: scheme.primary,
      decoration: TextDecoration.underline,
      decorationColor: scheme.primary,
      fontWeight: FontWeight.w600,
    );

    final matches = _urlRegExp.allMatches(cleanText);
    if (matches.isEmpty) {
      return Text(cleanText, textAlign: textAlign, style: style);
    }

    final spans = <InlineSpan>[];
    var lastIndex = 0;

    for (final match in matches) {
      if (match.start > lastIndex) {
        spans.add(TextSpan(text: _cleanUtf16(cleanText.substring(lastIndex, match.start))));
      }
      final rawUrl = match.group(0)!;
      final targetUrl = rawUrl.toLowerCase().startsWith('http') ? rawUrl : 'https://$rawUrl';

      spans.add(
        TextSpan(
          text: _cleanUtf16(rawUrl),
          style: defaultLinkStyle,
          recognizer: TapGestureRecognizer()
            ..onTap = () async {
              try {
                if (await canLaunchUrlString(targetUrl)) {
                  await launchUrlString(targetUrl, mode: LaunchMode.externalApplication);
                }
              } catch (_) {}
            },
        ),
      );
      lastIndex = match.end;
    }

    if (lastIndex < cleanText.length) {
      spans.add(TextSpan(text: _cleanUtf16(cleanText.substring(lastIndex))));
    }

    return Text.rich(
      TextSpan(style: style, children: spans),
      textAlign: textAlign,
    );
  }
}

class _AudioPlayerBubble extends StatefulWidget {
  const _AudioPlayerBubble({required this.url});

  final String url;

  @override
  State<_AudioPlayerBubble> createState() => _AudioPlayerBubbleState();
}

class _AudioPlayerBubbleState extends State<_AudioPlayerBubble> {
  final _player = AudioPlayer();
  bool _isPlaying = false;
  double _playbackRate = 1.0;
  Duration _position = Duration.zero;
  Duration _duration = Duration.zero;
  StreamSubscription? _posSub;
  StreamSubscription? _durSub;
  StreamSubscription? _stateSub;

  @override
  void initState() {
    super.initState();
    _stateSub = _player.onPlayerStateChanged.listen((state) {
      if (mounted) setState(() => _isPlaying = state == PlayerState.playing);
    });
    _posSub = _player.onPositionChanged.listen((pos) {
      if (mounted) setState(() => _position = pos);
    });
    _durSub = _player.onDurationChanged.listen((dur) {
      if (mounted) setState(() => _duration = dur);
    });
  }

  @override
  void dispose() {
    _stateSub?.cancel();
    _posSub?.cancel();
    _durSub?.cancel();
    _player.dispose();
    super.dispose();
  }

  void _togglePlaybackRate() {
    setState(() {
      if (_playbackRate == 1.0) {
        _playbackRate = 1.5;
      } else if (_playbackRate == 1.5) {
        _playbackRate = 2.0;
      } else {
        _playbackRate = 1.0;
      }
    });
    _player.setPlaybackRate(_playbackRate);
  }

  Future<void> _togglePlay() async {
    if (_isPlaying) {
      await _player.pause();
    } else {
      try {
        await _player.play(UrlSource(widget.url));
        if (_playbackRate != 1.0) {
          await _player.setPlaybackRate(_playbackRate);
        }
      } catch (_) {
        try {
          await launchUrlString(widget.url, mode: LaunchMode.externalApplication);
        } catch (_) {}
      }
    }
  }

  String _formatDuration(Duration d) {
    final m = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final s = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final maxVal = _duration.inMilliseconds.toDouble();
    final curVal = _position.inMilliseconds.toDouble().clamp(0.0, maxVal > 0 ? maxVal : 1.0);

    return Container(
      width: 240,
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHighest.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(F.rSm),
      ),
      child: Row(children: [
        IconButton(
          onPressed: _togglePlay,
          icon: Icon(
            _isPlaying ? Icons.pause_circle_filled_rounded : Icons.play_circle_fill_rounded,
            size: 34,
            color: scheme.primary,
          ),
          padding: EdgeInsets.zero,
          constraints: const BoxConstraints(),
        ),
        const SizedBox(width: 6),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              SliderTheme(
                data: SliderTheme.of(context).copyWith(
                  trackHeight: 3,
                  thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 5),
                  overlayShape: const RoundSliderOverlayShape(overlayRadius: 10),
                ),
                child: Slider(
                  value: curVal,
                  min: 0,
                  max: maxVal > 0 ? maxVal : 1.0,
                  onChanged: (val) {
                    _player.seek(Duration(milliseconds: val.toInt()));
                  },
                ),
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    _formatDuration(_position),
                    style: TextStyle(fontSize: 10, color: scheme.onSurfaceVariant),
                  ),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      InkWell(
                        onTap: _togglePlaybackRate,
                        borderRadius: BorderRadius.circular(4),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                          decoration: BoxDecoration(
                            color: scheme.primary.withValues(alpha: _playbackRate > 1.0 ? 0.2 : 0.08),
                            borderRadius: BorderRadius.circular(4),
                            border: Border.all(
                              color: scheme.primary.withValues(alpha: _playbackRate > 1.0 ? 0.6 : 0.25),
                              width: 0.8,
                            ),
                          ),
                          child: Text(
                            '${_playbackRate == 1.0 ? "1" : _playbackRate == 1.5 ? "1.5" : "2"}x',
                            style: TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.bold,
                              color: scheme.primary,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        _formatDuration(_duration),
                        style: TextStyle(fontSize: 10, color: scheme.onSurfaceVariant),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ]),
    );
  }
}

class _VideoBubble extends StatelessWidget {
  const _VideoBubble({required this.url});

  final String url;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 240,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.black,
        borderRadius: BorderRadius.circular(F.rSm),
      ),
      child: InkWell(
        onTap: () async {
          try {
            await launchUrlString(url, mode: LaunchMode.externalApplication);
          } catch (_) {}
        },
        child: Column(
          children: [
            Container(
              height: 110,
              decoration: BoxDecoration(
                color: Colors.white10,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Center(
                child: Icon(Icons.play_circle_fill_rounded, size: 48, color: Colors.white),
              ),
            ),
            const SizedBox(height: 8),
            const Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              Icon(Icons.video_file_outlined, size: 16, color: Colors.white70),
              SizedBox(width: 6),
              Text('Play Video', style: TextStyle(fontSize: 13, color: Colors.white, fontWeight: FontWeight.w600)),
            ]),
          ],
        ),
      ),
    );
  }
}

class _TemplateContent extends StatelessWidget {
  const _TemplateContent({required this.message});

  final Message message;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final api = context.read<ApiClient>();

    final headerMedia = message.templateHeaderImage ?? message.resolvedMedia(api.baseUrl);
    final carouselCards = message.templateCardsList;
    final buttons = message.templateButtonsList;

    String textContent = message.content;
    if (textContent.trim().startsWith('{') || textContent.trim().startsWith('[')) {
      final payload = message.parsedPayload;
      if (payload != null) {
        textContent = payload['body'] as String? ?? payload['text'] as String? ?? payload['content'] as String? ?? message.content;
      }
    }

    final imageUrlMatch = RegExp(r'(https?://[^\s]+\.(?:png|jpg|jpeg|gif|webp))', caseSensitive: false).firstMatch(textContent);
    final embeddedImageUrl = imageUrlMatch?.group(0);
    final displayHeaderMedia = headerMedia ?? embeddedImageUrl;

    return Container(
      width: 280,
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: scheme.primaryContainer.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(F.rSm),
        border: Border.all(color: scheme.primary.withValues(alpha: 0.35)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Icon(Icons.dashboard_outlined, size: 14, color: scheme.primary),
            const SizedBox(width: 6),
            Text(
              'TEMPLATE MESSAGE',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.5,
                color: scheme.primary,
              ),
            ),
          ]),
          const SizedBox(height: 8),

          if (displayHeaderMedia != null && displayHeaderMedia.isNotEmpty) ...[
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: cachedNetworkImage(
                displayHeaderMedia.startsWith('http')
                    ? displayHeaderMedia
                    : '${api.baseUrl.replaceAll(RegExp(r'/$'), '')}/${displayHeaderMedia.replaceAll(RegExp(r'^/'), '')}',
                width: double.infinity,
                height: 140,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => const SizedBox.shrink(),
              ),
            ),
            const SizedBox(height: 8),
          ],

          if (carouselCards.isNotEmpty) ...[
            SizedBox(
              height: 180,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: carouselCards.length,
                itemBuilder: (context, i) {
                  final card = carouselCards[i];
                  final cardMedia = card['image'] as String?;
                  final cardTitle = card['title'] as String? ?? 'Card ${i + 1}';
                  final cardText = card['body'] as String? ?? '';

                  return Container(
                    width: 180,
                    margin: const EdgeInsets.only(right: 8),
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: scheme.surface,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: scheme.outlineVariant),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (cardMedia != null && cardMedia.isNotEmpty)
                          ClipRRect(
                            borderRadius: BorderRadius.circular(6),
                            child: cachedNetworkImage(
                              cardMedia.startsWith('http')
                                  ? cardMedia
                                  : '${api.baseUrl.replaceAll(RegExp(r'/$'), '')}/${cardMedia.replaceAll(RegExp(r'^/'), '')}',
                              height: 75,
                              width: double.infinity,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                            ),
                          ),
                        const SizedBox(height: 4),
                        Text(cardTitle, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12), maxLines: 1, overflow: TextOverflow.ellipsis),
                        const SizedBox(height: 2),
                        Text(cardText, style: TextStyle(fontSize: 11, color: scheme.onSurfaceVariant), maxLines: 2, overflow: TextOverflow.ellipsis),
                      ],
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 8),
          ],

          _LinkableText(
            text: textContent,
            style: TextStyle(fontSize: 14, height: 1.38, color: scheme.onSurface),
          ),

          if (buttons.isNotEmpty) ...[
            const SizedBox(height: 8),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: buttons.map((btnMap) {
                final label = btnMap['text'] as String? ?? 'Action';
                final url = btnMap['url'] as String?;

                return OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    visualDensity: VisualDensity.compact,
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  ),
                  onPressed: () async {
                    if (url != null && url.isNotEmpty) {
                      try {
                        await launchUrlString(url, mode: LaunchMode.externalApplication);
                      } catch (_) {}
                    }
                  },
                  child: Text(label, style: const TextStyle(fontSize: 12)),
                );
              }).toList(),
            ),
          ],
        ],
      ),
    );
  }
}
