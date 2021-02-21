const LINE_ACCESS_TOKEN = process.env.LINE_ACCESS_TOKEN;
const spreadSheet = SpreadsheetApp.openById(SPREADSHEET_ID);
const sheet = spreadSheet.getSheetByName(SHEET_NAME);

function doPost(e){
    if (typeof e === "undefined"){
    } else {
        let json = JSON.parse(e.postData.contents);
        replyFromSheet(json);
    }
}

function doGet(e){
    let lastRow = sheet.getLastRow();
    let data = sheet.getRange(2, 1, lastRow, 5).getValues();
    Logger.log(data);
    let ret = [];
    for(let x=0;x<data.length; x++){
        ret.push({
          "latitude": data[x][0],
          "longitude": data[x][1],
          "address": data[x][2],
          "name": data[x][3],
          "name:en": data[x][4]
        })
    }
    Logger.log(ret);
    return ContentService.createTextOutput(JSON.stringify(ret) ).setMimeType(ContentService.MimeType.JSON);
}

function insertLocation(message) {
    let lastRow = sheet.getLastRow();
    //[最後の行の次の行の1カラム目から1x3の領域に指定した情報を入力]
    sheet.getRange(lastRow+1, 1, 1, 3).setValues([[message.latitude, message.longitude, message.address]]);
    return '場所の名前(日本語)を入力してください';
}

function insertName(message){
    let lastRow = sheet.getLastRow();
    let name = sheet.getRange(lastRow, 4);
    if(name.getValue() === ""){
        name.setValue(message.text);
        return message.text + 'の英語名を入力してください';
    }
    let name_en = sheet.getRange(lastRow, 5);
    if(name_en.getValue() === "") {
        name_en.setValue(message.text);
        let info = sheet.getRange(lastRow, 1, 1, 4).getValues();
        let ret = '緯度: ' + info[0][0];
        ret += '\n経度: ' + info[0][1];
        ret += '\n住所: ' + info[0][2];
        ret += '\n日本語名: ' + info[0][3];
        ret += '\n英語名: ' + message.text;
        ret += '\n';
        ret += '\n以上の情報を登録しました';
        return ret;
    }
    return "新しく登録したい位置情報を送信してください";
}

function replyFromSheet(json) {
    let replyUrl = "https://api.line.me/v2/bot/message/reply";
    let replyToken　= json.events[0].replyToken;

    let message = json.events[0].message;
    if('latitude' in message){
        replyText = insertLocation(message);
    }else if('text' in message) {
        replyText = insertName(message);
    }else {
        //何も該当しないので何もしない
        return;
    }

    let messageArray = [{"type": "text", "text": replyText}];

    const headers = {
        "Content-Type": "application/json; charset=UTF-8",
        "Authorization": "Bearer " + LINE_ACCESS_TOKEN,
    };

    const postData = {
        "replyToken": replyToken,
        "messages": messageArray
    };

    const options = {
        "method" : "post",
        "headers" : headers,
        "payload" : JSON.stringify(postData)
    };

    UrlFetchApp.fetch(replyUrl, options);
}
