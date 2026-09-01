import 'package:flutter/material.dart';
import 'tokens.dart';
import 'net_image.dart';

/// The Fizmoh component kit.
///
/// Every screen is assembled from these. Nothing here knows about bookings or
/// conversations — a component that knows what it contains cannot be reused,
/// and duplicating it per screen is how five screens end up with five
/// slightly different rows.

// ── surfaces ────────────────────────────────────────────────────────────────

/// A section of content. Flat by default: separation comes from a hairline and
/// the canvas behind it, not from a shadow under everything.
class Panel extends StatelessWidget {
  const Panel({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(T.s4),
    this.margin = EdgeInsets.zero,
    this.onTap,
    this.selected = false,
    this.elevated = false,
  });

  final Widget child;
  final EdgeInsets padding;
  final EdgeInsets margin;
  final VoidCallback? onTap;
  final bool selected;
  final bool elevated;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final dark = Theme.of(context).brightness == Brightness.dark;

    return Padding(
      padding: margin,
      child: AnimatedContainer(
        duration: T.motion(context, T.fast),
        decoration: BoxDecoration(
          color: selected ? T.brandTint.withValues(alpha: dark ? .08 : 1) : scheme.surface,
          borderRadius: BorderRadius.circular(T.rLg),
          border: Border.all(color: selected ? scheme.primary.withValues(alpha: .4) : scheme.outlineVariant),
          boxShadow: elevated ? T.shadow(1, dark: dark) : null,
        ),
        clipBehavior: Clip.antiAlias,
        child: Material(
          color: Colors.transparent,
          child: InkWell(onTap: onTap, child: Padding(padding: padding, child: child)),
        ),
      ),
    );
  }
}

/// A row in a dense list. No card, no shadow — a hairline and generous tap
/// height. Cards around every row waste a third of a phone screen on borders.
class ListRow extends StatelessWidget {
  const ListRow({
    super.key,
    required this.child,
    this.onTap,
    this.selected = false,
    this.padding = const EdgeInsets.symmetric(horizontal: T.s4, vertical: T.s3),
    this.divider = true,
  });

  final Widget child;
  final VoidCallback? onTap;
  final bool selected;
  final EdgeInsets padding;
  final bool divider;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Material(
      color: selected ? scheme.primary.withValues(alpha: .06) : Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Container(
          constraints: const BoxConstraints(minHeight: T.tapMin + 16),
          decoration: divider
              ? BoxDecoration(
                  border: Border(bottom: BorderSide(color: scheme.outlineVariant.withValues(alpha: .7))))
              : null,
          padding: padding,
          child: child,
        ),
      ),
    );
  }
}

// ── identity ────────────────────────────────────────────────────────────────

class Avatar extends StatelessWidget {
  const Avatar({super.key, required this.name, this.imageUrl, this.size = 40, this.badge});

  final String name;
  final String? imageUrl;
  final double size;

  /// A small overlay in the corner — a channel mark, or presence.
  final Widget? badge;

  String get _initials {
    final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    if (parts.length == 1) {
      return parts.first.length >= 2
          ? parts.first.substring(0, 2).toUpperCase()
          : parts.first.toUpperCase();
    }
    return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
  }

  String? get _resolvedUrl {
    if (imageUrl == null || imageUrl!.trim().isEmpty) return null;
    var url = imageUrl!.trim();
    if (url.startsWith('file://')) {
      url = url.replaceFirst(RegExp(r'^file://+'), '/');
    }
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/')) return 'https://app.fizmoh.cloud$url';
    return 'https://app.fizmoh.cloud/$url';
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final resolved = _resolvedUrl;

    final avatar = Container(
      height: size,
      width: size,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: scheme.primary.withValues(alpha: .12),
      ),
      child: resolved != null
          ? cachedNetworkImage(
              resolved,
              height: size,
              width: size,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Center(
                child: Text(_initials,
                    style: TextStyle(
                      color: scheme.primary,
                      fontSize: size * .34,
                      fontWeight: FontWeight.w700,
                      letterSpacing: -0.2,
                    )),
              ),
            )
          : Center(
              child: Text(_initials,
                  style: TextStyle(
                    color: scheme.primary,
                    fontSize: size * .34,
                    fontWeight: FontWeight.w700,
                    letterSpacing: -0.2,
                  )),
            ),
    );

    if (badge == null) return avatar;
    return Stack(clipBehavior: Clip.none, children: [
      avatar,
      Positioned(right: -1, bottom: -1, child: badge!),
    ]);
  }
}

// ── status ──────────────────────────────────────────────────────────────────

enum Tone { neutral, brand, success, pending, danger }

/// A status word. The word carries the meaning; the colour only reinforces it,
/// so it still reads for anyone who cannot separate the hues.
class StatusBadge extends StatelessWidget {
  const StatusBadge({super.key, required this.label, this.tone = Tone.neutral, this.dot = false});

