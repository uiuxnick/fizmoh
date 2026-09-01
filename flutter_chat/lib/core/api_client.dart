import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'local_store.dart';
import 'models.dart';

/// Talks to the admin API.
///
/// Authenticates with a bearer token rather than the session cookie. The web
/// build could use the cookie, but the mobile and desktop builds cannot, and
/// one code path that works everywhere beats three that each work somewhere.
class ApiClient {
  ApiClient({String? baseUrl}) : baseUrl = baseUrl ?? defaultBaseUrl;

  static const defaultBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://app.fizmoh.cloud',
  );

  final String baseUrl;
  final http.Client _client = http.Client();

  /// The phone's own copy of the inbox.
  ///
  /// Owned here rather than by the store because this is the only place that
  /// sees a server response: caching at the transport means every reader gets
  /// it, and there is one place where "fresh" is written down. Null on web and
  /// whenever the database could not be opened, in which case everything below
  /// behaves as it did before — just slower.
  LocalStore? cache;

  String? _token;
  Staff? staff;

  String? get token => _token;
  bool get signedIn => _token != null;

  static const _tokenKey = 'wptour_token';
  static const _staffKey = 'wptour_staff';
  static const _workspaceKey = 'fizmoh_workspace';

  /// Which business this session is looking at.
  ///
  /// Almost everybody belongs to one, and for them this stays null and the
  /// server decides from their membership. It matters for the few who belong
  /// to two — an agency running several, someone with a second brand — where
  /// nothing else in the request says which one they mean.
  String? _workspace;

  String? get workspace => _workspace;

  /// Restores a previous session so the app does not ask for a password on
  /// every launch. The token is verified against the server before it is
  /// trusted — a stored token may have expired while the app was closed.
  Future<bool> restore() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString(_tokenKey);
    final staffJson = prefs.getString(_staffKey);
    if (token == null || staffJson == null) return false;

    _token = token;
    _workspace = prefs.getString(_workspaceKey);
    try {
      staff = Staff.fromJson(jsonDecode(staffJson) as Map<String, dynamic>);
    } catch (_) {
      await signOut();
      return false;
    }

    final ok = await _ping();
    if (!ok) await signOut();
    return ok;
  }

  Future<bool> _ping() async {
    try {
      final response = await _client
          .get(Uri.parse('$baseUrl/api/conversations'), headers: _headers)
          .timeout(const Duration(seconds: 12));
      return response.statusCode != 401;
    } catch (_) {
      // A network failure is not an expired session. Keeping the token lets
      // the app work again when the connection comes back, rather than
      // logging somebody out because a train went into a tunnel.
      return true;
    }
  }

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (_token != null) 'Authorization': 'Bearer $_token',
        // A proposal, not a permission: the server checks it against
        // membership on every request, so a tampered value gets nothing.
        if (_workspace != null) 'x-fizmoh-workspace': _workspace!,
      };

  Future<void> signIn(String email, String password) async {
    final response = await _client.post(
      Uri.parse('$baseUrl/api/auth/admin-login'),
      headers: const {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );
    final body = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode != 200) {
      throw ApiException(body['error']?.toString() ?? 'Could not sign in');
    }

    _token = body['token'] as String?;
    if (_token == null) throw ApiException('The server did not return a session');
    staff = Staff.fromJson(body['staff'] as Map<String, dynamic>);

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, _token!);
    await prefs.setString(_staffKey, jsonEncode(body['staff']));
  }

  /// Signs in with an identity token from Google or Apple.
  ///
  /// The token proves who somebody is. Whether they are allowed in is the
  /// server's decision, and it turns away any address that is not already
  /// staff — otherwise anybody with a Gmail account could open this inbox.
  Future<void> signInWithProvider({required String provider, required String idToken}) async {
    final response = await _client.post(
      Uri.parse('$baseUrl/api/auth/provider-login'),
      headers: const {'Content-Type': 'application/json'},
      body: jsonEncode({'provider': provider, 'idToken': idToken}),
    );
    final body = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode != 200) {
      throw ApiException(body['error']?.toString() ?? 'Could not sign in');
    }

    _token = body['token'] as String?;
    if (_token == null) throw ApiException('The server did not return a session');
    staff = Staff.fromJson(body['staff'] as Map<String, dynamic>);

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, _token!);
    await prefs.setString(_staffKey, jsonEncode(body['staff']));
  }

  /// Keeps this session only until the app closes.
  ///
  /// The token stays in memory so the current session works, but nothing is
  /// written to disk — which is what "remember me", unticked, has to mean on a
  /// phone somebody else might pick up.
  Future<void> forgetOnClose() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_staffKey);
    await prefs.remove(_workspaceKey);
  }

  /// The workspaces this person belongs to, and which one is in view.
  Future<({List<Workspace> all, String? current})> workspaces() async {
    final response = await _client.get(
      Uri.parse('$baseUrl/api/workspaces'),
      headers: _headers,
    );
    if (response.statusCode != 200) return (all: <Workspace>[], current: null);
    final body = jsonDecode(response.body) as Map<String, dynamic>;
    final all = ((body['workspaces'] as List?) ?? [])
        .map((raw) => Workspace.fromJson(raw as Map<String, dynamic>))
        .toList();
    return (all: all, current: (body['current'] as Map?)?['slug'] as String?);
  }

  /// Looks at a different business. Everything already loaded belongs to the
  /// old one, so the caller reloads rather than merging the two.
  Future<void> useWorkspace(String? slug) async {
    /*
     * The cached inbox belongs to the workspace it came from.
     *
     * One person can administer several businesses, so the staff id the cache
     * is keyed by does not change when they switch — which would leave one
     * business's conversations on screen while looking at another. The sync
     * cursors go too: kept, they would ask the new workspace only for what
     * changed since a moment that means nothing to it.
     */
    if (slug != _workspace) await cache?.clear();

    _workspace = slug;
    final prefs = await SharedPreferences.getInstance();
    if (slug == null) {
      await prefs.remove(_workspaceKey);
    } else {
      await prefs.setString(_workspaceKey, slug);
    }
  }

  Future<void> signOut() async {
    _token = null;
    _workspace = null;
    staff = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_staffKey);
  }

  static const _conversationsCursor = 'conversations_since';

  Future<List<Conversation>> conversations() async {
    /*
     * Ask only for what changed.
     *
     * With a cursor the server returns the conversations touched since the last
     * sync — usually a handful — instead of every one the business has ever
     * had. The delta is merged into the cache and the full list read back from
     * there, so the screen still receives everything while the network carried
     * almost nothing.
     */
    final store = cache;
    final cursor = store == null ? null : await store.cursor(_conversationsCursor);

    final body = await _get(
      cursor == null
          ? '/api/conversations'
          : '/api/conversations?since=${Uri.encodeQueryComponent(cursor)}',
    );
    final list = ((body['conversations'] as List?) ?? const [])
        .whereType<Map<String, dynamic>>()
        .toList();
    final incremental = body['incremental'] == true;

    if (store != null) {
      // A delta merges; a full list replaces, because anything missing from a
      // full list has been deleted and should stop being shown.
      await store.saveConversations(list, replace: !incremental);
      final syncedAt = body['syncedAt']?.toString();
      if (syncedAt != null && syncedAt.isNotEmpty) {
        await store.setCursor(_conversationsCursor, syncedAt);
      }
      if (incremental) {
        final rows = await store.conversations();
        return rows.map(Conversation.fromJson).toList();
      }
    }

    return list.map(Conversation.fromJson).toList();
  }

  /// The conversations already on the phone, for drawing the list before the
  /// network has said anything.
  Future<List<Conversation>> cachedConversations() async {
    final rows = await cache?.conversations() ?? const [];
    return rows.map(Conversation.fromJson).toList();
  }

  /// The thread, plus whether a freeform reply can still be delivered.
  ///
  /// The messages are nested inside `conversation`, not returned at the top
  /// level. Reading the wrong key produced an empty list and a thread that
  /// rendered its header and composer around nothing at all — which looks
  /// exactly like a conversation with no messages in it.
  Future<ConversationDetail> conversationDetail(String conversationId) async {
    final store = cache;
    final cached = store == null ? null : await store.thread(conversationId);

    // Everything before the newest cached message is already on the phone, so
    // the server only needs to send what came after it.
    final newest = _newestMessageAt(cached);

    final body = await _get(
      newest == null
          ? '/api/conversations/$conversationId/messages'
          : '/api/conversations/$conversationId/messages?after=${Uri.encodeQueryComponent(newest)}',
    );

    if (store == null) return _detailFrom(body);

    final merged = body['tail'] == true && cached != null
        ? _mergeThread(cached: cached, tail: body)
        : body;
    unawaited(store.saveThread(conversationId, merged));
    return _detailFrom(merged);
  }

  /// The thread as last seen, for opening a conversation without waiting.
  Future<ConversationDetail?> cachedConversationDetail(String conversationId) async {
    final body = await cache?.thread(conversationId);
    return body == null ? null : _detailFrom(body);
  }

  /// The `createdAt` of the newest message held for a thread.
  static String? _newestMessageAt(Map<String, dynamic>? thread) {
    final conversation = thread?['conversation'];
    if (conversation is! Map<String, dynamic>) return null;
    final messages = conversation['messages'];
    if (messages is! List || messages.isEmpty) return null;

    DateTime? newest;
    for (final m in messages.whereType<Map<String, dynamic>>()) {
      final at = DateTime.tryParse(m['createdAt']?.toString() ?? '');
      if (at != null && (newest == null || at.isAfter(newest))) newest = at;
    }
    return newest?.toUtc().toIso8601String();
  }

  /// Old messages from disk, new ones from the server, everything else fresh.
  ///
  /// The conversation's own fields, its notes and the session window always
  /// come back in full, so those are taken from the response. Only `messages`
  /// is a tail, and it is appended — deduplicated by id, because a message
  /// created in the same instant the cursor was stamped can arrive twice.
  static Map<String, dynamic> _mergeThread({
    required Map<String, dynamic> cached,
    required Map<String, dynamic> tail,
  }) {
    final cachedConversation = cached['conversation'];
    final tailConversation = tail['conversation'];
    if (cachedConversation is! Map<String, dynamic> ||
        tailConversation is! Map<String, dynamic>) {
      return tail;
    }

    final byId = <String, Map<String, dynamic>>{};
    for (final source in [cachedConversation['messages'], tailConversation['messages']]) {
      if (source is! List) continue;
      for (final m in source.whereType<Map<String, dynamic>>()) {
        final id = m['id']?.toString();
        if (id != null && id.isNotEmpty) byId[id] = m;
      }
    }

    final messages = byId.values.toList()
      ..sort((a, b) {
        final x = DateTime.tryParse(a['createdAt']?.toString() ?? '');
        final y = DateTime.tryParse(b['createdAt']?.toString() ?? '');
        if (x == null || y == null) return 0;
        return x.compareTo(y);
      });

    return {
      ...tail,
      'conversation': {...tailConversation, 'messages': messages},
    };
  }

  ConversationDetail _detailFrom(Map<String, dynamic> body) {
    final conversation = (body['conversation'] as Map<String, dynamic>?) ?? const {};
    final list = (conversation['messages'] as List?) ?? const [];

    final messages = list
        .whereType<Map<String, dynamic>>()
        .map(Message.fromJson)
        .toList();
    // Oldest first, whatever order the API used — a thread reads downwards.
    messages.sort((a, b) => a.createdAt.compareTo(b.createdAt));

    final notes = ((conversation['notes'] as List?) ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(Note.fromJson)
        .toList();

    final session = (body['session'] as Map<String, dynamic>?) ?? const {};
    return ConversationDetail(
      messages: messages,
      notes: notes,
      // Outside Meta's 24-hour window a freeform reply is dropped silently, so
      // the agent needs to know before typing rather than after the customer
      // never answers.
      sessionOpen: session['open'] != false,
      hoursLeft: (session['hoursLeft'] as num?)?.toInt() ?? 0,
    );
  }

  Future<List<Message>> messages(String conversationId) async =>
      (await conversationDetail(conversationId)).messages;

  Future<void> send(String conversationId, String text) async {
    final response = await _client.post(
      Uri.parse('$baseUrl/api/conversations/$conversationId/messages'),
      headers: _headers,
      body: jsonEncode({'content': text, 'type': 'TEXT'}),
    );
    if (response.statusCode >= 400) {
      final body = _decode(response.body);
      throw ApiException(body['error']?.toString() ?? 'The message was not sent');
    }
  }

  /// Sends an approved template.
  ///
  /// The only thing Meta will deliver once the 24-hour window has closed. The
  /// variables are positional — Meta matches them to {{1}}, {{2}} by order, so
  /// a missing one silently shifts every value after it.
  Future<void> sendTemplate({
    required String conversationId,
    required String name,
    required String language,
    required List<String> variables,
    required String preview,
    String? headerMediaUrl,
    String? headerMediaType,
    String? headerDocumentName,
    List<Map<String, dynamic>>? cards,
  }) async {
    final response = await _client.post(
      Uri.parse('$baseUrl/api/conversations/$conversationId/messages'),
      headers: _headers,
      body: jsonEncode({
        'type': 'TEMPLATE',
        'templateName': name,
        'templateVariables': variables,
        'language': language,
        if (headerMediaUrl != null) 'headerMediaUrl': headerMediaUrl,
        if (headerMediaType != null) 'headerMediaType': headerMediaType,
        if (headerDocumentName != null) 'headerDocumentName': headerDocumentName,
        if (cards != null && cards.isNotEmpty) 'cards': cards,
        // What the agent saw when they pressed send, so the thread shows the
        // message rather than a template name nobody can read back.
        'content': preview,
      }),
    );
    if (response.statusCode >= 400) {
      final body = _decode(response.body);
      throw ApiException(body['error']?.toString() ?? 'The template was not sent');
    }
    final body = _decode(response.body);
    if (body['delivered'] == false) {
      throw ApiException(body['error']?.toString() ?? 'Meta rejected that template');
    }
  }

  /// The templates that can actually be sent. Anything not approved is left
  /// out: offering one is offering a message that will be rejected.
  Future<List<MessageTemplate>> templates() async {
    final body = await _get('/api/templates?channel=WHATSAPP');
    final list = (body['templates'] as List?) ?? const [];
    return list
        .whereType<Map<String, dynamic>>()
        .map(MessageTemplate.fromJson)
        .where((t) => t.approved)
        .toList();
  }

  /// What the assistant would say next, given the last few messages.
  ///
  /// Suggestions, never sends: the agent picks one, edits it, and presses send
  /// like any other reply.
  Future<List<String>> smartReplies(String conversationId) async {
    final body = await _get('/api/conversations/$conversationId/smart-replies');
    return ((body['replies'] as List?) ?? const []).map((r) => r.toString()).toList();
  }

  /// Creates a subscriber.
  Future<Subscriber> createCustomer({
    required String name,
    required String phone,
    String? email,
    String preferredLang = 'en',
    List<String> tags = const [],
  }) async {
    final response = await _client.post(
      Uri.parse('$baseUrl/api/customers'),
      headers: _headers,
      body: jsonEncode({
        'name': name, 'phone': phone,
        if (email != null && email.isNotEmpty) 'email': email,
        'preferredLang': preferredLang,
        'tags': tags,
      }),
    );
    if (response.statusCode == 401) throw SessionExpired();
    final body = _decode(response.body);
    if (response.statusCode >= 400) {
      throw ApiException(body['error']?.toString() ?? 'That subscriber was not saved');
    }
    final json = body['customer'];
    if (json is! Map<String, dynamic>) throw ApiException('That subscriber was not saved');
    return Subscriber.fromJson(json);
  }

  /// Changes a subscriber. Only the fields passed are touched.
  Future<void> updateCustomer(String id, Map<String, dynamic> changes) async {
    final response = await _client.patch(
      Uri.parse('$baseUrl/api/customers/$id'),
      headers: _headers,
      body: jsonEncode(changes),
    );
    if (response.statusCode == 401) throw SessionExpired();
    if (response.statusCode >= 400) {
      throw ApiException(_decode(response.body)['error']?.toString() ?? 'That change was not saved');
    }
  }

  // ── devices ────────────────────────────────────────────────────────────────

  /// Tells the server this phone should be told about things.
  Future<void> registerDevice({required String token, required String kind}) async {
    final response = await _client.post(
      Uri.parse('$baseUrl/api/notifications/devices'),
      headers: _headers,
      body: jsonEncode({
        'token': token,
        'platform': 'IOS',
        'kind': kind,
      }),
    );
    if (response.statusCode == 401) throw SessionExpired();
    if (response.statusCode >= 400) {
      throw ApiException('This device could not be registered for notifications');
    }
  }

  Future<void> unregisterDevice(String token) async {
    await _client.delete(
      Uri.parse('$baseUrl/api/notifications/devices?token=$token'),
      headers: _headers,
    );
  }

  /// Which events raise an alert, and whether each is on.
  Future<List<NotificationType>> notificationTypes() async {
    final body = await _get('/api/notification-prefs');
    return ((body['types'] as List?) ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(NotificationType.fromJson)
        .toList();
  }

  Future<void> setNotificationType(String key, bool enabled) async {
    final response = await _client.put(
      Uri.parse('$baseUrl/api/notification-prefs'),
      headers: _headers,
      body: jsonEncode({key: enabled}),
    );
    if (response.statusCode == 401) throw SessionExpired();
    if (response.statusCode >= 400) throw ApiException('That preference was not saved');
  }

  /// The phones signed into this account.
  Future<List<RegisteredDevice>> devices() async {
    final body = await _get('/api/notifications/devices');
    return ((body['devices'] as List?) ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(RegisteredDevice.fromJson)
        .toList();
  }

  Future<void> revokeDevice(String id) async {
    final response = await _client.delete(
      Uri.parse('$baseUrl/api/notifications/devices?id=$id'),
      headers: _headers,
    );
    if (response.statusCode >= 400) throw ApiException('That device was not removed');
  }

  // ── calls ──────────────────────────────────────────────────────────────────

  /// Answers a ringing call with the SDP this device produced.
  Future<void> answerCall(String callId, String sdp) =>
      _callAction(callId, {'action': 'answer', 'sdp': sdp});

  Future<void> rejectCall(String callId) => _callAction(callId, {'action': 'reject'});

  Future<void> terminateCall(String callId) => _callAction(callId, {'action': 'terminate'});

  Future<void> _callAction(String callId, Map<String, dynamic> body) async {
    final response = await _client.post(
      Uri.parse('$baseUrl/api/calls/$callId'),
      headers: _headers,
      body: jsonEncode(body),
    );
    if (response.statusCode == 401) throw SessionExpired();
    if (response.statusCode >= 400) {
      final decoded = _decode(response.body);
      throw ApiException(decoded['error']?.toString() ?? 'That call could not be answered');
    }
  }

  /// The full customer record — orders, spend, tags, consent.
  Future<CustomerProfile> customer(String customerId) async {
    final body = await _get('/api/customers/$customerId');
    final json = body['customer'];
    if (json is! Map<String, dynamic>) throw ApiException('That customer was not found');
    return CustomerProfile.fromJson(json);
  }

  // ── conversation actions ───────────────────────────────────────────────────

  /// Turns the bot off (or on) for one conversation.
  ///
  /// Taking over a conversation means the bot must stop replying, or the
  /// customer gets two answers to the same question from what looks like one
  /// person.
  Future<void> setBotActive(String conversationId, bool active) =>
      _patch('/api/conversations/$conversationId', {'botActive': active});

  Future<void> assignToMe(String conversationId) =>
      _patch('/api/conversations/$conversationId', {'assignedStaffId': staff?.id});

  Future<void> setConversationStatus(String conversationId, String status) =>
      _patch('/api/conversations/$conversationId', {'status': status});

  Future<void> addNote(String conversationId, String content) async {
    final response = await _client.post(
      Uri.parse('$baseUrl/api/conversations/$conversationId/notes'),
      headers: _headers,
      body: jsonEncode({'content': content}),
    );
    if (response.statusCode >= 400) throw ApiException('The note was not saved');
  }

  Future<List<CannedResponse>> cannedResponses() async {
    final body = await _get('/api/canned-responses');
    final list = (body['responses'] as List?) ?? const [];
    return list.whereType<Map<String, dynamic>>().map(CannedResponse.fromJson).toList();
  }

  // ── bookings ───────────────────────────────────────────────────────────────

  static const _ordersCursor = 'bookings_since';

  Future<List<Order>> orders({String? status, String? search}) async {
    // A filter returns a slice of the bookings, not all of them. Caching a
    // slice as if it were everything would leave the phone believing the rest
    // had been deleted — so a filtered request neither reads the cursor nor
    // writes to the cache.
    final filtered = (status != null && status.isNotEmpty) || (search != null && search.isNotEmpty);
    final store = cache;
    final cursor = (store == null || filtered) ? null : await store.cursor(_ordersCursor);

    final query = <String, String>{
      if (status != null && status.isNotEmpty) 'status': status,
      if (search != null && search.isNotEmpty) 'search': search,
      // Each booking carries its tour, slot, customer, payments and vouchers.
      // Pulling all of that again to redraw a list where nothing moved is the
      // reason the screen felt slow on every visit.
      if (cursor != null) 'since': cursor,
    };
    final uri = Uri.parse('$baseUrl/api/orders').replace(queryParameters: query.isEmpty ? null : query);
    final response = await _client.get(uri, headers: _headers);
    if (response.statusCode == 401) throw SessionExpired();
    if (response.statusCode >= 400) throw ApiException('Could not load bookings');
    final body = _decode(response.body);
    final list = ((body['orders'] as List?) ?? const [])
        .whereType<Map<String, dynamic>>()
        .toList();
    final incremental = body['incremental'] == true;

    if (store != null && !filtered) {
      // A delta merges; a full list replaces.
      await store.saveBookings(list, replace: !incremental);
      final syncedAt = body['syncedAt']?.toString();
      if (syncedAt != null && syncedAt.isNotEmpty) {
        await store.setCursor(_ordersCursor, syncedAt);
      }
      if (incremental) {
        final rows = await store.bookings();
        return rows.map(Order.fromJson).toList();
      }
    }
    return list.map(Order.fromJson).toList();
  }

  /// The bookings already on the phone, for drawing the list on launch.
  Future<List<Order>> cachedOrders() async {
    final rows = await cache?.bookings() ?? const [];
    return rows.map(Order.fromJson).toList();
  }

  /// One booking in full — money, seats, voucher, and who changed what.
  Future<OrderDetail> order(String orderId) async {
    final body = await _get('/api/orders/$orderId');
    final json = body['order'];
    if (json is! Map<String, dynamic>) throw ApiException('That booking was not found');
    return OrderDetail.fromJson(json);
  }

  Future<void> setOrderStatus(String orderId, String action) =>
      _patch('/api/orders/$orderId', {'action': action});

  Future<List<PendingPayment>> pendingPayments() async {
    final body = await _get('/api/payments?status=SUBMITTED');
    final list = (body['payments'] as List?) ?? const [];
    return list.whereType<Map<String, dynamic>>().map(PendingPayment.fromJson).toList();
  }

  /// Approves or rejects a payment somebody has sent proof of.
  Future<void> verifyPayment(String paymentId, {required bool approve, String? reason}) async {
    final response = await _client.post(
      Uri.parse('$baseUrl/api/payments/$paymentId/verify'),
      headers: _headers,
      body: jsonEncode({'approved': approve, if (reason != null) 'reason': reason}),
    );
    if (response.statusCode >= 400) {
      throw ApiException(_decode(response.body)['error']?.toString() ?? 'Could not verify the payment');
    }
  }

  // ── people ─────────────────────────────────────────────────────────────────

  Future<List<Subscriber>> subscribers({String? tag}) async {
    final body = await _get('/api/subscribers${tag != null && tag.isNotEmpty ? '?tag=$tag' : ''}');
    final list = (body['subscribers'] as List?) ?? (body['customers'] as List?) ?? const [];
    return list.whereType<Map<String, dynamic>>().map(Subscriber.fromJson).toList();
  }

  Future<List<Label>> labels() async {
    final body = await _get('/api/labels');
    final list = (body['labels'] as List?) ?? const [];
    return list.whereType<Map<String, dynamic>>().map(Label.fromJson).toList();
  }

  Future<void> applyLabel({
    String? conversationId,
    String? customerId,
    required String label,
    bool add = true,
  }) async {
    final response = await _client.post(
      Uri.parse('$baseUrl/api/labels'),
      headers: _headers,
      body: jsonEncode({
        if (conversationId != null) 'conversationId': conversationId,
        if (customerId != null) 'customerId': customerId,
        'label': label,
        'action': add ? 'add' : 'remove',
      }),
    );
    if (response.statusCode >= 400) {
      throw ApiException(_decode(response.body)['error']?.toString() ?? 'The label was not saved');
    }
  }

  // ── calls ──────────────────────────────────────────────────────────────────

  Future<({List<CallRecord> calls, CallingStatus status})> calls() async {
    final body = await _get('/api/calls');
    final list = (body['calls'] as List?) ?? const [];
    return (
      calls: list.whereType<Map<String, dynamic>>().map(CallRecord.fromJson).toList(),
      status: CallingStatus.fromJson((body['calling'] as Map<String, dynamic>?) ?? const {}),
    );
  }

  // ── this account ───────────────────────────────────────────────────────────

  Future<Staff> profile() async {
    final body = await _get('/api/staff/me');
    final staffJson = (body['staff'] as Map<String, dynamic>?) ?? const {};
    staff = Staff.fromJson(staffJson);
    await _cacheStaff(staffJson);
    return staff!;
  }

  Future<Staff> updateProfile(Map<String, dynamic> changes) async {
    final response = await _client.patch(
      Uri.parse('$baseUrl/api/staff/me'),
      headers: _headers,
      body: jsonEncode(changes),
    );
    final body = _decode(response.body);
    if (response.statusCode >= 400) {
      throw ApiException(body['error']?.toString() ?? 'Those changes were not saved');
    }
    final staffJson = (body['staff'] as Map<String, dynamic>?) ?? const {};
    staff = Staff.fromJson(staffJson);
    await _cacheStaff(staffJson);
    return staff!;
  }

  /// Uploads a picture and returns the URL to store against the account.
  Future<String> uploadImage(String filename, List<int> bytes, String contentType) async {
    // The type has to travel with the file. Without it the request arrives as
    // application/octet-stream, which the server refuses outright — every
    // attachment sent from the app was being rejected as an unsupported type.
    final request = http.MultipartRequest('POST', Uri.parse('$baseUrl/api/media/upload'))
      ..headers['Authorization'] = 'Bearer $_token'
      ..files.add(http.MultipartFile.fromBytes('file', bytes,
          filename: filename, contentType: MediaType.parse(contentType)));
    final streamed = await request.send();
    final body = _decode(await streamed.stream.bytesToString());
    if (streamed.statusCode >= 400) {
      throw ApiException(body['error']?.toString() ?? 'That image was not accepted');
    }
    final url = body['url']?.toString();
    if (url == null || url.isEmpty) throw ApiException('The upload returned no address');
    return url;
  }

  Future<void> _cacheStaff(Map<String, dynamic> staffJson) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_staffKey, jsonEncode(staffJson));
  }

  // ── sign in without a password ─────────────────────────────────────────────

  /// Asks for a one-time code. Answers the same whether or not the account
  /// exists, so this cannot be used to find out who works here.
  Future<void> requestOtp(String identifier, {required bool byWhatsApp}) async {
    final response = await _client.post(
      Uri.parse('$baseUrl/api/auth/staff-otp'),
      headers: const {'Content-Type': 'application/json'},
      body: jsonEncode({'identifier': identifier, 'channel': byWhatsApp ? 'whatsapp' : 'email'}),
    );
    if (response.statusCode >= 400) {
      throw ApiException(_decode(response.body)['error']?.toString() ?? 'The code could not be sent');
    }
  }

  Future<void> signInWithOtp(String identifier, String otp) async {
    final response = await _client.post(
      Uri.parse('$baseUrl/api/auth/staff-verify-otp'),
      headers: const {'Content-Type': 'application/json'},
      body: jsonEncode({'identifier': identifier, 'otp': otp}),
    );
    final body = _decode(response.body);
    if (response.statusCode != 200) {
      throw ApiException(body['error']?.toString() ?? 'That code is not valid');
    }
    _token = body['token'] as String?;
    if (_token == null) throw ApiException('The server did not return a session');
    staff = Staff.fromJson(body['staff'] as Map<String, dynamic>);

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, _token!);
    await prefs.setString(_staffKey, jsonEncode(body['staff']));
  }

  // ── attachments and translation ────────────────────────────────────────────

  /// Uploads a file then sends it as a message of the given kind.
  Future<void> sendMedia({
    required String conversationId,
    required String filename,
    required List<int> bytes,
    required String type,
    String contentType = 'application/octet-stream',
    String caption = '',
  }) async {
    final url = await uploadImage(filename, bytes, contentType);
    final response = await _client.post(
      Uri.parse('$baseUrl/api/conversations/$conversationId/messages'),
      headers: _headers,
      body: jsonEncode({'content': caption, 'type': type, 'mediaUrl': url}),
    );
    if (response.statusCode >= 400) {
      throw ApiException(_decode(response.body)['error']?.toString() ?? 'That attachment was not sent');
    }
  }

  /// Sends a place as a link, which is what a WhatsApp customer can act on.
  Future<void> sendLocation(String conversationId, double lat, double lng) async {
    final maps = 'https://maps.google.com/?q=$lat,$lng';
    await send(conversationId, '📍 Our location: $maps');
  }

  /// Translations are cached: the same message is toggled open and shut far
  /// more often than it changes, and each call is a second of waiting and a
  /// fraction of a penny.
  final Map<String, String> _translations = {};

  Future<String> translate(String messageId, String text, {String to = 'en'}) async {
    final cacheKey = '$messageId:$to';
    final cached = _translations[cacheKey];
    if (cached != null) return cached;

    final response = await _client.post(
      Uri.parse('$baseUrl/api/translate'),
      headers: _headers,
      body: jsonEncode({'text': text, 'to': to}),
    );
    final body = _decode(response.body);
    if (response.statusCode >= 400) {
      throw ApiException(body['error']?.toString() ?? 'Could not translate that');
    }
    final translation = body['translation']?.toString() ?? '';
    _translations[cacheKey] = translation;
    return translation;
  }

  /// Searches everything, not only what the phone happens to hold.
  ///
  /// The inbox filter matches on a conversation's name, number and last line —
  /// which is all a cached conversation row contains. Anything said earlier
  /// than the most recent message was unfindable, so "who asked about the
  /// price" returned nothing unless it was the very last thing they sent.
  Future<List<SearchHit>> search(String query) async {
    final term = query.trim();
    if (term.length < 2) return const [];
    final body = await _get('/api/search?q=${Uri.encodeQueryComponent(term)}');
    return ((body['results'] as List?) ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(SearchHit.fromJson)
        .toList();
  }

  /// What build of the app the server will still talk to.
  ///
  /// Deliberately unauthenticated and deliberately tolerant: the whole point
  /// is to work for an install that is too old for every other endpoint, and a
  /// failure to reach it must never be the thing that blocks somebody from
  /// their inbox. Anything unexpected comes back as "no requirement".
  Future<AppVersion> appVersion() async {
    try {
      final response = await _client
          .get(Uri.parse('$baseUrl/api/app-version'))
          .timeout(const Duration(seconds: 8));
      if (response.statusCode >= 400) return const AppVersion.none();
      final body = _decode(response.body);
      return AppVersion(
        minimumBuild: (body['minimumBuild'] as num?)?.toInt() ?? 0,
        latestBuild: (body['latestBuild'] as num?)?.toInt() ?? 0,
        storeUrl: body['storeUrl']?.toString() ?? '',
        message: body['message']?.toString() ?? '',
      );
    } catch (_) {
      return const AppVersion.none();
    }
  }

  Future<void> _patch(String path, Map<String, dynamic> body) async {
    final response = await _client.patch(
      Uri.parse('$baseUrl$path'),
      headers: _headers,
      body: jsonEncode(body),
    );
    if (response.statusCode == 401) throw SessionExpired();
    if (response.statusCode >= 400) {
      throw ApiException(_decode(response.body)['error']?.toString() ?? 'That change was not saved');
    }
  }

  Future<Map<String, dynamic>> _get(String path) async {
    final response = await _client.get(Uri.parse('$baseUrl$path'), headers: _headers);
    if (response.statusCode == 401) throw SessionExpired();
    if (response.statusCode >= 400) {
      throw ApiException('Request failed (${response.statusCode})');
    }
    return _decode(response.body);
  }

  Map<String, dynamic> _decode(String body) {
    try {
      final decoded = jsonDecode(body);
      return decoded is Map<String, dynamic> ? decoded : <String, dynamic>{};
    } catch (_) {
      return <String, dynamic>{};
    }
  }
}

