import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_chat/core/models.dart';
import 'package:flutter_chat/core/realtime.dart';

void main() {
  group('server-sent event parsing', () {
    test('a complete frame produces an event', () {
      final parser = SseParser();
      expect(parser.line('event: message'), isNull);
      expect(parser.line('data: {"conversationId":"c1","preview":"Hello"}'), isNull);

      // The blank line is what ends a frame; nothing is emitted before it.
      final event = parser.line('');
      expect(event, isNotNull);
      expect(event!.type, 'message');
      expect(event.conversationId, 'c1');
      expect(event.data['preview'], 'Hello');
    });

    test('heartbeat comments are ignored', () {
      // The server sends these every 25 seconds so proxies do not drop an idle
      // connection. Treating one as a frame would emit a null event per ping.
      final parser = SseParser();
      expect(parser.line(': ping'), isNull);
      expect(parser.line(''), isNull);
    });

    test('a malformed payload does not take the stream down', () {
      final parser = SseParser();
      parser.line('event: message');
      parser.line('data: {not json');
      expect(parser.line(''), isNull);

      // And the next frame still parses, which is the point.
      parser.line('event: message');
      parser.line('data: {"conversationId":"c2"}');
      expect(parser.line('')?.conversationId, 'c2');
    });

    test('carriage returns are stripped', () {
      final parser = SseParser();
      parser.line('event: typing\r');
      parser.line('data: {"conversationId":"c3"}\r');
      expect(parser.line('\r')?.type, 'typing');
    });
  });

  group('conversations', () {
    test('a customer with no name is shown by number, not as "Unknown"', () {
      // "Unknown" tells an agent nothing they can act on; a number does.
      final c = Conversation.fromJson({'id': '1', 'customerPhone': '+96890000000'});
      expect(c.customerName, '+96890000000');
    });

    test('initials come from a name when there is one', () {
      final c = Conversation.fromJson({
        'id': '1', 'customerPhone': '+968', 'customer': {'name': 'Emma Johnson'},
      });
      expect(c.initials, 'EJ');
    });

    test('a single-word name still yields two letters', () {
      final c = Conversation.fromJson({'id': '1', 'customer': {'name': 'Emma'}});
      expect(c.initials, 'EM');
    });
  });

  group('messages', () {
    test('direction decides which side the bubble sits on', () {
      expect(Message.fromJson({'direction': 'INBOUND'}).isMine, isFalse);
      expect(Message.fromJson({'direction': 'OUTBOUND'}).isMine, isTrue);
      // A bot reply is ours: the customer sees it as coming from us.
      expect(Message.fromJson({'direction': 'BOT'}).isMine, isTrue);
    });

    test('an unparseable date falls back rather than throwing', () {
      // One bad row must not blank the whole thread.
      final m = Message.fromJson({'id': 'x', 'createdAt': 'not-a-date'});
      expect(m.createdAt, isA<DateTime>());
    });
  });
}
