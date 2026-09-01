/// The shapes the API actually returns.
///
/// Parsed defensively: a chat client that throws on one unexpected field shows
/// the operator an empty screen instead of the nine conversations that parsed
/// perfectly well.
library;

import 'dart:convert';

DateTime? _date(dynamic value) {
  if (value == null) return null;
  return DateTime.tryParse(value.toString())?.toLocal();
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

String _string(dynamic value, [String fallback = '']) =>
    value == null ? fallback : _cleanUtf16(value.toString());

class Staff {
  const Staff({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    this.phone,
    this.avatar,
  });

  final String id;
  final String name;
  final String email;
  final String role;
  final String? phone;
  final String? avatar;

  factory Staff.fromJson(Map<String, dynamic> json) => Staff(
        id: _string(json['id']),
        name: _string(json['name'], 'Staff'),
        email: _string(json['email']),
        role: _string(json['role'], 'AGENT'),
        phone: json['phone'] as String?,
        avatar: json['avatar'] as String?,
      );

  String get initials {
    final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts.first.substring(0, 1).toUpperCase();
    return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
  }

  // ── Role-Based Access Control (RBAC) ──
  bool get isOwner => role.toUpperCase() == 'OWNER';
  bool get isAdmin => role.toUpperCase() == 'ADMIN' || isOwner;
  bool get isFinance => role.toUpperCase() == 'FINANCE' || isAdmin;
  bool get isAgent => role.toUpperCase() == 'AGENT' || isAdmin;
  bool get isViewer => role.toUpperCase() == 'VIEWER';

  bool get canManageTeam => isAdmin;
  bool get canManageBilling => isOwner;
  bool get canToggleBot => isAdmin;
  bool get canGeneratePayments => isFinance || isAgent;
  bool get canEditCustomerTags => isAgent || isAdmin;
  bool get canMakeVoipCalls => !isViewer;
  bool get canSendMessages => !isViewer;
  bool get canAddPrivateNotes => !isViewer;
}

class Conversation {
  Conversation({
    required this.id,
    this.customerId,
    required this.customerName,
    required this.customerPhone,
    required this.status,
    required this.unreadCount,
    required this.botActive,
    this.lastMessageText,
    this.lastMessageAt,
  });

  final String id;

  /// The customer record behind the thread, when there is one. A conversation
  /// can exist without it — somebody who wrote once and was never saved — so
  /// anything that needs the profile has to cope with it being absent.
  final String? customerId;
  final String customerName;
  final String customerPhone;
  final String status;
  int unreadCount;
  final bool botActive;
  String? lastMessageText;
  DateTime? lastMessageAt;

  factory Conversation.fromJson(Map<String, dynamic> json) {
    final customer = json['customer'] as Map<String, dynamic>?;
    final phone = _string(json['customerPhone'], _string(customer?['phone']));
    return Conversation(
      id: _string(json['id']),
      customerId: (json['customerId'] ?? customer?['id']) as String?,
      // A customer who has never given a name is shown by number rather than
      // as "Unknown", which tells the agent nothing they can act on.
      customerName: _string(customer?['name'], phone.isEmpty ? 'Unknown' : phone),
      customerPhone: phone,
      status: _string(json['status'], 'OPEN'),
      unreadCount: (json['unreadCount'] as num?)?.toInt() ?? 0,
      botActive: json['botActive'] != false,
      lastMessageText: json['lastMessageText'] as String?,
      lastMessageAt: _date(json['lastMessageAt']),
    );
  }

  /// Initials for the avatar, from a name or failing that a number.
  String get initials {
    final parts = customerName.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts.first.characters(2);
    return '${parts.first.characters(1)}${parts.last.characters(1)}';
  }
}

extension on String {
  String characters(int n) => length <= n ? toUpperCase() : substring(0, n).toUpperCase();
}

enum MessageDirection { inbound, outbound, bot }

class Message {
  const Message({
    required this.id,
    required this.content,
    required this.direction,
    required this.type,
    required this.status,
    required this.createdAt,
    this.mediaUrl,
    this.translation,
    this.rawJson,
  });

  final String id;
  final String content;
  final MessageDirection direction;
  final String type;
  final String status;
  final DateTime createdAt;
  final String? mediaUrl;

  /// Filled in on demand; never sent by the server.
  final String? translation;

  /// Retains the raw server JSON payload for rich templates/interactives.
  final Map<String, dynamic>? rawJson;

  bool get isMine => direction != MessageDirection.inbound;

  /// The kind, upper-cased.
  ///
  /// The database holds both `IMAGE` and `image` — a case-sensitive
  /// comparison silently rendered one of those as a plain text bubble with no
  /// picture in it.
  String get kind => type.toUpperCase();

  bool get isImage => kind == 'IMAGE' || kind == 'STICKER';
  bool get isAudio => kind == 'AUDIO' || kind == 'VOICE' || kind == 'PTT';
  bool get isVideo => kind == 'VIDEO';
  bool get isDocument => kind == 'DOCUMENT';
  bool get isLocation => kind == 'LOCATION';
  bool get isTemplate => kind == 'TEMPLATE' || kind == 'HSM' || kind == 'INTERACTIVE' || kind == 'BUTTON';

  /// An absolute address for the media, or null if there is nothing to show.
  ///
  /// Three shapes arrive here. A relative path needs the host putting back on
  /// — an `Image.network` given `/api/media/x.jpg` has no idea which server
  /// that is. An absolute URL passes through. And some rows hold a bare
  /// WhatsApp media id from before attachments were downloaded and stored:
  /// those cannot be fetched at all, so they return null and the bubble says
  /// so rather than showing a broken frame.
  String? resolvedMedia(String baseUrl) {
    var url = mediaUrl?.trim();
    if (url == null || url.isEmpty) return null;
    if (url.startsWith('file://')) {
      url = url.replaceFirst(RegExp(r'^file://+'), '/');
    }
    if (url.contains('file:')) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      final parsed = Uri.tryParse(url);
      return (parsed != null && parsed.hasAuthority && parsed.host.isNotEmpty) ? url : null;
    }
    final effectiveBase = (baseUrl.trim().isEmpty || !baseUrl.trim().startsWith('http'))
        ? 'https://app.fizmoh.cloud'
        : baseUrl.trim().replaceAll(RegExp(r'/$'), '');
    final cleanUrl = url.startsWith('/') ? url : '/$url';
    final fullUrl = '$effectiveBase$cleanUrl';
    final parsed = Uri.tryParse(fullUrl);
    if (parsed == null || !parsed.hasAuthority || parsed.host.isEmpty) return null;
    return fullUrl;
  }

  Map<String, dynamic>? get parsedPayload {
    if (rawJson != null) return rawJson;
    final trimmed = content.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        final decoded = jsonDecode(trimmed);
        if (decoded is Map<String, dynamic>) return decoded;
      } catch (_) {}
    }
    return null;
  }

  String? get templateHeaderImage {
    final payload = parsedPayload;
    if (payload != null) {
      final direct = payload['headerUrl'] ?? payload['header_url'] ?? payload['image'] ?? payload['mediaUrl'] ?? payload['header_image'];
      if (direct is String && direct.isNotEmpty) return direct;

      final template = payload['template'];
      if (template is Map<String, dynamic>) {
        final components = template['components'] as List<dynamic>?;
        if (components != null) {
          for (final c in components) {
            if (c is Map<String, dynamic> && c['type'] == 'HEADER') {
              final img = c['image'];
              if (img is Map<String, dynamic>) {
                final link = img['link'] as String?;
                if (link != null && link.isNotEmpty) return link;
              }
              final video = c['video'];
              if (video is Map<String, dynamic>) {
                final link = video['link'] as String?;
                if (link != null && link.isNotEmpty) return link;
              }
            }
          }
        }
      }

      final interactive = payload['interactive'];
      if (interactive is Map<String, dynamic>) {
        final header = interactive['header'];
        if (header is Map<String, dynamic>) {
          final img = header['image'];
          if (img is Map<String, dynamic>) {
            final link = img['link'] as String?;
            if (link != null && link.isNotEmpty) return link;
          }
        }
      }
    }
    return mediaUrl;
  }

  List<Map<String, dynamic>> get templateCardsList {
    final payload = parsedPayload;
    if (payload == null) return [];

    List<dynamic>? rawList = payload['cards'] as List<dynamic>? ?? payload['carousel'] as List<dynamic>?;

    if (rawList == null) {
      final template = payload['template'];
      if (template is Map<String, dynamic>) {
        final components = template['components'] as List<dynamic>?;
        if (components != null) {
          for (final c in components) {
            if (c is Map<String, dynamic> && c['type'] == 'CAROUSEL') {
              rawList = c['cards'] as List<dynamic>?;
              break;
            }
          }
        }
      }
    }

    if (rawList == null) return [];

    final result = <Map<String, dynamic>>[];
    for (final item in rawList) {
      if (item is Map<String, dynamic>) {
        String? img;
        String title = '';
        String body = '';

        final components = item['components'] as List<dynamic>?;
        if (components != null) {
          for (final c in components) {
            if (c is Map<String, dynamic>) {
              if (c['type'] == 'HEADER' && c['image'] is Map) {
                img = c['image']['link'] as String?;
              }
              if (c['type'] == 'BODY') {
                body = c['text'] as String? ?? '';
              }
            }
          }
        }
        img ??= item['image'] as String? ?? item['media'] as String? ?? item['header'] as String?;
        title = item['title'] as String? ?? item['header'] as String? ?? title;
        body = body.isNotEmpty ? body : (item['body'] as String? ?? item['text'] as String? ?? '');

        result.add({
          'image': img,
          'title': title,
          'body': body,
        });
      }
    }
    return result;
  }

  List<Map<String, dynamic>> get templateButtonsList {
    final payload = parsedPayload;
    if (payload == null) return [];

    List<dynamic>? rawButtons = payload['buttons'] as List<dynamic>?;

    if (rawButtons == null) {
      final template = payload['template'];
      if (template is Map<String, dynamic>) {
        final components = template['components'] as List<dynamic>?;
        if (components != null) {
          for (final c in components) {
            if (c is Map<String, dynamic> && (c['type'] == 'BUTTONS' || c['type'] == 'ACTION')) {
              rawButtons = c['buttons'] as List<dynamic>?;
              break;
            }
          }
        }
      }
    }

    if (rawButtons == null) {
      final interactive = payload['interactive'];
      if (interactive is Map<String, dynamic>) {
        final action = interactive['action'];
        if (action is Map<String, dynamic>) {
          rawButtons = action['buttons'] as List<dynamic>?;
        }
      }
    }

    if (rawButtons == null) return [];

    final result = <Map<String, dynamic>>[];
    for (final b in rawButtons) {
      if (b is Map<String, dynamic>) {
        final text = b['text'] as String? ?? b['label'] as String? ?? (b['reply'] is Map ? b['reply']['title'] as String? : null) ?? 'Action';
        final url = b['url'] as String?;
        result.add({'text': text, 'url': url});
      }
    }
    return result;
  }

  Message withTranslation(String value) => Message(
        id: id, content: content, direction: direction, type: type,
        status: status, createdAt: createdAt, mediaUrl: mediaUrl, translation: value,
        rawJson: rawJson,
      );

  factory Message.fromJson(Map<String, dynamic> json) {
    final raw = _string(json['direction'], 'INBOUND').toUpperCase();
    return Message(
      id: _string(json['id']),
      content: _string(json['content']),
      direction: raw == 'INBOUND'
          ? MessageDirection.inbound
          : raw == 'BOT'
              ? MessageDirection.bot
              : MessageDirection.outbound,
      type: _string(json['type'], 'TEXT'),
      status: _string(json['status'], 'SENT'),
      createdAt: _date(json['createdAt']) ?? DateTime.now(),
      mediaUrl: json['mediaUrl'] as String?,
      rawJson: json,
    );
  }

  /// An optimistic message, shown the instant Send is pressed.
  ///
  /// Waiting for the server before drawing it makes the app feel slow on a
  /// poor connection, which is exactly when it matters most.
  factory Message.pending(String text) => Message(
        id: 'pending-${DateTime.now().microsecondsSinceEpoch}',
        content: text,
        direction: MessageDirection.outbound,
        type: 'TEXT',
        status: 'PENDING',
        createdAt: DateTime.now(),
      );

  /// A message sitting in the outbox, waiting for a connection.
  ///
  /// Distinct from PENDING, which means "sent, awaiting the server's answer".
  /// QUEUED means the server has not been reached at all — the message is
  /// safe on disk and will go out by itself, and the bubble should say so
  /// rather than showing a spinner that never resolves.
  factory Message.queued({
    required String id,
    required String text,
    required DateTime createdAt,
  }) =>
      Message(
        id: id,
        content: text,
        direction: MessageDirection.outbound,
        type: 'TEXT',
        status: 'QUEUED',
        createdAt: createdAt,
      );
}

