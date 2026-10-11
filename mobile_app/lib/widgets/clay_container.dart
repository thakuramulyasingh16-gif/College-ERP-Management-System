import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/theme/theme_provider.dart';

enum ClayType {
  raised,
  inset,
  flat,
}

class ClayContainer extends StatelessWidget {
  final Widget? child;
  final double? width;
  final double? height;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final double borderRadius;
  final ClayType type;
  final Color? color;
  final Gradient? gradient;
  final double depth;
  final double spread;
  final BoxBorder? border;

  const ClayContainer({
    super.key,
    this.child,
    this.width,
    this.height,
    this.padding,
    this.margin,
    this.borderRadius = 24.0,
    this.type = ClayType.raised,
    this.color,
    this.gradient,
    this.depth = 8.0,
    this.spread = 0.0,
    this.border,
  });

  @override
  Widget build(BuildContext context) {
    final theme = context.watch<ThemeProvider>().clayTheme;
    final surface = color ?? (type == ClayType.inset ? theme.surfaceInsetColor : theme.surfaceColor);

    List<BoxShadow> shadows = [];
    if (type == ClayType.raised) {
      shadows = [
        BoxShadow(
          color: theme.shadowDark,
          offset: Offset(depth * 0.75, depth * 0.75),
          blurRadius: depth * 1.5,
          spreadRadius: spread,
        ),
        BoxShadow(
          color: theme.shadowLight,
          offset: Offset(-depth * 0.75, -depth * 0.75),
          blurRadius: depth * 1.5,
          spreadRadius: spread,
        ),
      ];
    } else if (type == ClayType.inset) {
      // In Flutter, inner shadow is simulated cleanly using layered soft gradients/borders
      shadows = [
        BoxShadow(
          color: theme.shadowDark.withValues(alpha: 0.25),
          offset: const Offset(1, 1),
          blurRadius: 3,
        ),
      ];
    }

    return Container(
      width: width,
      height: height,
      margin: margin,
      padding: padding,
      decoration: BoxDecoration(
        color: gradient == null ? surface : null,
        gradient: gradient,
        borderRadius: BorderRadius.circular(borderRadius),
        boxShadow: shadows,
        border: border,
      ),
      child: child,
    );
  }
}
