import 'package:flutter/material.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';
import 'package:provider/provider.dart';
import '../core/api_client.dart';
import 'auth_widgets.dart';
import 'brand.dart';
import 'tokens.dart';


/// Whether this build has a real Google iOS client configured.
///
/// Set at build time — `--dart-define=GOOGLE_SIGN_IN=true` — and left false
/// until Info.plist carries a genuine GIDClientID and the matching reversed
/// client URL scheme. It is a build fact, not a runtime one: the value lives
/// in the app bundle, and asking the SDK is what crashes.
const bool googleSignInConfigured =
    bool.fromEnvironment('GOOGLE_SIGN_IN', defaultValue: false);

/// Signing in to FizMoh.
///
/// Two methods on one screen: a password, or a one-time code sent over
/// WhatsApp or email. An agent on the road rarely remembers a password but
/// always has the phone the code lands on; an administrator at a desk wants
/// the password. Offering only one makes the app tiresome for half the people
/// who use it.
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, required this.onSignedIn});

  final VoidCallback onSignedIn;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

enum _Method { password, code }

class _LoginScreenState extends State<LoginScreen> {
  final _identifier = TextEditingController();
  final _password = TextEditingController();
  final _otp = TextEditingController();
  final _scroll = ScrollController();

  _Method _method = _Method.password;
  bool _remember = true;
  bool _codeSent = false;
  bool _busy = false;
  bool _obscure = true;
  String? _error;
  String? _identifierError;
  String? _notice;

  @override
  void dispose() {
    _identifier.dispose();
    _password.dispose();
    _otp.dispose();
    _scroll.dispose();
    super.dispose();
  }

  /// Whether what has been typed looks like a phone number.
  ///
  /// Decides the keyboard and the delivery channel without making anybody pick
  /// from a menu: a number can only be reached over WhatsApp, so the choice
  /// disappears rather than offering email that cannot arrive.
  String get _normalizedIdentifier {
    final raw = _identifier.text.trim();
    if (raw.isEmpty) return raw;
    if (_looksLikePhone) {
      final digits = raw.replaceAll(RegExp(r'\D'), '');
      if (raw.startsWith('+')) return '+$digits';
      if (digits.length == 8) return '+968$digits';
      if (digits.startsWith('968')) return '+$digits';
      return '+$digits';
    }
    return raw;
  }

  bool get _looksLikePhone {
    final value = _identifier.text.trim();
    return value.startsWith('+') || RegExp(r'^[0-9\s()-]{6,}$').hasMatch(value);
  }

