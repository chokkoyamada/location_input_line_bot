import URLFetchRequestOptions = GoogleAppsScript.URL_Fetch.URLFetchRequestOptions;

/*
    mapprintシートのcolumn
    A: line_user_id
    B: latitude
    C: longitude
    D: address
    E: category
    F: confirmed
    G: name
    H: name:en
    I以降 多言語対応のために使う
 */
const COLUMN_line_user_id = 1;
const COLUMN_latitude = 2;
const COLUMN_longitude = 3;
const COLUMN_address = 4;
const COLUMN_category = 5;
const COLUMN_confirmed = 6;
const COLUMN_name = 7;
const COLUMN_name_en = 8;

/*
    line_userシートのcolumn
    A: line_user_id
    B: language
 */
const COLUMN_language = 2;

const projectProperties = PropertiesService.getScriptProperties().getProperties()
const spreadSheet = SpreadsheetApp.openById(projectProperties.SPREADSHEET_ID);
const sheetLocation = spreadSheet.getSheetByName(projectProperties.SHEET_NAME);
const sheetUser = spreadSheet.getSheetByName(projectProperties.SHEET_NAME_USER);

type TextMessage = {
    text: string
}

type LocationMessage = {
    latitude: number
    longitude: number
    address: string
}

/**
 * LINE Botのwebhookのエントリポイント
 *
 */
function doPost(e) {
    if (typeof e === "undefined") {
    } else {
        let json = JSON.parse(e.postData.contents);
        replyFromSheet(json);
    }
}

/**
 * シートの内容をGeoJsonにして返すウェブAPI
 *
 */
function doGet(_) {
    const params = _.parameter;
    let lastRow = sheetLocation.getLastRow();
    let sheetValues = sheetLocation.getRange(2, 1, lastRow, 6).getValues();
    let json = [];
    for (let x = 0; x < sheetValues.length; x++) {
        if (params.confirmed && sheetValues[x][COLUMN_confirmed-1] !== "確認済み") {
            continue;
        }
        json.push({
            "latitude": sheetValues[x][COLUMN_latitude-1],
            "longitude": sheetValues[x][COLUMN_longitude-1],
            "address": sheetValues[x][COLUMN_address-1],
            "category": sheetValues[x][COLUMN_category-1],
            "confirmed": sheetValues[x][COLUMN_confirmed-1],
            "name": sheetValues[x][COLUMN_name-1],
            "name:en": sheetValues[x][COLUMN_name_en-1]
        })
    }
    let geoJson = makeGeoJson(json);
    return ContentService.createTextOutput(JSON.stringify(geoJson)).setMimeType(ContentService.MimeType.JSON);
}

function makeGeoJson(jsonData) {
    let features = [];
    jsonData.forEach(function (elem, _) {
        let feature = {
            "type": "Feature",
            "properties": elem,
            "geometry": {"type": "Point", "coordinates": [elem["longitude"], elem["latitude"]]}
        }
        features.push(feature)
    });

    return {
        "type": "FeatureCollection",
        "name": "sheet2geojson",
        "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
        "features": features
    };
}

function getTargetRow(targetSheet, userId): number {
    let lastRow: number = targetSheet.getLastRow();
    //userIdが一致するrowがあるか探す
    let range = targetSheet.getRange(2, 1, lastRow, 1)
    let userIndex = -1
    let values = range.getValues()
    for (let n = 0; n < values.length; n++) {
        if (values[n][0] == userId) {
            userIndex = n
        }
    }
    if (userIndex !== -1) {
        //userIdが一致するrowがすでにあった場合
        //ヘッダ行 + インデックス + インデックスは0から始まるので1を足す
        return 1 + userIndex + 1;
    } else {
        //最後のデータ行の次の行
        return lastRow + 1
    }
}

function insertLocationData(message: LocationMessage, userId: string): string {
    let lastRow = sheetLocation.getLastRow()
    sheetLocation.getRange(lastRow + 1, COLUMN_line_user_id).setValue(userId);
    sheetLocation.getRange(lastRow + 1, COLUMN_latitude).setValue(message.latitude);
    sheetLocation.getRange(lastRow + 1, COLUMN_longitude).setValue(message.longitude);
    sheetLocation.getRange(lastRow + 1, COLUMN_address).setValue(message.address);
    return '場所の名前(日本語)を入力してください';
}

