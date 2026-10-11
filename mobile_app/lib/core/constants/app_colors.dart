import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  // Brand Saffron
  static const Color primary = Color(0xFFFF9933);        // Rich Saffron
  static const Color primaryDark = Color(0xFFE67E17);    // Deep Amber/Saffron
  static const Color primaryLight = Color(0xFFFFB366);   // Bright Golden Saffron
  static const Color saffronGlow = Color(0x66FF9933);    // Saffron shadow/glow

  // Status colors
  static const Color danger = Color(0xFFEF4444);
  static const Color dangerLight = Color(0xFF3B1818);    // Dark-mode friendly danger container
  static const Color success = Color(0xFF10B981);
  static const Color successLight = Color(0xFF0F3025);
  static const Color warning = Color(0xFFF59E0B);
  static const Color warningLight = Color(0xFF33230A);
  static const Color info = Color(0xFF3B82F6);
  static const Color infoLight = Color(0xFF132847);

  // Dark Clay Theme (Default & Primary: Saffron + Black)
  static const Color darkBgStart = Color(0xFF0D0D0E);      // Deep obsidian
  static const Color darkBgEnd = Color(0xFF161619);        // Charcoal black
  static const Color darkSurface = Color(0xFF1C1C21);      // Black raised card surface
  static const Color darkSurfaceInset = Color(0xFF121215); // Deep inset surface for text fields
  static const Color darkShadowDark = Color(0xCC000000);   // Deep 80% shadow
  static const Color darkShadowLight = Color(0x1CFF9933);  // Subtle warm saffron specular highlight
  static const Color darkText = Color(0xFFFAF9F6);         // Warm off-white / ivory
  static const Color darkTextSecondary = Color(0xFFA1A1AA);// Zinc 400
  static const Color darkBorder = Color(0xFF2C2C33);       // Subtle border

  // Light Clay Theme (Warm Off-white / Cream with Saffron accents)
  static const Color lightBgStart = Color(0xFFF9F7F2);     // Warm linen / cream
  static const Color lightBgEnd = Color(0xFFF1EDE4);       // Warm pearl cream
  static const Color lightSurface = Color(0xFFFFFFFF);     // Pure white card
  static const Color lightSurfaceInset = Color(0xFFEBE6DC);// Cream inset
  static const Color lightShadowDark = Color(0x38B8A898);  // Warm sand shadow
  static const Color lightShadowLight = Color(0xF2FFFFFF); // Bright specular highlight
  static const Color lightText = Color(0xFF181513);        // Deep warm charcoal/black
  static const Color lightTextSecondary = Color(0xFF78716C);// Warm stone
  static const Color lightBorder = Color(0xFFE6E0D5);      // Warm cream border
}
