import type { Context } from "@netlify/edge-functions";

export default async (request: Request, context: Context) => {
  // Netlifyの環境変数からパスワードを取得
  const EXPECTED_PASSWORD = Deno.env.get("SITE_PASSWORD");

  const url = new URL(request.url);

  // すでに認証成功の Cookie を持っているかチェック
  const authCookie = context.cookies.get("site_auth");
  if (authCookie === "true") {
    // 認証済みなので通常のサイトコンテンツ（名簿）を表示
    return context.next();
  }

  // ログインフォームからパスワードが送信されたかチェック
  if (request.method === "POST" && url.pathname === "/_login") {
    const formData = await request.formData();
    const inputPassword = formData.get("password")?.toString() || "";

    // 万が一Netlify側で環境変数の設定を忘れていた場合のフェールセーフ
    if (!EXPECTED_PASSWORD) {
      return renderLogin("サイトの設定エラー: パスワードの環境変数(SITE_PASSWORD)がNetlify上で設定されていません。");
    }

    // 環境変数のパスワードと入力されたパスワードを直接比較
    if (inputPassword === EXPECTED_PASSWORD) {
      // 認証成功：Cookieに「認証済み」として記録（有効期限30日）
      context.cookies.set({
        name: "site_auth",
        value: "true",
        path: "/",
        secure: true,   // HTTPS通信でのみ送信
        httpOnly: true, // JavaScriptからのアクセスを禁止（XSS対策）
        maxAge: 60 * 60 * 24 * 30, // 30Days
      });

      // 元のページ（トップページ）にリダイレクト
      return new Response(null, {
        status: 302,
        headers: { Location: "/" },
      });
    } else {
      // パスワードが間違っている場合
      return renderLogin("パスワードが間違っています。");
    }
  }

  // 未認証状態で普通のアクセスがあった場合は、オリジナルのログイン画面を返す
  return renderLogin();
};

// ログイン専用のHTML画面
function renderLogin(errorMessage = "") {
  const html = `
    <!doctype html>
    <html lang="ja">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>ログイン - 議員名簿</title>
      <style>
        body { 
          margin: 0; background: #f7f7f9; 
          font-family: system-ui, "Noto Sans JP", sans-serif; 
          display: flex; align-items: center; justify-content: center; height: 100vh; 
        }
        .login-box { 
          background: #fff; padding: 40px 32px; border-radius: 12px; 
          box-shadow: 0 4px 12px rgba(0,0,0,0.1); 
          width: 100%; max-width: 400px; text-align: center; box-sizing: border-box; margin: 16px;
        }
        .login-box h1 { font-size: 1.4rem; margin-top: 0; margin-bottom: 24px; color: #333; }
        input[type="password"] { 
          width: 100%; padding: 14px; margin-bottom: 24px; 
          border: 1px solid #ccc; border-radius: 8px; font-size: 1rem; box-sizing: border-box; 
        }
        button { 
          width: 100%; padding: 14px; background: #007bff; color: #fff; 
          border: none; border-radius: 8px; font-size: 1rem; font-weight: bold; cursor: pointer; 
        }
        button:hover { background: #0056b3; }
        .error { color: #d32f2f; margin-bottom: 16px; font-size: 0.95rem; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="login-box">
        <h1>議員名簿の閲覧</h1>
        ${errorMessage ? `<div class="error">${errorMessage}</div>` : ""}
        <form method="POST" action="/_login">
          <input type="password" name="password" placeholder="合言葉（パスワード）" required autofocus />
          <button type="submit">ログインして閲覧</button>
        </form>
      </div>
    </body>
    </html>
  `;

  return new Response(html, {
    status: errorMessage ? 401 : 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
