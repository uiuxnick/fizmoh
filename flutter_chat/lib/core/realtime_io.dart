import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'models.dart';
import 'realtime.dart';

dynamic jsonDecodeRaw(String source) => jsonDecode(source);

RealtimeConnection createConnection({required String baseUrl, required String token}) =>
    _IoConnection(baseUrl: baseUrl, token: token);

/// SSE over a streamed HTTP response, for mobile and desktop.
///
/// Reconnects with a backoff that gives up quickly at first and then backs off
/// — a server restart should be invisible, but a server that is genuinely down
/// should not be hammered by every open client.
class _IoConnection implements RealtimeConnection {
  _IoConnection({required this.baseUrl, required this.token}) {
    _open();
  }

  final String baseUrl;
  final String token;

  final _events = StreamController<RealtimeEvent>.broadcast();
  final _connected = StreamController<bool>.broadcast();
  final _client = http.Client();

  StreamSubscription<String>? _subscription;
  Timer? _retry;
  int _attempt = 0;
  bool _closed = false;

  @override
  Stream<RealtimeEvent> get events => _events.stream;

  @override
  Stream<bool> get connected => _connected.stream;

  Future<void> _open() async {
    if (_closed) return;
    final parser = SseParser();

    try {
      final request = http.Request('GET', Uri.parse('$baseUrl/api/realtime/stream'))
        ..headers['Authorization'] = 'Bearer $token'
        ..headers['Accept'] = 'text/event-stream'
        ..headers['Cache-Control'] = 'no-cache';

      final response = await _client.send(request);
      if (response.statusCode != 200) {
        _scheduleRetry();
        return;
      }

      _attempt = 0;
      _connected.add(true);

      _subscription = response.stream
          .transform(utf8.decoder)
          .transform(const LineSplitter())
          .listen(
        (line) {
          final event = parser.line(line);
          if (event != null) _events.add(event);
        },
        onDone: _scheduleRetry,
        onError: (_) => _scheduleRetry(),
        cancelOnError: true,
      );
    } catch (_) {
      _scheduleRetry();
    }
  }

  void _scheduleRetry() {
    if (_closed) return;
    _connected.add(false);
    _subscription?.cancel();
    _subscription = null;

    // Exponential backoff with random jitter: (2^attempt) + jitter(0..1500ms), capped at 30s.
    final baseSeconds = (1 << _attempt.clamp(0, 5)).clamp(1, 30);
    final jitterMs = DateTime.now().microsecond % 1500;
    final delay = Duration(seconds: baseSeconds, milliseconds: jitterMs);
    _attempt++;
    _retry?.cancel();
    _retry = Timer(delay, _open);
  }

  @override
  void close() {
    _closed = true;
    _retry?.cancel();
    _subscription?.cancel();
    _client.close();
    _events.close();
    _connected.close();
  }
}
