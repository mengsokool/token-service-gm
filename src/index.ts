// 🎉 ยินดีต้อนรับสู่โลกแห่ง IoT Device Token Management! 🌈
// ถ้าคุณเป็นเด็กฝึกงานที่กำลังอ่านอยู่ เตรียมตัวให้พร้อม เพราะเราจะไปผจญภัยในโลกของ API กัน! 🗺️

import express from "express";
import { Sequelize, DataTypes, Model } from "sequelize";
import Redis from "ioredis";

// 🎭 ตั้งค่าพอร์ตให้เซิร์ฟเวอร์ของเรา
// ทำไมต้องเป็น 6000 ล่ะ? ไม่รู้สิ อาจจะเพราะมันฟังดูเท่ดี! 😎
const port = 6000;
const app = express();
app.use(express.json());

// 🐘 เชื่อมต่อกับ PostgreSQL
// ทำไมต้องใช้ Postgres? เพราะมันเหมือนช้างยังไงล่ะ! ใหญ่, แข็งแรง, และจำอะไรได้เยอะแยะ 🐘💪
const sequelize = new Sequelize("mydatabase", "myuser", "mypassword", {
  host: "localhost",
  dialect: "postgres",
  port: 5455,
});

// 🚀 เชื่อมต่อกับ Redis
// Redis เร็วมาก! เหมือนกับตอนที่แม่เรียกให้ไปกินข้าว เราวิ่งไปเร็วขนาดไหน? เร็วแบบนั้นแหละ! 🏃‍♂️💨
const redis = new Redis({
  host: "localhost",
  port: 6355,
});

