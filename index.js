import express from "express";
import dotenv from "dotenv";
import handler from "./api/create-pin.js"; // 確保檔案存在且 export 正確

dotenv.config();

const app = express();

// 處理 JSON 請求
app.use(express.json());

// 註冊 POST 路由
app.post("/api/create-pin", handler);

// 啟動伺服器
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`✅ Igloohome Proxy listening on port ${port}`);
});
