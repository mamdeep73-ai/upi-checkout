# UPI Auto-Detect Checkout

## Chalane ke 2 tareeke

### A) Apne computer par (test)
1. Node.js install karein (nodejs.org)
2. `.env.example` ko `.env` naam se copy karein, `SMS_SECRET` badlein
3. `npm install` phir `npm start`
4. Browser me http://localhost:3000 kholein

### B) Internet par (Render.com, free)
1. Ye folder GitHub par daalein
2. render.com par New > Blueprint > apni repo chunein (render.yaml apne aap padh lega)
3. Deploy ke baad Environment me jaakar `SMS_SECRET` copy karein
4. Aapka link: https://<naam>.onrender.com

## Phone par SMS forward (auto detect ke liye)
MacroDroid me macro: Trigger = SMS Received (text me "credited"),
Action = HTTP POST https://<aapka-link>/api/sms
Header: x-secret: <SMS_SECRET>
Body: {"message":"<SMS body variable>"}

## Backup
https://<aapka-link>/admin.html par secret daalkar pending order haath se "Mark Paid" kar sakte hain.

## Badlav
Products/prices: server.js ke CATALOG me. UPI ID: .env me MERCHANT_UPI.
