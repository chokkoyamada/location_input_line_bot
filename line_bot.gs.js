const projectProperties = PropertiesService.getScriptProperties().getProperties()
const spreadSheet = SpreadsheetApp.openById(projectProperties.SPREADSHEET_ID);
const sheet = spreadSheet.getSheetByName(projectProperties.SHEET_NAME);

function doPost(e){
    if (typeof e === "undefined"){
    } else {
        let json = JSON.parse(e.postData.contents);
        replyFromSheet(json);
    }
}

function doGet(e){
    let lastRow = sheet.getLastRow();
    let data = sheet.getRange(2, 1, lastRow, 6).getValues();
    Logger.log(data);
    let ret = [];
    for(let x=0;x<data.length; x++){
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
    return ContentService.createTextOutput(JSON.stringify(geojson) ).setMimeType(ContentService.MimeType.JSON);
}

function sheet2geojson(json_data) {
    let features = [];
    json_data.forEach(function(elem, index) {
        let feature = {
            "type": "Feature",
            "properties": elem,
            "geometry": {"type": "Point", "coordinates": [elem["longitude"], elem["latitude"]]}
            }
            features.push(feature)
        });

    var geojson = {
        "type": "FeatureCollection",
        "name": "sheet2geojson",
        "crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" }},
        "features": features
    }
    return geojson;
}

function insertLocation(message) {
    let lastRow = sheet.getLastRow();
    //[最後の行の次の行の1カラム目から1x3の領域に指定した情報を入力]
    sheet.getRange(lastRow+1, 1, 1, 3).setValues([[message.latitude, message.longitude, message.address]]);
    return '場所の名前(日本語)を入力してください';
}

function getCategory(text){
  switch(text) {
    case "1":
    case "１":
      return "GS";
      break;
    case "2":
    case "２":
      return "携帯充電";
      break;
    case "3":
    case "３":
      return "無料Wifi";
      break;
    case "4":
    case "４":
      return "給水所";
      break;
    case "5":
    case "５":
      return "自主避難所";
      break;
    case "6":
    case "６":
      return "入浴施設";
      break;
    default:
      return text;
  }
}

function insertName(message){
    let lastRow = sheet.getLastRow();
    let name = sheet.getRange(lastRow, 4);
    if(name.getValue() === ""){
        name.setValue(message.text);
        return message.text + 'の英語名を入力してください';
    }
    let name_en = sheet.getRange(lastRow, 5);
    if(name_en.getValue() === ""){
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
    let category = sheet.getRange(lastRow, 6);
    if(category.getValue() === "") {
        category.setValue(getCategory(message.text));
        let info = sheet.getRange(lastRow, 1, 1, 5).getValues();
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

function replyFromSheet(json) {
    let replyUrl = "https://api.line.me/v2/bot/message/reply";
    let replyToken = json.events[0].replyToken;

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
        "Authorization": "Bearer " + projectProperties.LINE_ACCESS_TOKEN,
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
