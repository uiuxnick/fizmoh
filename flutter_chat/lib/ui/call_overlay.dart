import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/call_service.dart';
import 'kit.dart';
import 'tokens.dart';

/// The call, over everything else.
///
/// A ringing phone is the one thing in this app that cannot wait behind
/// whatever screen happens to be open: there are about forty seconds to answer
/// before Meta gives up, so it takes the whole screen and offers two choices.
class CallOverlay extends StatefulWidget {
  const CallOverlay({super.key, required this.child});

  final Widget child;

  @override
  State<CallOverlay> createState() => _CallOverlayState();
}

class _CallOverlayState extends State<CallOverlay> {
  Timer? _tick;

  @override
  void initState() {
    super.initState();
    // The duration on screen has to move on its own; nothing else changes
    // during a call to rebuild it.
    _tick = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted && context.read<CallService>().state == CallState.active) {
        setState(() {});
      }
    });
  }

  @override
  void dispose() {
    _tick?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final calls = context.watch<CallService>();

    return Stack(children: [
      widget.child,
      if (calls.busy)
        Positioned.fill(
          child: _CallScreen(calls: calls),
        ),
    ]);
  }
}

class _CallScreen extends StatelessWidget {
  const _CallScreen({required this.calls});

  final CallService calls;

  @override
  Widget build(BuildContext context) {
    final ringing = calls.state == CallState.ringing;
    final connecting = calls.state == CallState.connecting;
    final active = calls.state == CallState.active;

    return Material(
      color: const Color(0xFF0B1220),
      child: SafeArea(
        child: Column(children: [
          const Spacer(flex: 2),

          Avatar(name: calls.customerName ?? 'Unknown', size: 108),
          const SizedBox(height: T.s5),
          Text(
            calls.customerName ?? 'Unknown',
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: Colors.white, fontSize: 26,
              fontWeight: FontWeight.w700, letterSpacing: -0.5),
          ),
          const SizedBox(height: T.s2),
          Text(
            ringing
                ? 'WhatsApp call'
                : connecting
                    ? 'Connecting'
                    : active
                        ? _clock(calls.elapsed)
                        : 'Ending',
            style: TextStyle(
              color: Colors.white.withValues(alpha: .7),
              fontSize: 15,
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
          ),
          if (calls.customerPhone != null) ...[
            const SizedBox(height: 4),
            Text(calls.customerPhone!,
                style: TextStyle(color: Colors.white.withValues(alpha: .45), fontSize: 13)),
          ],

          const Spacer(flex: 3),

          if (active)
            Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              _Toggle(
                icon: calls.muted ? Icons.mic_off_rounded : Icons.mic_rounded,
                label: calls.muted ? 'Unmute' : 'Mute',
                on: calls.muted,
                onTap: calls.toggleMute,
              ),
              const SizedBox(width: T.s8),
              _Toggle(
                icon: calls.speaker ? Icons.volume_up_rounded : Icons.hearing_rounded,
                label: 'Speaker',
                on: calls.speaker,
                onTap: calls.toggleSpeaker,
              ),
            ]),
          const SizedBox(height: T.s8),

          Padding(
            padding: const EdgeInsets.symmetric(horizontal: T.s8),
            child: ringing
                ? Row(mainAxisAlignment: MainAxisAlignment.spaceEvenly, children: [
                    _Big(
                      icon: Icons.call_end_rounded,
                      colour: const Color(0xFFDC2626),
                      label: 'Decline',
                      onTap: calls.decline,
                    ),
                    _Big(
                      icon: Icons.call_rounded,
                      colour: const Color(0xFF16A34A),
                      label: 'Answer',
                      onTap: calls.answer,
                    ),
                  ])
                : Center(
                    child: _Big(
                      icon: Icons.call_end_rounded,
                      colour: const Color(0xFFDC2626),
                      label: 'End',
                      onTap: connecting ? calls.decline : calls.hangUp,
                    ),
                  ),
          ),
          const SizedBox(height: T.s10),
        ]),
      ),
    );
  }

  static String _clock(Duration d) {
    final minutes = d.inMinutes.toString().padLeft(2, '0');
    final seconds = (d.inSeconds % 60).toString().padLeft(2, '0');
    return '$minutes:$seconds';
  }
}

class _Big extends StatelessWidget {
  const _Big({required this.icon, required this.colour, required this.label, required this.onTap});

  final IconData icon;
  final Color colour;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: label,
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Material(
          color: colour,
          shape: const CircleBorder(),
          child: InkWell(
            customBorder: const CircleBorder(),
            onTap: onTap,
            // Large on purpose: this is tapped in a hurry, often one-handed.
            child: SizedBox(
              height: 72, width: 72,
              child: Icon(icon, color: Colors.white, size: 30),
            ),
          ),
        ),
        const SizedBox(height: T.s2),
        Text(label, style: TextStyle(color: Colors.white.withValues(alpha: .8), fontSize: 13)),
      ]),
    );
  }
}

class _Toggle extends StatelessWidget {
  const _Toggle({required this.icon, required this.label, required this.on, required this.onTap});

  final IconData icon;
  final String label;
  final bool on;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      toggled: on,
      label: label,
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Material(
          color: on ? Colors.white : Colors.white.withValues(alpha: .14),
          shape: const CircleBorder(),
          child: InkWell(
            customBorder: const CircleBorder(),
            onTap: onTap,
            child: SizedBox(
              height: 58, width: 58,
              child: Icon(icon, color: on ? const Color(0xFF0B1220) : Colors.white, size: 24),
            ),
          ),
        ),
        const SizedBox(height: 6),
        Text(label, style: TextStyle(color: Colors.white.withValues(alpha: .7), fontSize: 12)),
      ]),
    );
  }
}