class CannedResponse {
  const CannedResponse({required this.title, required this.content, required this.category});

  final String title;
  final String content;
  final String category;

  factory CannedResponse.fromJson(Map<String, dynamic> json) => CannedResponse(
        title: _string(json['title'], 'Reply'),
        content: _string(json['content']),
        category: _string(json['category'], 'General'),
      );
}

class Order {
  const Order({
    required this.id,
    required this.orderNumber,
    required this.customerName,
    required this.customerPhone,
    required this.tourName,
    required this.orderStatus,
    required this.paymentStatus,
    required this.total,
    required this.adults,
    required this.children,
    required this.infants,
    this.departsAt,
    this.startTime,
    this.city,
  });

  final String id;
  final String orderNumber;
  final String customerName;
  final String customerPhone;
  final String tourName;
  final String orderStatus;
  final String paymentStatus;
  final double total;
  final int adults;
  final int children;
  final int infants;
  final DateTime? departsAt;
  final String? startTime;
  final String? city;

  factory Order.fromJson(Map<String, dynamic> json) {
    final tour = json['tour'] as Map<String, dynamic>?;
    final slot = json['slot'] as Map<String, dynamic>?;
    return Order(
      id: _string(json['id']),
      orderNumber: _string(json['orderNumber']),
      customerName: _string(json['customerName'], 'Guest'),
      customerPhone: _string(json['customerPhone']),
      tourName: _string(tour?['name'], 'Tour'),
      orderStatus: _string(json['orderStatus'], 'PENDING_PAYMENT'),
      paymentStatus: _string(json['paymentStatus'], 'PENDING'),
      total: (json['totalAmount'] as num?)?.toDouble() ?? 0,
      adults: (json['paxAdult'] as num?)?.toInt() ?? 1,
      children: (json['paxChild'] as num?)?.toInt() ?? 0,
      infants: (json['paxInfant'] as num?)?.toInt() ?? 0,
      departsAt: _date(slot?['date']),
      startTime: slot?['startTime'] as String?,
      city: tour?['city'] as String?,
    );
  }

