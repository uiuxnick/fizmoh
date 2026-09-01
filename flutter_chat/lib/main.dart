import 'dart:async';

import 'package:flutter/material.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:provider/provider.dart';
import 'package:sentry_flutter/sentry_flutter.dart';
import 'core/api_client.dart';
import 'core/attachments.dart';
import 'core/local_store.dart';
import 'core/appearance.dart';
import 'core/call_service.dart';
import 'core/chat_store.dart';
import 'core/notifier.dart';
import 'core/push.dart';
import 'ui/call_overlay.dart';
import 'ui/login_screen.dart';
import 'ui/shell.dart';
import 'ui/splash.dart';
import 'ui/tokens.dart';
import 'ui/upgrade_screen.dart';

/// Where crashes are reported, if anywhere.
///
/// Empty by default, and an empty DSN means Sentry is never started at all —
/// no network calls, no init cost, nothing to leak. A release passes the real
/// value with --dart-define=SENTRY_DSN=... so that a debug build and a
/// contributor's checkout stay silent.
const String _sentryDsn = String.fromEnvironment('SENTRY_DSN');

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  if (_sentryDsn.isEmpty) {
    runApp(const InboxApp());
    return;
  }

  // Every crash from a real install, rather than only the ones somebody
  // happens to reproduce on a simulator with a debugger attached.
  await SentryFlutter.init(
    (options) {
      options.dsn = _sentryDsn;
      // Performance tracing is off. This is here to find crashes, and sampling
      // every transaction on a phone budget buys nothing towards that.
      options.tracesSampleRate = 0.0;
      // Breadcrumbs record which screens were open before a crash. Request
      // bodies are not attached: they contain customers' messages.
      options.maxBreadcrumbs = 50;
      options.sendDefaultPii = false;
      options.environment = const bool.fromEnvironment('dart.vm.product')
          ? 'production'
          : 'development';
    },
    appRunner: () => runApp(const InboxApp()),
  );
}

class InboxApp extends StatefulWidget {
  const InboxApp({super.key});

  @override
  State<InboxApp> createState() => _InboxAppState();
}

class _InboxAppState extends State<InboxApp> with WidgetsBindingObserver {
  final ApiClient _api = ApiClient();
  final Appearance _appearance = Appearance();
  CallService? _calls;
  ChatStore? _store;
  Push? _push;
  bool _restoring = true;
  bool _signedIn = false;

