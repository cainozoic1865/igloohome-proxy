// ✅ Igloohome Developer API (v2) + Google Apps Script 整合版

function onFormSubmit(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("預約紀錄");
  const calendarId = "235f029616f9f1e3ee5e22ce4a7114868ca2fccf800d8191ee71fdd8aa86013a@group.calendar.google.com";
  const maxMonthlyMinutes = 600;

  const formData = e.namedValues;
  const name = formData["姓名"][0];
  const email = formData["Email"][0];
  const startRaw = formData["開始時間"][0];
  const endRaw = formData["結束時間"][0];
  const date = formData["日期"][0];

  Logger.log("🕒 原始開始時間: " + startRaw);
  Logger.log("🕒 原始結束時間: " + endRaw);

  const startTime = new Date(`${date} ${startRaw}`);
  const endTime = new Date(`${date} ${endRaw}`);
  const duration = (endTime - startTime) / (1000 * 60);
  const month = startTime.getMonth() + 1;

  Logger.log("⏱ 轉換後開始時間: " + Utilities.formatDate(startTime, Session.getScriptTimeZone(), "HH:mm"));
  Logger.log("⏱ 轉換後結束時間: " + Utilities.formatDate(endTime, Session.getScriptTimeZone(), "HH:mm"));
  Logger.log("📅 合併結果: " + startTime.toISOString());

  const events = CalendarApp.getCalendarById(calendarId).getEvents(startTime, endTime);
  if (events.length > 0) {
    MailApp.sendEmail(email, "預約失敗 - 時段衝突", `您預約的 ${startTime}~${endTime} 已被他人使用，請重新選擇時間。`);
    return;
  }

  const data = sheet.getDataRange().getValues();
  let totalThisMonth = 0;
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === email) {
      const thisDate = new Date(data[i][2]);
      if (thisDate.getMonth() + 1 === month) {
        totalThisMonth += data[i][4];
      }
    }
  }

  if (totalThisMonth + duration > maxMonthlyMinutes) {
    MailApp.sendEmail(email, "預約失敗 - 超出本月可用時數", `您本月已預約 ${totalThisMonth} 分鐘，本次將超過 600 分鐘限制。`);
    return;
  }

  CalendarApp.getCalendarById(calendarId).createEvent(`${name} 預約`, startTime, endTime);
  sheet.appendRow([new Date(), email, startTime, endTime, duration]);

  const deviceId = "IGM31969ae74";
  const result = createIgloodeveloperPin(deviceId, startTime, endTime);
  const pinCode = result.pin_code || "無法取得";

  MailApp.sendEmail(email, "預約成功", `✅ 預約完成\n📅 時間：${startTime}~${endTime}\n🔑 開門密碼：${pinCode}`);
}

function createIgloodeveloperPin(deviceId, start, end) {
  const url = "https://igloohome-proxy-production.up.railway.app/api/create-pin";

  const payload = {
    name: "預約", 
    device_uuid: deviceId,
    start_time: start.toISOString(),
    end_time: end.toISOString()
  };

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const raw = response.getContentText();
  const status = response.getResponseCode();

  try {
    const result = JSON.parse(raw);
    if (status === 200) {
      return result;
    } else {
      Logger.log("🔴 Proxy 回傳錯誤 JSON: " + raw);
      throw new Error("建立 PIN 碼失敗：" + raw);
    }
  } catch (err) {
    Logger.log("🔴 Proxy 非 JSON 回傳內容:\n" + raw);
    throw new Error("Proxy 回傳無法解析（非 JSON）：" + raw);
  }
}
