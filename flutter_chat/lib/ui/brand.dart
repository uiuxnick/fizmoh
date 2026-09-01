import 'package:flutter/material.dart';

/// The Fizmoh mark, wordmark and mascot.
///
/// The supplied artwork rather than a redrawing of it: a brand mark that is
/// nearly right is worse than one that is obviously a placeholder, because
/// nobody notices it needs replacing.
///
/// filterQuality is high because every file here is large and always drawn
/// small — the default sampling leaves visible aliasing on the fur.
class FizmohMark extends StatelessWidget {
  const FizmohMark({super.key, this.size = 40});

  final double size;

  @override
  Widget build(BuildContext context) {
    return Image.asset(
      'assets/mark.png',
      height: size,
      width: size,
      fit: BoxFit.contain,
      filterQuality: FilterQuality.high,
      // Decoding a 512px source at 40pt wastes memory on every list that shows
      // it; this caches it at the size actually drawn.
      cacheHeight: (size * MediaQuery.devicePixelRatioOf(context)).round(),
      semanticLabel: 'Fizmoh',
    );
  }
}

/// The wordmark.
///
/// The supplied artwork in both of its colourways: green for a light surface,
/// white for the brand green. Neither is filtered at runtime — the colour is
/// baked from the artwork's own alpha, so every anti-aliased edge survives.
class FizmohLogo extends StatelessWidget {
  const FizmohLogo({super.key, this.size = 36, this.onDark = false});

  /// The drawn height of the lockup, strapline included.
  final double size;

  /// Whether it sits on the brand green.
  final bool onDark;

  @override
  Widget build(BuildContext context) {
    return Image.asset(
      onDark ? 'assets/logo-light.png' : 'assets/logo.png',
      height: size,
      fit: BoxFit.contain,
      filterQuality: FilterQuality.high,
      cacheHeight: (size * MediaQuery.devicePixelRatioOf(context)).round(),
      semanticLabel: 'Fizmoh',
    );
  }
}

/// The mascot, full length.
class FizmohMascot extends StatelessWidget {
  const FizmohMascot({super.key, required this.height});

  final double height;

  @override
  Widget build(BuildContext context) {
    return Image.asset(
      'assets/mascot.png',
      height: height,
      fit: BoxFit.contain,
      filterQuality: FilterQuality.high,
      cacheHeight: (height * MediaQuery.devicePixelRatioOf(context)).round(),
      excludeFromSemantics: true,
    );
  }
}
