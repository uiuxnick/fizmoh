import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Fizmoh's design tokens.
///
/// One place for colour, spacing, radius, elevation and motion. Screens read
/// from here and never write a raw hex or a bare duration — the moment two
/// screens each pick their own blue, the product stops looking like one thing.
class F {
  F._();

  // ── colour ────────────────────────────────────────────────────────────────
  /// The blue from the mark. Everything else is derived from it.
  static const brand = Color(0xFF2563EB);
  static const brandDeep = Color(0xFF1D4ED8);
  static const brandSoft = Color(0xFF3B82F6);

  static const danger = Color(0xFFDC2626);
  static const success = Color(0xFF059669);
  static const warning = Color(0xFFD97706);

  // ── spacing, on a 4pt rhythm ──────────────────────────────────────────────
  static const xs = 4.0;
  static const sm = 8.0;
  static const md = 12.0;
  static const lg = 16.0;
  static const xl = 24.0;
  static const xxl = 32.0;

  // ── radius ────────────────────────────────────────────────────────────────
  static const rSm = 10.0;
  static const rMd = 14.0;
  static const rLg = 20.0;
  static const rXl = 28.0;
  static const rPill = 999.0;

  // ── motion ────────────────────────────────────────────────────────────────
  /// Micro-interactions sit at 180ms; anything longer starts to feel like a
  /// wait rather than a response.
  static const quick = Duration(milliseconds: 120);
  static const base = Duration(milliseconds: 180);
  static const slow = Duration(milliseconds: 280);
  /// Exits are shorter than entrances — leaving should feel decisive.
  static const exit = Duration(milliseconds: 120);
  static const enterCurve = Curves.easeOutCubic;
  static const exitCurve = Curves.easeInCubic;

  /// A single elevation scale. Random shadow values are the fastest way to
  /// make a careful layout look accidental.
  static List<BoxShadow> lift(BuildContext context, {int level = 1}) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final tint = dark ? Colors.black : const Color(0xFF0F172A);
    switch (level) {
      case 0:
        return const [];
      case 2:
        return [
          BoxShadow(color: tint.withValues(alpha: dark ? 0.5 : 0.07), blurRadius: 20, offset: const Offset(0, 6)),
          BoxShadow(color: tint.withValues(alpha: dark ? 0.3 : 0.04), blurRadius: 4, offset: const Offset(0, 1)),
        ];
      case 3:
        return [
          BoxShadow(color: tint.withValues(alpha: dark ? 0.6 : 0.12), blurRadius: 36, offset: const Offset(0, 14)),
        ];
      default:
        return [
          BoxShadow(color: tint.withValues(alpha: dark ? 0.4 : 0.05), blurRadius: 10, offset: const Offset(0, 2)),
        ];
    }
  }
}

class AppTheme {
  static const _fontFallback = ['SF Pro Text', 'Roboto', 'Helvetica Neue'];

  static ThemeData light() => _build(Brightness.light);
  static ThemeData dark() => _build(Brightness.dark);

  static ThemeData _build(Brightness brightness) {
    final dark = brightness == Brightness.dark;

    final scheme = ColorScheme.fromSeed(
      seedColor: F.brand,
      brightness: brightness,
    ).copyWith(
      primary: dark ? F.brandSoft : F.brand,
      error: F.danger,
      // A near-white canvas with white cards reads as depth without a single
      // border; pure white on white would need lines to separate anything.
      surface: dark ? const Color(0xFF14161C) : Colors.white,
      surfaceContainerLowest: dark ? const Color(0xFF0B0D11) : const Color(0xFFF6F7FB),
      surfaceContainerHighest: dark ? const Color(0xFF1E2129) : const Color(0xFFEFF2F9),
      outlineVariant: dark ? const Color(0xFF2A2E38) : const Color(0xFFE4ECFC),
    );

    final base = ThemeData(useMaterial3: true, colorScheme: scheme);

    return base.copyWith(
      scaffoldBackgroundColor: scheme.surfaceContainerLowest,
      splashFactory: InkSparkle.splashFactory,
      textTheme: base.textTheme.apply(fontFamilyFallback: _fontFallback),

      appBarTheme: AppBarTheme(
        backgroundColor: scheme.surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          color: scheme.onSurface, fontSize: 17, fontWeight: FontWeight.w700,
        ),
        systemOverlayStyle: dark ? SystemUiOverlayStyle.light : SystemUiOverlayStyle.dark,
      ),

      cardTheme: CardThemeData(
        elevation: 0,
        color: scheme.surface,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(F.rLg)),
      ),

      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: scheme.surfaceContainerHighest.withValues(alpha: dark ? 0.6 : 0.9),
        hintStyle: TextStyle(color: scheme.onSurfaceVariant, fontSize: 15),
        // No border at rest, brand ring on focus — the field announces itself
        // only when it is the thing you are using.
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(F.rMd),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(F.rMd),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(F.rMd),
          borderSide: BorderSide(color: scheme.primary, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(F.rMd),
          borderSide: BorderSide(color: scheme.error, width: 1.5),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: F.lg, vertical: 15),
      ),

      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          // 52 rather than 48: comfortably past the 44pt minimum even with a
          // dense font, and it reads as deliberate rather than tight.
          minimumSize: const Size(0, 52),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(F.rMd)),
          textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size(0, 48),
          side: BorderSide(color: scheme.outlineVariant),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(F.rMd)),
          textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
        ),
      ),

      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: scheme.surface,
        indicatorColor: scheme.primary.withValues(alpha: 0.14),
        elevation: 0,
        height: 68,
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        labelTextStyle: WidgetStatePropertyAll(
          TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: scheme.onSurfaceVariant),
        ),
      ),
      navigationRailTheme: NavigationRailThemeData(
        backgroundColor: scheme.surface,
        indicatorColor: scheme.primary.withValues(alpha: 0.14),
        selectedIconTheme: IconThemeData(color: scheme.primary),
      ),

      tabBarTheme: const TabBarThemeData(
        indicatorSize: TabBarIndicatorSize.label,
        dividerColor: Colors.transparent,
        labelStyle: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
        unselectedLabelStyle: TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
      ),

      dialogTheme: DialogThemeData(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(F.rLg)),
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: scheme.surface,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(F.rXl)),
        ),
        // 40–60% scrim, so the sheet is unmistakably in front.
        modalBarrierColor: const Color(0x80000000),
      ),
      snackBarTheme: const SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(F.rMd)),
        ),
      ),
      chipTheme: base.chipTheme.copyWith(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(F.rPill)),
        side: BorderSide.none,
      ),
      dividerTheme: DividerThemeData(
        color: scheme.outlineVariant,
        thickness: 1,
        space: 1,
      ),
    );
  }
}
