# QR TIME CARD

GitHub Pagesで動作する、QRコード式の簡易タイムカードです。

## 主な機能
- QRコードをカメラで読み取り
- スタッフごとの出勤 / 退勤を自動判定
- スタッフ登録
- スタッフQRコード生成・印刷
- 今日の勤怠一覧
- CSV出力
- スマートフォン / タブレット対応
- GitHub Pagesへそのまま配置可能

## GitHub Pagesへの公開
1. GitHubで新しいリポジトリを作成
2. `index.html`、`style.css`、`app.js`、`README.md`をアップロード
3. Settings → Pages → Deploy from a branch
4. `main` / `root` を選択して保存
5. 発行されたURLを開く

## 重要
この完成版はデータ保存に `localStorage` を使用しています。

そのため、**同じ端末・同じブラウザ内での簡易運用**には向いていますが、複数端末でデータを共有する本格的な勤怠システムには向きません。

また、カメラのQR読み取りはHTTPS環境（GitHub Pages）で利用してください。

本格運用する場合は、Firebase / Supabaseなどのデータベースを接続して、管理者ログイン・複数端末同期・不正打刻対策を追加することをおすすめします。

## QR表示について
管理画面の「表示」からスタッフQRを生成できます。PNG保存・印刷にも対応しています。
