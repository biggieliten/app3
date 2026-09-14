const SHEET_ID = "1QJ7YU25yPLwNpJDk9ecB7kBUPIVvsM5Hzka4ox2kjzs";
const SHEET_NAME = "Scores";
const MAX_NAME_LENGTH = 20;
const MAX_SCORE = 10000;

function doPost(event) {
  try {
    const data = JSON.parse(event.postData.contents);
    const name = String(data.name || "")
      .trim()
      .slice(0, MAX_NAME_LENGTH);
    const score = Number(data.score);

    if (!name || !Number.isInteger(score) || score < 0 || score > MAX_SCORE) {
      return jsonResponse({ ok: false, error: "Invalid name or score" });
    }

    getScoresSheet().appendRow([name, score, new Date()]);
    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse({ ok: false, error: "Invalid request" });
  }
}

function doGet() {
  const sheet = getScoresSheet();
  const rows = sheet.getDataRange().getValues().slice(1);
  const scores = rows
    .filter((row) => row[0] && Number.isInteger(Number(row[1])))
    .map((row) => ({
      name: String(row[0]),
      score: Number(row[1]),
      createdAt: row[2],
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  return jsonResponse({ ok: true, scores });
}

function getScoresSheet() {
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["name", "score", "created_at"]);
  }

  return sheet;
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
