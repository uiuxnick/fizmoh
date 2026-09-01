import 'package:flutter/material.dart';

/// Fizmoh design tokens.
///
/// Every colour, size, radius and duration in the product resolves here.
/// Screens never write a raw hex or a bare number: the moment two screens each
/// choose their own blue, or their own idea of "a bit of space", the product
/// stops reading as one thing and starts reading as a pile of pages.
///
/// The scale is deliberately short. A type ramp with fourteen sizes is not more
/// expressive than one with seven — it just means nobody can tell which to use.
class T {
  T._();

  // ── brand ─────────────────────────────────────────────────────────────────
  /// Electric royal blue. Used for action and for state, never for decoration.
  static const brand = Color(0xFF2563EB);
  static const brandPressed = Color(0xFF1D4ED8);
  static const brandTint = Color(0xFFEFF4FF);

  /// Fizmoh green, from the identity artwork. The launch screen, the splash
  /// and the icon are this colour; the interface stays blue, because a
  /// saturated green behind a working inbox competes with the WhatsApp green
  /// that already means "this channel".
  static const brandGreen = Color(0xFF12944A);
  static const brandDeep = Color(0xFF0B703F);

  // ── semantic ──────────────────────────────────────────────────────────────
  /// Meaning, not mood. Green is "this happened", amber is "waiting on
  /// something", red is only ever "this failed" or "this destroys data".
  static const success = Color(0xFF047857);
  static const successTint = Color(0xFFECFDF5);
  static const pending = Color(0xFFB45309);
  static const pendingTint = Color(0xFFFFFBEB);
  static const danger = Color(0xFFB91C1C);
  static const dangerTint = Color(0xFFFEF2F2);
  static const info = Color(0xFF1D4ED8);

  // ── neutrals ──────────────────────────────────────────────────────────────
  /// A cool grey ramp. Text sits at 900/600/500 — never lighter, because grey
  /// that looks tasteful in a mockup is unreadable on a phone in sunlight.
  static const ink900 = Color(0xFF0F172A);
  static const ink700 = Color(0xFF334155);
  static const ink600 = Color(0xFF475569);
  static const ink500 = Color(0xFF64748B);
  static const line = Color(0xFFE2E8F0);
  static const lineSoft = Color(0xFFF1F5F9);
  static const surface = Color(0xFFFFFFFF);
  static const canvas = Color(0xFFF8FAFC);

  // dark counterparts
  static const dInk = Color(0xFFE2E8F0);
  static const dInkSoft = Color(0xFF94A3B8);
  static const dLine = Color(0xFF1E293B);
  static const dSurface = Color(0xFF0F1521);
  static const dCanvas = Color(0xFF090D14);

  // ── spacing, 4pt ──────────────────────────────────────────────────────────
  static const s1 = 4.0;
  static const s2 = 8.0;
  static const s3 = 12.0;
  static const s4 = 16.0;
  static const s5 = 20.0;
  static const s6 = 24.0;
  static const s8 = 32.0;
  static const s10 = 40.0;

  // ── radius ────────────────────────────────────────────────────────────────
  /// Small and considered. Everything at 20pt reads as a toy.
  static const rXs = 6.0;
  static const rSm = 8.0;
  static const rMd = 10.0;
  static const rLg = 14.0;
  static const rXl = 20.0;
  static const rFull = 999.0;

  // ── icons ─────────────────────────────────────────────────────────────────
  static const iconSm = 16.0;
  static const iconMd = 20.0;
  static const iconLg = 24.0;

  // ── touch ─────────────────────────────────────────────────────────────────
  /// Apple's minimum. Anything smaller is a mis-tap waiting to be blamed on
  /// the user.
  static const tapMin = 44.0;

  // ── motion ────────────────────────────────────────────────────────────────
  static const fast = Duration(milliseconds: 140);
  static const normal = Duration(milliseconds: 200);
  static const slow = Duration(milliseconds: 260);
  static const enter = Curves.easeOutCubic;
  static const exit = Curves.easeInCubic;

  /// Whether the person using this has asked for less movement.
  ///
  /// Checked at the point of animating rather than assumed, because vestibular
  /// discomfort is not a preference to be overridden by a nice transition.
  static bool stillness(BuildContext context) =>
      MediaQuery.maybeDisableAnimationsOf(context) ??
      MediaQuery.maybeOf(context)?.disableAnimations ??
      false;

  static Duration motion(BuildContext context, Duration d) =>
      stillness(context) ? Duration.zero : d;

  // ── elevation ─────────────────────────────────────────────────────────────
  /// Three levels, and mostly level 0. Depth comes from a hairline and a tonal
  /// shift; shadows are for things that genuinely float above the page.
  static List<BoxShadow> shadow(int level, {bool dark = false}) {
    if (level <= 0) return const [];
    final base = dark ? Colors.black : const Color(0xFF0F172A);
    if (level == 1) {
      return [BoxShadow(color: base.withValues(alpha: dark ? .45 : .05), blurRadius: 8, offset: const Offset(0, 2))];
    }
    if (level == 2) {
      return [
        BoxShadow(color: base.withValues(alpha: dark ? .55 : .08), blurRadius: 20, offset: const Offset(0, 8)),
        BoxShadow(color: base.withValues(alpha: dark ? .3 : .04), blurRadius: 3, offset: const Offset(0, 1)),
      ];
    }
    return [BoxShadow(color: base.withValues(alpha: dark ? .6 : .14), blurRadius: 40, offset: const Offset(0, 16))];
  }
}

