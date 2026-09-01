import 'dart:js_interop';
import 'package:web/web.dart' as web;
import 'notifier.dart';

Notifier createNotifier() => _WebNotifier();

/// Browser notifications, and the unread count in the tab title.
class _WebNotifier implements Notifier {
  String? _baseTitle;

  @override
  bool get granted => web.Notification.permission == 'granted';

  @override
  bool get supported => true;

  @override
  Future<void> requestPermission() async {
    if (web.Notification.permission != 'default') return;
    await web.Notification.requestPermission().toDart;
  }

  @override
  void show({required String title, required String body, String? tag}) {
    if (!granted) return;
    // The tag collapses repeats: twenty messages from one customer replace
    // each other rather than stacking twenty notifications on the desktop.
    web.Notification(title, web.NotificationOptions(body: body, tag: tag ?? 'wptour'));
  }

  @override
  void badge(int count) {
    _baseTitle ??= web.document.title;
    web.document.title = count > 0 ? '($count) ${_baseTitle!}' : _baseTitle!;
  }
}
