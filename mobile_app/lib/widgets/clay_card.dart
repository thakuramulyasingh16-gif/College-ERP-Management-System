import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/theme/theme_provider.dart';

class ClayCard extends StatefulWidget {
  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry? margin;
  final double borderRadius;
  final Color? color;
  final Gradient? gradient;
  final double depth;

  const ClayCard({
    super.key,
    required this.child,
    this.onTap,
    this.padding = const EdgeInsets.all(20.0),
    this.margin,
    this.borderRadius = 24.0,
    this.color,
    this.gradient,
    this.depth = 8.0,
  });

  @override
  State<ClayCard> createState() => _ClayCardState();
}

class _ClayCardState extends State<ClayCard> {
  bool _isPressed = false;

  @override
  Widget build(BuildContext context) {
    final theme = context.watch<ThemeProvider>().clayTheme;
    final surface = widget.color ?? theme.surfaceColor;
    final double depth = _isPressed ? widget.depth * 0.4 : widget.depth;

    final shadows = [
      BoxShadow(
        color: theme.shadowDark,
        offset: Offset(depth * 0.75, depth * 0.75),
        blurRadius: depth * 1.5,
      ),
      BoxShadow(
        color: theme.shadowLight,
        offset: Offset(-depth * 0.75, -depth * 0.75),
        blurRadius: depth * 1.5,
      ),
    ];

    Widget content = Container(
      margin: widget.margin,
      padding: widget.padding,
      decoration: BoxDecoration(
        color: widget.gradient == null ? surface : null,
        gradient: widget.gradient,
        borderRadius: BorderRadius.circular(widget.borderRadius),
        boxShadow: shadows,
        border: Border.all(
          color: theme.isDark ? const Color(0xFF2C2C33) : const Color(0xFFE6E0D5),
          width: 1.0,
        ),
      ),
      child: widget.child,
    );

    if (widget.onTap != null) {
      return GestureDetector(
        onTapDown: (_) => setState(() => _isPressed = true),
        onTapUp: (_) {
          setState(() => _isPressed = false);
          widget.onTap?.call();
        },
        onTapCancel: () => setState(() => _isPressed = false),
        child: AnimatedScale(
          scale: _isPressed ? 0.98 : 1.0,
          duration: const Duration(milliseconds: 100),
          curve: Curves.easeOutCubic,
          child: content,
        ),
      );
    }

    return content;
  }
}