  String get party {
    final parts = <String>['$adults adult${adults == 1 ? '' : 's'}'];
    if (children > 0) parts.add('$children child${children == 1 ? '' : 'ren'}');
    if (infants > 0) parts.add('$infants infant${infants == 1 ? '' : 's'}');
    return parts.join(', ');
  }
}

class PendingPayment {
  const PendingPayment({
    required this.id,
    required this.orderId,
    required this.orderNumber,
    required this.customerName,
    required this.amount,
    required this.method,
    this.proofUrl,
    this.reference,
  });

  final String id;
  final String orderId;
  final String orderNumber;
  final String customerName;
  final double amount;
  final String method;
  final String? proofUrl;
  final String? reference;

  factory PendingPayment.fromJson(Map<String, dynamic> json) {
    final order = json['order'] as Map<String, dynamic>?;
    return PendingPayment(
      id: _string(json['id']),
      orderId: _string(json['orderId']),
      orderNumber: _string(order?['orderNumber']),
      customerName: _string(order?['customerName'], 'Guest'),
      amount: (json['amount'] as num?)?.toDouble() ?? 0,
      method: _string(json['method'], 'BANK_TRANSFER'),
      proofUrl: json['proofUrl'] as String? ?? json['screenshotUrl'] as String?,
      reference: json['reference'] as String?,
    );
  }
}

