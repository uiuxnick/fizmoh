import 'package:flutter/material.dart';
import 'theme.dart';

/// What can be attached to a message.
class AttachmentChoice {
  const AttachmentChoice(this.kind);
  final String kind;
}

/// The sheet behind the paperclip.
///
/// Four large targets rather than a cramped row of icons: this opens on a
/// phone, usually one-handed, often in a hurry.
Future<String?> showAttachmentSheet(BuildContext context) {
  return showModalBottomSheet<String>(
    context: context,
    showDragHandle: true,
    builder: (context) {
      final scheme = Theme.of(context).colorScheme;
      const options = [
        (kind: 'camera', icon: Icons.photo_camera_outlined, label: 'Camera', hint: 'Take a photo now'),
        (kind: 'gallery', icon: Icons.photo_library_outlined, label: 'Photo', hint: 'From the library'),
        (kind: 'document', icon: Icons.description_outlined, label: 'Document', hint: 'PDF, spreadsheet, anything'),
        (kind: 'location', icon: Icons.location_on_outlined, label: 'Location', hint: 'Share where you are'),
        (kind: 'payment', icon: Icons.payment_rounded, label: 'Payment Link', hint: 'Generate AmwalPay checkout card'),
      ];

      return SafeArea(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(F.xl, 0, F.xl, F.sm),
            child: Row(children: [
              Text('Attach', style: Theme.of(context).textTheme.titleMedium
                  ?.copyWith(fontWeight: FontWeight.w700)),
            ]),
          ),
          for (final option in options)
            ListTile(
              leading: Container(
                height: 44, width: 44,
                decoration: BoxDecoration(
                  color: scheme.primary.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(F.rMd),
                ),
                child: Icon(option.icon, color: scheme.primary, size: 21),
              ),
              title: Text(option.label, style: const TextStyle(fontWeight: FontWeight.w600)),
              subtitle: Text(option.hint, style: const TextStyle(fontSize: 12)),
              onTap: () => Navigator.pop(context, option.kind),
            ),
          const SizedBox(height: F.sm),
        ]),
      );
    },
  );
}
