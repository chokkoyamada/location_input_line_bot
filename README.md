# 環境構築

* 依存パッケージをインストール

```
> yarn
```

* Googleにログイン

```
> npx clasp login
```

* Google App Scriptプロジェクト作成

```
> npx clasp create
? Create which script? sheets
Created new Google Sheet: https://drive.google.com/open?id=xxxxxxxxxxxxxxxxxxxxxgPJHewMcrcJO6Ag
Created new Google Sheets Add-on script: https://script.google.com/d/xxxxxxxxxxxxxxxxxx9iKeijH5RqW4YpNUTVngtEF3JY1tDjbgkJpJrO/edit
```

* 上記で作成されたスプレッドシートを開いて、
  - あとで識別しやすいようにシート名をつける(例：mapprint)
  - 1行目にヘッダ行を書き込む。
    - A列 latitude 
    - B列 longitude
    - C列 address
    - D列 name
    - E列 name:en
    - F列 category

<img width="708" alt="スクリーンショット 2021-02-28 6 44 20" src="https://user-images.githubusercontent.com/843192/109401240-e6d67d00-7990-11eb-9d8f-ab0ed3527303.png">

* ソースコードをGoogle App Scriptへpushする。

```
> npx clasp push
? Manifest file has been updated. Do you want to push and overwrite? Yes
└─ appsscript.json
└─ line_bot.ts
Pushed 2 files.
```


* 秘匿情報を設定

`npx clasp open` でプロジェクトを開く。

「以前のエディタを使用」をクリックし、ファイル→プロジェクトのプロパティ→スクリプトのプロパティで以下の3つのプロパティを設定する。
(この設定項目は新エディタでは2021年2月時点で用意されていないため。この秘匿情報の設定が終わったら元のエディタに戻してしまって問題ない)

<img width="1274" alt="スクリーンショット 2021-02-28 6 53 52" src="https://user-images.githubusercontent.com/843192/109401580-dfb06e80-7992-11eb-92f2-c13bff9b00f3.png">

<img width="333" alt="スクリーンショット 2021-02-28 6 54 58" src="https://user-images.githubusercontent.com/843192/109401620-0c648600-7993-11eb-86cc-7c69afcc3a31.png">

<img width="641" alt="スクリーンショット 2021-02-28 6 57 03" src="https://user-images.githubusercontent.com/843192/109401631-1a1a0b80-7993-11eb-815a-8974f6780452.png">


- LINE_ACCESS_TOKEN
  - LINE DEVELOPERの管理画面で生成したトークン
- SPREADSHEET_ID
  - GoogleSpreadsheetのID ( `https://docs.google.com/spreadsheets/d/(.*)/edit` にあたる部分)
- SHEET_NAME
  - シートの名前（上記で例のとおりやったのであれば `mapprint`)

* デプロイする。

デプロイ→新しいデプロイから

* 種類の選択を「ウェブアプリ」
* アクセスできるユーザーを「全員」

としてデプロイする。

<img width="749" alt="スクリーンショット 2021-02-28 7 17 07" src="https://user-images.githubusercontent.com/843192/109401991-97df1680-7995-11eb-85a1-f9318e381286.png">

初回のデプロイ時はデータのアクセスを承認する必要があるので「アクセスを承認」のボタンを教えて先へ進む。

<img width="750" alt="スクリーンショット 2021-02-28 7 17 13" src="https://user-images.githubusercontent.com/843192/109401997-a299ab80-7995-11eb-8a90-65a9f599004b.png">

* webhookのURLをline botに設定

デプロイ完了後、ウェブアプリのURLをコピーし、LINE Botの管理画面でwebhookのURLとして設定する。

`clasp deploy` は毎回新しいURLを発行してしまうので、`clasp push`した後はデプロイはウェブ画面から毎回行うのが良い

参考 : [Clasp deploy doesn't update the deployed version with Google Apps Script Web App · Issue #63 · google/clasp](https://github.com/google/clasp/issues/63)
