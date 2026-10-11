import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/constants/app_colors.dart';
import '../core/theme/theme_provider.dart';

class ClayButton extends StatefulWidget {
  final VoidCallback? onPressed;
  final Widget? child;
  final String? text;
  final IconData? icon;
  final bool isLoading;
  final bool isPrimary;
  final bool isDanger;
  final double? width;
  final double height;
  final double borderRadius;
  final EdgeInsetsGeometry padding;

  const ClayButton({
    super.key,
    required this.onPressed,
    this.child,
    this.text,
    this.icon,
    this.isLoading = false,
    this.isPrimary = true,
    this.isDanger = false,
    this.width,
    this.height = 52.0,
    this.borderRadius = 20.0,
    this.padding = const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
  });

  @override
  State<ClayButton> createState() => _ClayButtonState();
}

class _ClayButtonState extends State<ClayButton> with SingleTickerProviderStateMixin {
  bool _isPressed = false;

  void _onTapDown(TapDownDetails _) {
    if (widget.onPressed == null || widget.isLoading) return;
    setState(() => _isPressed = true);
  }

  void _onTapUp(TapUpDetails _) {
    if (widget.onPressed == null || widget.isLoading) return;
    setState(() => _isPressed = false);
    widget.onPressed?.call();
  }

  void _onTapCancel() {
    if (widget.onPressed == null || widget.isLoading) return;
    setState(() => _isPressed = false);
  }

  @override
  Widget build(BuildContext context) {
    final theme = context.watch<ThemeProvider>().clayTheme;
    final isEnabled = widget.onPressed != null && !widget.isLoading;

    Color bg;
    Gradient? gradient;
    Color textColor = Colors.white;

    if (!isEnabled) {
      bg = theme.isDark ? const Color(0xFF334155) : const Color(0xFF94A3B8);
    } else if (widget.isDanger) {
      gradient = const LinearGradient(
        colors: [Color(0xFFEF4444), Color(0xFFDC2626)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      );
      bg = AppColors.danger;
    } else if (widget.isPrimary) {
      gradient = const LinearGradient(
        colors: [AppColors.primaryLight, AppColors.primary],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      );
      bg = AppColors.primary;
      textColor = const Color(0xFF111113); // High-contrast black on vibrant saffron
    } else {
      bg = theme.surfaceColor;
      textColor = theme.textPrimary;
    }

    final double depth = _isPressed ? 2.0 : 6.0;

    List<BoxShadow> shadows = [];
    if (isEnabled && !_isPressed) {
      if (widget.isPrimary || widget.isDanger) {
        shadows = [
          BoxShadow(
            color: (widget.isDanger ? AppColors.danger : AppColors.primary).withValues(alpha: 0.45),
            offset: const Offset(0, 5),
            blurRadius: 16,
          ),
          BoxShadow(
            color: theme.isDark ? Colors.black.withValues(alpha: 0.4) : Colors.white.withValues(alpha: 0.8),
            offset: const Offset(0, -2),
            blurRadius: 6,
          ),
        ];
      } else {
        shadows = [
          BoxShadow(
            color: theme.shadowDark,
            offset: Offset(depth * 0.7, depth * 0.7),
            blurRadius: depth * 1.5,
          ),
          BoxShadow(
            color: theme.shadowLight,
            offset: Offset(-depth * 0.7, -depth * 0.7),
            blurRadius: depth * 1.5,
          ),
        ];
      }
    } else if (_isPressed) {
      shadows = [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.3),
          offset: const Offset(0, 2),
          blurRadius: 4,
        ),
      ];
    }

    return GestureDetector(
      onTapDown: _onTapDown,
      onTapUp: _onTapUp,
      onTapCancel: _onTapCancel,
      child: AnimatedScale(
        scale: _isPressed ? 0.97 : 1.0,
        duration: const Duration(milliseconds: 100),
        curve: Curves.easeOutCubic,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 120),
          width: widget.width,
          height: widget.height,
          padding: widget.padding,
          decoration: BoxDecoration(
            color: gradient == null ? bg : null,
            gradient: gradient,
            borderRadius: BorderRadius.circular(widget.borderRadius),
            boxShadow: shadows,
          ),
          child: Center(
            child: widget.isLoading
                ? SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.5,
                      valueColor: AlwaysStoppedAnimation<Color>(
                        widget.isPrimary ? const Color(0xFF111113) : Colors.white,
                      ),
                    ),
                  )
                : widget.child ??
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        if (widget.icon != null) ...[
                          Icon(widget.icon, size: 20, color: textColor),
                          const SizedBox(width: 8),
                        ],
                        if (widget.text != null)
                          Text(
                            widget.text!,
                            style: TextStyle(
                              color: textColor,
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.2,
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