  bool get _identifierLooksValid {
    final value = _identifier.text.trim();
    if (value.isEmpty) return false;
    if (_looksLikePhone) return value.replaceAll(RegExp(r'\D'), '').length >= 8;
    return RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]{2,}$').hasMatch(value);
  }

  Future<void> _run(Future<void> Function() action) async {
    if (_busy) return;
    FocusScope.of(context).unfocus();
    setState(() { _busy = true; _error = null; _notice = null; });
    try {
      await action();
    } catch (e) {
      setState(() => _error = e is ApiException ? e.message : 'Something went wrong. Try again.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _validateIdentifier() {
    setState(() {
      _identifierError = _identifier.text.trim().isEmpty
          ? null
          : _identifierLooksValid
              ? null
              : _looksLikePhone
                  ? 'Enter a valid phone number (e.g. 98314456)'
                  : 'That does not look like an email address';
    });
  }

  Future<void> _signInWithPassword() => _run(() async {
        if (!_identifierLooksValid) { _validateIdentifier(); return; }
        if (_password.text.isEmpty) {
          setState(() => _error = 'Enter your password');
          return;
        }
        final api = context.read<ApiClient>();
        await api.signIn(_normalizedIdentifier, _password.text);
        if (!_remember) await api.forgetOnClose();
        widget.onSignedIn();
      });

  Future<void> _sendCode() => _run(() async {
        if (!_identifierLooksValid) { _validateIdentifier(); return; }
        await context.read<ApiClient>()
            .requestOtp(_normalizedIdentifier, byWhatsApp: _looksLikePhone);
        setState(() {
          _codeSent = true;
          _notice = _looksLikePhone
              ? 'Code sent over WhatsApp. It lasts five minutes.'
              : 'If that account exists, a code is on its way. It lasts five minutes.';
        });
      });

  Future<void> _signInWithCode() => _run(() async {
        final api = context.read<ApiClient>();
        await api.signInWithOtp(_normalizedIdentifier, _otp.text.trim());
        if (!_remember) await api.forgetOnClose();
        widget.onSignedIn();
      });

  /// There is no password-reset email, but there is a one-time code — which is
  /// a genuine way back in rather than a link to a page that does not exist.
  void _forgotPassword() {
    setState(() {
      _method = _Method.code;
      _codeSent = false;
      _error = null;
      _notice = 'Sign in with a one-time code instead, then set a new password from your profile.';
    });
  }

  /// Signs in with Google.
  ///
  /// The account has to exist here already — the server refuses an address
  /// that is not staff. That is the point of it: a Google account proves who
  /// somebody is, not that they work here.
  Future<void> _google() async {
    /*
     * Refused before the SDK is touched, when it is not configured.
     *
     * GoogleSignIn throws an uncaught Objective-C exception — "No active
     * configuration. Make sure GIDClientID is set in Info.plist" — which kills
     * the process outright. Nothing in Dart can catch that, so the only place
     * to stop it is before the call. iOS needs a real GIDClientID and the
     * matching reversed-client URL scheme; the project currently carries a
     * placeholder, so tapping the button closed the app.
     */
    if (!googleSignInConfigured) {
      setState(() => _error = 'Google sign-in is not set up on this build yet. '
          'Use your password or a one-time code.');
      return;
    }

    final api = context.read<ApiClient>();
    setState(() { _busy = true; _error = null; });
    try {
      final google = GoogleSignIn(scopes: const ['email']);
      try {
        await google.signOut();
      } catch (_) {}
      final account = await google.signIn().catchError((err) {
        return null;
      });
      if (account == null) {
        if (mounted) setState(() => _busy = false);
        return;
      }
      final auth = await account.authentication;
      final idToken = auth.idToken;
      if (idToken == null || idToken.isEmpty) {
        throw ApiException('Google sign-in ID token is not available for this project');
      }
      await api.signInWithProvider(provider: 'google', idToken: idToken);
      if (mounted) widget.onSignedIn();
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e is ApiException
              ? e.message
              : 'Google Sign-In requires OAuth Client ID in Firebase Console';
          _busy = false;
        });
      }
    }
  }

  /// Signs in with Apple.
  ///
  /// Apple sends the name once, on the very first authorisation, and never
  /// again — so nothing here depends on it. The email in the token is what
  /// matters, and it is matched against staff on the server.
  Future<void> _apple() async {
    final api = context.read<ApiClient>();
    setState(() { _busy = true; _error = null; });
    try {
      final credential = await SignInWithApple.getAppleIDCredential(
        scopes: const [AppleIDAuthorizationScopes.email],
      );
      final idToken = credential.identityToken;
      if (idToken == null) throw ApiException('Apple did not return a usable sign-in');
      await api.signInWithProvider(provider: 'apple', idToken: idToken);
      if (mounted) widget.onSignedIn();
    } on SignInWithAppleAuthorizationException {
      // Cancelled. Not an error worth showing anybody.
      if (mounted) setState(() => _busy = false);
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e is ApiException ? e.message : 'Apple sign-in did not work';
          _busy = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final insets = MediaQuery.viewInsetsOf(context).bottom;

    return Scaffold(
      // The backdrop must not resize when the keyboard opens, or the whole
      // screen jumps as somebody starts typing.
      resizeToAvoidBottomInset: false,
      body: AuthBackdrop(
        child: SafeArea(
          child: GestureDetector(
            onTap: () => FocusScope.of(context).unfocus(),
            behavior: HitTestBehavior.opaque,
            child: LayoutBuilder(builder: (context, constraints) {
              // Scrolls only when it genuinely cannot fit — a small phone, a
              // large text size, or the keyboard taking half the screen.
              // On an ordinary handset everything is on one page.
              return SingleChildScrollView(
                controller: _scroll,
                physics: const ClampingScrollPhysics(),
                padding: EdgeInsets.fromLTRB(T.s5, 0, T.s5, T.s3 + insets),
                child: ConstrainedBox(
                  constraints: BoxConstraints(minHeight: constraints.maxHeight),
                  child: Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 420),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const SizedBox(height: T.s2),

                          // ── brand ──
                          const BrandOrbits(size: 74, child: FizmohMark(size: 74)),
                          Text('FizMoh', style: TextStyle(
                            fontSize: 29, height: 1.05, fontWeight: FontWeight.w800,
                            letterSpacing: -0.9, color: scheme.onSurface)),

                          const SizedBox(height: T.s4),
                          Text('Welcome back', style: TextStyle(
                            fontSize: 22, fontWeight: FontWeight.w700,
                            letterSpacing: -0.5, color: scheme.onSurface)),
                          const SizedBox(height: 5),
                          Text(
                            'Sign in to your inbox and manage your business\nconversations, bookings and more.',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 13, height: 1.4, color: scheme.onSurfaceVariant),
                          ),

                          const SizedBox(height: T.s5),

                          AuthSegmented(
                            options: const [
                              (label: 'Password', icon: Icons.lock_outline_rounded),
                              (label: 'One-time code', icon: Icons.dialpad_rounded),
                            ],
                            selected: _method == _Method.password ? 0 : 1,
                            onSelect: (i) => setState(() {
                              _method = i == 0 ? _Method.password : _Method.code;
                              _codeSent = false;
                              _error = null;
                              _notice = null;
                            }),
                          ),

                          const SizedBox(height: T.s3),

                          AuthField(
                            controller: _identifier,
                            label: 'Email or phone number',
                            icon: _looksLikePhone
                                ? Icons.phone_iphone_rounded
                                : Icons.mail_outline_rounded,
                            enabled: !_codeSent,
                            keyboardType: _looksLikePhone
                                ? TextInputType.phone
                                : TextInputType.emailAddress,
                            autofillHints: const [AutofillHints.username],
                            errorText: _identifierError,
                            onChanged: (_) {
                              setState(() {});
                              if (_identifierError != null) _validateIdentifier();
                            },
                            onSubmitted:
                                _method == _Method.password ? _signInWithPassword : _sendCode,
                          ),

                          const SizedBox(height: T.s2),

                          if (_method == _Method.password) ...[
                            AuthField(
                              controller: _password,
                              label: 'Password',
                              icon: Icons.lock_outline_rounded,
                              obscure: _obscure,
                              autofillHints: const [AutofillHints.password],
                              onSubmitted: _signInWithPassword,
                              suffix: IconButton(
                                tooltip: _obscure ? 'Show password' : 'Hide password',
                                icon: Icon(
                                  _obscure
                                      ? Icons.visibility_off_outlined
                                      : Icons.visibility_outlined,
                                  size: 21, color: scheme.onSurfaceVariant),
                                onPressed: () => setState(() => _obscure = !_obscure),
                              ),
                            ),
                            Row(children: [
                              _Remember(
                                value: _remember,
                                onChanged: (v) => setState(() => _remember = v),
                              ),
                              const Spacer(),
                              TextButton(
                                onPressed: _forgotPassword,
                                style: TextButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(horizontal: T.s2),
                                  minimumSize: const Size(0, T.tapMin),
                                ),
                                child: const Text('Forgot password?'),
                              ),
                            ]),
                          ] else if (!_codeSent) ...[
                            Padding(
                              padding: const EdgeInsets.symmetric(vertical: T.s2),
                              child: Row(children: [
                                Icon(
                                  _looksLikePhone
                                      ? Icons.chat_rounded
                                      : Icons.mail_outline_rounded,
                                  size: 15, color: scheme.onSurfaceVariant),
                                const SizedBox(width: T.s2),
                                Expanded(
                                  child: Text(
                                    _looksLikePhone
                                        ? 'A six-digit code will arrive on WhatsApp.'
                                        : 'A six-digit code will be emailed to you.',
                                    style: TextStyle(
                                      fontSize: 12.5, color: scheme.onSurfaceVariant),
                                  ),
                                ),
                              ]),
                            ),
                          ] else ...[
                            AuthField(
                              controller: _otp,
                              label: 'Six-digit code',
                              icon: Icons.dialpad_rounded,
                              autofocus: true,
                              keyboardType: TextInputType.number,
                              autofillHints: const [AutofillHints.oneTimeCode],
                              onChanged: (v) {
                                if (v.trim().length == 6) _signInWithCode();
                              },
                            ),
                            Align(
                              alignment: Alignment.centerLeft,
                              child: TextButton(
                                onPressed: _busy
                                    ? null
                                    : () => setState(() {
                                          _codeSent = false;
                                          _otp.clear();
                                          _notice = null;
                                        }),
                                child: const Text('Use a different address'),
                              ),
                            ),
                          ],

                          if (_notice != null) ...[
                            const SizedBox(height: T.s2),
                            _Message(
                              icon: Icons.info_outline_rounded,
                              text: _notice!,
                              tone: scheme.primary,
                            ),
                          ],
                          if (_error != null) ...[
                            const SizedBox(height: T.s2),
                            _Message(
                              icon: Icons.error_outline_rounded,
                              text: _error!,
                              tone: T.danger,
                            ),
                          ],

                          const SizedBox(height: T.s3),

                          AuthButton(
                            label: _method == _Method.password
                                ? 'Sign in'
                                : _codeSent ? 'Verify code' : 'Send me a code',
                            busy: _busy,
                            onPressed: _method == _Method.password
                                ? _signInWithPassword
                                : _codeSent ? _signInWithCode : _sendCode,
                          ),

                          const SizedBox(height: T.s4),
                          const LabelledDivider(label: 'or continue with'),
                          const SizedBox(height: T.s3),

                          // Equal width: Apple's guidelines require its button
                          // to be no less prominent than any other option.
                          Row(children: [
                            // Offered only when it can actually work. A button
                            // that closes the app is worse than no button.
                            if (googleSignInConfigured) ...[
                              Expanded(
                                child: AuthProviderButton(
                                  label: 'Sign in with Google',
                                  logo: const GoogleMark(size: 18),
                                  onPressed: _busy ? null : _google,
                                ),
                              ),
                              const SizedBox(width: T.s2),
                            ],
                            Expanded(
                              child: AuthProviderButton(
                                label: 'Sign in with Apple',
                                logo: AppleMark(size: 19, color: scheme.onSurface),
                                onPressed: _busy ? null : _apple,
                              ),
                            ),
                          ]),

                          const SizedBox(height: T.s5),
                          const _TrustNote(),
                          const SizedBox(height: T.s2),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }
}

/// The remember tick. Built rather than a bare Checkbox so the label is part
/// of the target — a 20pt box on its own is a mis-tap waiting to happen.
class _Remember extends StatelessWidget {
  const _Remember({required this.value, required this.onChanged});

  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Semantics(
      checked: value,
      label: 'Remember me',
      child: InkWell(
        borderRadius: BorderRadius.circular(T.rSm),
        onTap: () => onChanged(!value),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: T.s3, horizontal: T.s1),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            AnimatedContainer(
              duration: T.motion(context, T.fast),
              height: 21, width: 21,
              decoration: BoxDecoration(
                color: value ? scheme.primary : Colors.transparent,
                borderRadius: BorderRadius.circular(T.rXs),
                border: Border.all(
                  color: value ? scheme.primary : scheme.outlineVariant,
                  width: 1.6),
              ),
              child: value
                  ? Icon(Icons.check_rounded, size: 15, color: scheme.onPrimary)
                  : null,
            ),
            const SizedBox(width: T.s2),
            Text('Remember me', style: TextStyle(
              fontSize: 14, fontWeight: FontWeight.w500, color: scheme.onSurface)),
          ]),
        ),
      ),
    );
  }
}

class _Message extends StatelessWidget {
  const _Message({required this.icon, required this.text, required this.tone});

  final IconData icon;
  final String text;
  final Color tone;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(T.s3),
      decoration: BoxDecoration(
        color: tone.withValues(alpha: .08),
        borderRadius: BorderRadius.circular(T.rMd),
      ),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(icon, size: 17, color: tone),
        const SizedBox(width: T.s2),
        Expanded(
          child: Text(text, style: TextStyle(
            fontSize: 13, height: 1.4, fontWeight: FontWeight.w500, color: tone)),
        ),
      ]),
    );
  }
}

class _TrustNote extends StatelessWidget {
  const _TrustNote();

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Row(mainAxisAlignment: MainAxisAlignment.center, children: [
      Icon(Icons.shield_outlined, size: 26, color: scheme.primary.withValues(alpha: .75)),
      const SizedBox(width: T.s3),
      Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
        Text('Your data is secure with FizMoh', style: TextStyle(
          fontSize: 13.5, fontWeight: FontWeight.w700, color: scheme.onSurface)),
        const SizedBox(height: 1),
        Text('We never share your information', style: TextStyle(
          fontSize: 12.5, color: scheme.onSurfaceVariant)),
      ]),
    ]);
  }
}