class Note {
  const Note({required this.content, required this.author, required this.createdAt});

  final String content;
  final String author;
  final DateTime createdAt;

  factory Note.fromJson(Map<String, dynamic> json) => Note(
        content: _string(json['content']),
        author: _string((json['staff'] as Map<String, dynamic>?)?['name'], 'Staff'),
        createdAt: _date(json['createdAt']) ?? DateTime.now(),
      );
}

/// A thread and everything that came with it.
class ConversationDetail {
  const ConversationDetail({
    required this.messages,
    required this.notes,
    required this.sessionOpen,
    required this.hoursLeft,
  });

  final List<Message> messages;
  final List<Note> notes;
  final bool sessionOpen;
  final int hoursLeft;
}

class Subscriber {
  const Subscriber({
    required this.id,
    required this.name,
    required this.phone,
    required this.whatsappOptIn,
    required this.emailOptIn,
    required this.tags,
    this.email,
    this.preferredLang = 'en',
  });

  final String id;
  final String name;
  final String phone;
  final String? email;
  final bool whatsappOptIn;
  final bool emailOptIn;
  final List<String> tags;

  /// Which language they write in. Carried so the editor shows what is stored
  /// rather than resetting everybody to English on the first save.
  final String preferredLang;

  factory Subscriber.fromJson(Map<String, dynamic> json) => Subscriber(
        id: _string(json['id']),
        name: _string(json['name'], _string(json['phone'], 'Unknown')),
        phone: _string(json['phone']),
        preferredLang: _string(json['preferredLang'], 'en'),
        email: json['email'] as String?,
        whatsappOptIn: json['whatsappOptIn'] != false,
        emailOptIn: json['emailOptIn'] == true,
        tags: parseStringList(json['tags']),
      );
}

/// Tags and labels arrive either as a real list or as a JSON string in a
/// column, depending on which endpoint produced them.
List<String> parseStringList(dynamic value) {
  if (value == null) return const [];
  if (value is List) return value.map((v) => v.toString()).toList();
  if (value is String) {
    try {
      final decoded = jsonDecode(value);
      return decoded is List ? decoded.map((v) => v.toString()).toList() : const [];
    } catch (_) {
      return const [];
    }
  }
  return const [];
}

class Label {
  const Label({required this.name, required this.conversations, required this.customers});

  final String name;
  final int conversations;
  final int customers;

  int get total => conversations + customers;

  factory Label.fromJson(Map<String, dynamic> json) => Label(
        name: _string(json['name']),
        conversations: (json['conversations'] as num?)?.toInt() ?? 0,
        customers: (json['customers'] as num?)?.toInt() ?? 0,
      );
}

