import 'dart:async';
import 'package:flutter/foundation.dart';
import 'api_client.dart';
import 'models.dart';
import 'notifier.dart';
import 'attachments.dart';
import 'local_store.dart';
import 'call_service.dart';
import 'realtime.dart';

/// Everything the screens read from.
///
/// One store rather than a provider per screen: a message arriving has to
/// update the thread, the conversation list, the unread badge and the tab
/// title at the same instant, and splitting that across four owners is how
/// those four end up disagreeing.
class ChatStore extends ChangeNotifier {
  ChatStore(this.api, {this.calls});

  final ApiClient api;

  /// The phone. Handed the ring events as they arrive, because the event
  /// stream is here and a second connection for calls would be a second thing
  /// to keep alive.
  final CallService? calls;

  List<Conversation> conversations = [];
  List<Message> messages = [];
  List<Note> notes = [];
  String? openConversationId;

  /// Whether a freeform reply would actually be delivered. Meta drops one sent
  /// outside the 24-hour window without telling anybody, so this is shown to
  /// the agent before they type rather than discovered afterwards.
  bool sessionOpen = true;
  int sessionHoursLeft = 0;

  bool loadingConversations = false;
  bool loadingMessages = false;
  bool sending = false;
  bool live = false;
  String? error;

  /// Whether the customer in the open conversation is typing, which is the
  /// small thing that makes a chat feel alive rather than merely fast.
  bool customerTyping = false;
  Timer? _typingTimer;

  RealtimeConnection? _connection;
  StreamSubscription<RealtimeEvent>? _eventSub;
  StreamSubscription<bool>? _stateSub;

  Conversation? get openConversation {
    final id = openConversationId;
    if (id == null) return null;
    for (final c in conversations) {
      if (c.id == id) return c;
    }
    return null;
  }

  int get totalUnread =>
      conversations.fold(0, (sum, c) => sum + c.unreadCount);

  // ── lifecycle ──────────────────────────────────────────────────────────────

  Future<void> start() async {
    await loadConversations();
    _connect();
  }

  void _connect() {
    final token = api.token;
    if (token == null) return;

    _connection?.close();
    _connection = connectRealtime(baseUrl: api.baseUrl, token: token);

    _eventSub = _connection!.events.listen(_onEvent);
    _stateSub = _connection!.connected.listen((up) {
      if (live == up) return;
      live = up;
      // Anything that arrived while the stream was down was missed, so the
      // list is refetched rather than assumed to be current. And the stream
      // coming back is the clearest signal there is that a queued message can
      // finally go out.
      if (up) {
        unawaited(loadConversations());
        unawaited(flushOutbox());
      }
      notifyListeners();
    });
  }

  @override
  void dispose() {
    _typingTimer?.cancel();
    _eventSub?.cancel();
    _stateSub?.cancel();
    _connection?.close();
    super.dispose();
  }

  // ── data ───────────────────────────────────────────────────────────────────

  /// Everything, from scratch.
  ///
  /// Used when the session changes what it is looking at — switching business,
  /// most obviously. Clearing first matters: leaving the old workspace's
  /// threads on screen while the new ones load is how somebody replies to the
  /// wrong customer.
  Future<void> refreshAll() async {
    conversations = [];
    messages = [];
    error = null;
    notifyListeners();
    await loadConversations();
  }

  Future<void> loadConversations() async {
    // What the phone already knows, drawn before the network is asked.
    //
    // The list used to start empty on every launch and sit under a spinner
    // until the server had returned every conversation — a wait that grew with
    // the size of the business. The cached copy is on screen in a frame and the
    // refresh happens behind it.
    if (conversations.isEmpty) {
      final cached = await api.cachedConversations();
      if (cached.isNotEmpty && conversations.isEmpty) {
        conversations = cached;
        Notifier.instance.badge(totalUnread);
        notifyListeners();
      }
    }

    loadingConversations = conversations.isEmpty;
    notifyListeners();
    try {
      conversations = await api.conversations();
      error = null;
    } on SessionExpired {
      rethrow;
    } catch (e) {
      error = 'Could not load conversations';
    } finally {
      loadingConversations = false;
      Notifier.instance.badge(totalUnread);
      notifyListeners();
    }
  }

