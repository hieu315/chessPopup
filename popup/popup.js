import { Chess } from "./vendor/chess.js";

if (document.readyState === "loading") {
  await new Promise((resolve) => {
    document.addEventListener("DOMContentLoaded", resolve, { once: true });
  });
}

const STORAGE_KEY = "chromeChessPopupState";
const START_FEN = new Chess().fen();
const MODE_PLAY = "play";
const MODE_CUSTOM = "custom";
const POPUP_WIDTH_CONFIG = globalThis.POPUP_GAMBIT_CONFIG?.popupWidth;
const POPUP_OPACITY_CONFIG = globalThis.POPUP_GAMBIT_CONFIG?.popupOpacity;
const BOARD_SIZE_CONFIG = globalThis.POPUP_GAMBIT_CONFIG?.boardSize;

if (!POPUP_WIDTH_CONFIG) {
  throw new Error("Missing POPUP_GAMBIT_CONFIG.popupWidth");
}

if (!BOARD_SIZE_CONFIG) {
  throw new Error("Missing POPUP_GAMBIT_CONFIG.boardSize");
}

if (!POPUP_OPACITY_CONFIG) {
  throw new Error("Missing POPUP_GAMBIT_CONFIG.popupOpacity");
}

const POPUP_WIDTH_STORAGE_KEY = POPUP_WIDTH_CONFIG.storageKey;
const POPUP_OPACITY_STORAGE_KEY = POPUP_OPACITY_CONFIG.storageKey;

const PIECE_SYMBOLS = {
  wp: "\u2659",
  wn: "\u2658",
  wb: "\u2657",
  wr: "\u2656",
  wq: "\u2655",
  wk: "\u2654",
  bp: "\u265F",
  bn: "\u265E",
  bb: "\u265D",
  br: "\u265C",
  bq: "\u265B",
  bk: "\u265A"
};

const PIECE_ASSETS = {
  wk: "./assets/pieces/cburnett/wK.svg",
  wq: "./assets/pieces/cburnett/wQ.svg",
  wr: "./assets/pieces/cburnett/wR.svg",
  wb: "./assets/pieces/cburnett/wB.svg",
  wn: "./assets/pieces/cburnett/wN.svg",
  wp: "./assets/pieces/cburnett/wP.svg",
  bk: "./assets/pieces/cburnett/bK.svg",
  bq: "./assets/pieces/cburnett/bQ.svg",
  br: "./assets/pieces/cburnett/bR.svg",
  bb: "./assets/pieces/cburnett/bB.svg",
  bn: "./assets/pieces/cburnett/bN.svg",
  bp: "./assets/pieces/cburnett/bP.svg"
};

const CUSTOM_PIECES = [
  { value: "erase", label: "Xoa o", symbol: "x" },
  { value: "wk", label: "Vua trang", asset: PIECE_ASSETS.wk },
  { value: "wq", label: "Hau trang", asset: PIECE_ASSETS.wq },
  { value: "wr", label: "Xe trang", asset: PIECE_ASSETS.wr },
  { value: "wb", label: "Tuong trang", asset: PIECE_ASSETS.wb },
  { value: "wn", label: "Ma trang", asset: PIECE_ASSETS.wn },
  { value: "wp", label: "Tot trang", asset: PIECE_ASSETS.wp },
  { value: "bk", label: "Vua den", asset: PIECE_ASSETS.bk },
  { value: "bq", label: "Hau den", asset: PIECE_ASSETS.bq },
  { value: "br", label: "Xe den", asset: PIECE_ASSETS.br },
  { value: "bb", label: "Tuong den", asset: PIECE_ASSETS.bb },
  { value: "bn", label: "Ma den", asset: PIECE_ASSETS.bn },
  { value: "bp", label: "Tot den", asset: PIECE_ASSETS.bp }
];

const DIFFICULTY_PRESETS = {
  "1": { label: "De", skill: 0, depth: 1, elo: 800 },
  "2": { label: "Thuong", skill: 5, depth: 3, elo: 1200 },
  "3": { label: "Kha", skill: 10, depth: 5, elo: 1600 },
  "4": { label: "Kho", skill: 15, depth: 8, elo: 2000 },
  "5": { label: "Rat kho", skill: 20, depth: 11, elo: 2500 }
};
const HINT_ENGINE_PRESET = {
  depth: 14,
  skill: 20
};

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

function requireElement(id) {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`Missing required popup element: #${id}`);
  }

  return element;
}

const boardEl = requireElement("board");
const boardOverlayEl = requireElement("boardOverlay");
const boardShellEl = requireElement("boardShell");
const boardResizeHandleEl = requireElement("boardResizeHandle");
const modeSelect = requireElement("modeSelect");
const playerColorSelect = requireElement("playerColorSelect");
const difficultySelect = requireElement("difficultySelect");
const sizeDecreaseButton = requireElement("sizeDecreaseButton");
const sizeIncreaseButton = requireElement("sizeIncreaseButton");
const sizeValueEl = requireElement("sizeValue");
const opacityDecreaseButton = requireElement("opacityDecreaseButton");
const opacityIncreaseButton = requireElement("opacityIncreaseButton");
const opacityValueEl = requireElement("opacityValue");
const customPanelEl = requireElement("customPanel");
const customTurnSelect = requireElement("customTurnSelect");
const customPaletteEl = requireElement("customPalette");
const customPieceLabelEl = requireElement("customPieceLabel");
const engineLineEl = requireElement("engineLine");
const gameFenInput = requireElement("gameFenInput");
const newGameButton = requireElement("newGameButton");
const undoMoveButton = requireElement("undoMoveButton");
const analyzeTopMovesButton = requireElement("analyzeTopMovesButton");
const flipBoardButton = requireElement("flipBoardButton");
const topMovesListEl = requireElement("topMovesList");
const loadFenButton = requireElement("loadFenButton");
const copyFenButton = requireElement("copyFenButton");
const clearBoardButton = requireElement("clearBoardButton");
const setupStartPositionButton = requireElement("setupStartPositionButton");

let chess = new Chess();
let initialFen = null;
let moveStack = [];
let playerColor = "white";
let boardView = "white";
let boardSize = BOARD_SIZE_CONFIG.defaultValue;
let difficulty = "2";
let popupWidth = POPUP_WIDTH_CONFIG.defaultValue;
let popupOpacity = POPUP_OPACITY_CONFIG.defaultValue;
let mode = MODE_PLAY;
let customTurn = "w";
let customSelectedPiece = "wp";
let selectedSquare = null;
let legalMoves = [];
let statusMessage = "San sang.";
let engineLineMessage = "Stockfish se hien score va dong pv sau khi bat dau tinh.";
let engineWorker = null;
let engineReady = false;
let engineSearching = false;
let pendingSearch = false;
let pendingForceSearch = false;
let pendingSearchPurpose = "move";
let activeSearchFen = "";
let activeSearchPurpose = "move";
let activeBoardResize = null;
let activePieceDrag = null;
let dragHoverSquare = "";
let suppressBoardClick = false;
let engineTopMoves = [];
let engineTopMovesFen = "";
let previewTopMove = null;

