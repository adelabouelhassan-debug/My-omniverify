# OmniVerify - Setup Guide for Supabase + Render

## 🚀 Quick Start

### Step 1: Set up Supabase Database

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Click **"New Project"**
3. Fill in:
   - **Project Name**: `omniverify`
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose the closest to you
4. Click **"Create new project"** and wait 2-3 minutes

### Step 2: Get Your DATABASE_URL

1. In Supabase dashboard, go to **Settings** ⚙️
2. Click **Database** from the left menu
3. Find **Connection String** section
4. Copy the **URI** format:
```
postgres://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres
```

### Step 3: Create `.env` File Locally

Create a `.env` file in your project root:
```bash
cp .env.example .env
```

Edit `.env` and paste your Supabase connection string:
```env
DATABASE_URL=postgres://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres
PORT=8787
```

### Step 4: Test Locally

```bash
npm install
node server.js
```

Open: http://localhost:8787

✅ Create an account and test the OTP playground!

---

## 🌐 Deploy to Render

### Option A: Deploy from GitHub (Recommended)

1. **Push your code to GitHub** (you already did this!)

2. Go to [https://render.com](https://render.com)

3. Click **New** → **Web Service**

4. Connect your GitHub repository `adelabouelhassan-debug/My-omniverify`

5. Fill in the deployment settings:
   - **Name**: `omniverify`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: `Free`

6. Add **Environment Variables**:
   - Key: `DATABASE_URL`
   - Value: `postgres://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres`
   
   - Key: `PORT`
   - Value: `10000`

7. Click **Create Web Service**

8. Wait for deployment (2-3 minutes)

9. Render will give you a public URL like: `https://omniverify.onrender.com`

---

## ✅ After Deployment

### Access Your App

1. Open your Render URL
2. **Create an account** (email + password)
3. You'll automatically get:
   - A project with 100 trial credits
   - API keys (public + secret)
4. Test the OTP flow in the **Playground** tab

### API Endpoints

#### Send OTP
```bash
curl -X POST https://your-url.onrender.com/api/v1/otp/send \
  -H "X-API-Key: sk_your_secret_key" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "sms",
    "destination": "+1234567890"
  }'
```

#### Verify OTP
```bash
curl -X POST https://your-url.onrender.com/api/v1/otp/verify \
  -H "X-API-Key: sk_your_secret_key" \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": "otp_...",
    "code": "123456"
  }'
```

---

## 🔧 Adding Real Message Providers (Production)

### SMS (Twilio)

1. Sign up at [https://twilio.com](https://twilio.com)
2. Get your `TWILIO_SID`, `TWILIO_AUTH_TOKEN`, and phone number
3. In Render dashboard → Environment variables, add:
   ```
   TWILIO_SID=your_sid
   TWILIO_AUTH_TOKEN=your_token
   TWILIO_FROM=+1234567890
   ```

### WhatsApp (Meta)

1. Set up Business Account at [Meta for Business](https://business.facebook.com)
2. Get API credentials
3. Add environment variables:
   ```
   WHATSAPP_PROVIDER_TOKEN=your_token
   WHATSAPP_PHONE_ID=your_phone_id
   ```

### Email (Gmail SMTP)

1. Enable 2FA on your Gmail account
2. Generate an [App Password](https://myaccount.google.com/apppasswords)
3. Add environment variables:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_app_password
   ```

Then uncomment the provider code in `lib/channels/index.js`

---

## 📊 Project Structure

```
server.js              ← Main app entry point
lib/
  ├── db.js            ← Postgres connection & storage
  ├── auth.js          ← Register/login logic
  ├── otp.js           ← OTP generation & verification
  ├── crypto-utils.js  ← Hashing & security
  └── channels/        ← SMS/WhatsApp/Email adapters
public/
  ├── dashboard.html   ← Web UI
  └── dashboard.js     ← Frontend logic
.env.example           ← Configuration template
```

---

## 🐛 Troubleshooting

### "Cannot connect to database"
- ✅ Check DATABASE_URL is correct
- ✅ Make sure Supabase project is running
- ✅ Verify password doesn't have special characters that need escaping

### "Port already in use"
- ✅ Change PORT in `.env` to something else (e.g., 8788)
- ✅ Or kill the process: `lsof -ti:8787 | xargs kill -9`

### "Module not found"
- ✅ Run `npm install` again
- ✅ Make sure you're in the project directory

### Render deployment fails
- ✅ Check build logs in Render dashboard
- ✅ Verify DATABASE_URL is in environment variables
- ✅ Make sure `.env` file is in `.gitignore` (it is!)

---

## 📝 Notes

- **Free tier limitations**:
  - Render free tier spins down after 15 minutes of inactivity
  - Supabase has no expiration (stays active forever)
  - For production, upgrade Supabase to paid plan

- **Security**:
  - Never commit `.env` file (it's in `.gitignore`)
  - Keep your `SECRET_KEY` private
  - Don't expose database credentials

- **Dev mode**:
  - OTP codes are logged to terminal
  - Also saved to `data/dev-outbox.json` for debugging
  - This won't send real messages until you add provider credentials

---

## 🏃 Next Steps

1. ✅ Set up Supabase
2. ✅ Create `.env` file with DATABASE_URL
3. ✅ Deploy to Render
4. ✅ Test your API
5. ✅ Add real SMS/WhatsApp/Email providers
6. ✅ Configure billing (wire to Stripe)

---

Need help? Check the [README.md](README.md) for more details!
