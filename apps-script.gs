/**
 * 직무특강 익명 Q&A 저장소 (구글 스프레드시트 + Apps Script)
 *
 * 시트 열: id | 시간 | 질문 | 공감 | 숨김 | 답변
 *  - 부적절한 질문은 '숨김' 칸에 TRUE 를 넣으면 화면에서 사라집니다.
 *  - '답변' 칸에 글을 쓰면 학생 페이지에 답변으로 표시됩니다.
 */
const SHEET_NAME = '질문';
const MAX_LEN = 300;

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(['id', '시간', '질문', '공감', '숨김', '답변']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function list_() {
  const rows = sheet_().getDataRange().getValues().slice(1);
  return rows
    .filter(r => r[0] && String(r[4]).toUpperCase() !== 'TRUE')
    .map(r => ({
      id: String(r[0]),
      t: new Date(r[1]).getTime(),
      text: String(r[2]),
      likes: Number(r[3]) || 0,
      answer: String(r[5] || '')
    }));
}

function doGet() {
  return json_({ ok: true, list: list_() });
}

function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); }
  catch (err) { return json_({ ok: false, error: 'bad_request' }); }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = sheet_();
    if (body.action === 'add') {
      let text = String(body.text || '').trim().slice(0, MAX_LEN);
      if (!text) return json_({ ok: false, error: 'empty' });
      // 수식으로 해석되지 않도록 막기
      if (/^[=+\-@]/.test(text)) text = "'" + text;
      const id = Utilities.getUuid().slice(0, 8);
      sh.appendRow([id, new Date(), text, 0, false, '']);
      return json_({ ok: true, id: id, list: list_() });
    }
    if (body.action === 'like') {
      const ids = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), 1).getValues();
      for (let i = 0; i < ids.length; i++) {
        if (String(ids[i][0]) === String(body.id)) {
          const cell = sh.getRange(i + 2, 4);
          cell.setValue((Number(cell.getValue()) || 0) + 1);
          break;
        }
      }
      return json_({ ok: true, list: list_() });
    }
    return json_({ ok: false, error: 'unknown_action' });
  } finally {
    lock.releaseLock();
  }
}

// 처음 한 번 실행해 '질문' 시트를 만들고 권한을 승인합니다.
function setup() {
  sheet_();
}
