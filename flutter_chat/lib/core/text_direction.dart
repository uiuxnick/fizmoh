import 'package:flutter/widgets.dart';

/// Which way a message should read.
///
/// A WhatsApp inbox in Oman carries Arabic, English, Hindi and Urdu, often in
/// the same thread and sometimes in the same sentence. Rendering Arabic
/// left-to-right does not merely look wrong — it puts the punctuation on the
/// wrong end and breaks the reading order, which is a correctness problem
/// dressed as a styling one.
///
/// Flutter will not infer this: a Text widget inherits the app's direction
/// unless told otherwise. So each message decides for itself, from its own
/// content.
class Script {
  Script._();

  /// Arabic, Hebrew, Persian, Urdu — the ranges that actually appear here.
  static final _rtl = RegExp(
    r'[֐-׿؀-ۿ܀-ݏݐ-ݿࢠ-ࣿיִ-﷿ﹰ-﻿]',
  );
  static final _ltr = RegExp(r'[A-Za-zÀ-ɏЀ-ӿऀ-ॿ]');

  /// The direction of a piece of text, decided by which script leads it.
  ///
  /// Counting characters would let a long Latin product name flip an Arabic
  /// sentence. What matters is the first strongly-directional character, which
  /// is also how the Unicode algorithm decides a paragraph.
  static TextDirection of(String text) {
    for (final match in _rtl.allMatches(text)) {
      final ltrBefore = _ltr.firstMatch(text.substring(0, match.start));
      return ltrBefore == null ? TextDirection.rtl : TextDirection.ltr;
    }
    return TextDirection.ltr;
  }

  static bool isRtl(String text) => of(text) == TextDirection.rtl;

  /// How a bubble's own text should align inside it.
  static TextAlign alignFor(String text) =>
      isRtl(text) ? TextAlign.right : TextAlign.left;
}