  final String label;
  final Tone tone;
  final bool dot;

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final scheme = Theme.of(context).colorScheme;

    final (fg, bg) = switch (tone) {
      Tone.brand => (T.brand, T.brandTint),
      Tone.success => (T.success, T.successTint),
      Tone.pending => (T.pending, T.pendingTint),
      Tone.danger => (T.danger, T.dangerTint),
      Tone.neutral => (scheme.onSurfaceVariant, scheme.surfaceContainerHighest),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: T.s2, vertical: 3),
      decoration: BoxDecoration(
        color: dark ? fg.withValues(alpha: .16) : bg,
        borderRadius: BorderRadius.circular(T.rXs),
      ),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        if (dot) ...[
          Container(height: 5, width: 5, decoration: BoxDecoration(color: fg, shape: BoxShape.circle)),
          const SizedBox(width: 5),
        ],
        Text(label,
            style: TextStyle(
                fontSize: 11.5, fontWeight: FontWeight.w700, letterSpacing: -0.1,
                color: dark ? fg.withValues(alpha: .95) : fg)),
      ]),
    );
  }
}

// ── controls ────────────────────────────────────────────────────────────────

/// A compact filter. Selected state is a filled pill; unselected is a hairline.
class FilterPill extends StatelessWidget {
  const FilterPill({
    super.key,
    required this.label,
    required this.selected,
    required this.onTap,
    this.count,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;
  final int? count;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Semantics(
      button: true,
      selected: selected,
      label: count != null && count! > 0 ? '$label, $count' : label,
      child: AnimatedContainer(
        duration: T.motion(context, T.fast),
        margin: const EdgeInsets.only(right: T.s2),
        decoration: BoxDecoration(
          color: selected ? scheme.primary : scheme.surface,
          borderRadius: BorderRadius.circular(T.rFull),
          border: Border.all(color: selected ? scheme.primary : scheme.outlineVariant),
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(T.rFull),
            onTap: onTap,
            child: Padding(
              padding: EdgeInsets.fromLTRB(
                  T.s3, 8, count != null && count! > 0 ? 7 : T.s3, 8),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                Text(label,
                    style: TextStyle(
                      fontSize: 13.5, fontWeight: FontWeight.w600, letterSpacing: -0.1,
                      color: selected ? scheme.onPrimary : scheme.onSurface,
                    )),
                if (count != null && count! > 0) ...[
                  const SizedBox(width: 7),
                  // The count sits in its own chip rather than loose beside the
                  // word, so "Unread 3" cannot be misread as one phrase.
                  Container(
                    constraints: const BoxConstraints(minWidth: 21),
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: selected
                          ? scheme.onPrimary.withValues(alpha: .22)
                          : scheme.primary.withValues(alpha: .10),
                      borderRadius: BorderRadius.circular(T.rFull),
                    ),
                    child: Text('$count',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 11.5, height: 1.25, fontWeight: FontWeight.w700,
                          color: selected ? scheme.onPrimary : scheme.primary,
                        )),
                  ),
                ],
              ]),
            ),
          ),
        ),
      ),
    );
  }
}

class SearchField extends StatelessWidget {
  const SearchField({
    super.key,
    required this.controller,
    required this.hint,
    required this.onChanged,
  });

  final TextEditingController controller;
  final String hint;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return TextField(
      controller: controller,
      onChanged: onChanged,
      textInputAction: TextInputAction.search,
      style: Type.body(context),
      decoration: InputDecoration(
        hintText: hint,
        isDense: true,
        contentPadding: const EdgeInsets.symmetric(horizontal: T.s3, vertical: 11),
        prefixIcon: Icon(Icons.search_rounded, size: T.iconMd, color: scheme.onSurfaceVariant),
        prefixIconConstraints: const BoxConstraints(minWidth: 38),
        suffixIcon: controller.text.isEmpty
            ? null
            : IconButton(
                tooltip: 'Clear search',
                icon: Icon(Icons.close_rounded, size: T.iconSm, color: scheme.onSurfaceVariant),
                onPressed: () { controller.clear(); onChanged(''); },
              ),
      ),
    );
  }
}

/// A page heading. Title, an optional line of context, and room for one action.
class PageHeader extends StatelessWidget {
  const PageHeader({super.key, required this.title, this.subtitle, this.trailing, this.leading});

  final String title;
  final String? subtitle;
  final Widget? trailing;
  final Widget? leading;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(T.s4, T.s4, T.s4, T.s3),
      child: Row(children: [
        if (leading != null) ...[leading!, const SizedBox(width: T.s3)],
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: Type.pageTitle(context)),
            if (subtitle != null) ...[
              const SizedBox(height: 2),
              Text(subtitle!, style: Type.secondary(context)),
            ],
          ]),
        ),
        if (trailing != null) trailing!,
      ]),
    );
  }
}

