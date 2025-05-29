# Secure Deployment Guide

## 🔐 Setup Google Cloud Secrets (One-Time Setup)

Before deploying, you need to create secrets in Google Cloud Secret Manager:

### 1. Create Discord Bot Token Secret

**Unix/Linux/Mac:**
```bash
echo -n "YOUR_DISCORD_BOT_TOKEN" | gcloud secrets create discord-bot-token --data-file=-
```

**Windows PowerShell:**
```powershell
"YOUR_DISCORD_BOT_TOKEN" | gcloud secrets create discord-bot-token --data-file=-
```

### 2. Create Firebase Private Key Secret

**Unix/Linux/Mac:**
```bash
# Extract private key from service-key.json and create secret
cat service-key.json | jq -r '.private_key' | gcloud secrets create firebase-private-key --data-file=-
```

**Windows PowerShell:**
```powershell
# Method 1: If you have jq installed
Get-Content service-key.json | jq -r '.private_key' | gcloud secrets create firebase-private-key --data-file=-

# Method 2: PowerShell JSON parsing (recommended)
$serviceKey = Get-Content service-key.json | ConvertFrom-Json
$serviceKey.private_key | gcloud secrets create firebase-private-key --data-file=-

# Method 3: Manual (if above methods fail)
# 1. Open service-key.json in notepad
# 2. Copy the private_key value (including -----BEGIN/END PRIVATE KEY-----)
# 3. Save to a temp file and use: gcloud secrets create firebase-private-key --data-file=temp_key.txt
```

### 3. Enable Required APIs
```bash
gcloud services enable secretmanager.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

## 🚀 Deployment Options

### Option 1: Use Deploy Script

**Unix/Linux/Mac:**
```bash
chmod +x deploy.sh
./deploy.sh
```

**Windows PowerShell:**
```powershell
# The bash script won't work directly in PowerShell
# Use Option 2 (Manual Deployment) instead
```

### Option 2: Manual Deployment (Recommended for Windows)

**Single-line (works on all platforms):**
```bash
gcloud builds submit --tag gcr.io/dskdao-discord/discord-bot
```

**Deploy command - Unix/Linux/Mac:**
```bash
gcloud run deploy discord-bot 
    --image gcr.io/dskdao-discord/discord-bot 
    --platform managed 
    --region us-central1 
    --set-env-vars "ENABLE_RAFFLES=false" 
    --set-env-vars "FIREBASE_PROJECT_ID=dskdao-discord" 
    --set-env-vars "FIREBASE_CLIENT_EMAIL=firebase-adminsdk-exc4r@dskdao-discord.iam.gserviceaccount.com" 
    --update-secrets "DISCORD_TOKEN=discord-bot-token:latest" \
    --update-secrets "FIREBASE_PRIVATE_KEY=firebase-private-key:latest" \
    --allow-unauthenticated
```

**Deploy command - Windows PowerShell:**
```powershell
gcloud run deploy discord-bot `
    --image gcr.io/dskdao-discord/discord-bot `
    --platform managed `
    --region us-central1 `
    --set-env-vars "ENABLE_RAFFLES=false" `
    --set-env-vars "FIREBASE_PROJECT_ID=dskdao-discord" `
    --set-env-vars "FIREBASE_CLIENT_EMAIL=firebase-adminsdk-exc4r@dskdao-discord.iam.gserviceaccount.com" `
    --update-secrets "DISCORD_TOKEN=discord-bot-token:latest" `
    --update-secrets "FIREBASE_PRIVATE_KEY=firebase-private-key:latest" `
    --allow-unauthenticated
```

## 🎫 Enable Raffles (When Ready)

**All platforms:**
```bash
gcloud run services update discord-bot \
    --region=us-central1 \
    --set-env-vars ENABLE_RAFFLES=true
```

**Windows PowerShell:**
```powershell
gcloud run services update discord-bot `
    --region=us-central1 `
    --set-env-vars ENABLE_RAFFLES=true
```

## 🧪 Local Development

For local development, you can still use the `service-key.json` file:

1. Keep `service-key.json` in your project root (gitignored)
2. The bot will automatically detect and use it when environment variables aren't set
3. Use `.env` file for local Discord token:
```bash
TOKEN=your_local_bot_token
ENABLE_RAFFLES=true
```

## 🔄 Update Secrets

**Unix/Linux/Mac:**
```bash
# Update Discord token
echo -n "NEW_TOKEN" | gcloud secrets versions add discord-bot-token --data-file=-

# Update Firebase key
echo -n "NEW_PRIVATE_KEY" | gcloud secrets versions add firebase-private-key --data-file=-
```

**Windows PowerShell:**
```powershell
# Update Discord token
"NEW_TOKEN" | gcloud secrets versions add discord-bot-token --data-file=-

# Update Firebase key (extract from new service-key.json)
$serviceKey = Get-Content service-key.json | ConvertFrom-Json
$serviceKey.private_key | gcloud secrets versions add firebase-private-key --data-file=-
```

## 🪟 Windows-Specific Notes

- **PowerShell line continuation**: Use backtick (`) instead of backslash (\)
- **JSON parsing**: PowerShell has built-in `ConvertFrom-Json` cmdlet
- **File reading**: Use `Get-Content` instead of `cat`
- **No jq required**: PowerShell can parse JSON natively
- **Alternative**: Use Git Bash or WSL for Unix-style commands

## 🛡️ Security Benefits

✅ **No credentials in Docker image**
✅ **Secrets managed by Google Cloud**
✅ **Environment-specific configuration**
✅ **Easy credential rotation**
✅ **Audit logs for secret access** 