  Future<void> open(String conversationId) async {
    openConversationId = conversationId;
    messages = [];
    notes = [];
    customerTyping = false;
    loadingMessages = true;
    notifyListeners();

    // Anything typed for this conversation that has not been delivered yet.
    // Read once and reused below, so a queued message is visible both on the
    // cached thread and on the fresh one.
    final waiting = await api.cache?.outbox(conversationId: conversationId) ?? const <QueuedMessage>[];

    // The thread as last seen, on screen while the fresh copy is fetched.
    final cached = await api.cachedConversationDetail(conversationId);
    if (cached != null && openConversationId == conversationId) {
      messages = _withQueued(cached.messages, waiting);
      notes = cached.notes;
      sessionOpen = cached.sessionOpen;
      sessionHoursLeft = cached.hoursLeft;
      loadingMessages = false;
      notifyListeners();
    }

    try {
      final detail = await api.conversationDetail(conversationId);
      // Somebody who taps a second conversation while the first is still in
      // flight must not have the first one's messages land on top of it.
      if (openConversationId != conversationId) return;
      messages = _withQueued(detail.messages, waiting);
      notes = detail.notes;
      sessionOpen = detail.sessionOpen;
      sessionHoursLeft = detail.hoursLeft;
      // Opening a conversation is reading it.
      final conversation = openConversation;
      if (conversation != null && conversation.unreadCount > 0) {
        conversation.unreadCount = 0;
        Notifier.instance.badge(totalUnread);
      }
      error = null;
    } on SessionExpired {
      rethrow;
    } catch (e) {
      error = 'Could not load this conversation';
    } finally {
      loadingMessages = false;
      notifyListeners();
    }
  }

  /// Sends, showing the message immediately.
  ///
  /// The message goes to the outbox on disk before anything is attempted, so
  /// it survives a dead connection, a backgrounded app and a restart. What
  /// used to happen instead: the send failed, the bubble turned red, and the
  /// text was gone unless somebody retyped it from memory.
  ///
  /// Nothing here waits on the network before returning. The composer clears
  /// the moment the message is safe on disk, which is the honest point at
  /// which it will definitely be delivered eventually.
  Future<void> send(String text) async {
    final id = openConversationId;
    final trimmed = text.trim();
    if (id == null || trimmed.isEmpty) return;

    final store = api.cache;
    if (store == null) {
      // No cache — the web build, or a phone whose database would not open.
      // Fall back to sending straight through, which is what the app did
      // before there was an outbox at all.
      await _sendDirect(id, trimmed);
      return;
    }

    final queuedId = 'queued-${DateTime.now().microsecondsSinceEpoch}';
    final at = DateTime.now();
    await store.enqueue(id: queuedId, conversationId: id, text: trimmed, createdAt: at);

    if (openConversationId == id) {
      messages = [...messages, Message.queued(id: queuedId, text: trimmed, createdAt: at)];
      notifyListeners();
    }

    await flushOutbox();
  }

  /// The old path, for when there is no outbox to put anything in.
  Future<void> _sendDirect(String id, String trimmed) async {
    final pending = Message.pending(trimmed);
    messages = [...messages, pending];
    sending = true;
    notifyListeners();

    try {
      await api.send(id, trimmed);
      final detail = await api.conversationDetail(id);
      messages = detail.messages;
      sessionOpen = detail.sessionOpen;
      error = null;
    } catch (e) {
      messages = messages
          .map((m) => m.id == pending.id
              ? Message(
                  id: m.id,
                  content: m.content,
                  direction: m.direction,
                  type: m.type,
                  status: 'FAILED',
                  createdAt: m.createdAt,
                )
              : m)
          .toList();
      error = e is ApiException ? e.message : 'The message was not sent';
    } finally {
      sending = false;
      notifyListeners();
    }
  }

