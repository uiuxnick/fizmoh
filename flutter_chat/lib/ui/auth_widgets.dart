import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'tokens.dart';

/// The soft wash behind the sign-in screen.
///
/// Painted rather than shipped as an image: it is three shapes and a dot grid,
/// which costs nothing to draw and scales to any screen without a set of
/// exports. An asset would also have to be produced twice for dark mode.
class AuthBackdrop extends StatelessWidget {
  const AuthBackdrop({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: dark
              ? const [Color(0xFF0D1220), Color(0xFF090D14)]
              : const [Color(0xFFEEF3FF), Color(0xFFF9FBFF), Color(0xFFFFFFFF)],
          stops: dark ? const [0, 1] : const [0, 0.42, 1],
        ),
      ),
      child: CustomPaint(
        painter: _Backdrop(dark: dark),
        child: child,
      ),
    );
  }
}

class _Backdrop extends CustomPainter {
  const _Backdrop({required this.dark});

  final bool dark;

  @override
  void paint(Canvas canvas, Size size) {
    // A dot grid in the top corner. Faint enough to read as texture rather
    // than as a pattern anybody is meant to notice.
    final dot = Paint()..color = T.brand.withValues(alpha: dark ? .10 : .13);
    for (var y = 0; y < 7; y++) {
      for (var x = 0; x < 8; x++) {
        final fade = 1 - (x / 8) * 0.7 - (y / 7) * 0.5;
        if (fade <= 0) continue;
        canvas.drawCircle(
          Offset(18 + x * 15, 60 + y * 15),
          1.6,
          dot..color = T.brand.withValues(alpha: (dark ? .10 : .16) * fade),
        );
      }
    }

    // The wave that separates the tinted head of the screen from the body.
    final wave = Paint()..color = Colors.white.withValues(alpha: dark ? .03 : .55);
    final path = Path()
      ..moveTo(0, size.height * 0.13)
      ..cubicTo(
        size.width * 0.25, size.height * 0.20,
        size.width * 0.62, size.height * 0.06,
        size.width, size.height * 0.155,
      )
      ..lineTo(size.width, 0)
      ..lineTo(0, 0)
      ..close();
    canvas.drawPath(path, wave);
  }

  @override
  bool shouldRepaint(_Backdrop oldDelegate) => oldDelegate.dark != dark;
}

/// Two small accent dots either side of the mark, as in the design.
class BrandOrbits extends StatelessWidget {
  const BrandOrbits({super.key, required this.child, this.size = 96});

  final Widget child;
  final double size;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: size * 1.05,
      width: size * 1.9,
      child: Stack(alignment: Alignment.center, children: [
        child,
        Positioned(
          right: size * 0.24,
          top: size * 0.60,
          child: const _Dot(color: Color(0xFF34D399), size: 9),
        ),
        Positioned(
          left: size * 0.30,
          bottom: size * 0.06,
          child: const _Dot(color: T.brand, size: 7),
        ),
      ]),
    );
  }
}

class _Dot extends StatelessWidget {
  const _Dot({required this.color, required this.size});

  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) => Container(
        height: size,
        width: size,
        decoration: BoxDecoration(color: color, shape: BoxShape.circle),
      );
}

/// Password / one-time code. A contained track with the selected side lifted
/// onto a white card, which reads as a physical switch rather than two tabs.
class AuthSegmented extends StatelessWidget {
  const AuthSegmented({
    super.key,
    required this.options,
    required this.selected,
    required this.onSelect,
  });

  final List<({String label, IconData icon})> options;
  final int selected;
  final ValueChanged<int> onSelect;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final dark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(5),
      decoration: BoxDecoration(
        color: dark ? const Color(0xFF141C28) : const Color(0xFFF1F5FC),
        borderRadius: BorderRadius.circular(T.rLg),
        border: Border.all(color: scheme.outlineVariant.withValues(alpha: .6)),
      ),
      child: Row(children: [
        for (var i = 0; i < options.length; i++)
          Expanded(
            child: Semantics(
              button: true,
              selected: i == selected,
              child: GestureDetector(
                onTap: () => onSelect(i),
                behavior: HitTestBehavior.opaque,
                child: AnimatedContainer(
                  duration: T.motion(context, T.fast),
                  curve: T.enter,
                  height: T.tapMin,
                  decoration: BoxDecoration(
                    color: i == selected ? (dark ? const Color(0xFF1E293B) : Colors.white) : Colors.transparent,
                    borderRadius: BorderRadius.circular(T.rMd),
                    boxShadow: i == selected ? T.shadow(1, dark: dark) : null,
                  ),
                  child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                    Icon(options[i].icon,
                        size: 17,
                        color: i == selected ? scheme.primary : scheme.onSurfaceVariant),
                    const SizedBox(width: 7),
                    Text(
                      options[i].label,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: i == selected ? FontWeight.w700 : FontWeight.w500,
                        color: i == selected ? scheme.primary : scheme.onSurfaceVariant,
                      ),
                    ),
                  ]),
                ),
              ),
            ),
          ),
      ]),
    );
  }
}