boardEl.addEventListener("click", handleBoardClick);
boardEl.addEventListener("pointerdown", handlePieceDragStart);
boardEl.addEventListener("pointermove", handlePieceDragMove);
boardEl.addEventListener("pointerup", handlePieceDragEnd);
boardEl.addEventListener("pointercancel", handlePieceDragCancel);
customPaletteEl.addEventListener("click", handlePaletteClick);
boardResizeHandleEl.addEventListener("pointerdown", handleBoardResizeStart);
boardResizeHandleEl.addEventListener("pointermove", handleBoardResizeMove);
boardResizeHandleEl.addEventListener("pointerup", handleBoardResizeEnd);
boardResizeHandleEl.addEventListener("pointercancel", handleBoardResizeEnd);

newGameButton.addEventListener("click", async () => {
  await startNewGame();
});

undoMoveButton.addEventListener("click", async () => {
  await undoFullTurn();
});

opacityDecreaseButton.addEventListener("click", async () => {
  await updatePopupOpacity(-POPUP_OPACITY_CONFIG.step);
});

opacityIncreaseButton.addEventListener("click", async () => {
  await updatePopupOpacity(POPUP_OPACITY_CONFIG.step);
});

flipBoardButton.addEventListener("click", async () => {
  boardView = boardView === "white" ? "black" : "white";
  statusMessage = "Da lat huong nhin ban co.";
  await persistState();
  renderGame();
});

analyzeTopMovesButton.addEventListener("click", async () => {
  await requestTopMoves();
});
topMovesListEl.addEventListener("pointerover", handleTopMovePointerOver);
topMovesListEl.addEventListener("pointerout", handleTopMovePointerOut);
topMovesListEl.addEventListener("click", handleTopMoveClick);

loadFenButton.addEventListener("click", async () => {
  await loadFenPosition(gameFenInput.value);
});

copyFenButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(chess.fen());
    statusMessage = "Da copy FEN hien tai.";
    renderGame();
  } catch (error) {
    statusMessage = error?.message || "Khong copy duoc FEN.";
    renderGame();
  }
});

clearBoardButton.addEventListener("click", async () => {
  if (mode !== MODE_CUSTOM) {
    return;
  }

  stopSearch();
  chess.clear();
  syncCustomBoardState();
  clearSelection();
  engineLineMessage = "Che do custom: Stockfish dang tat.";
  statusMessage = "Da xoa toan bo ban co.";
  await persistState();
  renderGame();
});

setupStartPositionButton.addEventListener("click", async () => {
  if (mode !== MODE_CUSTOM) {
    return;
  }

  stopSearch();
  chess = new Chess();
  customTurn = "w";
  initialFen = chess.fen();
  moveStack = [];
  clearSelection();
  engineLineMessage = "Che do custom: da dua ban co ve setup chuan.";
  statusMessage = "Da dua ban co ve vi tri xuat phat.";
  await persistState();
  renderGame();
});

modeSelect.addEventListener("change", async () => {
  await switchMode(modeSelect.value);
});

playerColorSelect.addEventListener("change", async () => {
  playerColor = playerColorSelect.value === "black" ? "black" : "white";
  boardView = playerColor;
  statusMessage = `Ban chuyen sang cam ${playerColor === "white" ? "trang" : "den"}.`;
  await persistState();
  renderGame();

  if (shouldEnginePlay()) {
    await requestEngineMove(false);
  }
});

difficultySelect.addEventListener("change", async () => {
  difficulty = DIFFICULTY_PRESETS[difficultySelect.value] ? difficultySelect.value : "2";
  statusMessage = `Da doi do kho sang muc ${DIFFICULTY_PRESETS[difficulty].label}.`;
  configureEngine("move");
  await persistState();
  renderGame();
});

sizeDecreaseButton.addEventListener("click", async () => {
  await updatePopupWidth(-POPUP_WIDTH_CONFIG.step);
});

sizeIncreaseButton.addEventListener("click", async () => {
  await updatePopupWidth(POPUP_WIDTH_CONFIG.step);
});

customTurnSelect.addEventListener("change", async () => {
  if (mode !== MODE_CUSTOM) {
    return;
  }

  customTurn = customTurnSelect.value === "b" ? "b" : "w";
  syncCustomBoardState();
  statusMessage = `Da doi luot trong FEN sang ${customTurn === "w" ? "trang" : "den"}.`;
  await persistState();
  renderGame();
});

window.addEventListener("beforeunload", shutdownEngine);

await restoreState();
renderGame();

if (shouldEnginePlay()) {
  await requestEngineMove(false);
}

function handleBoardClick(event) {
  if (suppressBoardClick) {
    suppressBoardClick = false;
    return;
  }

  const squareEl = event.target.closest(".square");

  if (!squareEl) {
    return;
  }

  const square = squareEl.dataset.square;

  if (mode === MODE_CUSTOM) {
    void handleCustomBoardClick(square);
    return;
  }

  if (engineSearching) {
    statusMessage = "Hay cho Stockfish danh xong nuoc hien tai.";
    renderGame();
    return;
  }

  if (!isPlayerTurn()) {
    statusMessage = "Chua den luot ban.";
    renderGame();
    return;
  }

  const piece = chess.get(square);
  const isOwnPiece = piece?.color === playerColorCode();

  if (selectedSquare) {
    if (square === selectedSquare) {
      clearSelection();
      statusMessage = "Da bo chon o hien tai.";
      renderGame();
      return;
    }

    const chosenMove = legalMoves.find((move) => move.to === square);

    if (chosenMove) {
      void playHumanMove(chosenMove);
      return;
    }

    if (isOwnPiece) {
      selectSquare(square);
      statusMessage = `Dang chon quan o ${square}.`;
      renderGame();
      return;
    }

    clearSelection();
    statusMessage = "Nuoc di khong hop le.";
    renderGame();
    return;
  }

  if (!isOwnPiece) {
    statusMessage = "Hay chon mot quan co cua ban.";
    renderGame();
    return;
  }

  selectSquare(square);
  statusMessage = `Dang chon quan o ${square}.`;
  renderGame();
}

function handlePieceDragStart(event) {
  if (event.button !== 0 || mode !== MODE_PLAY || engineSearching || !isPlayerTurn()) {
    return;
  }

  const squareEl = event.target.closest(".square");

  if (!squareEl) {
    return;
  }

  const square = squareEl.dataset.square;
  const piece = chess.get(square);

  if (!piece || piece.color !== playerColorCode()) {
    return;
  }

  activePieceDrag = {
    pointerId: event.pointerId,
    sourceSquare: square,
    pieceCode: getPieceCode(piece),
    startX: event.clientX,
    startY: event.clientY,
    started: false,
    ghostEl: null
  };
  boardEl.setPointerCapture(event.pointerId);
}

function handlePieceDragMove(event) {
  if (!activePieceDrag || activePieceDrag.pointerId !== event.pointerId) {
    return;
  }

  if (!activePieceDrag.started) {
    const deltaX = event.clientX - activePieceDrag.startX;
    const deltaY = event.clientY - activePieceDrag.startY;
    const dragDistance = Math.hypot(deltaX, deltaY);

    if (dragDistance < 6) {
      return;
    }

    activePieceDrag.started = true;
    suppressBoardClick = true;
    selectSquare(activePieceDrag.sourceSquare);
    activePieceDrag.ghostEl = createDragGhost(activePieceDrag.sourceSquare, activePieceDrag.pieceCode);
    updateDragGhostPosition(activePieceDrag.ghostEl, event.clientX, event.clientY);
    updateDragHoverSquare(event.clientX, event.clientY);
    renderBoard();
    return;
  }

  event.preventDefault();
  updateDragGhostPosition(activePieceDrag.ghostEl, event.clientX, event.clientY);
  updateDragHoverSquare(event.clientX, event.clientY);
}

