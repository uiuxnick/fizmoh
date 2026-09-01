import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

/// `Image.network`, except it keeps what it downloaded.
///
/// Every picture in this app came down the wire again on every rebuild, every
/// scroll back up, and every launch. Payment receipts were the worst of it —
/// an agent working through the approvals list refetched the same screenshots
/// continuously — but avatars and template headers cost the same on a phone
/// with a data plan.
///
/// A function rather than a widget so the call sites read as they did before
/// and keep their own `loadingBuilder` and `errorBuilder`: those builders are
/// where each screen says what a missing image should look like, and that is
/// per-screen knowledge worth keeping.
Image cachedNetworkImage(
  String url, {
  double? width,
  double? height,
  BoxFit? fit,
  ImageLoadingBuilder? loadingBuilder,
  ImageErrorWidgetBuilder? errorBuilder,
}) =>
    Image(
      image: CachedNetworkImageProvider(url),
      width: width,
      height: height,
      fit: fit,
      loadingBuilder: loadingBuilder,
      errorBuilder: errorBuilder,
    );
