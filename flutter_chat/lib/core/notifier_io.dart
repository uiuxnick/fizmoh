import 'package:flutter/services.dart';
import 'notifier.dart';

Notifier createNotifier() => _IoNotifier();

/// Mobile and desktop local notifications bridge.
class _IoNotifier implements Notifier {
  static const _channel = MethodChannel('app.fizmoh.inbox/push');
  bool _granted = false;

  @override
  bool get granted => _granted;

  @override
  bool get supported => true;

  @override
  Future<void> requestPermission() async {
    try {
      final res = await _channel.invokeMethod('register');
      if (res != null && res != false) {
        _granted = true;
      }
    } catch (_) {}
  }

  @override
  void show({required String title, required String body, String? tag}) {
    try {
      _channel.invokeMethod('showNotification', {
        'title': title,
        'body': body,
        'conversationId': tag,
      }).catchError((_) => null);
    } catch (_) {}
  }

  @override
  void badge(int count) {
    try {
      _channel.invokeMethod('badge', {'count': count}).catchError((_) => null);
    } catch (_) {}
  }
}
