/** Shared copy shape for all locales */
export interface Copy {
  app: {
    name: string;
    tagline: string;
    description: string;
  };
  nav: {
    menu: string;
    home: string;
    newSurvey: string;
    newShort: string;
    account: string;
  };
  login: {
    title: string;
    subtitle: string;
    email: string;
    password: string;
    submit: string;
    submitting: string;
    loggedOut: string;
    heroEyebrow: string;
    heroTitle: string;
    heroBody: string;
    footer: string;
    languageLabel: string;
  };
  dashboard: {
    eyebrow: string;
    greeting: (name: string) => string;
    title: string;
    body: string;
    cta: string;
    workflowEyebrow: string;
    workflowTitle: string;
    statusOnline: string;
    steps: Array<{ label: string; desc: string }>;
    capabilities: Array<{ title: string; desc: string }>;
    specs: Array<{ label: string; value: string }>;
  };
  survey: {
    back: string;
    title: string;
    subtitle: string;
    files: string;
    prompt: string;
    promptHint: string;
    runOcr: string;
    processing: string;
    processingFiles: (n: number) => string;
    reviewTitle: string;
    reviewRows: (n: number) => string;
    tabTable: string;
    tabRaw: string;
    export: string;
    exportCsv: string;
    connectGoogle: string;
    exporting: string;
    exportProgress: string;
    connectingGoogle: string;
    completeTitle: string;
    completeBody: (n: number) => string;
    completeBodyCsv: (n: number) => string;
    openSheet: string;
    downloadCsv: string;
    newSurvey: string;
    usage: {
      duration: string;
      tokens: string;
      cost: string;
    };
  };
  upload: {
    drop: string;
    dropActive: string;
    formats: string;
    quality: string;
  };
  table: {
    empty: string;
    footer: (n: number) => string;
  };
  auth: {
    logout: string;
    demoName: string;
  };
  errors: {
    ocrFailed: string;
    exportFailed: string;
    loginFailed: string;
    serviceNotConfigured: string;
    serviceUnavailable: string;
  };
}