function handlePieceDragEnd(event) {
  if (!activePieceDrag || activePieceDrag.pointerId !== event.pointerId) {
    return;
  }

  try {
    boardEl.releasePointerCapture(event.pointerId);
  } catch (error) {
    console.warn(error);
  }

  if (!activePieceDrag.started) {
    activePieceDrag = null;
    dragHoverSquare = "";
    return;
  }

  event.preventDefault();
  const sourceSquare = activePieceDrag.sourceSquare;
  const dropSquare = getSquareFromPoint(event.clientX, event.clientY);
  const chosenMove = legalMoves.find((move) => move.to === dropSquare);

  cleanupPieceDrag();

  if (!dropSquare || dropSquare === sourceSquare) {
    clearSelection();
    statusMessage = "Da huy keo quan.";
    renderGame();
  } else if (chosenMove) {
    void playHumanMove(chosenMove);
  } else {
    clearSelection();
    statusMessage = "Nuoc di khong hop le.";
    renderGame();
  }

  window.setTimeout(() => {
    suppressBoardClick = false;
  }, 0);
}

function handlePieceDragCancel(event) {
  if (!activePieceDrag || activePieceDrag.pointerId !== event.pointerId) {
    return;
  }

  try {
    boardEl.releasePointerCapture(event.pointerId);
  } catch (error) {
    console.warn(error);
  }

  cleanupPieceDrag();
  clearSelection();
  statusMessage = "Da huy keo quan.";
  renderGame();
  window.setTimeout(() => {
    suppressBoardClick = false;
  }, 0);
}

function handlePaletteClick(event) {
  const button = event.target.closest(".palette-button");

  if (!button) {
    return;
  }

  customSelectedPiece = button.dataset.piece;
  statusMessage = `Da chon ${getCustomPieceLabel(customSelectedPiece).toLowerCase()}.`;
  renderGame();
}

async function handleCustomBoardClick(square) {
  stopSearch();
  clearSelection();

  const pieceCode = customSelectedPiece;
  const currentPieceCode = getPieceCode(chess.get(square));

  if (pieceCode === "erase" || currentPieceCode === pieceCode) {
    chess.remove(square);
    syncCustomBoardState();
    engineLineMessage = "Che do custom: Stockfish dang tat.";
    statusMessage = `Da xoa o ${square}.`;
    await persistState();
    renderGame();
    return;
  }

  const piece = parsePieceCode(pieceCode);

  if (!piece) {
    statusMessage = "Khong xac dinh duoc quan can dat.";
    renderGame();
    return;
  }

  if (piece.type === "k") {
    const existingKingSquare = findPieceSquareByCode(pieceCode);

    if (existingKingSquare && existingKingSquare !== square) {
      chess.remove(existingKingSquare);
    }
  }

  const success = chess.put(piece, square);

  if (!success) {
    statusMessage = "Khong dat duoc quan nay. Moi mau chi duoc 1 vua.";
    renderGame();
    return;
  }

  syncCustomBoardState();
  engineLineMessage = "Che do custom: Stockfish dang tat.";
  statusMessage = `Da dat ${getCustomPieceLabel(pieceCode).toLowerCase()} vao ${square}.`;
  await persistState();
  renderGame();
}

function selectSquare(square) {
  selectedSquare = square;
  legalMoves = chess.moves({
    square,
    verbose: true
  });
}

function clearSelection() {
  selectedSquare = null;
  legalMoves = [];
}

async function playHumanMove(moveCandidate) {
  previewTopMove = null;
  const move = chess.move({
    from: moveCandidate.from,
    to: moveCandidate.to,
    promotion: moveCandidate.promotion || "q"
  });

  if (!move) {
    statusMessage = "Nuoc di khong hop le.";
    renderGame();
    return;
  }

  moveStack.push(moveToUci(move));
  clearSelection();
  engineLineMessage = "Dang doi Stockfish phan tich vi tri moi...";
  statusMessage = `Ban di ${move.san}.`;
  await persistState();
  renderGame();

  if (!chess.isGameOver()) {
    await requestEngineMove(false);
  }
}

async function startNewGame() {
  previewTopMove = null;
  stopSearch();
  chess = new Chess();
  initialFen = null;
  moveStack = [];
  customTurn = "w";
  boardView = playerColor;
  clearSelection();

  if (mode === MODE_CUSTOM) {
    initialFen = chess.fen();
    engineLineMessage = "Che do custom: ban co moi da san sang de ban dat quan.";
    statusMessage = "Ban co moi. Chon quan roi bam vao o de dat.";
  } else {
    engineLineMessage = "Stockfish se hien score va dong pv sau khi bat dau tinh.";
    statusMessage = playerColor === "white"
      ? "Van moi. Den luot ban."
      : "Van moi. Stockfish se di truoc.";
    resetEngineForFreshGame();
  }

  await persistState();
  renderGame();

  if (shouldEnginePlay()) {
    await requestEngineMove(false);
  }
}

async function undoFullTurn() {
  previewTopMove = null;
  if (mode === MODE_CUSTOM) {
    statusMessage = "Che do custom khong dung undo cap nuoc. Ban co the xoa o hoac nap FEN.";
    renderGame();
    return;
  }

  if (!moveStack.length) {
    statusMessage = "Khong con lich su de undo.";
    renderGame();
    return;
  }

  stopSearch();
  moveStack = moveStack.slice(0, Math.max(0, moveStack.length - Math.min(2, moveStack.length)));
  rebuildGameFromState();
  clearSelection();
  engineLineMessage = "Da lui 1 cap nuoc. Stockfish se tinh lai khi can.";
  statusMessage = "Da undo 1 cap nuoc.";
  resetEngineForFreshGame();
  await persistState();
  renderGame();

  if (shouldEnginePlay()) {
    await requestEngineMove(false);
  }
}

async function loadFenPosition(rawFen) {
  previewTopMove = null;
  const fen = rawFen.trim();

  if (!fen) {
    statusMessage = "Hay nhap FEN truoc khi nap.";
    renderGame();
    return;
  }

  try {
    stopSearch();
    clearSelection();

    if (mode === MODE_CUSTOM) {
      chess = new Chess(fen, { skipValidation: true });
      customTurn = chess.turn();
      initialFen = chess.fen();
      moveStack = [];
      engineLineMessage = "Che do custom: da nap FEN moi.";
      statusMessage = "Da nap FEN vao custom board.";
    } else {
      chess = new Chess(fen);
      initialFen = chess.fen() === START_FEN ? null : chess.fen();
      moveStack = [];
      engineLineMessage = "FEN moi da duoc nap. Stockfish se tinh lai tren vi tri nay.";
      statusMessage = "Da nap FEN thanh cong.";
      resetEngineForFreshGame();
    }

    await persistState();
    renderGame();

    if (shouldEnginePlay()) {
      await requestEngineMove(false);
    }
  } catch (error) {
    statusMessage = error?.message || "FEN khong hop le.";
    renderGame();
  }
}

