// ✅ IglooAccess Cloud API Proxy - create-pin.js (OAuth2.0)
// 使用 Igloohome Cloud API 而非 Developer API，適用於註冊於 access.igloocompany.co 的商業帳戶

import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

function encodeBasicAuth(clientId, clientSecret) {
  return Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  const { name, start_time, end_time, device_uuid } = req.body;

  const clientId = process.env.IGLOO_CLIENT_ID;
  const clientSecret = process.env.IGLOO_CLIENT_SECRET;
  const tokenUrl = 'https://auth.igloohome.co/oauth2/token';

  const basicAuth = encodeBasicAuth(clientId, clientSecret);

  try {
    // Step 1: 取得 access token
    console.log("🔑 正在取得 Access Token...");
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials&scope=igloohomeapi/create-pin-bridge-proxied-job'
    });

    const tokenJson = await tokenResponse.json();
    console.log("🟢 Token 取得成功：", tokenJson);

    if (!tokenResponse.ok || !tokenJson.access_token) {
      return res.status(500).json({ error: '無法取得 token', detail: tokenJson });
    }

    const accessToken = tokenJson.access_token;

    // Step 2: 建立 PIN
    const pinUrl = `https://api.igloohome.co/v1/devices/${device_uuid}/pin-generate`;
    console.log("📤 建立 PIN 請求發送至:", pinUrl);

    const pinResponse = await fetch(pinUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'igloohome-vercel-proxy'
      },
      body: JSON.stringify({
        type: 'time_bound',
        starts_at: start_time,
        ends_at: end_time,
        name: name
      })
    });

    const rawPinText = await pinResponse.text();
    console.log("📥 PIN 建立原始回應：", rawPinText);

    let pinData;
    try {
      pinData = JSON.parse(rawPinText);
    } catch (e) {
      return res.status(500).json({ error: 'Proxy 回傳非 JSON', detail: rawPinText });
    }

    if (!pinResponse.ok) {
      return res.status(500).json({ error: '建立 PIN 失敗', detail: pinData });
    }

    return res.status(200).json(pinData);
  } catch (err) {
    console.error("🔴 發生錯誤：", err);
    return res.status(500).json({ error: '伺服器錯誤', detail: err.message });
  }
}

export default handler;
