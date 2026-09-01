import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

import 'api_client.dart';
import 'call_service.dart';

/// The bridge to Apple push.
///
/// No Firebase. Apple is spoken to directly on the server, and the only thing
/// needed here is the device's tokens and the events that come with them —
/// which is a small piece of Swift, not a dependency that carries an analytics
/// SDK and a second copy of the signing key.
///
/// Two tokens, because Apple treats them as two things: an APNs token for
/// notifications, and a PushKit token for calls. A call must wake the app from
/// cold and ring like a phone; a message must not.
class Push {
  Push(this._api, this._calls);

  final ApiClient _api;
  final CallService _calls;

  static const _channel = MethodChannel('app.fizmoh.inbox/push');

  /// Called when a notification is opened, with the conversation it was about.
  void Function(String conversationId)? onOpenConversation;

  String? _alertToken;
  String? _voipToken;

  /// Asks for permission and registers both tokens.
  ///
  /// Called after signing in rather than at launch. A permission prompt on
  /// first launch, before anybody has seen what the app does, is the reliable
  /// way to be refused for ever.
  Future<void> start() async {
    _channel.setMethodCallHandler(_handle);
    try {
      // The token may already be cached natively, in which case it comes back
      // from this call and there is no second callback to wait for.
      final token = await _channel.invokeMethod<String>('register');
      if (token != null && token.isNotEmpty && token != 'pending') {
        _alertToken = token;
        await _register(_alertToken, 'ALERT');
      }
      await _channel.invokeMethod<void>('registerVoip');
    } on MissingPluginException catch (e) {
      // Android, or a platform without this bridge. Nothing to register.
      //
      // Said out loud, because on iOS it is not benign: it means the native
      // side never installed its handler, and silence here once hid a dead
      // push channel for an entire release.
      debugPrint('[Push] No native push bridge — nothing registered ($e)');
    } on PlatformException {
      // Permission refused. The app works; it just stays quiet.
    }
  }

  Future<void> _handle(MethodCall call) async {
    switch (call.method) {
      case 'apnsToken':
        _alertToken = call.arguments as String?;
        await _register(_alertToken, 'ALERT');

      case 'voipToken':
        _voipToken = call.arguments as String?;
        await _register(_voipToken, 'VOIP');

      case 'incomingCall':
        // The device was woken by a call push. Everything needed to answer
        // travelled in the payload, because there are seconds to spare.
        final data = Map<String, dynamic>.from(call.arguments as Map);
        final callId = data['callId']?.toString();
        final offer = data['offer']?.toString();
        if (callId == null || offer == null || offer.isEmpty) return;
        _calls.incoming(
          callId: callId,
          conversationId: data['conversationId']?.toString() ?? '',
          customerName: data['customerName']?.toString() ?? 'Unknown',
          from: data['from']?.toString(),
          offer: offer,
        );

      case 'callAction':
        await _callAction(call.arguments?.toString() ?? '');

      case 'openConversation':
        final id = call.arguments?.toString();
        if (id != null) onOpenConversation?.call(id);
    }
  }

  /// The system's own call UI is the one being tapped when the phone is
  /// locked, so its buttons drive the same service the in-app screen does.
  Future<void> _callAction(String action) async {
    switch (action) {
      case 'answer':
        await _calls.answer();
        // Tells the system the call is up, so its timer starts and the UI
        // stops saying "connecting".
        await _channel.invokeMethod<void>('callAnswered').catchError((_) {});
      case 'end':
      case 'reset':
        await _calls.hangUp();
      case 'mute':
        if (!_calls.muted) await _calls.toggleMute();
      case 'unmute':
        if (_calls.muted) await _calls.toggleMute();
    }
  }

  Future<void> _register(String? token, String kind) async {
    if (token == null || token.isEmpty) return;
    try {
      await _api.registerDevice(token: token, kind: kind);
      debugPrint('[Push] Registered $kind token (${token.substring(0, 8)}…)');
    } catch (e) {
      // A failed registration is not worth interrupting anybody over; the next
      // sign-in tries again. But we do want to see it in the console.
      debugPrint('[Push] Failed to register $kind token: $e');
    }
  }

  /// Re-files this device's tokens under whichever workspace is now current.
  ///
  /// start() registers once, under whatever workspace was current then. A
  /// person who switches business afterwards never re-posted their tokens, so
  /// alerts for the new workspace had no device to reach. The tokens do not
  /// change on a switch — only which workspace they belong to.
  Future<void> reRegister() async {
    await _register(_alertToken, 'ALERT');
    await _register(_voipToken, 'VOIP');
  }

  /// Signing out has to unregister, or this phone keeps receiving the messages
  /// of an account that is no longer on it.
  Future<void> stop() async {
    for (final token in [_alertToken, _voipToken]) {
      if (token == null) continue;
      try {
        await _api.unregisterDevice(token);
      } catch (_) {}
    }
    _alertToken = null;
    _voipToken = null;
  }
}