/// A field with its label inside it, above the value.
///
/// Keeps the label visible while typing — a placeholder that vanishes on the
/// first keystroke leaves somebody looking at text with no idea what it is
/// supposed to be, which is the oldest form failure there is.
class AuthField extends StatelessWidget {
  const AuthField({
    super.key,
    required this.controller,
    required this.label,
    required this.icon,
    this.obscure = false,
    this.keyboardType,
    this.autofillHints,
    this.suffix,
    this.onSubmitted,
    this.onChanged,
    this.errorText,
    this.autofocus = false,
    this.enabled = true,
  });

  final TextEditingController controller;
  final String label;
  final IconData icon;
  final bool obscure;
  final TextInputType? keyboardType;
  final Iterable<String>? autofillHints;
  final Widget? suffix;
  final VoidCallback? onSubmitted;
  final ValueChanged<String>? onChanged;
  final String? errorText;
  final bool autofocus;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final dark = Theme.of(context).brightness == Brightness.dark;
    final bad = errorText != null;

    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Container(
        decoration: BoxDecoration(
          color: dark ? const Color(0xFF111825) : Colors.white,
          borderRadius: BorderRadius.circular(T.rLg),
          border: Border.all(
            color: bad ? T.danger : scheme.outlineVariant,
            width: bad ? 1.4 : 1,
          ),
        ),
        padding: const EdgeInsets.fromLTRB(T.s3, T.s2, T.s3, T.s2),
        child: Row(children: [
          Container(
            height: 38,
            width: 38,
            decoration: BoxDecoration(
              color: (bad ? T.danger : T.brand).withValues(alpha: dark ? .18 : .09),
              borderRadius: BorderRadius.circular(T.rMd),
            ),
            child: Icon(icon, size: 18, color: bad ? T.danger : T.brand),
          ),
          const SizedBox(width: T.s3),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(label, style: TextStyle(
                  fontSize: 12, height: 1.1, fontWeight: FontWeight.w500,
                  color: scheme.onSurfaceVariant)),
                TextField(
                  controller: controller,
                  obscureText: obscure,
                  enabled: enabled,
                  autofocus: autofocus,
                  keyboardType: keyboardType,
                  autofillHints: autofillHints,
                  onChanged: onChanged,
                  onSubmitted: (_) => onSubmitted?.call(),
                  style: TextStyle(
                    fontSize: 15.5, fontWeight: FontWeight.w600,
                    letterSpacing: obscure ? 2 : -0.1,
                    color: scheme.onSurface,
                  ),
                  cursorColor: scheme.primary,
                  decoration: const InputDecoration(
                    isDense: true,
                    filled: false,
                    contentPadding: EdgeInsets.only(top: 2, bottom: 4),
                    border: InputBorder.none,
                    enabledBorder: InputBorder.none,
                    focusedBorder: InputBorder.none,
                    errorBorder: InputBorder.none,
                  ),
                ),
              ],
            ),
          ),
          if (suffix != null) suffix!,
        ]),
      ),
      if (bad)
        Padding(
          padding: const EdgeInsets.only(left: T.s1, top: 6),
          child: Row(children: [
            const Icon(Icons.error_outline_rounded, size: 14, color: T.danger),
            const SizedBox(width: 5),
            // The message sits under its own field, not in a summary at the
            // top, so the thing that is wrong and the reason are together.
            Expanded(child: Text(errorText!,
                style: const TextStyle(fontSize: 12.5, color: T.danger, fontWeight: FontWeight.w500))),
          ]),
        ),
    ]);
  }
}