  bool _flushing = false;

  /// Sends whatever is waiting, oldest first.
  ///
  /// Called after typing, when the realtime connection comes back, and when
  /// the app returns to the foreground — the three moments at which a queue
  /// that could not drain a minute ago might drain now.
  ///
  /// Order matters and is preserved: a reply that overtakes the message it
  /// was answering reads as nonsense to the customer. So one at a time, and
  /// the first transport failure stops the run rather than skipping ahead.
  Future<void> flushOutbox() async {
    final store = api.cache;
    if (store == null || _flushing || !api.signedIn) return;
    _flushing = true;
    sending = true;
    notifyListeners();

    try {
      for (final queued in await store.outbox()) {
        try {
          await api.send(queued.conversationId, queued.text);
          await store.dequeue(queued.id);
        } on SessionExpired {
          // Nothing will send until somebody signs in again, and the queue is
          // the right place for the message to wait until they do.
          rethrow;
        } on ApiException catch (e) {
          // The server was reached and said no — the window closed, the
          // conversation is gone, the plan is out of messages. Retrying that
          // forever would never succeed and would block everything behind it.
          await store.dequeue(queued.id);
          _markFailed(queued.id);
          error = e.message;
        } catch (_) {
          // Anything else is the network. Leave it queued, stop the run, and
          // try again at the next opportunity.
          await store.recordAttempt(queued.id, 'Not delivered yet');
          return;
        }
      }

      // Only refetch once the queue is empty, and only for what is on screen.
      final id = openConversationId;
      if (id != null) {
        final detail = await api.conversationDetail(id);
        if (openConversationId == id) {
          messages = _withQueued(detail.messages, await store.outbox(conversationId: id));
          notes = detail.notes;
          sessionOpen = detail.sessionOpen;
          sessionHoursLeft = detail.hoursLeft;
        }
      }
    } on SessionExpired {
      rethrow;
    } catch (_) {
      // A failed refetch leaves what is on screen alone. The messages went.
    } finally {
      _flushing = false;
      sending = false;
      notifyListeners();
    }
  }

  /// Marks a queued bubble as rejected, in place, so it keeps its position in
  /// the thread instead of jumping to the end.
  void _markFailed(String queuedId) {
    messages = messages
        .map((m) => m.id == queuedId
            ? Message(
                id: m.id,
                content: m.content,
                direction: m.direction,
                type: m.type,
                status: 'FAILED',
                createdAt: m.createdAt,
              )
            : m)
        .toList();
  }

  /// The server's thread with anything still waiting appended.
  ///
  /// The server cannot know about a message that has not reached it, so a
  /// refetch would otherwise erase the queued bubbles from the screen while
  /// the messages themselves sat safely on disk — which looks exactly like
  /// losing them.
  static List<Message> _withQueued(List<Message> fetched, List<QueuedMessage> queued) => [
        ...fetched,
        for (final q in queued) Message.queued(id: q.id, text: q.text, createdAt: q.createdAt),
      ];

  /// Sends a picked file as an attachment.
  Future<void> sendAttachment(PickedFile file, String type) async {
    final id = openConversationId;
    if (id == null || sending) return;
    sending = true;
    error = null;
    notifyListeners();
    try {
      await api.sendMedia(
        conversationId: id, filename: file.name, bytes: file.bytes, type: type,
        contentType: file.contentType,
      );
      final detail = await api.conversationDetail(id);
      messages = detail.messages;
    } catch (e) {
      error = e is ApiException ? e.message : 'That attachment was not sent';
    } finally {
      sending = false;
      notifyListeners();
    }
  }

