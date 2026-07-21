import type { OcrResult } from "@cowell/shared";
import { generateId } from "./utils";

/** Demo OCR — no external API, for local FE workflow testing only */
export function runMockOcr(
  files: Array<{ name: string }>
): OcrResult {
  const source = files[0]?.name ?? "demo.pdf";
  const rawText = [
    "フロア\t設置場所\t器具品番\t既設商品名\t数量\t備考",
    "1F\t廊下\tLED-40W\tパナソニック XX123\t12\t",
    "2F\t教室A\tLED-60W\t東芝 YY456\t8\t調光あり",
    "3F\t体育館\tLED-100W\t三菱 ZZ789\t4\t高所",
  ].join("\n");

  const rows = [
    {
      id: generateId(),
      floor: "1F",
      location: "廊下",
      fixtureModel: "LED-40W",
      existingProduct: "パナソニック XX123",
      quantity: "12",
      notes: "",
      confidence: 0.92,
      sourceFile: source,
    },
    {
      id: generateId(),
      floor: "2F",
      location: "教室A",
      fixtureModel: "LED-60W",
      existingProduct: "東芝 YY456",
      quantity: "8",
      notes: "調光あり",
      confidence: 0.88,
      sourceFile: source,
    },
    {
      id: generateId(),
      floor: "3F",
      location: "体育館",
      fixtureModel: "LED-100W",
      existingProduct: "三菱 ZZ789",
      quantity: "4",
      notes: "高所",
      confidence: 0.85,
      sourceFile: source,
    },
  ];

  return {
    rawText,
    rows,
    usage: {
      promptTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      elapsedMs: 800,
      costUsd: 0,
      costJpy: 0,
    },
    finishReason: "MOCK",
  };
}

export function isMockOcrEnabled(): boolean {
  return process.env.MOCK_OCR === "true";
}
