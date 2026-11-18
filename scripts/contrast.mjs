import { writeFileSync } from "fs";

function luminance(hex) {
  const rgb = hex.replace("#", "").match(/.{2}/g).map(x => parseInt(x, 16) / 255);
  const a = rgb.map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}
function ratio(hex1, hex2) {
  const l1 = luminance(hex1);
  const l2 = luminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

const tokens = {
  dark: {
    bg: "#1d1c1a",
    surface: "#262522",
    surfaceContainer: "#302e2b",
    onSurface: "#eef0ea",
    onSurfaceVariant: "#b9bdb2",
    primary: "#81b64c",
    primaryText: "#9bd05f",
    onPrimary: "#10200a",
    tertiary: "#e5b84b",
    error: "#ff7a70"
  },
  light: {
    bg: "#f3f5f0",
    surface: "#ffffff",
    surfaceContainer: "#e9ede4",
    onSurface: "#1b1f17",
    onSurfaceVariant: "#4b5143",
    primary: "#5d9a30",
    primaryText: "#3d7a1c",
    onPrimary: "#ffffff",
    tertiary: "#a9760a",
    error: "#b3261e"
  }
};

const results = {
  dark: [
    { text: "onSurface (#eef0ea)", bg: "surface (#262522)", ratio: ratio(tokens.dark.onSurface, tokens.dark.surface), aa: ratio(tokens.dark.onSurface, tokens.dark.surface) >= 4.5 },
    { text: "onSurface (#eef0ea)", bg: "bg (#1d1c1a)", ratio: ratio(tokens.dark.onSurface, tokens.dark.bg), aa: ratio(tokens.dark.onSurface, tokens.dark.bg) >= 4.5 },
    { text: "onSurface (#eef0ea)", bg: "surface-container (#302e2b)", ratio: ratio(tokens.dark.onSurface, tokens.dark.surfaceContainer), aa: ratio(tokens.dark.onSurface, tokens.dark.surfaceContainer) >= 4.5 },
    { text: "onSurfaceVariant (#b9bdb2)", bg: "surface (#262522)", ratio: ratio(tokens.dark.onSurfaceVariant, tokens.dark.surface), aa: ratio(tokens.dark.onSurfaceVariant, tokens.dark.surface) >= 4.5 },
    { text: "primaryText (#9bd05f)", bg: "surface (#262522)", ratio: ratio(tokens.dark.primaryText, tokens.dark.surface), aa: ratio(tokens.dark.primaryText, tokens.dark.surface) >= 4.5 },
    { text: "onPrimary (#10200a)", bg: "primary (#81b64c)", ratio: ratio(tokens.dark.onPrimary, tokens.dark.primary), aa: ratio(tokens.dark.onPrimary, tokens.dark.primary) >= 4.5 },
    { text: "tertiary (#e5b84b)", bg: "surface (#262522)", ratio: ratio(tokens.dark.tertiary, tokens.dark.surface), aa: ratio(tokens.dark.tertiary, tokens.dark.surface) >= 4.5 },
    { text: "error (#ff7a70)", bg: "surface (#262522)", ratio: ratio(tokens.dark.error, tokens.dark.surface), aa: ratio(tokens.dark.error, tokens.dark.surface) >= 4.5 }
  ],
  light: [
    { text: "onSurface (#1b1f17)", bg: "surface (#ffffff)", ratio: ratio(tokens.light.onSurface, tokens.light.surface), aa: ratio(tokens.light.onSurface, tokens.light.surface) >= 4.5 },
    { text: "onSurface (#1b1f17)", bg: "bg (#f3f5f0)", ratio: ratio(tokens.light.onSurface, tokens.light.bg), aa: ratio(tokens.light.onSurface, tokens.light.bg) >= 4.5 },
    { text: "onSurface (#1b1f17)", bg: "surface-container (#e9ede4)", ratio: ratio(tokens.light.onSurface, tokens.light.surfaceContainer), aa: ratio(tokens.light.onSurface, tokens.light.surfaceContainer) >= 4.5 },
    { text: "onSurfaceVariant (#4b5143)", bg: "surface (#ffffff)", ratio: ratio(tokens.light.onSurfaceVariant, tokens.light.surface), aa: ratio(tokens.light.onSurfaceVariant, tokens.light.surface) >= 4.5 },
    { text: "primaryText (#3d7a1c)", bg: "surface (#ffffff)", ratio: ratio(tokens.light.primaryText, tokens.light.surface), aa: ratio(tokens.light.primaryText, tokens.light.surface) >= 4.5 },
    { text: "onPrimary (#ffffff)", bg: "primary (#5d9a30)", ratio: ratio(tokens.light.onPrimary, tokens.light.primary), aa: ratio(tokens.light.onPrimary, tokens.light.primary) >= 4.5 },
    { text: "tertiary (#a9760a)", bg: "surface (#ffffff)", ratio: ratio(tokens.light.tertiary, tokens.light.surface), aa: ratio(tokens.light.tertiary, tokens.light.surface) >= 4.5 },
    { text: "error (#b3261e)", bg: "surface (#ffffff)", ratio: ratio(tokens.light.error, tokens.light.surface), aa: ratio(tokens.light.error, tokens.light.surface) >= 4.5 }
  ]
};

console.log(JSON.stringify(results, null, 2));