async function switchMode(nextMode) {
  previewTopMove = null;
  const targetMode = nextMode === MODE_CUSTOM ? MODE_CUSTOM : MODE_PLAY;

  if (targetMode === mode) {
    renderGame();
    return;
  }

  stopSearch();
  clearSelection();

  if (targetMode === MODE_PLAY) {
    try {
      const strictGame = new Chess(chess.fen());
      chess = strictGame;
      mode = MODE_PLAY;
      initialFen = chess.fen() === START_FEN ? null : chess.fen();
      moveStack = [];
      customTurn = chess.turn();
      engineLineMessage = "Da quay lai che do choi voi may.";
      statusMessage = "Che do choi voi may da duoc bat.";
      resetEngineForFreshGame();
      await persistState();
      renderGame();

      if (shouldEnginePlay()) {
        await requestEngineMove(false);
      }
    } catch (error) {
      modeSelect.value = MODE_CUSTOM;
      statusMessage =
        "Vi tri custom chua hop le de choi voi may. Hay dat lai FEN hop le roi moi chuyen che do.";
      renderGame();
    }

    return;
  }

  mode = MODE_CUSTOM;
  customTurn = chess.turn();
  initialFen = chess.fen();
  moveStack = [];
  engineLineMessage = "Che do custom: Stockfish tam tat de ban tu dat quan.";
  statusMessage = "Da chuyen sang che do custom ban co.";
  await persistState();
  renderGame();
}

async function requestEngineMove(forceCurrentSide) {
  previewTopMove = null;
  if (mode !== MODE_PLAY) {
    statusMessage = "Che do custom dang bat, may se khong danh nuoc.";
    renderGame();
    return;
  }

  if (engineSearching || chess.isGameOver()) {
    renderGame();
    return;
  }

  if (!forceCurrentSide && !shouldEnginePlay()) {
    return;
  }

  ensureEngine();

  if (!engineReady) {
    pendingSearch = true;
    pendingForceSearch = forceCurrentSide;
    pendingSearchPurpose = "move";
    statusMessage = "Dang tai Stockfish...";
    renderGame();
    return;
  }

  configureEngine("move");
  clearSelection();
  engineSearching = true;
  pendingSearch = false;
  pendingForceSearch = false;
  pendingSearchPurpose = "move";
  activeSearchPurpose = "move";
  activeSearchFen = chess.fen();
  engineTopMoves = [];
  engineTopMovesFen = activeSearchFen;
  statusMessage = "Stockfish dang nghi...";
  engineLineMessage = `Muc ${DIFFICULTY_PRESETS[difficulty].label} | depth ${DIFFICULTY_PRESETS[difficulty].depth}`;
  renderGame();

  engineSend(`position fen ${activeSearchFen}`);
  engineSend(`go depth ${DIFFICULTY_PRESETS[difficulty].depth}`);
}

async function requestTopMoves() {
  previewTopMove = null;
  if (mode !== MODE_PLAY) {
    statusMessage = "Che do custom dang bat, khong phan tich Top 3.";
    renderGame();
    return;
  }

  if (engineSearching) {
    statusMessage = "Stockfish dang nghi, hay doi lan phan tich hien tai xong.";
    renderGame();
    return;
  }

  if (chess.isGameOver()) {
    statusMessage = "Van nay da ket thuc, khong con Top 3 de goi y.";
    renderGame();
    return;
  }

  ensureEngine();

  if (!engineReady) {
    pendingSearch = true;
    pendingForceSearch = false;
    pendingSearchPurpose = "hint";
    statusMessage = "Dang tai Stockfish...";
    renderGame();
    return;
  }

  configureEngine("hint");
  clearSelection();
  engineSearching = true;
  pendingSearch = false;
  pendingForceSearch = false;
  pendingSearchPurpose = "hint";
  activeSearchPurpose = "hint";
  activeSearchFen = chess.fen();
  engineTopMoves = [];
  engineTopMovesFen = activeSearchFen;
  statusMessage = "Stockfish dang phan tich Top 3...";
  engineLineMessage = `Top 3 | depth ${HINT_ENGINE_PRESET.depth} | engine manh nhat`;
  renderGame();

  engineSend(`position fen ${activeSearchFen}`);
  engineSend(`go depth ${HINT_ENGINE_PRESET.depth}`);
}

function ensureEngine() {
  if (engineWorker) {
    return;
  }

  engineWorker = new Worker(chrome.runtime.getURL("popup/engine/stockfish.js"));
  engineWorker.addEventListener("message", handleEngineMessage);
  engineWorker.addEventListener("error", (event) => {
    engineReady = false;
    engineSearching = false;
    pendingSearch = false;
    pendingForceSearch = false;
    activeSearchFen = "";
    statusMessage = event?.message || "Khong khoi dong duoc Stockfish.";
    engineLineMessage = "Engine gap loi khi tai worker.";
    renderGame();
  });
  engineSend("uci");
}

function handleEngineMessage(event) {
  const line = typeof event.data === "string" ? event.data.trim() : "";

  if (!line) {
    return;
  }

  if (line === "uciok") {
    engineReady = true;
    configureEngine("move");
    engineSend("isready");
    renderGame();
    return;
  }

  if (line === "readyok") {
    engineReady = true;
    renderGame();

    if (pendingSearch) {
      const forced = pendingForceSearch;
      const purpose = pendingSearchPurpose;
      pendingForceSearch = false;
      pendingSearchPurpose = "move";
      void (purpose === "hint" ? requestTopMoves() : requestEngineMove(forced));
    }

    return;
  }

  if (line.startsWith("bestmove")) {
    handleBestMove(line);
    return;
  }

  if (line.startsWith("info ")) {
    handleEngineInfo(line);
  }
}

function handleBestMove(line) {
  engineSearching = false;
  const match = line.match(/^bestmove\s([a-h][1-8])([a-h][1-8])([qrbn])?/);

  if (activeSearchPurpose === "hint") {
    previewTopMove = null;
    activeSearchFen = "";
    activeSearchPurpose = "move";
    statusMessage = engineTopMoves.length
      ? "Da cap nhat Top 3 nuoc goi y."
      : "Khong lay duoc Top 3 cho vi tri hien tai.";
    renderGame();
    return;
  }

  if (mode !== MODE_PLAY || !match || !activeSearchFen || chess.fen() !== activeSearchFen) {
    activeSearchFen = "";
    renderGame();
    return;
  }

  const move = chess.move({
    from: match[1],
    to: match[2],
    promotion: match[3] || "q"
  });

  previewTopMove = null;
  activeSearchFen = "";
  activeSearchPurpose = "move";

  if (!move) {
    statusMessage = "Da bo qua bestmove cu vi trang thai van da thay doi.";
    renderGame();
    return;
  }

  moveStack.push(moveToUci(move));
  statusMessage = `Stockfish di ${move.san}.`;
  void persistState();
  renderGame();
}

