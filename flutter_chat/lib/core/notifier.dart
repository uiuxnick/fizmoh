import 'notifier_stub.dart'
    if (dart.library.js_interop) 'notifier_web.dart'
    if (dart.library.io) 'notifier_io.dart';

/// Tells the operator something arrived while they were looking elsewhere.
///
/// A desk notification is the whole point of a realtime inbox: without one,
/// "realtime" only means the message appears quickly on a screen nobody is
/// watching.
abstract class Notifier {
  static final Notifier instance = createNotifier();

  /// Asks the platform for permission, if it needs asking. Called after a
  /// deliberate action rather than on launch — a permission prompt before
  /// anyone has seen the app is usually refused.
  Future<void> requestPermission();

  /// Whether a notification would actually be shown, so the UI can offer to
  /// turn them on rather than silently doing nothing.
  bool get granted;

  /// Whether this platform can show one at all.
  ///
  /// Without this the app offered to "turn on notifications" on iOS, where
  /// pressing the button did nothing whatsoever — an invitation to grant
  /// permission for a feature that is not there yet.
  bool get supported;

  void show({required String title, required String body, String? tag});

  /// The unread count on the tab or dock icon.
  void badge(int count);
}