  /// Sends an approved template, and reports back whether it went.
  ///
  /// Returns the error rather than only storing it, because a template is the
  /// last resort after the reply window has closed — an agent who is not told
  /// it failed will assume the customer was reached.
  Future<String?> sendTemplate({
    required String name,
    required String language,
    required List<String> variables,
    required String preview,
    String? headerMediaUrl,
    String? headerMediaType,
    String? headerDocumentName,
    List<Map<String, dynamic>>? cards,
  }) async {
    final id = openConversationId;
    if (id == null || sending) return 'No conversation is open';
    sending = true;
    notifyListeners();
    try {
      await api.sendTemplate(
        conversationId: id, name: name, language: language,
        variables: variables, preview: preview,
        headerMediaUrl: headerMediaUrl,
        headerMediaType: headerMediaType,
        headerDocumentName: headerDocumentName,
        cards: cards,
      );
      final detail = await api.conversationDetail(id);
      messages = detail.messages;
      sessionOpen = detail.sessionOpen;
      sessionHoursLeft = detail.hoursLeft;
      error = null;
      return null;
    } catch (e) {
      final message = e is ApiException ? e.message : 'The template was not sent';
      error = message;
      return message;
    } finally {
      sending = false;
      notifyListeners();
    }
  }

  Future<void> sendLocation(double lat, double lng) async {
    final id = openConversationId;
    if (id == null || sending) return;
    sending = true;
    notifyListeners();
    try {
      await api.sendLocation(id, lat, lng);
      final detail = await api.conversationDetail(id);
      messages = detail.messages;
    } catch (e) {
      error = 'The location was not sent';
    } finally {
      sending = false;
      notifyListeners();
    }
  }

  /// Which messages are currently showing a translation.
  final Set<String> translating = {};

  /// Translates one message, or hides a translation already shown.
  ///
  /// The original always stays on screen. Replacing it would hide the one
  /// thing an agent needs when a translation reads oddly — what was actually
  /// said.
  Future<void> toggleTranslation(String messageId, {String to = 'en'}) async {
    final index = messages.indexWhere((m) => m.id == messageId);
    if (index < 0) return;
    final message = messages[index];

    if (message.translation != null) {
      messages = [...messages]..[index] = Message(
        id: message.id, content: message.content, direction: message.direction,
        type: message.type, status: message.status, createdAt: message.createdAt,
        mediaUrl: message.mediaUrl, rawJson: message.rawJson,
      );
      notifyListeners();
      return;
    }

    translating.add(messageId);
    notifyListeners();
    try {
      final translation = await api.translate(messageId, message.content, to: to);
      final at = messages.indexWhere((m) => m.id == messageId);
      if (at >= 0) messages = [...messages]..[at] = messages[at].withTranslation(translation);
    } catch (e) {
      error = e is ApiException ? e.message : 'Could not translate that';
    } finally {
      translating.remove(messageId);
      notifyListeners();
    }
  }

  /// Takes the conversation off the bot, or hands it back.
  ///
  /// Taking over means the bot must stop replying, or the customer gets two
  /// answers to one question from what looks like a single person.
  Future<void> setBotActive(bool active) async {
    final id = openConversationId;
    if (id == null) return;
    try {
      await api.setBotActive(id, active);
      await loadConversations();
    } catch (e) {
      error = 'Could not change who is replying';
      notifyListeners();
    }
  }

  Future<void> addNote(String content) async {
    final id = openConversationId;
    if (id == null || content.trim().isEmpty) return;
    try {
      await api.addNote(id, content.trim());
      final detail = await api.conversationDetail(id);
      notes = detail.notes;
      notifyListeners();
    } catch (e) {
      error = 'The note was not saved';
      notifyListeners();
    }
  }

  // ── realtime ───────────────────────────────────────────────────────────────