/// The type ramp.
///
/// Seven roles, each with a job. Weight and colour carry the hierarchy as much
/// as size does, which is what keeps an operational screen dense without
/// becoming flat.
class Type {
  Type._();

  static TextStyle pageTitle(BuildContext c) => TextStyle(
        fontSize: 26, height: 1.15, fontWeight: FontWeight.w700, letterSpacing: -0.6,
        color: _ink(c));

  static TextStyle section(BuildContext c) => TextStyle(
        fontSize: 15, height: 1.3, fontWeight: FontWeight.w700, letterSpacing: -0.2,
        color: _ink(c));

  static TextStyle body(BuildContext c) => TextStyle(
        fontSize: 15, height: 1.45, fontWeight: FontWeight.w400, color: _ink(c));

  static TextStyle bodyStrong(BuildContext c) => TextStyle(
        fontSize: 15, height: 1.45, fontWeight: FontWeight.w600, color: _ink(c));

  static TextStyle secondary(BuildContext c) => TextStyle(
        fontSize: 13.5, height: 1.4, fontWeight: FontWeight.w400, color: _soft(c));

  static TextStyle meta(BuildContext c) => TextStyle(
        fontSize: 12, height: 1.3, fontWeight: FontWeight.w500, color: _soft(c));

  static TextStyle label(BuildContext c) => TextStyle(
        fontSize: 11.5, height: 1.2, fontWeight: FontWeight.w700,
        letterSpacing: 0.2, color: _soft(c));

  /// Figures that must not jitter as they change — timers, amounts, counts.
  static TextStyle amount(BuildContext c, {double size = 17}) => TextStyle(
        fontSize: size, height: 1.2, fontWeight: FontWeight.w700,
        letterSpacing: -0.3, color: _ink(c),
        fontFeatures: const [FontFeature.tabularFigures()]);

  static Color _ink(BuildContext c) =>
      Theme.of(c).brightness == Brightness.dark ? T.dInk : T.ink900;
  static Color _soft(BuildContext c) =>
      Theme.of(c).brightness == Brightness.dark ? T.dInkSoft : T.ink500;
}

ThemeData fizmohTheme(Brightness brightness) {
  final dark = brightness == Brightness.dark;

  final scheme = ColorScheme.fromSeed(seedColor: T.brand, brightness: brightness).copyWith(
    primary: dark ? const Color(0xFF60A5FA) : T.brand,
    onPrimary: Colors.white,
    surface: dark ? T.dSurface : T.surface,
    surfaceContainerLowest: dark ? T.dCanvas : T.canvas,
    surfaceContainerHighest: dark ? const Color(0xFF16202F) : T.lineSoft,
    outlineVariant: dark ? T.dLine : T.line,
    error: T.danger,
    onSurface: dark ? T.dInk : T.ink900,
    onSurfaceVariant: dark ? T.dInkSoft : T.ink500,
  );

  final base = ThemeData(useMaterial3: true, colorScheme: scheme);

  return base.copyWith(
    scaffoldBackgroundColor: scheme.surfaceContainerLowest,
    // A ripple that spreads across a dense list row is noise. A quiet
    // highlight says "registered" without redrawing half the screen.
    splashFactory: InkSparkle.splashFactory,
    dividerTheme: DividerThemeData(color: scheme.outlineVariant, thickness: 1, space: 1),

    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: dark ? const Color(0xFF141C28) : Colors.white,
      hintStyle: TextStyle(color: scheme.onSurfaceVariant, fontSize: 15, fontWeight: FontWeight.w400),
      contentPadding: const EdgeInsets.symmetric(horizontal: T.s4, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(T.rMd),
        borderSide: BorderSide(color: scheme.outlineVariant),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(T.rMd),
        borderSide: BorderSide(color: scheme.outlineVariant),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(T.rMd),
        borderSide: BorderSide(color: scheme.primary, width: 1.6),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(T.rMd),
        borderSide: const BorderSide(color: T.danger, width: 1.4),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(T.rMd),
        borderSide: const BorderSide(color: T.danger, width: 1.6),
      ),
    ),

    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size(0, T.tapMin + 4),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(T.rMd)),
        textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, letterSpacing: -0.1),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(0, T.tapMin),
        side: BorderSide(color: scheme.outlineVariant),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(T.rMd)),
        textStyle: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w600),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        minimumSize: const Size(0, T.tapMin),
        textStyle: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w600),
      ),
    ),

    bottomSheetTheme: BottomSheetThemeData(
      backgroundColor: scheme.surface,
      surfaceTintColor: Colors.transparent,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(T.rXl)),
      ),
      modalBarrierColor: const Color(0x8C0F172A),
      showDragHandle: true,
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: scheme.surface,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(T.rLg)),
    ),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: dark ? const Color(0xFF1E293B) : T.ink900,
      contentTextStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: Colors.white),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.all(Radius.circular(T.rMd)),
      ),
    ),
    tabBarTheme: TabBarThemeData(
      indicatorSize: TabBarIndicatorSize.label,
      indicatorColor: scheme.primary,
      dividerColor: scheme.outlineVariant,
      labelColor: scheme.onSurface,
      unselectedLabelColor: scheme.onSurfaceVariant,
      labelStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
      unselectedLabelStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
    ),
  );
}
