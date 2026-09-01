import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher_string.dart';
import 'theme.dart';
import 'net_image.dart';

void showMediaLightbox(BuildContext context, String url) {
  HapticFeedback.lightImpact();
  showDialog<void>(
    context: context,
    useSafeArea: false,
    builder: (dialogContext) => Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        iconTheme: const IconThemeData(color: Colors.white),
        leading: IconButton(
          icon: const Icon(Icons.close_rounded, color: Colors.white),
          onPressed: () => Navigator.pop(dialogContext),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.open_in_browser_rounded, color: Colors.white),
            tooltip: 'Open original',
            onPressed: () async {
              try {
                if (await canLaunchUrlString(url)) {
                  await launchUrlString(url, mode: LaunchMode.externalApplication);
                }
              } catch (_) {}
            },
          ),
        ],
      ),
      body: Center(
        child: InteractiveViewer(
          minScale: 0.8,
          maxScale: 4.0,
          child: cachedNetworkImage(
            url,
            fit: BoxFit.contain,
            loadingBuilder: (_, child, progress) => progress == null
                ? child
                : const Center(child: CircularProgressIndicator(color: Colors.white)),
            errorBuilder: (_, __, ___) => const Center(
              child: Icon(Icons.broken_image_outlined, size: 64, color: Colors.white54),
            ),
          ),
        ),
      ),
    ),
  );
}

/// The pieces every screen is built from.
///
/// Written once here rather than five times across five screens: a card that
/// is 16pt on one screen and 20pt on another is the difference between a
/// product and a collection of screens.

/// A surface that sits above the canvas.
class FCard extends StatelessWidget {
  const FCard({
    super.key,
    required this.child,
    this.onTap,
    this.padding = const EdgeInsets.all(F.lg),
    this.margin = EdgeInsets.zero,
    this.selected = false,
  });

  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsets padding;
  final EdgeInsets margin;
  final bool selected;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: margin,
      child: AnimatedContainer(
        duration: F.quick,
        decoration: BoxDecoration(
          color: selected ? scheme.primary.withValues(alpha: 0.06) : scheme.surface,
          borderRadius: BorderRadius.circular(F.rLg),
          border: selected ? Border.all(color: scheme.primary.withValues(alpha: 0.35)) : null,
          boxShadow: F.lift(context),
        ),
        child: Material(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(F.rLg),
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(F.rLg),
            child: Padding(padding: padding, child: child),
          ),
        ),
      ),
    );
  }
}

/// A person, as a circle. Falls back to initials on the brand tint, which is
/// what most WhatsApp customers will have — very few set a picture a business
/// can see.
class FAvatar extends StatelessWidget {
  const FAvatar({super.key, required this.initials, this.imageUrl, this.size = 44, this.online});

  final String initials;
  final String? imageUrl;
  final double size;
  final bool? online;

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
        gradient: resolved == null
            ? LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  scheme.primary.withValues(alpha: 0.22),
                  scheme.primary.withValues(alpha: 0.12),
                ],
              )
            : null,
      ),
      alignment: Alignment.center,
      child: resolved != null
          ? cachedNetworkImage(
              resolved,
              height: size,
              width: size,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Center(
                child: Text(
                  initials,
                  style: TextStyle(
                    color: scheme.primary,
                    fontWeight: FontWeight.w700,
                    fontSize: size * 0.32,
                  ),
                ),
              ),
            )
          : Text(
              initials,
              style: TextStyle(
                color: scheme.primary,
                fontWeight: FontWeight.w700,
                fontSize: size * 0.32,
              ),
            ),
    );

    if (online == null) return avatar;
    return Stack(clipBehavior: Clip.none, children: [
      avatar,
      Positioned(
        right: 0,
        bottom: 0,
        child: Container(
          height: size * 0.28,
          width: size * 0.28,
          decoration: BoxDecoration(
            color: online! ? const Color(0xFF22C55E) : scheme.outlineVariant,
            shape: BoxShape.circle,
            // The ring is what stops the dot disappearing into a dark avatar.
            border: Border.all(color: scheme.surface, width: 2),
          ),
        ),
      ),
    ]);
  }
}

/// A small status word. Colour alone never carries the meaning — the label
/// says it too, which is what makes it readable to someone who cannot
/// distinguish the colours.
class FBadge extends StatelessWidget {
  const FBadge({super.key, required this.label, required this.tone, this.icon});

  final String label;
  final Color tone;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: icon == null ? 9 : 7, vertical: 3),
      decoration: BoxDecoration(
        color: tone.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(F.rPill),
      ),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        if (icon != null) ...[Icon(icon, size: 11, color: tone), const SizedBox(width: 4)],
        Text(label, style: TextStyle(color: tone, fontSize: 11, fontWeight: FontWeight.w700)),
      ]),
    );
  }
}

/// A filter pill.
class FChip extends StatelessWidget {
  const FChip({super.key, required this.label, required this.selected, required this.onTap, this.count = 0});

