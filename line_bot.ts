/*
    mapprintシートのcolumn
    A: line_user_id
    B: latitude
    C: longitude
    D: address
    E: name
    F: name:en
    G: category

    line_userシートのcolumn
    A: line_user_id
    B: language
 */
import URLFetchRequestOptions = GoogleAppsScript.URL_Fetch.URLFetchRequestOptions;

const projectProperties = PropertiesService.getScriptProperties().getProperties()
const spreadSheet = SpreadsheetApp.openById(projectProperties.SPREADSHEET_ID);
const sheet_location = spreadSheet.getSheetByName(projectProperties.SHEET_NAME);
const sheet_user = spreadSheet.getSheetByName(projectProperties.SHEET_NAME_USER);

type TextMessage = {
    text: string
}

type LocationMessage = {
    latitude: number
    longitude: number
    address: string

}


function doPost(e) {
    if (typeof e === "undefined") {
    } else {
        let json = JSON.parse(e.postData.contents);
        replyFromSheet(json);
    }
}

function doGet(e) {
    let lastRow = sheet_location.getLastRow();
    let data = sheet_location.getRange(2, 2, lastRow, 6).getValues();
    Logger.log(data);
    let ret = [];
    for (let x = 0; x < data.length; x++) {
        ret.push({
            "latitude": data[x][0],
            "longitude": data[x][1],
            "address": data[x][2],
            "name": data[x][3],
            "name:en": data[x][4],
            "category": data[x][5]
        })
    }
    let geojson = sheet2geojson(ret);
    return ContentService.createTextOutput(JSON.stringify(geojson)).setMimeType(ContentService.MimeType.JSON);
}

function sheet2geojson(json_data) {
    let features = [];
    json_data.forEach(function (elem, _) {
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

function insertLocation(message: LocationMessage, userId: string) {
    let lastRow = sheet_location.getLastRow();
    //[最後の行の次の行の1カラム目から1x4の領域に指定した情報を入力]
    sheet_location.getRange(lastRow + 1, 1, 1, 4).setValues([[userId, message.latitude, message.longitude, message.address]]);
    return '場所の名前(日本語)を入力してください';
}

function getCategory(text) {
    switch (text) {
        case "1":
        case "１":
            return "GS";
        case "2":
        case "２":
            return "携帯充電";
        case "3":
        case "３":
            return "無料Wifi";
        case "4":
        case "４":
            return "給水所";
        case "5":
        case "５":
            return "自主避難所";
        case "6":
        case "６":
            return "入浴施設";
        default:
            return text;
    }
}

function insertName(message: TextMessage, userId: string) {
    //TODO userIdを含む最後の行を取得する
    let lastRow = sheet_location.getLastRow();
    let name = sheet_location.getRange(lastRow, 5);
    if (name.getValue() === "") {
        name.setValue(message.text);
        return message.text + 'の英語名を入力してください';
    }
    let name_en = sheet_location.getRange(lastRow, 6);
    if (name_en.getValue() === "") {
        name_en.setValue(message.text);
        let ret = "";
        ret += 'カテゴリを以下から選んで番号を入力してください。下記にあてはまるものがない場合は自由入力でカテゴリ名を入力してください。';
        ret += '\n 1 ガソリンスタンド';
        ret += '\n 2 携帯充電';
        ret += '\n 3 無料Wifi';
        ret += '\n 4 給水所';
        ret += '\n 5 自主避難所';
        ret += '\n 6 入浴施設';
        return ret;
    }
    let category = sheet_location.getRange(lastRow, 7);
    if (category.getValue() === "") {
        category.setValue(getCategory(message.text));
        let info = sheet_location.getRange(lastRow, 2, 1, 5).getValues();
        let ret = '緯度: ' + info[0][0];
        ret += '\n経度: ' + info[0][1];
        ret += '\n住所: ' + info[0][2];
        ret += '\n日本語名: ' + info[0][3];
        ret += '\n英語名: ' + info[0][4];
        ret += '\nカテゴリ: ' + getCategory(message.text);
        ret += '\n';
        ret += '\n以上の情報を登録しました';
        return ret;
    }
    return "新しく登録したい位置情報を送信してください";
}

function changeUserLanguage(message: TextMessage, userId: string) {
    let lastRow = sheet_user.getLastRow();
    let user = sheet_user.getRange(lastRow + 1, 1)
    let language = sheet_user.getRange(lastRow + 1, 2)
    if (message.text.indexOf("日本語") !== -1) {
        user.setValue(userId)
        language.setValue("日本語")
        return '言語を日本語に設定しました。'
    } else if (message.text.indexOf("English") !== -1) {
        user.setValue(userId)
        language.setValue("English")
        return "Language is set to English."
    } else {
        return "その言語には対応していません。対応言語: 日本語, English"
    }
}

function replyFromSheet(json) {
    let replyUrl = "https://api.line.me/v2/bot/message/reply";
    let replyToken = json.events[0].replyToken;
    let replyText: string;

    let message = json.events[0].message;
    let userId = json.events[0].source.userId;
    if ('latitude' in message) {
        // 位置情報が送られてきた場合、新規の場所を登録する
        replyText = insertLocation(message, userId);
    } else if ('text' in message) {
        //テキストが送られてきた場合、対応した処理を行う
        Logger.log(message.text)
        if (message.text.indexOf("language") === 0) {
            replyText = changeUserLanguage(message, userId);
        } else {
            replyText = insertName(message, userId);
        }
    } else {
        //何も該当しないので何もしない
        return;
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