  void _onEvent(RealtimeEvent event) {
    switch (event.type) {
      case 'message':
        _onMessage(event);
      case 'typing':
        _onTyping(event);
      case 'call':
        _onCall(event);
      case 'conversation':
        unawaited(loadConversations());
      case 'notification':
        Notifier.instance.show(
          title: event.data['title']?.toString() ?? 'FizMoh',
          body: event.data['message']?.toString() ?? event.data['body']?.toString() ?? '',
          tag: 'notification',
        );
    }
  }

  void _onMessage(RealtimeEvent event) {
    final id = event.conversationId;
    final dir = (event.data['direction']?.toString() ?? event.data['sender']?.toString() ?? '').toLowerCase();
    final inbound = dir.isEmpty || dir == 'inbound' || dir == 'customer' || dir == 'user' || event.data['from_customer'] == true || event.data['from_me'] == false || dir != 'outbound';
    final preview = event.data['preview']?.toString() ??
        event.data['text']?.toString() ??
        event.data['message']?.toString() ??
        event.data['content']?.toString() ??
        event.data['body']?.toString() ??
        'New message';

    // The open thread refetches; every other conversation just updates its
    // preview and unread count, which avoids a request per event.
    if (id != null && id == openConversationId) {
      customerTyping = false;
      unawaited(api.conversationDetail(id).then((detail) {
        messages = detail.messages;
        sessionOpen = detail.sessionOpen;
        sessionHoursLeft = detail.hoursLeft;
        notifyListeners();
      }).catchError((_) {}));
    }

    var found = false;
    for (final c in conversations) {
      if (c.id != id) continue;
      found = true;
      if (preview.isNotEmpty && preview != 'New message') c.lastMessageText = preview;
      c.lastMessageAt = DateTime.now();
      if (inbound && id != openConversationId) c.unreadCount++;
      break;
    }

    // A message from somebody who has never written before belongs at the top
    // of the list, and the list has to be fetched to know who they are.
    if (!found) {
      unawaited(loadConversations());
    } else {
      conversations.sort((a, b) =>
          (b.lastMessageAt ?? DateTime(0)).compareTo(a.lastMessageAt ?? DateTime(0)));
    }

    if (inbound) {
      final String title;
      if (id != null) {
        final c = conversations.firstWhere(
          (item) => item.id == id,
          orElse: () => Conversation(
            id: '', customerName: 'New message', customerPhone: '',
            status: 'OPEN', unreadCount: 0, botActive: true,
          ),
        );
        title = c.customerPhone.isNotEmpty && c.customerName != c.customerPhone
            ? '${c.customerName} (${c.customerPhone})'
            : c.customerName;
      } else {
        title = 'New message';
      }
      Notifier.instance.show(title: title, body: preview, tag: id ?? 'msg');
    }

    Notifier.instance.badge(totalUnread);
    notifyListeners();
  }

  /// A call started, ended, or was taken by somebody else.
  void _onCall(RealtimeEvent event) {
    final callId = event.data['callId']?.toString();
    if (callId == null) return;

    final ringing = event.data['ringing'] == true;
    final offer = event.data['offer']?.toString();

    if (ringing && offer != null && offer.isNotEmpty) {
      calls?.incoming(
        callId: callId,
        conversationId: event.conversationId ?? '',
        customerName: event.data['customerName']?.toString() ?? 'Unknown',
        from: event.data['from']?.toString(),
        offer: offer,
      );
    } else {
      // ANSWERED, REJECTED or TERMINATE. Whichever it is, this device stops
      // ringing rather than offering a button that would fail.
      calls?.endedElsewhere(callId);
    }

    // A call is a line in the thread too.
    unawaited(loadConversations());
  }

  void _onTyping(RealtimeEvent event) {
    if (event.conversationId != openConversationId) return;
    customerTyping = true;
    notifyListeners();
    // The server sends a typing event but never an "stopped typing" one, so
    // the indicator times itself out rather than hanging there for ever.
    _typingTimer?.cancel();
    _typingTimer = Timer(const Duration(seconds: 6), () {
      customerTyping = false;
      notifyListeners();
    });
  }
}