  final String label;
  final bool selected;
  final VoidCallback onTap;
  final int count;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return AnimatedContainer(
      duration: F.quick,
      curve: F.enterCurve,
      margin: const EdgeInsets.only(right: F.sm),
      decoration: BoxDecoration(
        color: selected ? scheme.primary : scheme.surface,
        borderRadius: BorderRadius.circular(F.rPill),
        boxShadow: selected ? F.lift(context) : null,
        border: selected ? null : Border.all(color: scheme.outlineVariant),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(F.rPill),
          onTap: onTap,
          child: Padding(
            // 10 vertical puts the pill over 40pt tall with the text — close
            // enough to the 44 minimum for a secondary control in a row.
            padding: const EdgeInsets.symmetric(horizontal: F.lg, vertical: 10),
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              Text(label, style: TextStyle(
                fontSize: 13.5,
                fontWeight: FontWeight.w600,
                color: selected ? scheme.onPrimary : scheme.onSurfaceVariant,
              )),
              if (count > 0) ...[
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                  decoration: BoxDecoration(
                    color: selected ? Colors.white.withValues(alpha: 0.25) : scheme.primary,
                    borderRadius: BorderRadius.circular(F.rPill),
                  ),
                  child: Text('$count', style: TextStyle(
                    fontSize: 10.5, fontWeight: FontWeight.w800,
                    color: selected ? Colors.white : scheme.onPrimary,
                  )),
                ),
              ],
            ]),
          ),
        ),
      ),
    );
  }
}

/// What a screen shows when there is nothing to show.
///
/// A blank area reads as a fault. This says what would be here and, where
/// there is one, offers the action that would put something in it.
class FEmpty extends StatelessWidget {
  const FEmpty({
    super.key,
    required this.icon,
    required this.title,
    this.message,
    this.action,
    this.onAction,
  });

  final IconData icon;
  final String title;
  final String? message;
  final String? action;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(F.xxl),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(
            height: 72, width: 72,
            decoration: BoxDecoration(
              color: scheme.primary.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(F.rLg),
            ),
            child: Icon(icon, size: 30, color: scheme.primary.withValues(alpha: 0.7)),
          ),
          const SizedBox(height: F.lg),
          Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          if (message != null) ...[
            const SizedBox(height: F.sm),
            Text(
              message!,
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13.5, height: 1.45, color: scheme.onSurfaceVariant),
            ),
          ],
          if (action != null && onAction != null) ...[
            const SizedBox(height: F.xl),
            FilledButton(onPressed: onAction, child: Text(action!)),
          ],
        ]),
      ),
    );
  }
}

/// A screen title with optional trailing controls.
class FHeader extends StatelessWidget {
  const FHeader({super.key, required this.title, this.subtitle, this.trailing});

  final String title;
  final String? subtitle;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(F.lg, F.lg, F.lg, F.md),
      child: Row(children: [
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: const TextStyle(
              fontSize: 26, fontWeight: FontWeight.w800, letterSpacing: -0.6)),
            if (subtitle != null) ...[
              const SizedBox(height: 2),
              Text(subtitle!, style: TextStyle(
                  fontSize: 13, color: Theme.of(context).colorScheme.onSurfaceVariant)),
            ],
          ]),
        ),
        if (trailing != null) trailing!,
      ]),
    );
  }
}

/// The live/reconnecting indicator.
class FLiveDot extends StatelessWidget {
  const FLiveDot({super.key, required this.live});

  final bool live;

  @override
  Widget build(BuildContext context) {
    final colour = live ? const Color(0xFF22C55E) : F.warning;
    return Tooltip(
      message: live
          ? 'Connected — messages arrive as they are sent'
          : 'Reconnecting. What you are looking at may be a moment behind.',
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: colour.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(F.rPill),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Container(height: 7, width: 7, decoration: BoxDecoration(color: colour, shape: BoxShape.circle)),
          const SizedBox(width: 6),
          Text(live ? 'Live' : 'Reconnecting',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: colour)),
        ]),
      ),
    );
  }
}

/// A shimmering placeholder, used while a list loads.
///
/// A skeleton in the shape of the content tells someone what is coming; a
/// spinner in the middle of a blank screen tells them only to wait.
class FSkeleton extends StatefulWidget {
  const FSkeleton({super.key, this.height = 72, this.margin = const EdgeInsets.only(bottom: F.sm)});

  final double height;
  final EdgeInsets margin;

  @override
  State<FSkeleton> createState() => _FSkeletonState();
}

class _FSkeletonState extends State<FSkeleton> with SingleTickerProviderStateMixin {
  late final AnimationController _controller =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 1200))..repeat();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) => Container(
        height: widget.height,
        margin: widget.margin,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(F.rLg),
          gradient: LinearGradient(
            begin: Alignment(-1 - 2 * _controller.value, 0),
            end: Alignment(1 - 2 * _controller.value, 0),
            colors: [
              scheme.surfaceContainerHighest.withValues(alpha: 0.5),
              scheme.surfaceContainerHighest,
              scheme.surfaceContainerHighest.withValues(alpha: 0.5),
            ],
          ),
        ),
      ),
    );
  }
}