function handleEngineInfo(line) {
  if (mode !== MODE_PLAY) {
    return;
  }

  const depthMatch = line.match(/\bdepth\s(\d+)/);
  const multiPvMatch = line.match(/\bmultipv\s(\d+)/);
  const scoreMatch = line.match(/\bscore\s(cp|mate)\s(-?\d+)/);
  const pvMatch = line.match(/\bpv\s(.+)$/);
  const multiPv = Number(multiPvMatch?.[1] || 1);
  const depth = depthMatch ? Number(depthMatch[1]) : 0;

  if (!depthMatch && !scoreMatch && !pvMatch) {
    return;
  }

  const parts = [];

  if (scoreMatch) {
    parts.push(formatScore(scoreMatch[1], Number(scoreMatch[2])));
  }

  if (depthMatch) {
    parts.push(`depth ${depth}`);
  }

  if (pvMatch) {
    parts.push(`pv ${pvMatch[1].split(/\s+/).slice(0, 5).join(" ")}`);
  }

  if (multiPv === 1) {
    engineLineMessage = parts.join(" | ");
  }

  if (activeSearchFen && scoreMatch && pvMatch) {
    upsertTopMove({
      rank: multiPv,
      depth,
      score: formatScore(scoreMatch[1], Number(scoreMatch[2])),
      pv: pvMatch[1]
    });
  }

  renderGame();
}

function configureEngine(purpose = "move") {
  if (!engineWorker || !engineReady) {
    return;
  }

  const preset = DIFFICULTY_PRESETS[difficulty];
  engineSend("setoption name Threads value 1");
  engineSend("setoption name Hash value 16");
  engineSend("setoption name MultiPV value 3");

  if (purpose === "hint") {
    engineSend("setoption name UCI_LimitStrength value false");
    engineSend(`setoption name Skill Level value ${HINT_ENGINE_PRESET.skill}`);
    return;
  }

  engineSend(`setoption name Skill Level value ${preset.skill}`);
  engineSend("setoption name UCI_LimitStrength value true");
  engineSend(`setoption name UCI_Elo value ${preset.elo}`);
}

function resetEngineForFreshGame() {
  if (!engineWorker || !engineReady) {
    return;
  }

  engineSend("stop");
  engineSend("ucinewgame");
  engineSend("isready");
}

function stopSearch() {
  if (!engineWorker) {
    activeSearchFen = "";
    activeSearchPurpose = "move";
    engineSearching = false;
    pendingSearch = false;
    pendingForceSearch = false;
    return;
  }

  engineSearching = false;
  pendingSearch = false;
  pendingForceSearch = false;
  pendingSearchPurpose = "move";
  activeSearchFen = "";
  activeSearchPurpose = "move";
  engineSend("stop");
}

function engineSend(command) {
  if (!engineWorker) {
    return;
  }

  engineWorker.postMessage(command);
}

function shutdownEngine() {
  if (!engineWorker) {
    return;
  }

  try {
    engineWorker.postMessage("quit");
  } catch (error) {
    console.warn(error);
  }
}

async function restoreState() {
  try {
    const stored = await chrome.storage.local.get(STORAGE_KEY);
    const snapshot = stored?.[STORAGE_KEY];

    if (!snapshot) {
      syncFormControls();
      return;
    }

    playerColor = snapshot.playerColor === "black" ? "black" : "white";
    boardView = snapshot.boardView === "black" ? "black" : playerColor;
    boardSize = clampBoardSize(snapshot.boardSize);
    difficulty = DIFFICULTY_PRESETS[snapshot.difficulty] ? snapshot.difficulty : "2";
    popupWidth = clampPopupWidth(snapshot.popupWidth);
    popupOpacity = clampPopupOpacity(snapshot.popupOpacity);
    mode = snapshot.mode === MODE_CUSTOM ? MODE_CUSTOM : MODE_PLAY;
    customTurn = snapshot.customTurn === "b" ? "b" : "w";
    customSelectedPiece = CUSTOM_PIECES.some((piece) => piece.value === snapshot.customSelectedPiece)
      ? snapshot.customSelectedPiece
      : "wp";

    if (mode === MODE_PLAY && snapshot.initialFen !== undefined) {
      initialFen = typeof snapshot.initialFen === "string" ? snapshot.initialFen : null;
      moveStack = Array.isArray(snapshot.moveStack) ? snapshot.moveStack.filter(Boolean) : [];
      rebuildGameFromState();
    } else if (typeof snapshot.currentFen === "string") {
      chess = new Chess(snapshot.currentFen, {
        skipValidation: mode === MODE_CUSTOM
      });
      initialFen = mode === MODE_CUSTOM
        ? chess.fen()
        : (chess.fen() === START_FEN ? null : chess.fen());
      moveStack = [];
      customTurn = chess.turn();
    }

    statusMessage = mode === MODE_CUSTOM
      ? "Da khoi phuc custom board."
      : (moveStack.length ? "Da khoi phuc van dang choi." : "San sang.");
    engineLineMessage = mode === MODE_CUSTOM
      ? "Che do custom: Stockfish dang tat."
      : "Popup da tai lai van dang choi tu lan mo truoc.";
    syncFormControls();
    applyPopupWidth();
    applyPopupOpacity();
  } catch (error) {
    statusMessage = error?.message || "Khong khoi phuc duoc van da luu.";
  }
}

function rebuildGameFromState() {
  previewTopMove = null;
  chess = initialFen ? new Chess(initialFen) : new Chess();

  for (const uci of moveStack) {
    const move = parseUciMove(uci);

    if (!move || !chess.move(move)) {
      chess = new Chess();
      initialFen = null;
      moveStack = [];
      statusMessage = "Trang thai cu bi loi, da reset ve van moi.";
      engineLineMessage = "Khong dung duoc state cu nen popup da reset.";
      break;
    }
  }

  customTurn = chess.turn();
}

async function persistState() {
  try {
    await chrome.storage.local.set({
      [STORAGE_KEY]: {
        currentFen: chess.fen(),
        initialFen,
        moveStack,
        playerColor,
        boardView,
        boardSize,
        difficulty,
        popupWidth,
        popupOpacity,
        mode,
        customTurn,
        customSelectedPiece
      }
    });
  } catch (error) {
    console.warn(error);
  }
}

function renderGame() {
  syncFormControls();
  renderCustomPalette();
  renderBoard();
  renderTopMoveOverlay();
  renderTopMoves();
  customPanelEl.classList.toggle("hidden", mode !== MODE_CUSTOM);
  gameFenInput.value = chess.fen();
  engineLineEl.textContent = engineLineMessage || "Stockfish se hien score va dong pv sau khi bat dau tinh.";
  undoMoveButton.disabled = mode === MODE_CUSTOM;
  analyzeTopMovesButton.disabled = mode === MODE_CUSTOM || engineSearching || chess.isGameOver();
}

function syncFormControls() {
  applyPopupWidth();
  applyPopupOpacity();
  applyBoardSize();
  modeSelect.value = mode;
  playerColorSelect.value = playerColor;
  difficultySelect.value = difficulty;
  sizeValueEl.textContent = `${popupWidth}px`;
  sizeDecreaseButton.disabled = popupWidth <= POPUP_WIDTH_CONFIG.min;
  sizeIncreaseButton.disabled = popupWidth >= POPUP_WIDTH_CONFIG.max;
  opacityValueEl.textContent = `${popupOpacity}%`;
  opacityDecreaseButton.disabled = popupOpacity <= POPUP_OPACITY_CONFIG.min;
  opacityIncreaseButton.disabled = popupOpacity >= POPUP_OPACITY_CONFIG.max;
  customTurnSelect.value = customTurn;
  customPieceLabelEl.textContent = getCustomPieceLabel(customSelectedPiece);
}