class CallRecord {
  const CallRecord({
    required this.id,
    required this.conversationId,
    required this.customerName,
    required this.customerPhone,
    required this.summary,
    required this.at,
    required this.inbound,
  });

  final String id;
  final String conversationId;
  final String customerName;
  final String customerPhone;
  final String summary;
  final DateTime at;
  final bool inbound;

  factory CallRecord.fromJson(Map<String, dynamic> json) => CallRecord(
        id: _string(json['id']),
        conversationId: _string(json['conversationId']),
        customerName: _string(json['customerName'], 'Unknown'),
        customerPhone: _string(json['customerPhone']),
        summary: _string(json['summary']),
        at: _date(json['at']) ?? DateTime.now(),
        inbound: _string(json['direction'], 'INBOUND').toUpperCase() == 'INBOUND',
      );
}

/// Whether calling is available, and what to do when it is not.
class CallingStatus {
  const CallingStatus({required this.enabled, required this.known, this.reason, this.fallbackNumber});

  final bool enabled;
  final bool known;
  final String? reason;
  final String? fallbackNumber;

  factory CallingStatus.fromJson(Map<String, dynamic> json) => CallingStatus(
        enabled: json['enabled'] == true,
        known: json['known'] == true,
        reason: json['reason'] as String?,
        fallbackNumber: json['fallbackNumber'] as String?,
      );
}

/// One event off the server-sent stream.
class RealtimeEvent {
  const RealtimeEvent(this.type, this.data);

  final String type;
  final Map<String, dynamic> data;

  String? get conversationId => data['conversationId'] as String?;
}


/// An approved WhatsApp template.
///
/// The only thing that reaches a customer once the 24-hour window has closed,
/// which is why the app cares about `status`: an unapproved template is not a
/// template, it is a message that will be rejected.
class MessageTemplate {
  const MessageTemplate({
    required this.id,
    required this.name,
    required this.language,
    required this.category,
    required this.status,
    required this.body,
    required this.headerType,
    required this.cards,
    this.header,
    this.footer,
  });

  final String id;
  final String name;
  final String language;
  final String category;
  final String status;
  final String body;

  /// NONE, TEXT, IMAGE, VIDEO or DOCUMENT. Anything but the first two means
  /// the send needs a file, and Meta rejects the message without one.
  final String headerType;

  /// The carousel's cards, when it is one. Each needs its own media.
  final List<TemplateCard> cards;

  final String? header;
  final String? footer;

  /// Whether this template cannot be sent until a file is attached.
  bool get needsHeaderMedia =>
      const {'IMAGE', 'VIDEO', 'DOCUMENT'}.contains(headerType.toUpperCase());

  /// The kind of file the header wants, in the words the upload API uses.
  String get headerMediaType => headerType.toLowerCase();

  bool get isCarousel => cards.isNotEmpty;

  bool get approved => status.toUpperCase() == 'APPROVED';

  /// The placeholders Meta expects filled, in order: {{1}}, {{2}}…
  ///
  /// Read off the body rather than the stored variable list, because the body
  /// is what Meta validates against and the two can drift.
  List<int> get placeholders {
    final found = RegExp(r'\{\{\s*(\d+)\s*\}\}')
        .allMatches(body)
        .map((m) => int.parse(m.group(1)!))
        .toSet()
        .toList()
      ..sort();
    return found;
  }

  /// The body with the placeholders replaced, for the preview an agent reads
  /// before sending something they cannot take back.
  String filled(List<String> values) {
    var text = body;
    for (var i = 0; i < values.length; i++) {
      final slot = RegExp('\\{\\{\\s*${i + 1}\\s*\\}\\}');
      text = text.replaceAll(slot, values[i].isEmpty ? '{{${i + 1}}}' : values[i]);
    }
    return text;
  }

  factory MessageTemplate.fromJson(Map<String, dynamic> json) => MessageTemplate(
        id: _string(json['id']),
        name: _string(json['name']),
        language: _string(json['language'], 'en_US'),
        category: _string(json['category'], 'UTILITY'),
        status: _string(json['status'], 'DRAFT'),
        body: _string(json['bodyContent']),
        headerType: _string(json['headerType'], 'NONE'),
        cards: _jsonList(json['cards'])
            .whereType<Map<String, dynamic>>()
            .map(TemplateCard.fromJson)
            .toList(),
        header: json['headerContent'] as String?,
        footer: json['footerContent'] as String?,
      );
}

/// One card of a carousel template.
class TemplateCard {
  const TemplateCard({required this.body, required this.buttons, this.imageUrl});

  final String body;
  final List<String> buttons;

  /// The image the template was approved with. It is a sample, not the thing
  /// that gets sent — Meta wants a fresh file per send.
  final String? imageUrl;