class ApiException implements Exception {
  ApiException(this.message);
  final String message;
  @override
  String toString() => message;
}

/// The session has ended. Distinct from any other failure, because the only
/// useful response is to sign in again rather than to retry.
class SessionExpired implements Exception {}

/// What the server requires of the app it is talking to.
class AppVersion {
  const AppVersion({
    required this.minimumBuild,
    required this.latestBuild,
    required this.storeUrl,
    required this.message,
  });

  /// Nothing is required. The state after any failure to ask.
  const AppVersion.none()
      : minimumBuild = 0,
        latestBuild = 0,
        storeUrl = '',
        message = '';

  final int minimumBuild;
  final int latestBuild;
  final String storeUrl;
  final String message;

  /// Zero means the running build could not be read, and an app that cannot
  /// identify itself is never locked out on suspicion.
  bool blocks(int build) => build > 0 && minimumBuild > 0 && build < minimumBuild;
}

/// One thing the server found.
class SearchHit {
  const SearchHit({
    required this.type,
    required this.id,
    required this.title,
    required this.subtitle,
    required this.matchedInMessage,
  });

  factory SearchHit.fromJson(Map<String, dynamic> json) => SearchHit(
        type: json['type']?.toString() ?? '',
        id: json['id']?.toString() ?? '',
        title: json['title']?.toString() ?? '',
        subtitle: json['subtitle']?.toString() ?? '',
        matchedInMessage: json['matchedIn']?.toString() == 'message',
      );

  final String type;
  final String id;
  final String title;
  final String subtitle;

  /// Whether the match was in the body of a message rather than in a name or
  /// a number. Worth saying on screen: it explains why a result is there when
  /// nothing visible about the customer matches what was typed.
  final bool matchedInMessage;
}
