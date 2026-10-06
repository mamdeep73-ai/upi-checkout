require('dotenv').config();
const express = require('express');
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const path = require('path');
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

const CATALOG = {
  tshirt: { name: 'Cotton T-Shirt', price: 499 },
  mug:    { name: 'Coffee Mug',     price: 199 },
  demo:   { name: 'Demo Product',   price: 1 },
};
const EXPIRY_MS = 10 * 60 * 1000;
const orders = {}; // production me database use karein

const pending = () => Object.values(orders)
  .filter(o => o.status === 'PENDING' && Date.now() - o.created < EXPIRY_MS);

// 1) Order banao. Har pending order ko UNIQUE amount (paise ke saath) milta hai
app.post('/api/create-order', (req, res) => {
  const items = (req.body.items || []).filter(i => CATALOG[i.id] && i.qty > 0);
  const base = items.reduce((s, i) => s + CATALOG[i.id].price * i.qty, 0);
  if (!base) return res.status(400).json({ error: 'Cart khali hai' });

  const used = new Set(pending().map(o => Math.round(o.amount * 100)));
  let paise = base * 100, n = 0;
  while (used.has(paise) && n < 99) { paise += 1; n++; }
  if (used.has(paise)) return res.status(503).json({ error: 'Abhi bahut orders hain, thodi der baad try karein' });

  const id = 'ORD' + Date.now().toString().slice(-8);
  const amount = paise / 100;
  orders[id] = { id, base, amount, status: 'PENDING', created: Date.now() };
  const upi = `upi://pay?pa=${encodeURIComponent(process.env.MERCHANT_UPI)}`
    + `&pn=${encodeURIComponent(process.env.MERCHANT_NAME)}&am=${amount.toFixed(2)}&cu=INR&tn=${id}`;
  res.json({ orderId: id, amount, upi });
});

// 2) Aapke phone se bank SMS yahan aayega (SMS forwarder app se)
app.post('/api/sms', (req, res) => {
  const secret = req.headers['x-secret'] || req.body.secret;
  if (secret !== process.env.SMS_SECRET) return res.status(401).json({ error: 'bad secret' });

  const msg = String(req.body.message || req.body.text || '');
  const credited = /credited|received|deposited/i.test(msg) && !/debited/i.test(msg);
  const m = msg.match(/(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (!credited || !m) return res.json({ ok: true, matched: false });

  const paise = Math.round(parseFloat(m[1].replace(/,/g, '')) * 100);
  const order = pending().find(o => Math.round(o.amount * 100) === paise);
  if (!order) return res.json({ ok: true, matched: false });

  order.status = 'PAID';
  console.log('PAID:', order.id, order.amount);
  // yahan apna kaam karein: DB update, email/WhatsApp, stock kam karna, etc.
  res.json({ ok: true, matched: true, orderId: order.id });
});

// 3) Frontend status poochta hai
app.get('/api/status/:id', (req, res) => {
  const o = orders[req.params.id];
  if (!o) return res.status(404).json({ error: 'Order nahi mila' });
  if (o.status === 'PENDING' && Date.now() - o.created >= EXPIRY_MS) o.status = 'EXPIRED';
  res.json({ status: o.status, amount: o.amount });
});

// 4) Admin: pending orders dekho aur zarurat par haath se confirm karo (backup)
const isAdmin = req => (req.headers['x-secret'] || req.query.secret) === process.env.SMS_SECRET;
app.get('/api/admin/orders', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'bad secret' });
  res.json(Object.values(orders).sort((a, b) => b.created - a.created).slice(0, 50));
});
app.post('/api/admin/confirm/:id', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'bad secret' });
  const o = orders[req.params.id];
  if (!o) return res.status(404).json({ error: 'Order nahi mila' });
  o.status = 'PAID';
  res.json({ ok: true });
});

app.listen(process.env.PORT || 3000, () => console.log('Server chalu'));
