import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_chat/core/text_direction.dart';

void main() {
  group('message direction', () {
    test('Arabic reads right to left', () {
      // Rendering this left-to-right puts the question mark on the wrong end
      // and breaks the reading order — a correctness bug, not a style one.
      expect(Script.of('مرحبا، هل يمكنني حجز رحلة غدا؟'), TextDirection.rtl);
      expect(Script.of('كم سعر رحلة الصحراء؟'), TextDirection.rtl);
    });

    test('English, Hindi and Portuguese read left to right', () {
      expect(Script.of('Can I book a tour tomorrow?'), TextDirection.ltr);
      expect(Script.of('क्या मैं कल एक टूर बुक कर सकता हूँ?'), TextDirection.ltr);
      expect(Script.of('Posso reservar um passeio amanhã?'), TextDirection.ltr);
    });

    test('the leading script decides, not the majority', () {
      // A long Latin product name inside an Arabic sentence must not flip it,
      // and an Arabic word quoted inside an English sentence must not either.
      expect(Script.of('مرحبا Musandam Dhow Cruise and Dolphin Watching'), TextDirection.rtl);
      expect(Script.of('The tour is called رحلة الصحراء'), TextDirection.ltr);
    });

    test('emoji, numbers and punctuation do not decide direction', () {
      expect(Script.of('👋 مرحبا'), TextDirection.rtl);
      expect(Script.of('35.700 OMR'), TextDirection.ltr);
      expect(Script.of('   '), TextDirection.ltr);
      expect(Script.of(''), TextDirection.ltr);
    });

    test('an order number stays readable in an Arabic message', () {
      const text = 'تم تأكيد حجزك ORD-20260809-72D29FBB';
      expect(Script.isRtl(text), isTrue);
      expect(Script.alignFor(text), TextAlign.right);
    });
  });
}