// 🎭 สร้าง interface สำหรับ Token
// เหมือนกับตอนที่เราวาดภาพในจินตนาการว่าเราอยากให้ Token หน้าตาเป็นยังไง
interface TokenAttributes {
  token: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// 🦸‍♂️ สร้าง Model สำหรับ Token
// นี่คือซูเปอร์ฮีโร่ของเรา! เขาจะจัดการทุกอย่างเกี่ยวกับ Token ให้เรา
class Token extends Model<TokenAttributes> implements TokenAttributes {
  public token!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

// 🏗️ กำหนดโครงสร้างของตาราง Token ในฐานข้อมูล
// เหมือนกับการสร้างบ้านให้ Token อยู่ยังไงล่ะ! 🏠
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

// 🏗️ สร้างตารางในฐานข้อมูล (ถ้ายังไม่มี)
// เหมือนกับการเช็คว่าบ้านของ Token สร้างเสร็จรึยัง ถ้ายังก็สร้างให้เลย!
sequelize.sync();

// 🎟️ ลงทะเบียน Token
app.post('/register', async (req, res) => {
  try {
    const token = req.body.token; // รับค่า Token จาก body ของ request
    console.log(token);

    // 🕵️‍♂️ ตรวจสอบว่ามี Token มาด้วยรึเปล่า
    if (!token) {
      return res.status(400).json({ error: 'Token is required' }); // ถ้าไม่มี ก็บอกว่า "เฮ้ย! ลืมอะไรมาป่ะ?"
    }

    // 🔍 ตรวจสอบว่า Token มีอยู่ในฐานข้อมูลรึยัง
    const tokenExists = await Token.findOne({ where: { token } });
    if (tokenExists) {
      // 🔄 ถ้ามีแล้ว ก็อัพเดตเวลาให้หน่อย
      await tokenExists.update({ updatedAt: new Date() });
    } else {
      // ✨ ถ้ายังไม่มี ก็สร้างใหม่เลย!
      await Token.create({ token });
    }

    // 🚀 บันทึก Token ลงใน Redis ด้วย
    // ทำไมต้องเก็บใน Redis ด้วย? เพราะมันเร็วไง! เหมือนกับการจดโน้ตไว้ในสมองเลย!
    await redis.set(token, 'true');
    
    // 🎉 ส่งข้อความแจ้งผลการสร้างหรืออัพเดต Token
    return res.json({ message: 'Token created or updated successfully', token });
  } catch (error: any) {
    // 🚨 จัดการข้อผิดพลาด
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Token already exists' });
    }
  }
}) 

// 🕵️‍♂️ ตรวจสอบ Token
app.get("/verify/:token", async (req, res) => {
  const token = req.params.token; // รับค่า Token จาก URL

  // 🧐 ตรวจสอบว่ามี Token มาด้วยรึเปล่า
  if (!token) {
    return res.status(400).json({ error: "Token is required" }); // ถ้าไม่มี ก็บอกว่า "เฮ้ย! ลืมอะไรมาป่ะ?"
  }

  try {
    // 🚀 ตรวจสอบใน Redis ก่อน เพราะมันเร็วกว่า!
    const existsInRedis = await redis.exists(token);
    if (existsInRedis) {
      return res.json({ allow: true }); // ถ้าเจอใน Redis ก็ให้ผ่านเลย!
    }

    // 🐘 ถ้าไม่เจอใน Redis ก็ไปตามหาใน Postgres
    const tokenExists = await Token.findOne({where: { token: token }});
    if (tokenExists) {
      await redis.set(token, "true"); // เจอแล้วก็เก็บไว้ใน Redis ด้วย จะได้เร็วขึ้นครั้งหน้า
      return res.json({ allow: true }); // อนุญาตให้ผ่าน!
    }

    // 🚫 ถ้าไม่เจอที่ไหนเลย ก็ไม่ให้ผ่าน!
    return res.json({ allow: false });
  } catch (error) {
    console.error("Error checking token:", error); // โอ๊ะโอ! มีอะไรผิดพลาด
    res.status(500).json({ error: "Internal server error" }); // บอกว่าเซิร์ฟเวอร์มีปัญหา
  }
});

// 🗑️ ลบ Token
app.delete("/invoke/:token", async (req, res) => {
  const token = req.params.token; // รับค่า Token จาก URL

  // 🧐 ตรวจสอบว่ามี Token มาด้วยรึเปล่า
  if (!token) {
    return res.status(400).json({ error: "Token is required" }); // ถ้าไม่มี ก็บอกว่า "เฮ้ย! ลืมอะไรมาป่ะ?"
  }

  try {
    // 🗑️ ลบ Token จากฐานข้อมูล
    const result = await Token.destroy({ where: { token } });
    if (result > 0) {
      await redis.del(token); // ลบจาก Redis ด้วย
      return res.json({ message: "Token deleted successfully" }); // แจ้งว่าลบสำเร็จ
    } else {
      return res.status(404).json({ error: "Token not found" }); // ถ้าไม่เจอ Token ก็บอกว่าหาไม่เจอ
    }
  } catch (error) {
    console.error("Error deleting token:", error); // โอ๊ะโอ! มีอะไรผิดพลาด
    res.status(500).json({ error: "Internal server error" }); // บอกว่าเซิร์ฟเวอร์มีปัญหา
  }
});

// 🚨 จัดการข้อผิดพลาดในการเชื่อมต่อ Redis
redis.on("error", (error) => {
  console.error("Redis connection error:", error);
});

// 🚀 เริ่มเซิร์ฟเวอร์
app.listen(port, () => {
  console.log(`🎉 เย้! เซิร์ฟเวอร์ของเราทำงานแล้วที่พอร์ต ${port}`);
});

// 🎓 เกร็ดความรู้:
// 1. ทำไมเราใช้ทั้ง Postgres และ Redis?
//    - Postgres เก็บข้อมูลถาวร เหมือนเก็บของในตู้เสื้อผ้า
//    - Redis เก็บข้อมูลชั่วคราว เร็วมาก เหมือนเก็บของในกระเป๋ากางเกง

// 2. ทำไมต้องใช้ async/await?
//    - เพราะการติดต่อกับฐานข้อมูลใช้เวลา เราเลยบอกโค้ดว่า "รอแป๊บนะ" 😴

// 3. ทำไมต้องใช้ try/catch?
//    - เพราะบางทีก็มีอุบัติเหตุเกิดขึ้นได้ เราต้องเตรียมตัวรับมือ! 🦺

// 4. ทำไม Token ต้องเป็น string?
//    - เพราะมันยืดหยุ่นที่สุด! จะใส่ตัวอักษร ตัวเลข หรือสัญลักษณ์อะไรก็ได้ 🎨

// 5. ทำไมต้องใช้ Express?
//    - เพราะมันทำให้การสร้าง API ง่ายขึ้น เหมือนกับการมีผู้ช่วยส่วนตัวยังไงล่ะ! 🦸‍♂️