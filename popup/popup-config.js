(function registerPopupGambitConfig(global) {
  const popupWidth = Object.freeze({
    storageKey: "chromeChessPopupWidth",
    defaultValue: 200,
    min: 200,
    max: 720,
    step: 20,
    clamp(value) {
      const numericValue = Number.parseInt(value, 10);

      if (Number.isNaN(numericValue)) {
        return this.defaultValue;
      }

      return Math.min(this.max, Math.max(this.min, numericValue));
    }
  });

  const popupOpacity = Object.freeze({
    storageKey: "chromeChessPopupOpacity",
    defaultValue: 100,
    min: 35,
    max: 100,
    step: 5,
    clamp(value) {
      const numericValue = Number.parseInt(value, 10);

      if (Number.isNaN(numericValue)) {
        return this.defaultValue;
      }

      return Math.min(this.max, Math.max(this.min, numericValue));
    }
  });

  const boardSize = Object.freeze({
    defaultValue: 720,
    min: 220,
    max: 720,
    clamp(value) {
      const numericValue = Number.parseInt(value, 10);

      if (Number.isNaN(numericValue)) {
        return this.defaultValue;
      }

      return Math.min(this.max, Math.max(this.min, numericValue));
    }
  });

  global.POPUP_GAMBIT_CONFIG = Object.freeze({
    popupWidth,
    popupOpacity,
    boardSize
  });
})(globalThis);
