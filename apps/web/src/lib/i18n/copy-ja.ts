import type { Copy } from "./types";

/** Japanese UI copy */
export const copyJa: Copy = {
  app: {
    name: "Cowell OCR",
    tagline: "現地調査 → スプレッドシート",
    description:
      "手書きのLED調査シートをOCRで読み取り、Googleスプレッドシートへ登録します。",
  },
  nav: {
    menu: "メニュー",
    home: "ホーム",
    newSurvey: "新規調査",
    newShort: "新規",
    account: "アカウント",
  },
  login: {
    title: "ログイン",
    subtitle: "管理者アカウントでサインイン",
    email: "メールアドレス",
    password: "パスワード",
    submit: "サインイン",
    submitting: "ログイン中…",
    loggedOut: "ログアウトしました。再度サインインしてください。",
    heroEyebrow: "LED現地調査",
    heroTitle: "現地調査を、\nデジタルに。",
    heroBody:
      "手書きのLED調査シートをOCRで読み取り、Googleスプレッドシートへ。調査記録のデジタル化と、発注業務の効率化を支援します。",
    footer: "Cowell · 現地調査デジタル化",
    languageLabel: "言語",
  },
  dashboard: {
    eyebrow: "ダッシュボード",
    greeting: (name: string) => `お疲れさまです、${name}さん`,
    title: "現地調査を、デジタルに記録",
    body: "調査シートをアップロードし、AIが表データを読み取り。内容を確認・編集して、スプレッドシートへ登録できます。",
    cta: "新規調査を開始",
    workflowEyebrow: "ワークフロー",
    workflowTitle: "調査から登録まで",
    statusOnline: "システム稼働中",
    steps: [
      { label: "アップロード", desc: "画像・PDFを選択" },
      { label: "読み取り", desc: "AIが表を解析" },
      { label: "確認", desc: "内容を編集" },
      { label: "登録", desc: "スプレッドシートへ" },
    ],
    capabilities: [
      {
        title: "マルチフォーマット",
        desc: "PNG · JPEG · WEBP · PDF に対応。現場で撮影した画像をそのままアップロード。",
      },
      {
        title: "AI 表読み取り",
        desc: "手書き・印刷混在の調査シートから、表形式データを高精度で抽出。",
      },
      {
        title: "スプレッドシート連携",
        desc: "確認後ワンクリックで Google スプレッドシートに登録。発注業務へスムーズに連携。",
      },
    ],
    specs: [
      { label: "対応形式", value: "PDF · 画像" },
      { label: "読み取りエンジン", value: "Gemini AI" },
      { label: "出力先", value: "Google スプレッドシート" },
    ],
  },
  survey: {
    back: "ホームに戻る",
    title: "新規調査",
    subtitle: "現地調査シートをアップロードし、読み取り結果を登録します",
    files: "調査ファイル",
    prompt: "読み取り指示",
    promptHint: "表の形式や出力ルールを指定できます。通常は既定のままで問題ありません。",
    runOcr: "読み取りを開始",
    processing: "読み取り中…",
    processingFiles: (n: number) => `${n}件のファイルを処理しています`,
    reviewTitle: "読み取り結果",
    reviewRows: (n: number) => `${n}件`,
    tabTable: "表",
    tabRaw: "原文",
    export: "スプレッドシートに登録",
    exportCsv: "CSVでエクスポート",
    connectGoogle: "Googleに接続して登録",
    exporting: "登録中…",
    exportProgress: "スプレッドシートに書き込み中…",
    connectingGoogle: "Googleアカウントを確認中…",
    completeTitle: "登録が完了しました",
    completeBody: (n: number) => `${n}件のデータをスプレッドシートに登録しました`,
    completeBodyCsv: (n: number) => `${n}件のデータをCSVファイルとして保存しました`,
    openSheet: "スプレッドシートを開く",
    downloadCsv: "CSVを再ダウンロード",
    newSurvey: "続けて調査する",
    usage: {
      duration: "処理時間",
      tokens: "トークン",
      cost: "概算費用",
    },
  },
  upload: {
    drop: "ファイルを選択またはドラッグ",
    dropActive: "ドロップしてアップロード",
    formats: "PNG · JPEG · WEBP · PDF — 最大 20MB · 複数選択可",
    quality: "画質設定",
  },
  table: {
    empty: "読み取り結果がありません",
    footer: (n: number) => `${n}件 — セルをクリックして編集`,
  },
  auth: {
    logout: "ログアウト",
    demoName: "管理者",
  },
  errors: {
    ocrFailed: "読み取りに失敗しました。ファイルを確認のうえ、再度お試しください。",
    exportFailed: "スプレッドシートへの登録に失敗しました",
    loginFailed: "ログインに失敗しました",
    serviceNotConfigured: "現在、読み取り機能をご利用いただけません。管理者にお問い合わせください。",
    serviceUnavailable: "サービスに接続できませんでした。しばらくしてから再度お試しください。",
  },
};

export type { Copy } from "./types";
