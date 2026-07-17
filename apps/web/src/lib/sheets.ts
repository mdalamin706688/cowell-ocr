import { SURVEY_COLUMNS, type OcrRow } from "@cowell/shared";

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

export interface SheetsExportResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  rowCount: number;
}

function getServiceAccountCredentials() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const key = rawKey?.replace(/\\n/g, "\n");

  if (!email || !key) return null;
  return { email, key };
}

async function getGoogleAccessToken(email: string, key: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const claim = Buffer.from(
    JSON.stringify({
      iss: email,
      scope: `${SHEETS_SCOPE} ${DRIVE_SCOPE}`,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  ).toString("base64url");

  const crypto = await import("crypto");
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(`${header}.${claim}`);
  const signature = sign.sign(key, "base64url");
  const jwt = `${header}.${claim}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error_description || "Google認証に失敗しました");
  }
  return data.access_token as string;
}

export async function exportToGoogleSheets(
  rows: OcrRow[],
  title: string
): Promise<SheetsExportResult> {
  const creds = getServiceAccountCredentials();

  if (!creds) {
    if (process.env.NODE_ENV === "development") {
      const mockId = `dev-${Date.now()}`;
      return {
        spreadsheetId: mockId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${mockId}`,
        rowCount: rows.length,
      };
    }
    throw new Error(
      "スプレッドシート連携が未設定です。GOOGLE_SERVICE_ACCOUNT_* を設定してください。"
    );
  }

  const token = await getGoogleAccessToken(creds.email, creds.key);
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers,
    body: JSON.stringify({
      properties: { title },
      sheets: [{ properties: { title: "現調データ" } }],
    }),
  });

  const created = await createRes.json();
  if (!createRes.ok) {
    throw new Error(created.error?.message || "スプレッドシートの作成に失敗しました");
  }

  const spreadsheetId = created.spreadsheetId as string;
  const columns = SURVEY_COLUMNS.filter((c) => c !== "写真");
  const values = [
    columns,
    ...rows.map((r) => [
      r.floor,
      r.location,
      r.fixtureModel,
      r.existingProduct,
      r.quantity,
      r.notes,
    ]),
  ];

  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers,
      body: JSON.stringify({ values }),
    }
  );

  if (!updateRes.ok) {
    const err = await updateRes.json();
    throw new Error(err.error?.message || "データの書き込みに失敗しました");
  }

  const folderId = process.env.GOOGLE_SHEETS_FOLDER_ID;
  if (folderId) {
    await fetch(
      `https://www.googleapis.com/drive/v3/files/${spreadsheetId}?addParents=${folderId}&fields=id`,
      { method: "PATCH", headers: { Authorization: `Bearer ${token}` } }
    );
  }

  return {
    spreadsheetId,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    rowCount: rows.length,
  };
}