function applyPopupWidth() {
  document.documentElement.style.setProperty("--popup-width", `${popupWidth}px`);
  document.documentElement.style.width = `${popupWidth}px`;

  if (document.body) {
    document.body.style.width = `${popupWidth}px`;
    document.body.style.minWidth = `${popupWidth}px`;
  }

  try {
    localStorage.setItem(POPUP_WIDTH_STORAGE_KEY, String(popupWidth));
  } catch (error) {
    console.warn(error);
  }
}

function applyPopupOpacity() {
  document.documentElement.style.setProperty("--popup-opacity", `${popupOpacity / 100}`);

  try {
    localStorage.setItem(POPUP_OPACITY_STORAGE_KEY, String(popupOpacity));
  } catch (error) {
    console.warn(error);
  }
}

function applyBoardSize() {
  boardShellEl.style.setProperty("--board-size", `${boardSize}px`);
}

function clampPopupWidth(value) {
  return POPUP_WIDTH_CONFIG.clamp(value);
}

function clampPopupOpacity(value) {
  return POPUP_OPACITY_CONFIG.clamp(value);
}

async function updatePopupWidth(delta) {
  const nextWidth = clampPopupWidth(popupWidth + delta);

  if (nextWidth === popupWidth) {
    renderGame();
    return;
  }

  popupWidth = nextWidth;
  applyPopupWidth();
  statusMessage = `Da doi kich thuoc popup sang ${popupWidth}px.`;
  await persistState();
  renderGame();
}

async function updatePopupOpacity(delta) {
  const nextOpacity = clampPopupOpacity(popupOpacity + delta);

  if (nextOpacity === popupOpacity) {
    renderGame();
    return;
  }

  popupOpacity = nextOpacity;
  applyPopupOpacity();
  statusMessage = `Da doi do mo popup sang ${popupOpacity}%.`;
  await persistState();
  renderGame();
}

function clampBoardSize(value) {
  return BOARD_SIZE_CONFIG.clamp(value);
}

function handleBoardResizeStart(event) {
  if (event.button !== 0) {
    return;
  }

  event.preventDefault();
  activeBoardResize = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    startSize: boardSize
  };
  boardShellEl.classList.add("resizing");
  boardResizeHandleEl.setPointerCapture(event.pointerId);
}

function handleBoardResizeMove(event) {
  if (!activeBoardResize || activeBoardResize.pointerId !== event.pointerId) {
    return;
  }

  event.preventDefault();
  const deltaX = event.clientX - activeBoardResize.startX;
  const deltaY = event.clientY - activeBoardResize.startY;
  const delta = Math.round((deltaX + deltaY) / 2);
  boardSize = clampBoardSize(activeBoardResize.startSize + delta);
  applyBoardSize();
}

function handleBoardResizeEnd(event) {
  if (!activeBoardResize || activeBoardResize.pointerId !== event.pointerId) {
    return;
  }

  activeBoardResize = null;
  boardShellEl.classList.remove("resizing");

  try {
    boardResizeHandleEl.releasePointerCapture(event.pointerId);
  } catch (error) {
    console.warn(error);
  }

  statusMessage = `Da doi co ban co sang ${boardSize}px.`;
  void persistState();
  renderGame();
}

function createDragGhost(sourceSquare, pieceCode) {
  const sourceSquareEl = boardEl.querySelector(`[data-square="${sourceSquare}"]`);

  if (!sourceSquareEl) {
    return null;
  }

  const rect = sourceSquareEl.getBoundingClientRect();
  const ghostEl = document.createElement("div");
  const pieceAsset = PIECE_ASSETS[pieceCode];
  const pieceClass = pieceCode.startsWith("w") ? "piece piece-white" : "piece piece-black";

  ghostEl.className = "drag-piece-ghost";
  ghostEl.style.width = `${rect.width * 0.84}px`;
  ghostEl.style.height = `${rect.height * 0.84}px`;

  if (pieceAsset) {
    ghostEl.innerHTML = `<img class="${pieceClass}" src="${pieceAsset}" alt="" aria-hidden="true" draggable="false">`;
  } else {
    ghostEl.innerHTML = `<span class="${pieceClass} piece-fallback">${PIECE_SYMBOLS[pieceCode] || ""}</span>`;
  }

  document.body.appendChild(ghostEl);
  return ghostEl;
}

function updateDragGhostPosition(ghostEl, clientX, clientY) {
  if (!ghostEl) {
    return;
  }

  ghostEl.style.left = `${clientX}px`;
  ghostEl.style.top = `${clientY}px`;
}

function updateDragHoverSquare(clientX, clientY) {
  const nextSquare = getSquareFromPoint(clientX, clientY);

  if (nextSquare === dragHoverSquare) {
    return;
  }

  dragHoverSquare = nextSquare;
  renderBoard();
}

function getSquareFromPoint(clientX, clientY) {
  const targetEl = document.elementFromPoint(clientX, clientY);
  return targetEl?.closest(".square")?.dataset.square || "";
}

function cleanupPieceDrag() {
  if (activePieceDrag?.ghostEl) {
    activePieceDrag.ghostEl.remove();
  }

  activePieceDrag = null;
  dragHoverSquare = "";
  renderBoard();
  renderTopMoveOverlay();
}

function upsertTopMove(entry) {
  const sanLine = convertPvToSan(activeSearchFen, entry.pv);
  const nextMove = sanLine[0] || entry.pv.split(/\s+/)[0] || "-";
  const line = sanLine.slice(0, 5).join(" ");
  const firstUciMove = entry.pv.split(/\s+/).find(Boolean) || "";
  const parsedFirstMove = parseUciMove(firstUciMove);
  const existingMove = engineTopMoves.find((move) => move.rank === entry.rank);

  if (existingMove && existingMove.depth > entry.depth) {
    return;
  }

  engineTopMoves = [
    ...engineTopMoves.filter((move) => move.rank !== entry.rank),
    {
      rank: entry.rank,
      depth: entry.depth,
      score: entry.score,
      move: nextMove,
      line: line || entry.pv,
      from: parsedFirstMove?.from || "",
      to: parsedFirstMove?.to || ""
    }
  ].sort((left, right) => left.rank - right.rank);
}

function handleTopMovePointerOver(event) {
  const itemEl = event.target.closest(".top-move");

  if (!itemEl || !topMovesListEl.contains(itemEl)) {
    return;
  }

  setTopMovePreview(itemEl.dataset.from, itemEl.dataset.to, itemEl.dataset.rank);
}

function handleTopMovePointerOut(event) {
  const itemEl = event.target.closest(".top-move");

  if (!itemEl) {
    return;
  }

  const relatedTarget = event.relatedTarget;

  if (relatedTarget instanceof Node && itemEl.contains(relatedTarget)) {
    return;
  }

  clearTopMovePreview();
}

