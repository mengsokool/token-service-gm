import express from "express";
import { Sequelize, DataTypes, Model } from "sequelize";
import Redis from "ioredis";

const port = 6000;
const app = express();
app.use(express.json());

const sequelize = new Sequelize("mydatabase", "myuser", "mypassword", {
  host: "localhost",
  dialect: "postgres",
  port: 5455,
});

const redis = new Redis({
  host: "localhost",
  port: 6355,
});

interface TokenAttributes {
  token: string;
  createdAt?: Date;
  updatedAt?: Date;
}

class Token extends Model<TokenAttributes> implements TokenAttributes {
  public token!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

// กำหนดรูปแบบของตาราง Token ในฐานข้อมูล
Token.init(
  {
    token: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
    },
  },
  {
    sequelize,
    modelName: "Token",
  }
);

// สร้างตารางในฐานข้อมูล (หากยังไม่มีอยู่)
sequelize.sync();

app.post('/register', async (req, res) => {
  try {
    const token = req.body.token; // รับค่า Token จาก body ของ request
    console.log(token);

    if (!token) {
      return res.status(400).json({ error: 'Token is required' }); // ส่งคืนข้อความแจ้งผลการสร้าง Token ไม่สำเร็จ
    }

    // ตรวจสอบว่า Token มีอยู่ในฐานข้อมูลหรือไม่
    const tokenExists = await Token.findOne({ where: { token } });
    if (tokenExists) {
      // อัพเดต Token ที่มีอยู่เดิม
      await tokenExists.update({ updatedAt: new Date() });
    } else {
      // บันทึก Token ใหม่ลงฐานข้อมูล
      await Token.create({ token });
    }

    await redis.set(token, 'true'); // บันทึก Token ลงใน Redis
    return res.json({ message: 'Token created or updated successfully', token }); // ส่งคืนข้อความแจ้งผลการสร้างหรืออัพเดต Token
  } catch (error: any) {
    // จัดการข้อผิดพลาด
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Token already exists' });
    }
  }
}) 

app.get("/verify/:token", async (req, res) => {
  const token = req.params.token; // รับค่า Token จาก URL

  if (!token) {
    return res.status(400).json({ error: "Token is required" }); // ส่งคืนข้อความแจ้งผลการสร้าง Token ไม่สำเร็จ
  }

  try {
    const existsInRedis = await redis.exists(token); // ตรวจสอบว่า Token มีอยู่ใน Redis หรือไม่
    if (existsInRedis) {
      return res.json({ allow: true }); // ส่งคืนข้อความอนุญาตการเข้าถึง
    }

    const tokenExists = await Token.findOne({where: { token: token }}); // ตรวจสอบว่า Token มีอยู่ในฐานข้อมูลหรือไม่
    if (tokenExists) {
      await redis.set(token, "true"); // บันทึก Token ลงใน Redis
      return res.json({ allow: true }); // ส่งคืนข้อความอนุญาตการเข้าถึง
    }

    return res.json({ allow: false }); // ส่งคืนข้อความไม่อนุญาตการเข้าถึง
  } catch (error) {
    console.error("Error checking token:", error); // แสดงข้อผิดพลาดในคอนโซล
    res.status(500).json({ error: "Internal server error" }); // ส่งคืนข้อความแจ้งข้อผิดพลาดของเซิร์ฟเวอร์
  }
});

app.delete("/invoke/:token", async (req, res) => {
  const token = req.params.token; // รับค่า Token จาก URL

  if (!token) {
    return res.status(400).json({ error: "Token is required" }); // ส่งคืนข้อความแจ้งผลการสร้าง Token ไม่สำเร็จ
  }

  try {
    const result = await Token.destroy({ where: { token } }); // ลบ Token จากฐานข้อมูล
    if (result > 0) {
      await redis.del(token); // ลบ Token จาก Redis
      return res.json({ message: "Token deleted successfully" }); // ส่งคืนข้อความแจ้งผลการลบ Token สำเร็จ
    } else {
      return res.status(404).json({ error: "Token not found" }); // ส่งคืนข้อความแจ้งผลการลบ Token ไม่สำเร็จ
    }
  } catch (error) {
    console.error("Error deleting token:", error); // แสดงข้อผิดพลาดในคอนโซล
    res.status(500).json({ error: "Internal server error" }); // ส่งคืนข้อความแจ้งข้อผิดพลาดของเซิร์ฟเวอร์
  }
});

// จัดการข้อผิดพลาดในการเชื่อมต่อ Redis
redis.on("error", (error) => {
  console.error("Redis connection error:", error);
});

// เริ่มเซิร์ฟเวอร์
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});