  /// What the server requires of this build, and what this build is. Both
  /// start permissive: until proven otherwise, the app works.
  AppVersion _required = const AppVersion.none();
  int _build = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _restore();
    unawaited(_checkVersion());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  /// Coming back to the foreground is the moment to try again.
  ///
  /// A phone that was in a lift, or asleep in a pocket, has a queue to drain
  /// and a stream to reopen, and neither happens on its own.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed) return;
    unawaited(_store?.flushOutbox() ?? Future.value());
    unawaited(_checkVersion());
  }

  /// Asks whether this build is still supported.
  ///
  /// Failure is silent and permissive by design — the server being
  /// unreachable is not evidence that the app is out of date, and locking
  /// somebody out on that basis would turn an outage into an outage nobody
  /// can work through.
  Future<void> _checkVersion() async {
    try {
      final info = await PackageInfo.fromPlatform();
      final build = int.tryParse(info.buildNumber) ?? 0;
      final required = await _api.appVersion();
      if (!mounted) return;
      setState(() {
        _build = build;
        _required = required;
      });
    } catch (_) {
      // Leaves the permissive defaults in place.
    }
  }

  Future<void> _restore() async {
    final splashWait = Future.delayed(const Duration(milliseconds: 650));
    await _appearance.restore();
    unawaited(Attachments.pruneOldRecordings());
    final ok = await _api.restore();
    await splashWait;
    if (!mounted) return;
    setState(() {
      _signedIn = ok;
      _restoring = false;
      if (ok) _startSession();
    });
    Notifier.instance.requestPermission();
  }

  void _onSignedIn() {
    setState(() {
      _signedIn = true;
      _startSession();
    });
  }

  /// Everything that only exists while somebody is signed in.
  void _startSession() {
    // The phone's copy of the inbox, opened per account so a shared handset
    // never shows one person another's conversations. Awaited by nobody: the
    // screens read through the client, which simply has no cache until this
    // resolves a moment later.
    final staffId = _api.staff?.id;
    if (staffId != null) {
      unawaited(LocalStore.open(staffId).then((store) {
        _api.cache = store;
        // A message typed during the last run, on a connection that never
        // came back, goes out now. Nothing else knows the queue exists until
        // the cache is open, so this is the first chance there is.
        return _store?.flushOutbox();
      }));
    }

    final calls = CallService(_api);
    _calls = calls;
    _store = ChatStore(_api, calls: calls);
    // Permission is asked for here rather than at launch: a prompt shown
    // before anybody has seen what the app does is the reliable way to be
    // refused for ever.
    _push = Push(_api, calls)..start();
    Notifier.instance.requestPermission();
  }

  Future<void> _signOut() async {
    // The store owns a live connection; it has to be torn down before the
    // token it authenticated with is thrown away.
    // The phone must stop being told about an account that is no longer on
    // it, and this has to happen while the token still authenticates.
    await _push?.stop();
    _push = null;
    // The cached inbox belongs to the account that was signed in, not to the
    // phone. Leaving it would show the next person the last one's messages.
    final cache = _api.cache;
    _api.cache = null;
    if (cache != null) {
      await cache.clear();
      await cache.close();
    }
    _store?.dispose();
    _store = null;
    _calls?.dispose();
    _calls = null;
    await _api.signOut();
    if (mounted) setState(() => _signedIn = false);
  }

  @override
  Widget build(BuildContext context) {
    // Above MaterialApp, not inside `home`.
    //
    // A dialog or bottom sheet is pushed onto the Navigator that MaterialApp
    // owns, so its context's ancestors stop at MaterialApp — anything provided
    // below that point is invisible to every sheet in the app. With the
    // providers here, a sheet can read the client and the store like any other
    // widget, instead of each one having to be handed its dependencies by hand.
    return MultiProvider(
      providers: [
        Provider<ApiClient>.value(value: _api),
        ChangeNotifierProvider<Appearance>.value(value: _appearance),
      ],
      child: _store == null || _calls == null
          ? _app()
          : MultiProvider(
              providers: [
                ChangeNotifierProvider<ChatStore>.value(value: _store!),
                ChangeNotifierProvider<CallService>.value(value: _calls!),
              ],
              child: _app(),
            ),
    );
  }

  Widget _app() {
    return AnimatedBuilder(
      animation: _appearance,
      builder: (context, _) => MaterialApp(
      title: 'FizMoh',
      debugShowCheckedModeBanner: false,
      theme: fizmohTheme(Brightness.light),
      darkTheme: fizmohTheme(Brightness.dark),
      themeMode: _appearance.mode,
      home: Builder(builder: (context) {
        // The splash covers the wait, and goes the moment it is over. A
        // minimum display time would be holding somebody on a logo for the
        // benefit of the logo.
        if (_restoring) return const Splash();
        // Before anything else, including the sign-in screen: an app the
        // server will not talk to cannot sign anybody in either.
        if (_required.blocks(_build)) {
          return UpgradeScreen(message: _required.message, storeUrl: _required.storeUrl);
        }
        if (!_signedIn || _store == null) {
          return LoginScreen(onSignedIn: _onSignedIn);
        }
        // The call sits over every screen: there are about forty seconds to
        // answer, which is no time to be looking for the right tab.
        return CallOverlay(child: Shell(onSignedOut: _signOut));
      }),
      ),
    );
  }
}
