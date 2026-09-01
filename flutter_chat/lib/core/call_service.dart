import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';

import 'api_client.dart';

/// Where a call is, from this device's point of view.
enum CallState { idle, ringing, connecting, active, ending }

/// Answering a WhatsApp call.
///
/// The device is the WebRTC endpoint. Meta sends an SDP offer to the server,
/// the server passes it here, this builds the answer and posts it back, and
/// audio then flows directly between the caller and this phone. No media
/// server sits in between — there is nothing to pay for, scale, or restart at
/// three in the morning, and one fewer hop for the voice to cross.
///
/// The clock is the hard part: Meta allows roughly 30 to 60 seconds from the
/// ring to the accept. Answering has to finish gathering ICE candidates inside
/// that, which is why gathering is bounded rather than waited on indefinitely.
class CallService extends ChangeNotifier {
  CallService(this._api);

  final ApiClient _api;

  CallState state = CallState.idle;
  String? callId;
  String? conversationId;
  String? customerName;
  String? customerPhone;
  String? error;

  bool muted = false;
  bool speaker = true;
  DateTime? connectedAt;

  RTCPeerConnection? _peer;
  MediaStream? _microphone;
  Timer? _ringTimeout;

  bool get busy => state != CallState.idle;

  /// How long the call has been up, for the timer on screen.
  Duration get elapsed =>
      connectedAt == null ? Duration.zero : DateTime.now().difference(connectedAt!);

  /// Public STUN only.
  ///
  /// The other end of this call is Meta's media server, which is on a public
  /// address, so a relay is usually unnecessary. A device on a carrier NAT
  /// that blocks direct paths will need TURN; that is a server to run, so it
  /// is not pretended here — a call that cannot find a path fails visibly.
  static const _iceServers = {
    'iceServers': [
      {'urls': 'stun:stun.l.google.com:19302'},
      {'urls': 'stun:stun1.l.google.com:19302'},
    ],
    'sdpSemantics': 'unified-plan',
  };

  /// A call has started ringing.
  void incoming({
    required String callId,
    required String conversationId,
    required String customerName,
    required String offer,
    String? from,
  }) {
    // One call at a time. A second ring while somebody is talking is not
    // silently swapped in underneath them.
    if (busy) return;

    this.callId = callId;
    this.conversationId = conversationId;
    this.customerName = customerName;
    customerPhone = from;
    _offer = offer;
    error = null;
    state = CallState.ringing;
    notifyListeners();

    // Meta stops accepting an answer after about a minute. Leaving a ringing
    // screen up past that offers a button that cannot work.
    _ringTimeout = Timer(const Duration(seconds: 55), () {
      if (state == CallState.ringing) _reset(message: 'The caller gave up');
    });
  }

  String? _offer;

  /// Picks up.
  Future<void> answer() async {
    final id = callId;
    final offer = _offer;
    if (id == null || offer == null || state != CallState.ringing) return;

    _ringTimeout?.cancel();
    state = CallState.connecting;
    error = null;
    notifyListeners();

    try {
      // Audio only. Asking for the camera would prompt for a permission this
      // app has no use for, on a call that cannot carry video.
      _microphone = await navigator.mediaDevices.getUserMedia({
        'audio': {
          'echoCancellation': true,
          'noiseSuppression': true,
          'autoGainControl': true,
        },
        'video': false,
      });

      final peer = await createPeerConnection(_iceServers);
      _peer = peer;

      for (final track in _microphone!.getTracks()) {
        await peer.addTrack(track, _microphone!);
      }

      peer.onConnectionState = (connection) {
        if (connection == RTCPeerConnectionState.RTCPeerConnectionStateFailed ||
            connection == RTCPeerConnectionState.RTCPeerConnectionStateClosed) {
          if (state == CallState.active || state == CallState.connecting) {
            unawaited(hangUp(reason: 'The connection dropped'));
          }
        }
      };

      await peer.setRemoteDescription(RTCSessionDescription(offer, 'offer'));
      final answer = await peer.createAnswer({'offerToReceiveAudio': true});
      await peer.setLocalDescription(answer);

      // Meta wants one complete SDP, not a trickle of candidates, so the
      // answer waits for gathering — but only briefly. A phone that is still
      // finding candidates at three seconds has found the ones that matter,
      // and the answer window is not long enough to be patient.
      final local = await _gathered(peer, answer);

      await _api.answerCall(id, local.sdp!);

      state = CallState.active;
      connectedAt = DateTime.now();
      await Helper.setSpeakerphoneOn(speaker);
      notifyListeners();
    } catch (e) {
      final message = e is ApiException ? e.message : 'That call could not be connected';
      await _teardown();
      _reset(message: message);
    }
  }

  /// Waits for ICE gathering, up to a point.
  Future<RTCSessionDescription> _gathered(
    RTCPeerConnection peer,
    RTCSessionDescription fallback,
  ) async {
    final done = Completer<void>();
    peer.onIceGatheringState = (gathering) {
      if (gathering == RTCIceGatheringState.RTCIceGatheringStateComplete && !done.isCompleted) {
        done.complete();
      }
    };
    if ((await peer.getIceGatheringState()) ==
        RTCIceGatheringState.RTCIceGatheringStateComplete) {
      if (!done.isCompleted) done.complete();
    }
    await done.future.timeout(const Duration(seconds: 3), onTimeout: () {});
    return (await peer.getLocalDescription()) ?? fallback;
  }

  /// Declines a ringing call. The caller hears a refusal rather than ringing out.
  Future<void> decline() async {
    final id = callId;
    if (id == null) return;
    _ringTimeout?.cancel();
    state = CallState.ending;
    notifyListeners();
    try {
      await _api.rejectCall(id);
    } catch (_) {
      // The caller may have hung up first. Either way this device is done.
    }
    _reset();
  }

  /// Ends a call in progress.
  Future<void> hangUp({String? reason}) async {
    final id = callId;
    state = CallState.ending;
    notifyListeners();
    await _teardown();
    if (id != null) {
      // Meta only counts a call as ended when told, even when the audio has
      // already stopped.
      try {
        await _api.terminateCall(id);
      } catch (_) {}
    }
    _reset(message: reason);
  }

  Future<void> toggleMute() async {
    muted = !muted;
    for (final track in _microphone?.getAudioTracks() ?? const <MediaStreamTrack>[]) {
      track.enabled = !muted;
    }
    notifyListeners();
  }

  Future<void> toggleSpeaker() async {
    speaker = !speaker;
    await Helper.setSpeakerphoneOn(speaker);
    notifyListeners();
  }

  /// Somebody else picked it up, or the caller rang off.
  void endedElsewhere(String id) {
    if (callId != id) return;
    if (state == CallState.ringing) {
      _ringTimeout?.cancel();
      _reset();
    } else {
      unawaited(hangUp());
    }
  }

  Future<void> _teardown() async {
    for (final track in _microphone?.getTracks() ?? const <MediaStreamTrack>[]) {
      await track.stop();
    }
    await _microphone?.dispose();
    _microphone = null;
    await _peer?.close();
    _peer = null;
  }

  void _reset({String? message}) {
    _ringTimeout?.cancel();
    _ringTimeout = null;
    callId = null;
    conversationId = null;
    customerName = null;
    customerPhone = null;
    _offer = null;
    connectedAt = null;
    muted = false;
    error = message;
    state = CallState.idle;
    notifyListeners();
  }

  @override
  void dispose() {
    _ringTimeout?.cancel();
    unawaited(_teardown());
    super.dispose();
  }
}
