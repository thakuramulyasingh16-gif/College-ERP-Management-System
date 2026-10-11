import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import '../core/constants/app_colors.dart';

enum PreviewDevice {
  iphone15Pro('iPhone 15 Pro', 393, 852, 48, true),
  pixel8('Pixel 8', 412, 892, 40, false),
  samsungS24('Galaxy S24', 360, 780, 36, false),
  fullWidth('Full Screen', 0, 0, 0, false);

  final String label;
  final double width;
  final double height;
  final double borderRadius;
  final bool hasDynamicIsland;

  const PreviewDevice(
    this.label,
    this.width,
    this.height,
    this.borderRadius,
    this.hasDynamicIsland,
  );
}

class MobileDevicePreview extends StatefulWidget {
  final Widget child;

  const MobileDevicePreview({
    super.key,
    required this.child,
  });

  @override
  State<MobileDevicePreview> createState() => _MobileDevicePreviewState();
}

class _MobileDevicePreviewState extends State<MobileDevicePreview> {
  PreviewDevice _selectedDevice = PreviewDevice.iphone15Pro;
  bool _darkBackdrop = true;

  @override
  Widget build(BuildContext context) {
    final media = MediaQuery.of(context);
    final screenWidth = media.size.width;

    final isDesktopOrWeb = kIsWeb ||
        defaultTargetPlatform == TargetPlatform.windows ||
        defaultTargetPlatform == TargetPlatform.macOS ||
        defaultTargetPlatform == TargetPlatform.linux;

    if (!isDesktopOrWeb || screenWidth <= 520 || _selectedDevice == PreviewDevice.fullWidth) {
      return widget.child;
    }

    final bgGradient = _darkBackdrop
        ? const LinearGradient(
            colors: [Color(0xFF0B1120), Color(0xFF1E293B), Color(0xFF0F172A)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          )
        : const LinearGradient(
            colors: [Color(0xFFE2E8F0), Color(0xFFF1F5F9), Color(0xFFCBD5E1)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          );

    return Material(
      type: MaterialType.transparency,
      child: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: BoxDecoration(gradient: bgGradient),
        child: SafeArea(
          child: Column(
            children: [
              // Top control bar
              _buildTopToolbar(),
              // Phone mockup scaled with FittedBox to prevent any overflow
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
                  child: Center(
                    child: FittedBox(
                      fit: BoxFit.contain,
                      child: _buildPhoneMockup(media),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTopToolbar() {
    final isDark = _darkBackdrop;
    final barBg = isDark ? const Color(0xFF1E293B).withValues(alpha: 0.9) : Colors.white.withValues(alpha: 0.95);
    final textColor = isDark ? Colors.white : const Color(0xFF0F172A);
    final borderColor = isDark ? Colors.white.withValues(alpha: 0.12) : Colors.black.withValues(alpha: 0.08);

    return Container(
      margin: const EdgeInsets.only(top: 8, left: 16, right: 16, bottom: 4),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: barBg,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: borderColor),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.18),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              Icons.phone_iphone_rounded,
              color: AppColors.primary,
              size: 18,
            ),
          ),
          const SizedBox(width: 10),
          Text(
            'Mobile Preview',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: textColor,
              decoration: TextDecoration.none,
            ),
          ),
          const SizedBox(width: 16),
          Container(
            height: 20,
            width: 1,
            color: borderColor,
          ),
          const SizedBox(width: 16),
          // Device selector buttons
          ...PreviewDevice.values.map((device) {
            final isSelected = _selectedDevice == device;
            return Padding(
              padding: const EdgeInsets.symmetric(horizontal: 3),
              child: InkWell(
                onTap: () => setState(() => _selectedDevice = device),
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? AppColors.primary
                        : Colors.transparent,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    device.label,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: isSelected ? FontWeight.w800 : FontWeight.w500,
                      color: isSelected ? const Color(0xFF111113) : textColor.withValues(alpha: 0.75),
                      decoration: TextDecoration.none,
                    ),
                  ),
                ),
              ),
            );
          }),
          const SizedBox(width: 12),
          Container(
            height: 20,
            width: 1,
            color: borderColor,
          ),
          const SizedBox(width: 8),
          // Backdrop theme toggle button (InkWell to avoid Tooltip requiring Overlay)
          InkWell(
            onTap: () => setState(() => _darkBackdrop = !_darkBackdrop),
            borderRadius: BorderRadius.circular(12),
            child: Padding(
              padding: const EdgeInsets.all(8.0),
              child: Icon(
                _darkBackdrop ? Icons.light_mode_rounded : Icons.dark_mode_rounded,
                size: 18,
                color: textColor.withValues(alpha: 0.8),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPhoneMockup(MediaQueryData rootMedia) {
    final dev = _selectedDevice;
    final targetW = dev.width;
    final targetH = dev.height;
    final radius = dev.borderRadius;

    final topSafe = dev.hasDynamicIsland ? 47.0 : 36.0;
    final bottomSafe = 34.0;

    return Container(
      width: targetW + 24, // 12px bezel all around
      height: targetH + 24,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(radius + 12),
        border: Border.all(
          color: const Color(0xFF475569),
          width: 3.0,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.5),
            blurRadius: 40,
            spreadRadius: 4,
            offset: const Offset(0, 16),
          ),
          BoxShadow(
            color: const Color(0xFF3B82F6).withValues(alpha: 0.15),
            blurRadius: 60,
            spreadRadius: 8,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Stack(
        children: [
          // The Phone Screen with overriding MediaQuery
          ClipRRect(
            borderRadius: BorderRadius.circular(radius),
            child: SizedBox(
              width: targetW,
              height: targetH,
              child: MediaQuery(
                data: rootMedia.copyWith(
                  size: Size(targetW, targetH),
                  padding: EdgeInsets.only(top: topSafe, bottom: bottomSafe),
                  viewPadding: EdgeInsets.only(top: topSafe, bottom: bottomSafe),
                  viewInsets: EdgeInsets.zero,
                  devicePixelRatio: 3.0,
                ),
                child: Navigator(
                  onGenerateRoute: (settings) => MaterialPageRoute(
                    builder: (_) => widget.child,
                  ),
                ),
              ),
            ),
          ),

          // Dynamic Island or Camera Punch Hole
          if (dev.hasDynamicIsland)
            Positioned(
              top: 11,
              left: (targetW - 100) / 2,
              child: IgnorePointer(
                child: Container(
                  width: 100,
                  height: 28,
                  decoration: BoxDecoration(
                    color: Colors.black,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.3),
                        blurRadius: 4,
                      ),
                    ],
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      Container(
                        margin: const EdgeInsets.only(right: 12),
                        width: 11,
                        height: 11,
                        decoration: const BoxDecoration(
                          color: Color(0xFF0F172A),
                          shape: BoxShape.circle,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            )
          else
            Positioned(
              top: 10,
              left: (targetW - 14) / 2,
              child: IgnorePointer(
                child: Container(
                  width: 14,
                  height: 14,
                  decoration: const BoxDecoration(
                    color: Colors.black,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
            ),

          // Phone Home Bar Indicator at bottom
          Positioned(
            bottom: 8,
            left: (targetW - 120) / 2,
            child: IgnorePointer(
              child: Container(
                width: 120,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.35),
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
