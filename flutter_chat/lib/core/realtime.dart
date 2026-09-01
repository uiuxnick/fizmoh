import 'dart:async';
import 'models.dart';
import 'realtime_stub.dart'
    if (dart.library.js_interop) 'realtime_web.dart'
    if (dart.library.io) 'realtime_io.dart';

/// A live connection to the server's event stream.
///
/// Server-sent events rather than websockets, because the server already
/// speaks SSE to the admin panel and a second transport would be a second
/// thing to keep working. SSE is one-way, which is all this needs: messages go
/// out over ordinary requests.
///
/// The two implementations exist because the browser has EventSource built in
/// and native platforms do not. On the web, EventSource also reconnects by
/// itself; the native client has to do that here.
abstract class RealtimeConnection {
  Stream<RealtimeEvent> get events;

  /// Whether the stream is currently up. Drives the "reconnecting" strip —
  /// an operator needs to know when they are looking at stale messages.
  Stream<bool> get connected;

  void close();
}

RealtimeConnection connectRealtime({required String baseUrl, required String token}) =>
    createConnection(baseUrl: baseUrl, token: token);

/// Parses the SSE wire format: blank-line-separated blocks of `field: value`.
///
/// Shared by both implementations so a malformed frame behaves identically on
/// every platform.
class SseParser {
  final StringBuffer _data = StringBuffer();
  String? _event;

  /// Feeds one line in; returns an event when a block completes.
  RealtimeEvent? line(String raw) {
    final line = raw.endsWith('\r') ? raw.substring(0, raw.length - 1) : raw;

    if (line.isEmpty) {
      final payload = _data.toString();
      final type = _event ?? 'message';
      _data.clear();
      _event = null;
      if (payload.isEmpty) return null;
      return decode(type, payload);
    }

    // A comment. The server sends these as a heartbeat to stop proxies
    // dropping an idle connection.
    if (line.startsWith(':')) return null;

    final separator = line.indexOf(':');
    if (separator < 0) return null;
    final field = line.substring(0, separator);
    final value = line.substring(separator + 1).trimLeft();

    switch (field) {
      case 'event':
        _event = value;
      case 'data':
        _data.write(value);
      default:
        // `id` and `retry` are not used here.
        break;
    }
    return null;
  }

  static RealtimeEvent? decode(String type, String payload) {
    if (type == 'ready') return null;
    try {
      final data = jsonDecodeMap(payload);
      return RealtimeEvent(type, data);
    } catch (_) {
      // One bad frame must not take the connection down with it.
      return null;
    }
  }
}

Map<String, dynamic> jsonDecodeMap(String source) {
  final decoded = jsonDecodeRaw(source);
  return decoded is Map<String, dynamic> ? decoded : <String, dynamic>{};
}