function handleTopMoveClick(event) {
  const itemEl = event.target.closest(".top-move");

  if (!itemEl || !topMovesListEl.contains(itemEl)) {
    return;
  }

  const nextPreview = {
    from: itemEl.dataset.from || "",
    to: itemEl.dataset.to || "",
    rank: itemEl.dataset.rank || ""
  };

  if (
    previewTopMove?.from === nextPreview.from &&
    previewTopMove?.to === nextPreview.to &&
    previewTopMove?.rank === nextPreview.rank
  ) {
    clearTopMovePreview();
    return;
  }

  setTopMovePreview(nextPreview.from, nextPreview.to, nextPreview.rank);
}

function setTopMovePreview(from, to, rank) {
  if (!from || !to) {
    clearTopMovePreview();
    return;
  }

  previewTopMove = { from, to, rank: String(rank || "") };
  renderBoard();
  renderTopMoveOverlay();
  syncTopMovePreviewState();
}

function clearTopMovePreview() {
  if (!previewTopMove) {
    return;
  }

  previewTopMove = null;
  renderBoard();
  renderTopMoveOverlay();
  syncTopMovePreviewState();
}

function renderTopMoves() {
  if (mode !== MODE_PLAY) {
    topMovesListEl.textContent = "Top 3 chi hien trong che do choi voi may.";
    return;
  }

  if (!engineTopMoves.length || engineTopMovesFen !== chess.fen()) {
    topMovesListEl.textContent = engineSearching && activeSearchPurpose === "hint"
      ? "Stockfish dang tinh Top 3..."
      : 'Bam "Top 3 goi y" de xem cac nuoc manh nhat cho vi tri hien tai.';
    return;
  }

  topMovesListEl.innerHTML = engineTopMoves.map((move) => `
    <button
      class="top-move"
      type="button"
      data-rank="${move.rank}"
      data-from="${escapeHtml(move.from)}"
      data-to="${escapeHtml(move.to)}"
    >
      <div class="top-move-head">
        <span><span class="top-move-rank">#${move.rank}</span> ${escapeHtml(move.move)}</span>
        <span class="top-move-score">${escapeHtml(move.score)}</span>
      </div>
      <div class="top-move-line">depth ${move.depth} | ${escapeHtml(move.line)}</div>
    </button>
  `).join("");
  syncTopMovePreviewState();
}

function syncTopMovePreviewState() {
  const moveButtons = topMovesListEl.querySelectorAll(".top-move");

  moveButtons.forEach((buttonEl) => {
    const isActive = previewTopMove?.rank === buttonEl.dataset.rank;
    buttonEl.classList.toggle("active-preview", Boolean(isActive));
  });
}

function renderTopMoveOverlay() {
  const movesToRender = engineTopMovesFen === chess.fen()
    ? engineTopMoves.filter((move) => move.from && move.to)
    : [];

  if (!movesToRender.length) {
    boardOverlayEl.innerHTML = "";
    return;
  }

  const boardRect = boardEl.getBoundingClientRect();
  const viewWidth = boardRect.width;
  const viewHeight = boardRect.height;
  const overlayMarkup = movesToRender.map((move) => {
    const fromEl = boardEl.querySelector(`[data-square="${move.from}"]`);
    const toEl = boardEl.querySelector(`[data-square="${move.to}"]`);

    if (!fromEl || !toEl) {
      return "";
    }

    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();
    const startX = fromRect.left - boardRect.left + fromRect.width / 2;
    const startY = fromRect.top - boardRect.top + fromRect.height / 2;
    const endX = toRect.left - boardRect.left + toRect.width / 2;
    const endY = toRect.top - boardRect.top + toRect.height / 2;
    const vectorX = endX - startX;
    const vectorY = endY - startY;
    const distance = Math.hypot(vectorX, vectorY) || 1;
    const unitX = vectorX / distance;
    const unitY = vectorY / distance;
    const squareSize = Math.min(fromRect.width, fromRect.height);
    const startOffset = squareSize * 0.16;
    const endOffset = squareSize * 0.24;
    const lineStartX = startX + unitX * startOffset;
    const lineStartY = startY + unitY * startOffset;
    const lineEndX = endX - unitX * endOffset;
    const lineEndY = endY - unitY * endOffset;
    const headLength = Math.max(12, squareSize * 0.24);
    const headWidth = Math.max(9, squareSize * 0.18);
    const baseX = lineEndX - unitX * headLength;
    const baseY = lineEndY - unitY * headLength;
    const normalX = -unitY;
    const normalY = unitX;
    const headLeftX = baseX + normalX * headWidth;
    const headLeftY = baseY + normalY * headWidth;
    const headRightX = baseX - normalX * headWidth;
    const headRightY = baseY - normalY * headWidth;
    const isActive = previewTopMove?.rank === String(move.rank);
    const stateClass = previewTopMove ? (isActive ? " is-active" : " is-muted") : "";
    const rankClass = ` rank-${move.rank}`;

    return `
      <g class="top-move-overlay${rankClass}${stateClass}">
        <path class="top-move-arrow-glow${rankClass}" d="M ${lineStartX} ${lineStartY} L ${lineEndX} ${lineEndY}" />
        <path class="top-move-arrow-line${rankClass}" d="M ${lineStartX} ${lineStartY} L ${lineEndX} ${lineEndY}" />
        <circle class="top-move-arrow-from-dot${rankClass}" cx="${startX}" cy="${startY}" r="${Math.max(6, squareSize * 0.12)}" />
        <circle class="top-move-arrow-to-ring${rankClass}" cx="${endX}" cy="${endY}" r="${Math.max(12, squareSize * 0.22)}" />
        <polygon class="top-move-arrow-head${rankClass}" points="${lineEndX},${lineEndY} ${headLeftX},${headLeftY} ${headRightX},${headRightY}" />
      </g>
    `;
  }).join("");

  boardOverlayEl.innerHTML = `
    <svg viewBox="0 0 ${viewWidth} ${viewHeight}" preserveAspectRatio="none" aria-hidden="true">
      ${overlayMarkup}
    </svg>
  `;
}