  List<int> get placeholders {
    final found = RegExp(r'\{\{\s*(\d+)\s*\}\}')
        .allMatches(body)
        .map((m) => int.parse(m.group(1)!))
        .toSet()
        .toList()
      ..sort();
    return found;
  }

  String filled(List<String> values) {
    var text = body;
    for (var i = 0; i < values.length; i++) {
      text = text.replaceAll(RegExp('\\{\\{\\s*${i + 1}\\s*\\}\\}'),
          values[i].isEmpty ? '{{${i + 1}}}' : values[i]);
    }
    return text;
  }

  factory TemplateCard.fromJson(Map<String, dynamic> json) => TemplateCard(
        body: _string(json['body']),
        imageUrl: json['imageUrl'] as String?,
        buttons: ((json['buttons'] as List?) ?? const [])
            .whereType<Map<String, dynamic>>()
            .map((b) => _string(b['text'], 'Button'))
            .toList(),
      );
}

/// Prisma's Json columns arrive either decoded or as a string, depending on
/// how they were written. Both shapes have been seen in this database.
List<dynamic> _jsonList(dynamic value) {
  if (value is List) return value;
  if (value is String && value.trim().isNotEmpty) {
    try {
      final parsed = jsonDecode(value);
      if (parsed is List) return parsed;
    } catch (_) {}
  }
  return const [];
}

/// Everything known about the person on the other end.
class CustomerProfile {
  const CustomerProfile({
    required this.id,
    required this.name,
    required this.phone,
    required this.orders,
    required this.totalSpent,
    required this.loyaltyTier,
    required this.loyaltyPoints,
    this.email,
    this.preferredLang = 'en',
    this.tags = const [],
    this.optedOut = false,
    this.since,
  });

  final String id;
  final String name;
  final String phone;
  final List<Order> orders;
  final double totalSpent;
  final String loyaltyTier;
  final int loyaltyPoints;
  final String? email;
  final String preferredLang;
  final List<String> tags;
  final bool optedOut;
  final DateTime? since;

  factory CustomerProfile.fromJson(Map<String, dynamic> json) {
    final orders = ((json['orders'] as List?) ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(Order.fromJson)
        .toList();
    final tags = ((json['tags'] as List?) ?? const []).map((t) => t.toString()).toList();
    return CustomerProfile(
      id: _string(json['id']),
      name: _string(json['name'], _string(json['phone'])),
      phone: _string(json['phone']),
      email: json['email'] as String?,
      orders: orders,
      // The stored total is a running figure the server keeps; the order list
      // may be truncated, so it is not recomputed here from what arrived.
      totalSpent: (json['totalSpent'] as num?)?.toDouble() ?? 0,
      loyaltyTier: _string(json['loyaltyTier'], 'BRONZE'),
      loyaltyPoints: (json['loyaltyPoints'] as num?)?.toInt() ?? 0,
      preferredLang: _string(json['preferredLang'], 'en'),
      tags: tags,
      optedOut: json['whatsappOptIn'] == false || json['optOutAt'] != null,
      since: _date(json['createdAt']),
    );
  }

  CustomerProfile copyWith({
    String? id,
    String? name,
    String? phone,
    List<Order>? orders,
    double? totalSpent,
    String? loyaltyTier,
    int? loyaltyPoints,
    String? email,
    String? preferredLang,
    List<String>? tags,
    bool? optedOut,
    DateTime? since,
  }) {
    return CustomerProfile(
      id: id ?? this.id,
      name: name ?? this.name,
      phone: phone ?? this.phone,
      orders: orders ?? this.orders,
      totalSpent: totalSpent ?? this.totalSpent,
      loyaltyTier: loyaltyTier ?? this.loyaltyTier,
      loyaltyPoints: loyaltyPoints ?? this.loyaltyPoints,
      email: email ?? this.email,
      preferredLang: preferredLang ?? this.preferredLang,
      tags: tags ?? this.tags,
      optedOut: optedOut ?? this.optedOut,
      since: since ?? this.since,
    );
  }
}


/// One booking, in full.
///
/// The list view carries what an agent scans; this carries what they need when
/// somebody is on the phone asking a question about it — money, seats, pickup,
/// the voucher, and who changed what.
class OrderDetail {
  const OrderDetail({
    required this.id,
    required this.orderNumber,
    required this.orderStatus,
    required this.paymentStatus,
    required this.paymentMethod,
    required this.channel,
    required this.customerName,
    required this.customerPhone,
    required this.tourName,
    required this.adults,
    required this.children,
    required this.infants,
    required this.subtotal,
    required this.discount,
    required this.tax,
    required this.total,
    required this.payments,
    required this.vouchers,
    required this.history,
    required this.createdAt,
    this.customerId,
    this.customerEmail,
    this.tourCity,
    this.departsAt,
    this.startTime,
    this.endTime,
    this.pickupLocation,
    this.specialRequests,
    this.couponCode,
    this.confirmedAt,
    this.completedAt,
    this.cancelledAt,
    this.cancelReason,
  });

