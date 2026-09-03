/**
 * P6-Lite ｜ Google Sheet 後端 (Apps Script Web App)
 * ------------------------------------------------------------
 * 這支程式碼要貼到「你自己的 Google 試算表」的 Apps Script 編輯器裡（Extensions > Apps Script）。
 * 它會把這份試算表變成 p6-lite.html 的資料後端：
 *   - GET  /exec  → 回傳整份任務清單（JSON 陣列）
 *   - POST /exec  → 用整批任務清單覆寫整份試算表（前端每次修改都會自動呼叫一次）
 *
 * 詳細部署步驟請看隨附的「設定說明」文件。這裡只需要：
 *   1. 貼上這支程式碼（整份取代預設的 Code.gs 內容）
 *   2. 把下面的 TOKEN 改成你自訂的密碼，並在 p6-lite.html 的 API_TOKEN 填同一組
 *   3. 部署為網頁應用程式 (Deploy > New deployment > Web app)
 */

// ⚠️ 請改成你自己的密碼，並且要跟 p6-lite.html 裡的 API_TOKEN 完全一樣
const TOKEN = 'CHANGE_ME_SHARED_TOKEN';

// 資料要寫在哪一個工作表分頁（sheet tab）；沒有的話會自動建立
const SHEET_NAME = 'tasks';

// 欄位順序 = 試算表的欄位順序（A欄開始）。這些是「唯一需要儲存」的欄位——
// 所有算出來的欄位（WBS編號、開始/結束日期、ES/EF/LS/LF、浮時、關鍵路徑…）
// 都是前端載入資料後即時算出來的，不會存進試算表。
const FIELDS = ['id', 'parent', 'name', 'duration', 'responsible', 'budget', 'actual', 'progress', 'milestone', 'preds'];

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(FIELDS);
    sh.setFrozenRows(1);
  }
  return sh;
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// GET：把整份試算表讀成任務陣列回傳給前端
function doGet(e) {
  const sh = getSheet_();
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return jsonOut_([]); // 只有標題列或完全空白
  const header = values[0];
  const rows = values.slice(1).filter(r => r[0] !== '' && r[0] !== null); // 跳過空白列
  const tasks = rows.map(r => {
    const t = {};
    header.forEach((key, i) => {
      let v = r[i];
      if (key === 'id' || key === 'parent') {
        v = (v === '' || v === null) ? null : Number(v);
      } else if (key === 'duration' || key === 'budget' || key === 'actual' || key === 'progress') {
        v = Number(v) || 0;
      } else if (key === 'milestone') {
        v = (v === true || v === 'TRUE' || v === 'true');
      } else if (key === 'preds') {
        // preds 存成 JSON 字串（例如 [{"id":3,"type":"FS","lag":0}]），讀回來要 parse 回陣列
        try { v = v ? JSON.parse(v) : []; } catch (err) { v = []; }
      }
      t[key] = v;
    });
    return t;
  });
  return jsonOut_(tasks);
}

// POST：前端每次新增/編輯/刪除/搬移/串聯任務後，會把「整份」任務清單傳過來，
// 這裡整批覆寫試算表（先清空舊資料再整批寫入新資料），資料量不大（幾十筆任務）
// 所以用「整批覆寫」而不是逐列比對更新，實作簡單也不容易出錯。
function doPost(e) {
  let body;
  try {
    // 前端用 text/plain 送出（是刻意的，為了避免瀏覽器對 Apps Script 發出 CORS 預檢 OPTIONS 請求，
    // Apps Script Web App 對 OPTIONS 的支援不穩定），所以這裡要自己 JSON.parse 純文字內容
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonOut_({ ok: false, error: '無法解析請求內容' });
  }
  if (!body || body.token !== TOKEN) {
    return jsonOut_({ ok: false, error: 'token 不正確，請確認 p6-lite.html 裡的 API_TOKEN 跟這裡的 TOKEN 一致' });
  }
  const tasks = Array.isArray(body.tasks) ? body.tasks : [];
  const sh = getSheet_();
  sh.clearContents();
  sh.appendRow(FIELDS);
  if (tasks.length) {
    const rows = tasks.map(t => FIELDS.map(key => {
      const v = t[key];
      if (key === 'preds') return JSON.stringify(v || []);
      if (v === null || v === undefined) return '';
      return v;
    }));
    sh.getRange(2, 1, rows.length, FIELDS.length).setValues(rows);
  }
  return jsonOut_({ ok: true, count: tasks.length });
}