function convertPvToSan(fen, pv) {
  if (!fen || !pv) {
    return [];
  }

  const analysisChess = new Chess(fen);
  const sanMoves = [];

  for (const rawMove of pv.split(/\s+/).filter(Boolean)) {
    const move = parseUciMove(rawMove);

    if (!move) {
      break;
    }

    const playedMove = analysisChess.move(move);

    if (!playedMove) {
      break;
    }

    sanMoves.push(playedMove.san);
  }

  return sanMoves;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderCustomPalette() {
  const html = CUSTOM_PIECES.map((piece) => {
    const activeClass = piece.value === customSelectedPiece ? " active" : "";
    const visual = piece.asset
      ? `<img class="palette-piece" src="${piece.asset}" alt="" aria-hidden="true" draggable="false">`
      : `<span class="palette-erase" aria-hidden="true">${piece.symbol}</span>`;

    return `
      <button class="palette-button${activeClass}" data-piece="${piece.value}" type="button">
        ${visual}
        <span class="palette-label">${piece.label}</span>
      </button>
    `;
  }).join("");

  customPaletteEl.innerHTML = html;
}

function renderBoard() {
  const rankOrder = boardView === "white"
    ? [8, 7, 6, 5, 4, 3, 2, 1]
    : [1, 2, 3, 4, 5, 6, 7, 8];
  const fileOrder = boardView === "white" ? FILES : [...FILES].reverse();
  const checkedSquare = mode === MODE_PLAY && chess.isCheck() ? findKingSquare(chess.turn()) : "";
  let html = "";

  rankOrder.forEach((rank, rankIndex) => {
    fileOrder.forEach((file, fileIndex) => {
      const square = `${file}${rank}`;
      const piece = chess.get(square);
      const colorClass = isLightSquare(square) ? "light" : "dark";
      const isSelected = selectedSquare === square;
      const isLegalTarget = mode === MODE_PLAY && legalMoves.some((move) => move.to === square);
      const isCapture = isLegalTarget && Boolean(piece);
      const isDragSource = activePieceDrag?.started && activePieceDrag.sourceSquare === square;
      const isDragHover = dragHoverSquare === square;
      const isTopMoveFrom = previewTopMove?.from === square;
      const isTopMoveTo = previewTopMove?.to === square;
      const coord = buildCoordLabel(rankIndex, fileIndex, square);
      const classes = [
        "square",
        colorClass,
        isSelected ? "selected" : "",
        isLegalTarget ? "legal" : "",
        isDragSource ? "drag-source" : "",
        isDragHover ? "drag-hover" : "",
        isTopMoveFrom ? "top-move-from" : "",
        isTopMoveTo ? "top-move-to" : "",
        isCapture ? "capture" : "",
        checkedSquare === square ? "checked" : ""
      ].filter(Boolean).join(" ");

      html += `<button class="${classes}" data-square="${square}" aria-label="${square}" type="button">`;

      if (coord) {
        html += `<span class="coord">${coord}</span>`;
      }

      if (isLegalTarget) {
        html += piece ? '<span class="capture-ring"></span>' : '<span class="move-dot"></span>';
      }

      if (piece) {
        const pieceCode = `${piece.color}${piece.type}`;
        const pieceClass = piece.color === "w" ? "piece piece-white" : "piece piece-black";
        const pieceAsset = PIECE_ASSETS[pieceCode];
        html += pieceAsset
          ? `<img class="${pieceClass}" src="${pieceAsset}" alt="" aria-hidden="true" draggable="false">`
          : `<span class="${pieceClass} piece-fallback">${PIECE_SYMBOLS[pieceCode] || ""}</span>`;
      }

      html += "</button>";
    });
  });

  boardEl.innerHTML = html;
}

function buildCoordLabel(rankIndex, fileIndex, square) {
  const labels = [];

  if (fileIndex === 0) {
    labels.push(square[1]);
  }

  if (rankIndex === 7) {
    labels.push(square[0]);
  }

  return labels.join(" ");
}

function isLightSquare(square) {
  const fileIndex = FILES.indexOf(square[0]);
  const rankIndex = Number(square[1]) - 1;
  return (fileIndex + rankIndex) % 2 === 1;
}

function findKingSquare(colorCode) {
  for (const file of FILES) {
    for (let rank = 1; rank <= 8; rank += 1) {
      const square = `${file}${rank}`;
      const piece = chess.get(square);

      if (piece?.type === "k" && piece.color === colorCode) {
        return square;
      }
    }
  }

  return "";
}

function findPieceSquareByCode(pieceCode) {
  for (const file of FILES) {
    for (let rank = 1; rank <= 8; rank += 1) {
      const square = `${file}${rank}`;
      const currentPieceCode = getPieceCode(chess.get(square));

      if (currentPieceCode === pieceCode) {
        return square;
      }
    }
  }

  return "";
}

function syncCustomBoardState() {
  const placement = chess.fen().split(" ")[0];
  chess = new Chess(`${placement} ${customTurn} - - 0 1`, {
    skipValidation: true
  });
  initialFen = chess.fen();
  moveStack = [];
}

function defaultStatusText() {
  if (mode === MODE_CUSTOM) {
    return "Dang custom ban co.";
  }

  if (chess.isGameOver()) {
    return describeGameResult();
  }

  if (engineSearching) {
    return "Stockfish dang nghi...";
  }

  return isPlayerTurn() ? "Den luot ban." : "Den luot Stockfish.";
}

function describeGameResult() {
  if (mode === MODE_CUSTOM) {
    return "Dang custom";
  }

  if (chess.isCheckmate()) {
    return isPlayerTurn() ? "Ban thua do bi chieu bi." : "Ban thang do chieu bi.";
  }

  if (chess.isStalemate()) {
    return "Hoa do het nuoc di.";
  }

  if (typeof chess.isInsufficientMaterial === "function" && chess.isInsufficientMaterial()) {
    return "Hoa do thieu vat chat.";
  }

  if (typeof chess.isThreefoldRepetition === "function" && chess.isThreefoldRepetition()) {
    return "Hoa do lap lai 3 lan.";
  }

  if (typeof chess.isDrawByFiftyMoves === "function" && chess.isDrawByFiftyMoves()) {
    return "Hoa do luat 50 nuoc.";
  }

  if (chess.isDraw()) {
    return "Hoa.";
  }

  return "Dang choi";
}

function describeEngineStatus() {
  if (mode === MODE_CUSTOM) {
    return "Tat trong custom";
  }

  if (!engineWorker) {
    return `San sang | ${DIFFICULTY_PRESETS[difficulty].label}`;
  }

  if (!engineReady) {
    return "Dang tai...";
  }

  if (engineSearching) {
    return `Dang nghi | ${DIFFICULTY_PRESETS[difficulty].label}`;
  }

  return `San sang | ${DIFFICULTY_PRESETS[difficulty].label}`;
}

function shouldEnginePlay() {
  return mode === MODE_PLAY && !chess.isGameOver() && chess.turn() !== playerColorCode();
}

function isPlayerTurn() {
  return mode === MODE_PLAY && chess.turn() === playerColorCode();
}

function playerColorCode() {
  return playerColor === "black" ? "b" : "w";
}

function moveToUci(move) {
  return `${move.from}${move.to}${move.promotion || ""}`;
}

function parseUciMove(uci) {
  const match = String(uci).match(/^([a-h][1-8])([a-h][1-8])([qrbn])?$/);

  if (!match) {
    return null;
  }

  return {
    from: match[1],
    to: match[2],
    promotion: match[3] || "q"
  };
}

function formatScore(scoreType, rawValue) {
  if (scoreType === "mate") {
    const normalized = chess.turn() === "w" ? rawValue : -rawValue;
    return normalized > 0 ? `mate +${normalized}` : `mate ${normalized}`;
  }

  const whitePerspective = chess.turn() === "w" ? rawValue : -rawValue;
  const pawns = (whitePerspective / 100).toFixed(2);
  return whitePerspective > 0 ? `+${pawns}` : pawns;
}

function parsePieceCode(pieceCode) {
  if (!/^[wb][kqrbnp]$/.test(pieceCode)) {
    return null;
  }

  return {
    color: pieceCode[0],
    type: pieceCode[1]
  };
}

function getPieceCode(piece) {
  if (!piece) {
    return "";
  }

  return `${piece.color}${piece.type}`;
}

function getCustomPieceLabel(pieceCode) {
  return CUSTOM_PIECES.find((piece) => piece.value === pieceCode)?.label || "Tot trang";
}
