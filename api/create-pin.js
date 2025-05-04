import fetch from 'node-fetch';
import https from 'https';
import { Buffer } from 'buffer';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  const { name, start_time, end_time, device_uuid } = req.body;

  const IGLOO_TOKEN_URL = "https://auth.igloohome.co/oauth2/token";
  const IGLOO_CLIENT_ID = process.env.IGLOO_CLIENT_ID;
  const IGLOO_CLIENT_SECRET = process.env.IGLOO_CLIENT_SECRET;

  const scope = [
    "igloohomeapi/algopin-hourly",
    "igloohomeapi/algopin-daily",
    "igloohomeapi/algopin-permanent",
    "igloohomeapi/algopin-onetime",
    "igloohomeapi/create-pin-bridge-proxied-job",
    "igloohomeapi/delete-pin-bridge-proxied-job",
    "igloohomeapi/lock-bridge-proxied-job",
    "igloohomeapi/unlock-bridge-proxied-job",
    "igloohomeapi/get-device-status-bridge-proxied-job",
    "igloohomeapi/get-battery-level-bridge-proxied-job",
    "igloohomeapi/get-activity-logs-bridge-proxied-job",
    "igloohomeapi/get-devices",
    "igloohomeapi/get-job-status"
  ].join(" ");

  const credentials = Buffer.from(`${IGLOO_CLIENT_ID}:${IGLOO_CLIENT_SECRET}`).toString("base64");
  const agent = new https.Agent({ rejectUnauthorized: false });

  try {
    console.log("🔄 正在取得 access token...");

    const tokenRes = await fetch(IGLOO_TOKEN_URL, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "igloohome-railway-proxy"
      },
      body: `grant_type=client_credentials&scope=${encodeURIComponent(scope)}`,
      agent
    });

    const tokenData = await tokenRes.json();
    console.log("📥 Token API 回應：", tokenData);

    if (!tokenRes.ok || !tokenData.access_token) {
      return res.status(500).json({ error: "無法取得 token", detail: tokenData });
    }

    const accessToken = tokenData.access_token;
    console.log("🔐 取得 token 成功，準備建立 PIN...");

    const pinRes = await fetch(`https://api.igloohome.co/v1/devices/${device_uuid}/pin-generate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "User-Agent": "igloohome-railway-proxy"
      },
      body: JSON.stringify({
        type: "time_bound",
        starts_at: start_time,
        ends_at: end_time
      }),
      agent
    });

    const pinData = await pinRes.json();
    console.log("📥 PIN 建立回應：", pinData);

    if (!pinRes.ok) {
      return res.status(500).json({ error: "建立 PIN 失敗", detail: pinData });
    }

    return res.status(200).json(pinData);

  } catch (err) {
    console.error("🔴 發生錯誤：", err);
    return res.status(500).json({ error: "伺服器錯誤", detail: err.message });
  }
}

export default handler;
