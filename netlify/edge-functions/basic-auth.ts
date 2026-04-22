import type { Context } from "@netlify/edge-functions";

export default async (request: Request, context: Context) => {
  // 環境変数からユーザー名とパスワードを取得
  const expectedUser = Deno.env.get("SITE_USERNAME") || "admin";
  const expectedPassword = Deno.env.get("SITE_PASSWORD");

  // セキュリティ上、パスワードが環境変数に設定されていない場合はアクセスをブロックする
  if (!expectedPassword) {
    return new Response("認証設定エラー: パスワードの環境変数(SITE_PASSWORD)が設定されていません。", {
      status: 500,
    });
  }

  // リクエストヘッダーから認証情報を取得
  const authHeader = request.headers.get("Authorization");

  if (authHeader) {
    const match = authHeader.match(/^Basic\s+(.*)$/);
    if (match) {
      // Base64デコード
      const authParams = atob(match[1]);
      const [reqUser, reqPassword] = authParams.split(":");

      // IDとパスワードが一致すればアクセスを許可
      if (reqUser === expectedUser && reqPassword === expectedPassword) {
        return context.next();
      }
    }
  }

  // 認証情報が間違っているか、まだ入力されていない場合は認証ダイアログを表示
  return new Response("認証が必要です", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Secured Site"',
    },
  });
};
