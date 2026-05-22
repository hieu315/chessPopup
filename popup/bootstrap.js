const popupWidthConfig = globalThis.POPUP_GAMBIT_CONFIG?.popupWidth;

if (!popupWidthConfig) {
  throw new Error("Missing POPUP_GAMBIT_CONFIG.popupWidth");
}

try {
  const storedWidth = localStorage.getItem(popupWidthConfig.storageKey);
  const popupWidth = popupWidthConfig.clamp(storedWidth);

  document.documentElement.style.setProperty("--popup-width", `${popupWidth}px`);
  document.documentElement.style.width = `${popupWidth}px`;
} catch (error) {
  document.documentElement.style.setProperty("--popup-width", `${popupWidthConfig.defaultValue}px`);
  document.documentElement.style.width = `${popupWidthConfig.defaultValue}px`;
}