function getCategory(text: string): string {
    switch (text) {
        case "1":
        case "１":
            return "避難所";
        case "2":
        case "２":
            return "給水所";
        case "3":
        case "３":
            return "入浴施設";
        case "4":
        case "４":
            return "携帯充電";
        case "5":
        case "５":
            return "無料Wi-Fi";
        case "6":
        case "６":
            return "ガソリンスタンド";
        default:
            return text;
    }
}

function insertAdditionalData(message: TextMessage, userId: string): string {
    let targetRow = getTargetRow(sheetLocation, userId)
    let confirmed = sheetLocation.getRange(targetRow, COLUMN_confirmed);
    confirmed.setValue('未確認');

    let name = sheetLocation.getRange(targetRow, COLUMN_name);
    if (name.getValue() === "") {
        name.setValue(message.text);
        return message.text + 'の英語名を入力してください';
    }
    let name_en = sheetLocation.getRange(targetRow, COLUMN_name_en);
    if (name_en.getValue() === "") {
        name_en.setValue(message.text);
        return `カテゴリを以下から選んで番号を入力してください。下記にあてはまるものがない場合は自由入力でカテゴリ名を入力してください。
1 避難所
2 給水所
3 入浴施設
4 携帯充電
5 無料Wi-Fi
6 ガソリンスタンド`;
    }
    let category = sheetLocation.getRange(targetRow, COLUMN_category);
    if (category.getValue() === "") {
        category.setValue(getCategory(message.text));
        let info = sheetLocation.getRange(targetRow, 1, 1, 8).getValues();
        return `緯度: ${info[0][COLUMN_latitude-1]}
経度: ${info[0][COLUMN_longitude-1]}
住所: ${info[0][COLUMN_address-1]}
日本語名: ${info[0][COLUMN_name-1]}
英語名: ${info[0][COLUMN_name_en-1]}
カテゴリ: ${getCategory(message.text)}
以上の情報を登録しました`;
    }
    return "新しく登録したい位置情報を送信してください";
}

function setUserLanguage(message: TextMessage, userId: string): string {
    let targetRow = getTargetRow(sheetUser, userId)
    let userCell = sheetUser.getRange(targetRow, COLUMN_line_user_id)
    let languageCell = sheetUser.getRange(targetRow, COLUMN_language)

    if (message.text.indexOf("日本語") !== -1) {
        userCell.setValue(userId)
        languageCell.setValue("日本語")
        return '言語を日本語に設定しました。'
    } else if (message.text.indexOf("English") !== -1) {
        userCell.setValue(userId)
        languageCell.setValue("English")
        return "Language is set to English."
    } else {
        return "その言語には対応していません。対応言語: 日本語, English"
    }
}

function replyFromSheet(json): void {
    let replyUrl = "https://api.line.me/v2/bot/message/reply";
    let replyToken = json.events[0].replyToken;
    let replyText: string;

    let message = json.events[0].message;
    let userId = json.events[0].source.userId;
    if ('latitude' in message) {
        // 位置情報が送られてきた場合、新規の場所を登録する
        replyText = insertLocationData(message, userId);
    } else if ('text' in message) {
        //テキストが送られてきた場合、対応した処理を行う
        if (message.text.indexOf("language") === 0) {
            replyText = setUserLanguage(message, userId);
        } else {
            replyText = insertAdditionalData(message, userId);
        }
    } else {
        //何も該当しないのでヘルプテキストを返す
        replyText = `情報を登録するには、位置情報を送信してください。

Send me a "Location" where you would like to register.

The Bot UI uses Japanese, but if you prefer to switch language, enter "language English" to switch to English, or enter "language 日本語" to switch to Japanese.`
    }

    let messageArray = [{"type": "text", "text": replyText}];

    const headers = {
        "Content-Type": "application/json; charset=UTF-8",
        "Authorization": "Bearer " + projectProperties.LINE_ACCESS_TOKEN,
    };

    const postData = {
        "replyToken": replyToken,
        "messages": messageArray
    };

    const options: URLFetchRequestOptions = {
        "method": "post",
        "headers": headers,
        "payload": JSON.stringify(postData)
    };

    UrlFetchApp.fetch(replyUrl, options);
}
