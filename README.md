# Discord Bot for DSKDAO

This project is a Discord bot designed for the DSKDAO community. It includes features such as rewarding users with tickets, managing auto-join for games, raffle system, and integrating with Google Cloud services.

## Features

- **Ticket Rewards**: Users can earn tickets by participating in specific channels.
- **Auto-Join**: Users can purchase auto-join credits to automatically participate in multiple game rounds.
- **Raffle System**: Create and manage raffles where users can spend tickets to enter for prizes.
- **Ticket Arena**: Web3-themed survival game with automated rounds and winner selection.
- **Google Cloud Integration**: The bot is deployed using Google Cloud services, ensuring scalability and reliability.

## Raffle System

### Overview
The raffle system allows administrators to create timed raffles where users can spend tickets to enter for a chance to win prizes. The system includes automatic winner selection and comprehensive management tools.

### Admin Commands
- `/createraffle` - Create a new raffle with specified parameters
- `/endraffle <raffle-id>` - Manually end a raffle and pick a winner
- `/viewraffles` - View all active raffles and their status

### User Experience
- Users see raffle announcements with "Join Raffle" buttons
- Click button to enter (uses ephemeral replies for privacy)
- Automatic balance validation and deduction
- Real-time entry count updates
- Winner announcements when raffles end

### Raffle Parameters
When creating a raffle, specify:
- **Title**: Display name for the raffle
- **Duration Hours**: How many hours until the raffle ends (1-168 hours max)
- **Prize Image URL**: Image displayed in the raffle announcement
- **Prize Title**: Description of what the winner receives
- **Max Participants**: Maximum number of entries allowed
- **Ticket Price**: Cost per entry in tickets

### Automatic Features
- **Auto-Expiration**: Raffles automatically end at specified time
- **Winner Selection**: Random winner picked from participants
- **Message Updates**: Raffle announcements update to show winners
- **Background Monitoring**: System checks every 5 minutes for expired raffles

### Database Structure
Raffles are stored in Firestore with the following fields:
- `title`, `prizeTitle`, `prizeImageUrl` - Display information
- `endingDateTime` - When raffle expires
- `maxParticipants`, `ticketPrice` - Entry limits and cost
- `participants[]` - Array of user IDs who entered
- `ticketsSold` - Current number of entries
- `winnerUserID` - ID of selected winner (null until ended)
- `active` - Boolean indicating if raffle is still running
- `createdAt`, `createdBy` - Audit information

## Setup

### Prerequisites

- Node.js and npm installed
- Google Cloud SDK installed and authenticated
- Firebase Admin SDK configured
- Discord bot token from Discord Developer Portal

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/discord-bot.git
   cd discord-bot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Firebase:
   - Create a Firebase project
   - Generate a service account key and save it as `service-key.json` in the project root
   - Enable Firestore database in your Firebase project

### Google Cloud Secret Manager Setup

The bot uses Google Cloud Secret Manager to securely store sensitive credentials in production.

#### 1. Enable Required APIs
```bash
gcloud services enable secretmanager.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

#### 2. Create Secrets

**Create Discord Bot Token Secret:**
```bash
echo -n "YOUR_DISCORD_BOT_TOKEN" | gcloud secrets create discord-bot-token --data-file=-
```

**Create Firebase Service Account Secret:**
```bash
# Store the entire service-key.json file as a secret
gcloud secrets create firebase-private-key --data-file=service-key.json
```

#### 3. Configure Service Account Permissions

**Grant Secret Manager access to Firebase service account:**
```bash
gcloud projects add-iam-policy-binding dskdao-discord \
    --member="serviceAccount:firebase-adminsdk-exc4r@dskdao-discord.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

**Note:** Replace `firebase-adminsdk-exc4r@dskdao-discord.iam.gserviceaccount.com` with your actual Firebase service account email from your `service-key.json` file.

### Deployment

#### Deploy to Google Cloud Run

```bash
# Build and deploy in one command
gcloud run deploy dsk-dao-discord-bot 
    --source . 
    --region=us-central1 
    --service-account=firebase-adminsdk-exc4r@dskdao-discord.iam.gserviceaccount.com 
    --set-env-vars "ENABLE_RAFFLES=true" 
    --set-env-vars "FIREBASE_PROJECT_ID=dskdao-discord"
    --set-env-vars "TOKEN=[Discord bot Token]"
```

#### Alternative: Two-Step Deployment

1. Build and submit Docker image:
   ```bash
   gcloud builds submit --tag gcr.io/dskdao-discord/discord-bot
   ```

2. Deploy the image:
   ```bash
   gcloud run deploy dsk-dao-discord-bot 
     --image gcr.io/dskdao-discord/discord-bot 
     --region=us-central1 
     --service-account=firebase-adminsdk-exc4r@dskdao-discord.iam.gserviceaccount.com 
    --set-env-vars "ENABLE_RAFFLES=true" 
    --set-env-vars "FIREBASE_PROJECT_ID=dskdao-discord"
    --set-env-vars "TOKEN=[Discord bot Token]"
   ```

### Local Development Setup

For local development, create a `.env` file in the root directory:

```bash
TOKEN=your_discord_bot_token
ENABLE_RAFFLES=true  # Set to false to disable raffle system
```

The bot will automatically use `service-key.json` for Firebase authentication when running locally.

### Configuration

- **Raffle Channel**: Update `RAFFLE_CHANNEL_ID` in `commands/raffle/createRaffle.js` to set where raffle announcements are posted.
- **Arena Channel**: Update `channelId` in `index.js` for the ticket arena channel.
- **Farmer Role**: Update `farmerRole` in `index.js` for role mentions in announcements.
- **Feature Flags**: Use `ENABLE_RAFFLES=true/false` environment variable to enable/disable raffle functionality.

### Secret Management

The application uses a hierarchical credential loading system:

1. **Production (Google Cloud Run)**: Loads service account from Secret Manager
2. **Fallback**: Uses individual environment variables (legacy support)
3. **Local Development**: Uses `service-key.json` file

### Troubleshooting

#### Permission Denied Errors
If you see Secret Manager permission errors:
```bash
# Check current service account
gcloud run services describe dsk-dao-discord-bot --region=us-central1 --format="value(spec.template.spec.serviceAccountName)"

# Grant permissions (replace with your service account)
gcloud projects add-iam-policy-binding dskdao-discord \
    --member="serviceAccount:YOUR_SERVICE_ACCOUNT@dskdao-discord.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

#### Firebase Connection Issues
Check logs for detailed error information:
```bash
gcloud logs read "resource.type=cloud_run_revision AND resource.labels.service_name=dsk-dao-discord-bot" --limit=20
```

### Usage

- **Rewarding Tickets**: Users can earn tickets by sending messages in designated channels.
- **Auto-Join**: Users can purchase auto-join credits to automatically join game rounds.
- **Raffle Participation**: Users can spend tickets to enter raffles for prizes.
- **Arena Games**: Automated 30-minute survival games with ticket rewards.

### Contributing

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Submit a pull request with a detailed description of your changes.

### License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

### Contact

For questions or support, please contact [germanlamelar@hotmail.com](mailto:germanlamelar@hotmail.com) or reach out on X [@Smart_Snippet](https://x.com/Smart_Snippet).

