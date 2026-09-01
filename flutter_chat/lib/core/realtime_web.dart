import 'dart:async';
import 'dart:convert';
import 'dart:js_interop';
import 'package:web/web.dart' as web;
import 'models.dart';
import 'realtime.dart';

dynamic jsonDecodeRaw(String source) => jsonDecode(source);

RealtimeConnection createConnection({required String baseUrl, required String token}) =>
    _WebConnection(baseUrl: baseUrl);

/// SSE in the browser, using the platform's own EventSource.
///
/// EventSource cannot carry an Authorization header — the browser API simply
/// has no way to set one. It sends cookies instead, which is why the web build
/// must be served from the same origin as the API: the session cookie set at
/// sign-in then travels with the stream. Passing the token in the query string
/// would work anywhere, and would also write a credential into every proxy log
/// and browser history entry between here and the server.
///
/// The browser also reconnects on its own, so there is no backoff here — only
/// a report of whether the connection is currently up.
class _WebConnection implements RealtimeConnection {
  _WebConnection({required String baseUrl}) {
    _source = web.EventSource(
      '$baseUrl/api/realtime/stream',
      web.EventSourceInit(withCredentials: true),
    );

    _source.onopen = ((web.Event _) => _connected.add(true)).toJS;
    _source.onerror = ((web.Event _) => _connected.add(false)).toJS;

    // Every event type the server emits has to be subscribed to by name:
    // onmessage only fires for frames with no `event:` field, and the server
    // names all of them.
    for (final type in const ['message', 'conversation', 'notification', 'typing', 'call']) {
      _source.addEventListener(
        type,
        ((web.Event event) {
          final payload = (event as web.MessageEvent).data;
          final text = payload.dartify()?.toString();
          if (text == null || text.isEmpty) return;
          final decoded = SseParser.decode(type, text);
          if (decoded != null) _events.add(decoded);
        }).toJS,
      );
    }
  }

  late final web.EventSource _source;
  final _events = StreamController<RealtimeEvent>.broadcast();
  final _connected = StreamController<bool>.broadcast();

  @override
  Stream<RealtimeEvent> get events => _events.stream;

  @override
  Stream<bool> get connected => _connected.stream;

  @override
  void close() {
    _source.close();
    _events.close();
    _connected.close();
  }
}
