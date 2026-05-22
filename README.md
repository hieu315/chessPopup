# Popup Gambit

Extension Chrome nho de choi co vua voi `Stockfish` ngay trong popup, chay hoan toan local.

## Tinh nang

- Choi voi may ngay trong popup
- Co `Custom ban co` de tu dat/xoa quan ma khong bi may chen vao
- Chon ben cam `Trang/Den`
- Chon 5 muc do kho
- `Undo` 1 cap nuoc
- Lat huong nhin ban co
- Nap va copy `FEN`
- Tu luu lai van dang choi bang `chrome.storage`

## Cai dat

1. Mo `chrome://extensions`
2. Bat `Developer mode`
3. Bam `Load unpacked`
4. Chon thu muc [ChromeChessPopup](d:\NghichCode\ChromeChessPopup)
5. Bam icon extension de mo popup

## Cau truc

- [manifest.json](d:\NghichCode\ChromeChessPopup\manifest.json): khai bao extension popup
- [popup/popup.html](d:\NghichCode\ChromeChessPopup\popup\popup.html): giao dien popup
- [popup/popup.css](d:\NghichCode\ChromeChessPopup\popup\popup.css): style ban co va control
- [popup/popup.js](d:\NghichCode\ChromeChessPopup\popup\popup.js): luat di, state, luu game va noi Stockfish
- [popup/vendor/chess.js](d:\NghichCode\ChromeChessPopup\popup\vendor\chess.js): thu vien xu ly luat co
- [popup/engine/stockfish.js](d:\NghichCode\ChromeChessPopup\popup\engine\stockfish.js): worker engine
- [popup/engine/stockfish.wasm](d:\NghichCode\ChromeChessPopup\popup\engine\stockfish.wasm): file wasm cua engine

## Luu y

- Day la ban MVP, tot phong dang duoc auto phong hau
- Neu dong popup, van dang choi se duoc nho lai va phuc hoi khi mo lai
- Neu ban dinh phat hanh extension nay, can xem ky nghia vu giay phep cua `Stockfish` vi engine nay dung `GPLv3`