  final String id;
  final String orderNumber;
  final String orderStatus;
  final String paymentStatus;
  final String paymentMethod;
  final String channel;

  final String? customerId;
  final String customerName;
  final String customerPhone;
  final String? customerEmail;

  final String tourName;
  final String? tourCity;
  final DateTime? departsAt;
  final String? startTime;
  final String? endTime;

  final int adults;
  final int children;
  final int infants;

  final double subtotal;
  final double discount;
  final double tax;
  final double total;
  final String? couponCode;

  final String? pickupLocation;
  final String? specialRequests;

  final List<PaymentLine> payments;
  final List<VoucherLine> vouchers;
  final List<OrderEvent> history;

  final DateTime createdAt;
  final DateTime? confirmedAt;
  final DateTime? completedAt;
  final DateTime? cancelledAt;
  final String? cancelReason;

  int get seats => adults + children;

  String get party {
    final parts = <String>['$adults adult${adults == 1 ? '' : 's'}'];
    if (children > 0) parts.add('$children child${children == 1 ? '' : 'ren'}');
    if (infants > 0) parts.add('$infants infant${infants == 1 ? '' : 's'}');
    return parts.join(', ');
  }

  /// What has actually been taken, which is not always what is owed.
  double get paid => payments
      .where((p) => const {'PAID', 'VERIFIED', 'APPROVED'}.contains(p.status.toUpperCase()))
      .fold(0.0, (sum, p) => sum + p.amount);

  double get outstanding => (total - paid).clamp(0, double.infinity);

