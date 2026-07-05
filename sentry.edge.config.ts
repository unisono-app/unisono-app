// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://b529308812323a2b042086f370509a70@o4511679868043264.ingest.us.sentry.io/4511679887114240",

  // パフォーマンス計測は無効化（無料枠をエラー捕捉に集中させるため）。必要なら値を上げる。
  tracesSampleRate: 0,

  // Sentry Logs は無効化（無料枠節約・ノイズ低減）。
  enableLogs: false,

  dataCollection: {
    // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#dataCollection
    // userInfo: false,
    // httpBodies: [],
  },
});
