import 'package:flutter/material.dart';
import 'brand.dart';
import 'tokens.dart';

/// The first second of the app.
///
/// Shown only while there is genuinely something to wait for — restoring a
/// session, reaching the server. If that finishes in 80ms the splash goes with
/// it. Holding somebody on a logo to admire the animation is theatre at the
/// user's expense, so nothing here delays anything.
///
/// It continues the launch screen rather than replacing it: the same green
/// field, the same mascot, in the same place. A native launch image that cuts
/// to a different first frame is the cheapest way to make an app feel stitched
/// together from parts.
class Splash extends StatefulWidget {
  const Splash({super.key});

  @override
  State<Splash> createState() => _SplashState();
}

class _SplashState extends State<Splash> with SingleTickerProviderStateMixin {
  late final AnimationController _c =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 1100));

  late final Animation<double> _mascotFade =
      CurvedAnimation(parent: _c, curve: const Interval(0.0, 0.45, curve: Curves.easeOut));
  late final Animation<double> _mascotRise = Tween(begin: 26.0, end: 0.0).animate(
      CurvedAnimation(parent: _c, curve: const Interval(0.0, 0.6, curve: Curves.easeOutCubic)));

  // The wordmark arrives after the mascot, not with it — the sequence is what
  // makes it read as deliberate rather than as one fade-in.
  late final Animation<double> _wordFade =
      CurvedAnimation(parent: _c, curve: const Interval(0.32, 0.8, curve: Curves.easeOut));
  late final Animation<Offset> _wordSlide =
      Tween(begin: const Offset(0, 0.3), end: Offset.zero).animate(
          CurvedAnimation(parent: _c, curve: const Interval(0.32, 0.85, curve: Curves.easeOutCubic)));
  late final Animation<double> _glow =
      CurvedAnimation(parent: _c, curve: const Interval(0.0, 0.7, curve: Curves.easeOut));

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      // Somebody who has asked for less movement gets the finished state, not
      // a slower version of the animation.
      if (T.stillness(context)) {
        _c.value = 1;
      } else {
        _c.forward();
      }
    });
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: T.brandDeep,
      body: AnimatedBuilder(
        animation: _c,
        builder: (context, _) => DecoratedBox(
          decoration: BoxDecoration(
            gradient: RadialGradient(
              center: const Alignment(0, -0.15),
              radius: 1.2,
              colors: [
                Color.lerp(T.brandDeep, T.brandGreen, 0.45 + 0.55 * _glow.value)!,
                T.brandDeep,
              ],
            ),
          ),
          child: Stack(children: [
            Positioned.fill(child: CustomPaint(painter: _Halo(_glow.value))),
            Center(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                Transform.translate(
                  offset: Offset(0, _mascotRise.value),
                  child: FadeTransition(
                    opacity: _mascotFade,
                    child: Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.08),
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: T.brandGreen.withValues(alpha: 0.35),
                            blurRadius: 36,
                            spreadRadius: 8,
                          ),
                        ],
                        border: Border.all(
                          color: Colors.white.withValues(alpha: 0.18),
                          width: 1.5,
                        ),
                      ),
                      child: const FizmohMark(size: 84),
                    ),
                  ),
                ),
                const SizedBox(height: 28),
                FadeTransition(
                  opacity: _wordFade,
                  child: SlideTransition(
                    position: _wordSlide,
                    child: const FizmohLogo(size: 46, onDark: true),
                  ),
                ),
                const SizedBox(height: 24),
                FadeTransition(
                  opacity: _wordFade,
                  child: SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.5,
                      valueColor: AlwaysStoppedAnimation<Color>(
                        Colors.white.withValues(alpha: 0.85),
                      ),
                    ),
                  ),
                ),
              ]),
            ),
            Positioned(
              left: 0,
              right: 0,
              bottom: 36,
              child: FadeTransition(
                opacity: _wordFade,
                child: Text(
                  'Automate · Connect · Grow',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 13,
                    letterSpacing: 2.0,
                    fontWeight: FontWeight.w600,
                    color: Colors.white.withValues(alpha: 0.65),
                  ),
                ),
              ),
            ),
          ]),
        ),
      ),
    );
  }
}

/// A soft bloom behind the mascot.
///
/// Painted rather than layered as an image: one radial gradient costs nothing
/// and scales to any screen, where a baked PNG would band on a large one.
class _Halo extends CustomPainter {
  const _Halo(this.t);

  final double t;

  @override
  void paint(Canvas canvas, Size size) {
    if (t <= 0) return;
    final centre = Offset(size.width / 2, size.height * 0.42);
    final radius = size.shortestSide * (0.42 + 0.10 * t);
    canvas.drawCircle(
      centre,
      radius,
      Paint()
        ..shader = RadialGradient(
          colors: [
            Colors.white.withValues(alpha: 0.10 * t),
            Colors.white.withValues(alpha: 0),
          ],
        ).createShader(Rect.fromCircle(center: centre, radius: radius)),
    );
  }

  @override
  bool shouldRepaint(_Halo old) => old.t != t;
}
