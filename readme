# Discord Bot for DSKDAO

This project is a Discord bot designed for the DSKDAO community. It includes features such as rewarding users with tickets, managing auto-join for games, and integrating with Google Cloud services.

## Features

- **Ticket Rewards**: Users can earn tickets by participating in specific channels.
- **Auto-Join**: Users can purchase auto-join credits to automatically participate in multiple game rounds.
- **Google Cloud Integration**: The bot is deployed using Google Cloud services, ensuring scalability and reliability.

## Setup

### Prerequisites

- Node.js and npm installed
- Google Cloud SDK installed
- Firebase Admin SDK configured

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

3. Set up environment variables:
   - Create a `.env` file in the root directory.
   - Add your Discord bot token and other necessary configurations.

4. Configure Firebase:
   - Ensure your Firebase service account key is available as `service-key.json`.
   - Update your Firebase project settings in the code.

### Deployment

1. Build and submit your Docker image to Google Cloud:
   ```bash
   gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/discord-bot
   ```

2. Deploy the bot to Cloud Run:
   ```bash
   gcloud run deploy discord-bot \
     --image gcr.io/YOUR_PROJECT_ID/discord-bot \
     --platform managed \
     --region YOUR_REGION
   ```

### Usage

- **Rewarding Tickets**: Users can earn tickets by sending messages in designated channels.
- **Auto-Join**: Users can purchase auto-join credits to automatically join game rounds.

### Configuration

- **Allowed Channels**: Update the `allowedChannels` array in `chatBot.js` to specify which channels can reward tickets.
- **Auto-Join Costs**: Adjust the `autoJoinCosts` variable to set the ticket cost for purchasing auto-join credits.

### Contributing

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Submit a pull request with a detailed description of your changes.

### License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

### Contact

For questions or support, please contact [your-email@example.com](mailto:your-email@example.com).