// ── states ──────────────────────────────────────────────────────────────────

/// What a screen shows when there is nothing to show. Compact and centred —
/// an empty state that fills the screen with whitespace reads as a fault.
class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    required this.icon,
    required this.title,
    this.message,
    this.actionLabel,
    this.onAction,
    this.compact = false,
  });

  final IconData icon;
  final String title;
  final String? message;
  final String? actionLabel;
  final VoidCallback? onAction;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Center(
      child: Padding(
        padding: EdgeInsets.symmetric(horizontal: T.s8, vertical: compact ? T.s6 : T.s10),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, size: 28, color: scheme.onSurfaceVariant.withValues(alpha: .55)),
          const SizedBox(height: T.s3),
          Text(title, textAlign: TextAlign.center, style: Type.section(context)),
          if (message != null) ...[
            const SizedBox(height: T.s1),
            Text(message!, textAlign: TextAlign.center, style: Type.secondary(context)),
          ],
          if (actionLabel != null && onAction != null) ...[
            const SizedBox(height: T.s4),
            OutlinedButton(onPressed: onAction, child: Text(actionLabel!)),
          ],
        ]),
      ),
    );
  }
}

/// A placeholder in the shape of what is coming.
class Skeleton extends StatefulWidget {
  const Skeleton({super.key, this.height = 16, this.width, this.radius = T.rSm});

  final double height;
  final double? width;
  final double radius;

  @override
  State<Skeleton> createState() => _SkeletonState();
}

class _SkeletonState extends State<Skeleton> with SingleTickerProviderStateMixin {
  late final AnimationController _c =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 1100));

  @override
  void initState() {
    super.initState();
    // Respect stillness: a shimmer is decoration, and decoration is the first
    // thing to drop when somebody has asked for less movement.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && !T.stillness(context)) _c.repeat();
    });
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return AnimatedBuilder(
      animation: _c,
      builder: (context, _) => Container(
        height: widget.height,
        width: widget.width,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(widget.radius),
          color: scheme.surfaceContainerHighest,
          gradient: _c.isAnimating
              ? LinearGradient(
                  begin: Alignment(-1 - 2 * _c.value, 0),
                  end: Alignment(1 - 2 * _c.value, 0),
                  colors: [
                    scheme.surfaceContainerHighest,
                    scheme.surfaceContainerHighest.withValues(alpha: .45),
                    scheme.surfaceContainerHighest,
                  ],
                )
              : null,
        ),
      ),
    );
  }
}

/// A skeleton shaped like a list row, so loading looks like what arrives.
class SkeletonRow extends StatelessWidget {
  const SkeletonRow({super.key, this.lines = 2});

  final int lines;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: T.s4, vertical: T.s3),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Skeleton(height: 40, width: 40, radius: T.rFull),
        const SizedBox(width: T.s3),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Skeleton(height: 13, width: 130),
            const SizedBox(height: T.s2),
            if (lines > 1) const Skeleton(height: 11, width: double.infinity),
          ]),
        ),
      ]),
    );
  }
}

// ── feedback ────────────────────────────────────────────────────────────────

/// One way to tell somebody something happened.
void notify(BuildContext context, String message, {Tone tone = Tone.neutral}) {
  final icon = switch (tone) {
    Tone.success => Icons.check_circle_rounded,
    Tone.danger => Icons.error_rounded,
    Tone.pending => Icons.schedule_rounded,
    _ => Icons.info_rounded,
  };
  final colour = switch (tone) {
    Tone.success => const Color(0xFF34D399),
    Tone.danger => const Color(0xFFF87171),
    Tone.pending => const Color(0xFFFBBF24),
    _ => Colors.white70,
  };

  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(
      duration: const Duration(seconds: 3),
      content: Row(children: [
        Icon(icon, size: T.iconSm, color: colour),
        const SizedBox(width: T.s2),
        Expanded(child: Text(message)),
      ]),
    ));
}

/// A tap target that is always at least 44pt, whatever is inside it.
class IconAction extends StatelessWidget {
  const IconAction({
    super.key,
    required this.icon,
    required this.onPressed,
    required this.tooltip,
    this.tone,
  });

  final IconData icon;
  final VoidCallback? onPressed;
  final String tooltip;
  final Color? tone;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: Semantics(
        button: true,
        label: tooltip,
        child: InkWell(
          onTap: onPressed,
          customBorder: const CircleBorder(),
          child: SizedBox(
            height: T.tapMin,
            width: T.tapMin,
            child: Icon(icon,
                size: T.iconMd,
                color: tone ?? Theme.of(context).colorScheme.onSurfaceVariant),
          ),
        ),
      ),
    );
  }
}
