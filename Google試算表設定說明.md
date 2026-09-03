# P6-Lite：Google 試算表後端設定說明

這份說明教你把 `p6-lite.html` 接上一個免費的 Google 試算表，讓每次新增／編輯／刪除／搬移任務都會自動即時寫入試算表，重新整理頁面或換一台電腦開，資料都還在。

整體架構：`p6-lite.html`（放在 GitHub Pages 上）←→ Google Apps Script 網頁應用程式（免費，跑在 Google 的伺服器上）←→ Google 試算表（真正存資料的地方）。

## 第一步：建立 Google 試算表

1. 到 [Google 試算表](https://sheets.google.com) 新增一份空白試算表，取名例如「大安區OO商辦大樓新建工程 - P6-Lite 資料」。
2. 不需要手動建欄位或分頁，程式第一次執行時會自動建立一個叫 `tasks` 的分頁並補上標題列。

## 第二步：貼上後端程式碼

1. 在試算表上方選單點 **擴充功能 (Extensions) > Apps Script**。
2. 把編輯器裡預設的 `Code.gs` 內容全部刪掉，貼上隨附的 `Code.gs` 檔案的完整內容。
3. 找到檔案最上面這一行：
   ```js
   const TOKEN = 'CHANGE_ME_SHARED_TOKEN';
   ```
   把 `CHANGE_ME_SHARED_TOKEN` 改成你自己設定的一組密碼（英數字即可，例如 `daan-office-2026-xyz`）。這組密碼是用來防止別人亂猜到你的網址就能改你的資料，**不要用真的很重要的密碼**，因為它會明碼寫在前端網頁的原始碼裡。
4. 上方點 **儲存專案**（磁片圖示）。

## 第三步：部署成網頁應用程式

1. 右上角點 **部署 (Deploy) > 新增部署作業 (New deployment)**。
2. 左邊齒輪圖示選類型：**網頁應用程式 (Web app)**。
3. 設定：
   - **執行身分 (Execute as)**：我 (你的帳號)
   - **誰可以存取 (Who has access)**：任何人 (Anyone)
   
   ⚠️ 這裡選「任何人」不是說任何人都能改你的資料——沒有正確的 TOKEN 密碼，寫入請求會被拒絕（見 Code.gs 的 `doPost` 檢查）。但只要知道網址，任何人理論上都能讀到你的任務清單，所以請不要放機密資訊。
4. 點 **部署 (Deploy)**，第一次會要求你**授權**（因為程式要讀寫這份試算表）：跳出視窗後選你的 Google 帳號 → 「進階」→「前往 XXX（不安全）」→「允許」。這是正常的，因為這是你自己寫的程式，Google 只是還沒幫它做過安全審核。
5. 部署完成後會顯示一個網址，格式類似：
   ```
   https://script.google.com/macros/s/AKfycb.......XXXXXXXX/exec
   ```
   把這整串網址複製起來（結尾一定是 `/exec`）。

> 之後如果你修改了 Code.gs 的內容，要記得回到「部署 > 管理部署作業」，把現有的部署編輯成「新版本」重新部署，不然改的東西不會生效。

## 第四步：把網址和密碼填進 p6-lite.html

用文字編輯器打開 `p6-lite.html`，找到接近檔案開頭的這幾行（在 `<script>` 標籤之後）：

```js
const SHEET_API_URL = 'PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE';
const API_TOKEN = 'CHANGE_ME_SHARED_TOKEN';
```

改成：

```js
const SHEET_API_URL = '你剛剛複製的 /exec 網址';
const API_TOKEN = '你在 Code.gs 裡設定的同一組密碼';
```

**這兩個值一定要跟 Code.gs 裡的完全一樣**，密碼是拿來互相核對身分用的。存檔。

## 第五步：發布到 GitHub Pages

1. 到 [GitHub](https://github.com) 新增一個 repository（可以是 public 或 private，private 也能開 Pages）。
2. 把改好的 `p6-lite.html` 上傳進去，檔名建議直接改成 `index.html`（這樣網址比較短）。
3. 到 repository 的 **Settings > Pages**，Source 選 `main` 分支、根目錄 `/`，儲存。
4. 等一兩分鐘，GitHub 會給你一個網址，格式類似：
   ```
   https://你的帳號.github.io/repository名稱/
   ```
5. 打開這個網址，畫面右上角會有個小圓點狀態列：
   - 灰色「尚未連線」→ 表示 `SHEET_API_URL` 還沒填或格式不對，回去檢查第四步。
   - 橘色閃爍「同步中…」→ 正在寫入或讀取。
   - 綠色「已同步到 Google Sheet」/「已從 Google Sheet 載入」→ 成功了！
   - 紅色「同步失敗」→ 通常是 TOKEN 兩邊沒對上，或是部署設定裡「誰可以存取」不是「任何人」，回去檢查第三步。

## 之後怎麼用

- 之後每次新增、編輯、刪除、拖曳搬移、剪下貼上、或用右鍵串聯任務相依關係，右上角狀態列都會自動顯示同步進度，**不需要手動按儲存**。
- 如果同時有兩個人打開同一個網址編輯，後存的會整批覆蓋先存的（目前設計是「整份覆寫」，不是逐格合併），建議一次只由一個人編輯，或約定好誰負責維護。
- 想要備份資料，直接打開那份 Google 試算表看 `tasks` 分頁就可以，或用試算表本身的「版本記錄」功能救回舊版本。
- 想要改回純離線版本（不接 Google 試算表），把 `SHEET_API_URL` 改回 `PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE` 就可以，畫面會自動顯示內建的範例資料。

## 技術補充（給有興趣了解細節的人）

- 試算表裡只存「原始欄位」（任務名稱、負責人、預算、實際花費、進度、里程碑、前置任務關係……），像是開始/結束日期、關鍵路徑、浮時這些都是每次打開網頁時，前端用 CPM（要徑法）即時算出來的，**不會**存進試算表，所以你也不會在試算表裡看到這些欄位——這是正常的。
- 前端送資料到 Google 用 `Content-Type: text/plain` 而不是 `application/json`，這是為了避開瀏覽器對跨網域 JSON 請求會發出的「預檢請求（CORS preflight, OPTIONS）」——Google Apps Script 的網頁應用程式對這種預檢請求的支援不太穩定，用 `text/plain` 送、後端再自己 `JSON.parse` 是這個情境下常見的標準寫法。
- 目前是「整批覆寫」策略：每次同步都是把試算表整個清空重寫，不是逐列比對更新。以現在的任務規模（幾十筆）來說夠快也夠穩，但如果之後任務量成長到幾百筆以上，可能要改成差異更新，會需要重新設計。