  factory OrderDetail.fromJson(Map<String, dynamic> json) {
    final tour = json['tour'] as Map<String, dynamic>?;
    final slot = json['slot'] as Map<String, dynamic>?;
    final customer = json['customer'] as Map<String, dynamic>?;
    return OrderDetail(
      id: _string(json['id']),
      orderNumber: _string(json['orderNumber']),
      orderStatus: _string(json['orderStatus'], 'PENDING_PAYMENT'),
      paymentStatus: _string(json['paymentStatus'], 'PENDING'),
      paymentMethod: _string(json['paymentMethod'], 'UNKNOWN'),
      channel: _string(json['channel'], 'WEB'),
      customerId: (json['customerId'] ?? customer?['id']) as String?,
      customerName: _string(json['customerName'], _string(customer?['name'], 'Guest')),
      customerPhone: _string(json['customerPhone'], _string(customer?['phone'])),
      customerEmail: (json['customerEmail'] ?? customer?['email']) as String?,
      tourName: _string(tour?['name'], 'Tour'),
      tourCity: tour?['city'] as String?,
      departsAt: _date(slot?['date']),
      startTime: slot?['startTime'] as String?,
      endTime: slot?['endTime'] as String?,
      adults: (json['paxAdult'] as num?)?.toInt() ?? 1,
      children: (json['paxChild'] as num?)?.toInt() ?? 0,
      infants: (json['paxInfant'] as num?)?.toInt() ?? 0,
      subtotal: (json['subtotal'] as num?)?.toDouble() ?? 0,
      discount: (json['discount'] as num?)?.toDouble() ?? 0,
      tax: (json['taxAmount'] as num?)?.toDouble() ?? 0,
      total: (json['totalAmount'] as num?)?.toDouble() ?? 0,
      couponCode: json['couponCode'] as String?,
      pickupLocation: json['pickupLocation'] as String?,
      specialRequests: json['specialRequests'] as String?,
      payments: ((json['payments'] as List?) ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(PaymentLine.fromJson)
          .toList(),
      vouchers: ((json['vouchers'] as List?) ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(VoucherLine.fromJson)
          .toList(),
      history: ((json['auditLogs'] as List?) ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(OrderEvent.fromJson)
          .toList(),
      createdAt: _date(json['createdAt']) ?? DateTime.now(),
      confirmedAt: _date(json['confirmedAt']),
      completedAt: _date(json['completedAt']),
      cancelledAt: _date(json['cancelledAt']),
      cancelReason: json['cancelReason'] as String?,
    );
  }
}

class PaymentLine {
  const PaymentLine({
    required this.id,
    required this.method,
    required this.amount,
    required this.status,
    required this.createdAt,
    this.reference,
    this.bankName,
    this.proofUrl,
    this.rejectionReason,
  });

  final String id;
  final String method;
  final double amount;
  final String status;
  final DateTime createdAt;
  final String? reference;
  final String? bankName;
  final String? proofUrl;
  final String? rejectionReason;

  factory PaymentLine.fromJson(Map<String, dynamic> json) => PaymentLine(
        id: _string(json['id']),
        method: _string(json['method'], 'UNKNOWN'),
        amount: (json['amount'] as num?)?.toDouble() ?? 0,
        status: _string(json['status'], 'PENDING'),
        createdAt: _date(json['createdAt']) ?? DateTime.now(),
        reference: (json['gatewayReference'] ?? json['bankReference']) as String?,
        bankName: json['bankName'] as String?,
        proofUrl: json['screenshotUrl'] as String?,
        rejectionReason: json['rejectionReason'] as String?,
      );
}

class VoucherLine {
  const VoucherLine({
    required this.code,
    required this.status,
    this.checkedInAt,
    this.pdfUrl,
  });

  final String code;
  final String status;
  final DateTime? checkedInAt;
  final String? pdfUrl;

  factory VoucherLine.fromJson(Map<String, dynamic> json) => VoucherLine(
        code: _string(json['voucherCode']),
        status: _string(json['status'], 'VALID'),
        checkedInAt: _date(json['checkedInAt']),
        pdfUrl: json['pdfUrl'] as String?,
      );
}

/// Something that happened to a booking, and who did it.
class OrderEvent {
  const OrderEvent({required this.action, required this.at, this.by, this.detail});

  final String action;
  final DateTime at;
  final String? by;
  final String? detail;

  factory OrderEvent.fromJson(Map<String, dynamic> json) {
    final staff = json['staff'] as Map<String, dynamic>?;
    return OrderEvent(
      action: _string(json['action'], 'CHANGED'),
      at: _date(json['createdAt']) ?? DateTime.now(),
      by: staff?['name'] as String?,
      detail: json['details'] as String? ?? json['reason'] as String?,
    );
  }
}


/// One kind of alert, and whether it is switched on.
class NotificationType {
  const NotificationType({
    required this.key,
    required this.label,
    required this.description,
    required this.enabled,
  });

  final String key;
  final String label;
  final String description;
  final bool enabled;

  NotificationType copyWith({bool? enabled}) => NotificationType(
        key: key, label: label, description: description, enabled: enabled ?? this.enabled,
      );

  factory NotificationType.fromJson(Map<String, dynamic> json) => NotificationType(
        key: _string(json['key']),
        label: _string(json['label'], 'Alert'),
        description: _string(json['description']),
        enabled: json['enabled'] != false,
      );
}

/// A phone that is signed into this account.
class RegisteredDevice {
  const RegisteredDevice({
    required this.id,
    required this.platform,
    required this.kind,
    required this.lastSeenAt,
    this.appVersion,
  });

  final String id;
  final String platform;

  /// ALERT for notifications, VOIP for calls. One phone registers both, which
  /// is why the same device can appear twice.
  final String kind;
  final DateTime lastSeenAt;
  final String? appVersion;

  factory RegisteredDevice.fromJson(Map<String, dynamic> json) => RegisteredDevice(
        id: _string(json['id']),
        platform: _string(json['platform'], 'IOS'),
        kind: _string(json['kind'], 'ALERT'),
        lastSeenAt: _date(json['lastSeenAt']) ?? DateTime.now(),
        appVersion: json['appVersion'] as String?,
      );
}


/// A business this person belongs to.
///
/// Only interesting when there is more than one — see ApiClient.workspaces.
class Workspace {
  const Workspace({
    required this.id,
    required this.slug,
    required this.name,
    required this.role,
    required this.status,
    this.plan = 'PRO',
    this.modules = const ['INBOX', 'TOURS', 'PAYMENTS', 'AI', 'CALLS', 'BROADCAST'],
  });

  final String id;
  final String slug;
  final String name;
  final String role;
  final String status;
  final String plan;
  final List<String> modules;

  bool get suspended => status == 'SUSPENDED';

  // ── Plan Module Entitlements ──
  bool hasModule(String module) {
    if (modules.isEmpty) return true;
    return modules.map((m) => m.toUpperCase()).contains(module.toUpperCase());
  }

  bool get supportsAiBot => hasModule('AI');
  bool get supportsVoipCalls => hasModule('CALLS');
  bool get supportsPayments => hasModule('PAYMENTS');
  bool get supportsBroadcast => hasModule('BROADCAST');
  bool get supportsTours => hasModule('TOURS');

  factory Workspace.fromJson(Map<String, dynamic> json) {
    final rawModules = (json['modules'] as List?)?.map((e) => e.toString()).toList() ??
        const ['INBOX', 'TOURS', 'PAYMENTS', 'AI', 'CALLS', 'BROADCAST'];
    return Workspace(
      id: json['id']?.toString() ?? '',
      slug: json['slug']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      role: json['role']?.toString() ?? '',
      status: json['status']?.toString() ?? 'ACTIVE',
      plan: json['plan']?.toString().toUpperCase() ?? 'PRO',
      modules: rawModules,
    );
  }
}
