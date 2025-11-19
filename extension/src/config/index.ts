// Configuration constants

export const API_BASE = "http://192.168.2.235:8000";

export const COLORS = {
  safe: "#10b981",      // green
  suspicious: "#f59e0b", // orange
  unsafe: "#ef4444",     // red
  primary: "#3b82f6",    // blue
  gray: {
    50: "#f9fafb",
    100: "#f3f4f6",
    200: "#e5e7eb",
    300: "#d1d5db",
    400: "#9ca3af",
    500: "#6b7280",
    600: "#4b5563",
    700: "#374151",
    800: "#1f2937",
    900: "#111827",
  }
};

export const VERDICT_CONFIG = {
  safe: {
    color: COLORS.safe,
    emoji: "✅",
    text: "SAFE"
  },
  suspicious: {
    color: COLORS.suspicious,
    emoji: "⚠️",
    text: "SUSPICIOUS"
  },
  unsafe: {
    color: COLORS.unsafe,
    emoji: "🚨",
    text: "UNSAFE"
  }
};