/// The primary action. A short gradient and a soft brand-tinted shadow — the
/// one place in the product where a gradient earns its place.
class AuthButton extends StatelessWidget {
  const AuthButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.busy = false,
    this.icon = Icons.arrow_forward_rounded,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool busy;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final enabled = onPressed != null && !busy;
    return Semantics(
      button: true,
      enabled: enabled,
      label: label,
      child: AnimatedOpacity(
        duration: T.motion(context, T.fast),
        opacity: enabled ? 1 : 0.55,
        child: Container(
          height: 54,
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              begin: Alignment.centerLeft,
              end: Alignment.centerRight,
              colors: [Color(0xFF2F6BFF), Color(0xFF1D4ED8)],
            ),
            borderRadius: BorderRadius.circular(T.rLg),
            boxShadow: enabled
                ? [BoxShadow(
                    color: T.brand.withValues(alpha: .32),
                    blurRadius: 18,
                    offset: const Offset(0, 8))]
                : null,
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              borderRadius: BorderRadius.circular(T.rLg),
              onTap: enabled ? onPressed : null,
              child: Center(
                child: busy
                    ? const SizedBox(
                        height: 21, width: 21,
                        child: CircularProgressIndicator(strokeWidth: 2.2, color: Colors.white))
                    : Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                        Text(label, style: const TextStyle(
                          fontSize: 16, fontWeight: FontWeight.w600,
                          color: Colors.white, letterSpacing: -0.1)),
                        if (icon != null) ...[
                          const SizedBox(width: T.s2),
                          Icon(icon, size: 19, color: Colors.white),
                        ],
                      ]),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// A third-party sign-in option.
///
/// Logo and text together. A logo alone in a full-width button leaves a small
/// mark adrift in a wide empty slab, and the two providers then read as
/// unrelated shapes rather than a pair of choices.
///
/// Both companies publish approved strings — "Sign in with Google", "Sign in
/// with Apple" — and neither permits them shortened, so the full string is
/// used and the type is sized to fit it rather than the other way round.
///
/// They share one treatment. Apple's guidance allows a black button or a white
/// one with an outline; the white one is used so the pair carries equal weight
/// on a light background, which is what makes them look like two options
/// rather than one loud one and one quiet one.
class AuthProviderButton extends StatelessWidget {
  const AuthProviderButton({
    super.key,
    required this.label,
    required this.logo,
    required this.onPressed,
  });

  final String label;
  final Widget logo;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final dark = Theme.of(context).brightness == Brightness.dark;

    return SizedBox(
      height: 50,
      child: Material(
        color: dark ? const Color(0xFF111825) : Colors.white,
        borderRadius: BorderRadius.circular(T.rMd),
        child: InkWell(
          borderRadius: BorderRadius.circular(T.rMd),
          onTap: onPressed,
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(T.rMd),
              // Google's spec calls for a defined stroke rather than a shadow.
              border: Border.all(color: dark ? scheme.outlineVariant : const Color(0xFFDADCE0)),
            ),
            padding: const EdgeInsets.symmetric(horizontal: T.s2),
            child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              logo,
              const SizedBox(width: 7),
              // Shrinks rather than wraps or clips if the text size is turned
              // up: the approved string has to stay whole.
              Flexible(
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Text(
                    label,
                    maxLines: 1,
                    style: TextStyle(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w600,
                      letterSpacing: -0.2,
                      color: scheme.onSurface,
                    ),
                  ),
                ),
              ),
            ]),
          ),
        ),
      ),
    );
  }
}

/// Google's mark, drawn rather than fetched.
///
/// Google's brand terms require the official colours and proportions; drawing
/// it keeps those exact without shipping an asset or reaching the network from
/// a sign-in screen.
class GoogleMark extends StatelessWidget {
  const GoogleMark({super.key, this.size = 19});

  final double size;

  @override
  Widget build(BuildContext context) =>
      SizedBox(height: size, width: size, child: CustomPaint(painter: _GooglePainter()));
}

class _GooglePainter extends CustomPainter {
  /// The four arcs of Google's G, placed by clock position.
  ///
  /// Flutter measures angles from three o'clock, increasing clockwise, so each
  /// segment is written as the hour it starts at and the sweep from there —
  /// which is how the mark is actually described, and far easier to check than
  /// a list of radians.
  static const _quarter = math.pi / 6; // 30 degrees, one hour on the dial

  static double _hour(double h) => (h - 3) * _quarter;

  @override
  void paint(Canvas canvas, Size size) {
    final stroke = size.width * 0.235;
    final box = Rect.fromLTWH(0, 0, size.width, size.height).deflate(stroke / 2);

    final arc = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.butt;

    // Blue from one o'clock round to four; red across the top; yellow down the
    // left; green along the bottom.
    canvas.drawArc(box, _hour(1), _quarter * 3, false, arc..color = const Color(0xFF4285F4));
    canvas.drawArc(box, _hour(10), _quarter * 3, false, arc..color = const Color(0xFFEA4335));
    canvas.drawArc(box, _hour(8), _quarter * 2, false, arc..color = const Color(0xFFFBBC05));
    canvas.drawArc(box, _hour(4), _quarter * 4, false, arc..color = const Color(0xFF34A853));

    // The crossbar, which is what makes it a G rather than a ring. It stops
    // short of the centre, as the real mark does.
    canvas.drawRect(
      Rect.fromLTRB(
        size.width * 0.52,
        size.height / 2 - stroke / 2,
        size.width,
        size.height / 2 + stroke / 2,
      ),
      Paint()..color = const Color(0xFF4285F4),
    );
  }

  @override
  bool shouldRepaint(CustomPainter oldDelegate) => false;
}

/// Apple's mark.
///
/// Drawn rather than taken from the icon font: the Material glyph is a
/// lookalike, and Apple's guidelines are specific about the shape of its own
/// mark. This follows the outline they publish — the leaf sits to the right of
/// the bite, and the body is wider than it is tall at the shoulders.
class AppleMark extends StatelessWidget {
  const AppleMark({super.key, this.size = 22, required this.color});

  final double size;
  final Color color;

  @override
  Widget build(BuildContext context) =>
      Icon(Icons.apple, size: size, color: color);
}

/// A hairline with a word in it.
class LabelledDivider extends StatelessWidget {
  const LabelledDivider({super.key, required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Row(children: [
      Expanded(child: Divider(color: scheme.outlineVariant)),
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: T.s3),
        child: Text(label, style: TextStyle(
          fontSize: 13, fontWeight: FontWeight.w500, color: scheme.onSurfaceVariant)),
      ),
      Expanded(child: Divider(color: scheme.outlineVariant)),
    ]);
  }
}

