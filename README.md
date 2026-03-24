# https://heliumneon210.github.io/Keion-Reservation/

# 軽音班講堂予約システム

軽音楽班の講堂練習予約を管理するカレンダーアプリです。

## 特徴
- カレンダー形式での視認性の高い予約管理
- ダブルブッキング防止機能
- 管理者モード（ロゴを4回タップ）によるスケジュール設定
- **GitHub Pages + Google Apps Script (GAS)** によるサーバーレス運用

## デプロイ方法

### 1. データ保存用GASの設定
1. 新しいGoogleスプレッドシートを作成します。
2. 4つのシート（タブ）を作成し、それぞれ以下の名前にします：
   - `reservations`
   - `available_slots`
   - `extra_slots`
   - `blocked_slots`
3. 各シートの1行目に以下のヘッダーを入力します：
   - `reservations`: `id`, `date`, `startTime`, `bandName`, `memberCount`
   - `available_slots`: `id`, `dayOfWeek`, `startTime`
   - `extra_slots`: `id`, `date`, `startTime`
   - `blocked_slots`: `id`, `date`, `startTime`
4. 「拡張機能」 > 「Apps Script」を開きます。
5. 本プロジェクトの `gas-backend.gs` の内容を貼り付けて保存します。
6. 「デプロイ」 > 「新しいデプロイ」をクリックします。
7. 種類を「ウェブアプリ」にし、以下のように設定します：
   - 次のユーザーとして実行: 「自分」
   - アクセスできるユーザー: 「全員」
8. 発行された **ウェブアプリURL** をコピーします。

### 2. GitHubへの公開設定
1. GitHubで新しいリポジトリを作成し、コードをアップロードします。
2. GitHubリポジトリの「Settings」 > 「Secrets and variables」 > 「Actions」で、新しい変数 `VITE_GAS_URL` を作成し、先ほどコピーしたGASのURLを値として設定します。
3. `.github/workflows/deploy.yml` を作成して、GitHub Actionsで自動デプロイするように設定します（以下にサンプルを記載）。

#### GitHub Actions設定例 (`.github/workflows/deploy.yml`)
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm install

      - name: Build
        run: npm run build
        env:
          VITE_GAS_URL: ${{ secrets.VITE_GAS_URL }}

      - name: Deploy
        uses: JamesIves/github-pages-deploy-action@v4
        with:
          folder: dist
          branch: gh-pages
```

### 3. GitHub Pagesの有効化
1. リポジトリの「Settings」 > 「Pages」で、Build and deployment の Source を `Deploy from a branch` にし、Branch を `gh-pages` / `/(root)` に設定して保存します。

これで、GitHub PagesのURLからアプリにアクセスでき、データはGoogleスプレッドシートに保存されるようになります。

### 困ったときには
Google AI Studio
Cursor
Google Antigravity Download
Login Deep Control
これらをgithubのcliに接続して変更する。ただしCursor以外の互換性は不明
