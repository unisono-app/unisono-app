// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
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
