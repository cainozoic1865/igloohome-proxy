// ✅ Igloodeveloper API v2 Proxy (for Bluetooth Lock)
// 完整 create-pin.js，部署於 Railway 的 /api/create-pin 路徑

import fetch from 'node-fetch';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  const { name, start_time, end_time, device_uuid } = req.body;

  const API_KEY = process.env.IGLOO_API_KEY;
  const apiUrl = `https://api.igloodeveloper.co/v2/devices/${device_uuid}/pin-generate`;

  console.log("📤 發送至 Igloodeveloper API:", apiUrl);
  console.log("⏱ 時間:", start_time, "~", end_time);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        "X-IGLOOCOMPANY-APIKEY": API_KEY,
        "Content-Type": "application/json",
        "User-Agent": "igloohome-railway-proxy"
      },
      body: JSON.stringify({
        name: name,
        type: "time_bound",
        starts_at: start_time,
        ends_at: end_time
      })
    });

    const rawText = await response.text();
    console.log("📥 回傳原始內容:", rawText);

    let json;
    try {
      json = JSON.parse(rawText);
    } catch (e) {
      return res.status(500).json({ error: 'Proxy 回傳非 JSON', detail: rawText });
    }

    if (!response.ok) {
      return res.status(response.status).json({ error: '建立 PIN 失敗', detail: json });
    }

    return res.status(200).json(json);
  } catch (err) {
    console.error("🔴 Proxy 發生錯誤:", err);
    return res.status(500).json({ error: '伺服器錯誤', detail: err.message });
  }
}

export default handler;
