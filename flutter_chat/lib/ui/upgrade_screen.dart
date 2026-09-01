import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'tokens.dart';

/// Shown instead of the app when this build is older than the server supports.
///
/// A wall rather than a banner, because the alternative to a wall is an app
/// that half works: requests failing in ways nobody can explain, bookings that
/// appear not to save, and a support conversation that starts with "it's
/// broken" instead of "update it".
class UpgradeScreen extends StatelessWidget {
  const UpgradeScreen({super.key, required this.message, required this.storeUrl});

  final String message;
  final String storeUrl;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(28),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.system_update_rounded, size: 56, color: scheme.primary),
                const SizedBox(height: T.s5),
                Text(
                  'Time to update',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: T.s3),
                Text(
                  message.isNotEmpty
                      ? message
                      : 'This version of FizMoh is too old to work with the server. '
                          'Install the latest one to carry on.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 14.5, color: scheme.onSurfaceVariant, height: 1.45),
                ),
                const SizedBox(height: T.s6),
                // Only offered when there is somewhere real to send people. A
                // button that opens nothing is worse than no button at all.
                if (storeUrl.isNotEmpty)
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: () => launchUrl(
                        Uri.parse(storeUrl),
                        mode: LaunchMode.externalApplication,
                      ),
                      style: FilledButton.styleFrom(minimumSize: const Size(0, 50)),
                      child: const Text('Update now'),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
