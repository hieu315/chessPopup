const popupWidthConfig = globalThis.POPUP_GAMBIT_CONFIG?.popupWidth;
const popupOpacityConfig = globalThis.POPUP_GAMBIT_CONFIG?.popupOpacity;
const stealthModeConfig = globalThis.POPUP_GAMBIT_CONFIG?.stealthMode;

if (!popupWidthConfig) {
  throw new Error("Missing POPUP_GAMBIT_CONFIG.popupWidth");
}

if (!popupOpacityConfig) {
  throw new Error("Missing POPUP_GAMBIT_CONFIG.popupOpacity");
}

if (!stealthModeConfig) {
  throw new Error("Missing POPUP_GAMBIT_CONFIG.stealthMode");
}

try {
  const storedWidth = localStorage.getItem(popupWidthConfig.storageKey);
  const popupWidth = popupWidthConfig.clamp(storedWidth);
  const storedOpacity = localStorage.getItem(popupOpacityConfig.storageKey);
  const popupOpacity = popupOpacityConfig.clamp(storedOpacity);
  const storedStealthMode = localStorage.getItem(stealthModeConfig.storageKey);
  const stealthMode = stealthModeConfig.normalize(storedStealthMode);

  document.documentElement.style.setProperty("--popup-width", `${popupWidth}px`);
  document.documentElement.style.setProperty("--popup-opacity", `${popupOpacity / 100}`);
  document.documentElement.dataset.stealth = stealthMode ? "on" : "off";
  document.documentElement.style.width = `${popupWidth}px`;
} catch (error) {
  document.documentElement.style.setProperty("--popup-width", `${popupWidthConfig.defaultValue}px`);
  document.documentElement.style.setProperty("--popup-opacity", `${popupOpacityConfig.defaultValue / 100}`);
  document.documentElement.dataset.stealth = stealthModeConfig.defaultValue ? "on" : "off";
  document.documentElement.style.width = `${popupWidthConfig.defaultValue}px`;
}
