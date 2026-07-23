/** Build a clear Drive folder name for one survey process (local time). */
export function buildSurveyProcessName(projectName?: string): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
  ].join("-") + `_${pad(now.getHours())}${pad(now.getMinutes())}`;

  const site = (projectName ?? "")
    .trim()
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 60);

  // e.g. Tokyo_HQ_Survey_2026-07-23_1356  or  Field_Survey_2026-07-23_1356
  return site ? `${site}_Survey_${stamp}` : `Field_Survey_${stamp}`;
}
