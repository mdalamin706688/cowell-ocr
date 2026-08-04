/**
 * Cognito User Pool trigger: Custom message
 *
 * Attach to the pool under Triggers → Custom message.
 * Pair with Amazon SES (verified domain) — see README.md and docs/COGNITO.md.
 */
export const handler = async (event) => {
  const appName = process.env.APP_NAME || "COWELL OCR";
  const supportEmail = (process.env.SUPPORT_EMAIL || "").trim();

  const footer = supportEmail
    ? `\n\nお問い合わせ: ${supportEmail}\n`
    : "\n";

  switch (event.triggerSource) {
    case "CustomMessage_ForgotPassword": {
      event.response.emailSubject = `【${appName}】パスワード再設定の確認コード`;
      event.response.emailMessage =
        `${appName} をご利用いただきありがとうございます。\n\n` +
        `パスワード再設定の確認コードは次のとおりです。\n\n` +
        `${event.request.codeParameter}\n\n` +
        `有効期限が切れた場合は、ログイン画面から再度「パスワードをお忘れですか？」をお試しください。` +
        `心当たりがない場合はこのメールを破棄してください。` +
        footer;
      break;
    }
    case "CustomMessage_SignUp":
    case "CustomMessage_ResendCode": {
      event.response.emailSubject = `【${appName}】確認コード`;
      event.response.emailMessage =
        `${appName} の確認コード:\n\n${event.request.codeParameter}\n` + footer;
      break;
    }
    case "CustomMessage_AdminCreateUser": {
      event.response.emailSubject = `【${appName}】アカウントのご案内`;
      event.response.emailMessage =
        `${appName} のアカウントが作成されました。\n\n` +
        `ユーザー名: ${event.request.usernameParameter}\n` +
        `仮パスワード: ${event.request.codeParameter}\n\n` +
        `初回ログイン時に新しいパスワードを設定してください。` +
        footer;
      break;
    }
    case "CustomMessage_UpdateUserAttribute": {
      event.response.emailSubject = `【${appName}】確認コード`;
      event.response.emailMessage =
        `${appName} の確認コード:\n\n${event.request.codeParameter}\n` + footer;
      break;
    }
    default:
      break;
  }

  return event;
};
