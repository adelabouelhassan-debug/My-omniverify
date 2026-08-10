# Deployment Instructions

## 📋 Prerequisites

- ✅ GitHub repository (`adelabouelhassan-debug/My-omniverify`)
- ✅ Supabase account with DATABASE_URL
- ✅ Render account (free tier available)

---

## 🚀 Deployment Steps

### 1. Prepare Supabase

**Already done? Skip to Step 2**

Otherwise:
1. Create account at https://app.supabase.com
2. Create new project (save the password!)
3. Get CONNECTION STRING from Settings > Database
4. Copy the URI format: `postgres://postgres:PASSWORD@HOST:5432/postgres`

### 2. Deploy to Render

1. Go to https://render.com
2. Click **New** → **Web Service**
3. Click **Deploy from GitHub repo**
4. Search for and select: `adelabouelhassan-debug/My-omniverify`
5. Fill deployment form:
   ```
   Name: omniverify
   Environment: Node
   Build Command: npm install
   Start Command: node server.js
   Plan: Free
   ```
6. Click **Advanced** → **Add Environment Variable**:
   - `DATABASE_URL` = your Supabase connection string
   - `PORT` = `10000`
7. Click **Create Web Service**
8. Wait 2-3 minutes for deployment

### 3. Access Your App

- Render gives you a URL like: `https://omniverify-xxxxx.onrender.com`
- Open it and create an account
- You get 100 trial OTP credits automatically

---

## ✅ Verification Checklist

- [ ] Supabase project created
- [ ] DATABASE_URL copied
- [ ] Render deployment started
- [ ] App loads without errors
- [ ] Can create account
- [ ] Can send OTP in playground
- [ ] Can verify OTP code

---

## 🔧 Environment Variables Reference

| Variable | Example | Required |
|----------|---------|----------|
| `DATABASE_URL` | `postgres://...` | ✅ YES |
| `PORT` | `10000` | ✅ YES |
| `TWILIO_SID` | `AC...` | ❌ No (optional) |
| `TWILIO_AUTH_TOKEN` | `xxx` | ❌ No (optional) |
| `TWILIO_FROM` | `+1234567890` | ❌ No (optional) |
| `WHATSAPP_PROVIDER_TOKEN` | `xxx` | ❌ No (optional) |
| `WHATSAPP_PHONE_ID` | `xxx` | ❌ No (optional) |
| `SMTP_HOST` | `smtp.gmail.com` | ❌ No (optional) |
| `SMTP_PORT` | `587` | ❌ No (optional) |
| `SMTP_USER` | `email@gmail.com` | ❌ No (optional) |
| `SMTP_PASS` | `xxx` | ❌ No (optional) |

---

## 📞 Support

- **Supabase docs**: https://supabase.com/docs
- **Render docs**: https://render.com/docs
- **Node.js docs**: https://nodejs.org/docs

