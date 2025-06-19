# EtradeCLI Slack Bot

Slack integration for real-time trading commands and Claude AI conversations.

## Features

### 🤖 Trading Commands
- **Quotes**: `q TSLA` or `quote AAPL`
- **Deep Premium**: `spx 0` or `spx 1`

### 🧠 Claude AI Integration
- Natural conversation about market conditions
- Trading strategy discussions
- Market analysis and insights
- Maintains conversation context per user

### ⏰ Automated Alerts
- **9:40 AM EST**: Daily SPX 0DTE scan (same day opportunities)
- **3:50 PM EST**: Daily SPX 1DTE scan (next day setup)

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Create Slack App
1. Go to https://api.slack.com/apps
2. "Create New App" → "From scratch"
3. Name: "Trading Bot", select your workspace
4. Enable **Socket Mode** (required for real-time messaging)

### 3. Configure Permissions
**OAuth & Permissions** → Add Bot Token Scopes:
- `chat:write`
- `commands` 
- `app_mentions:read`
- `channels:read`

**Socket Mode** → Create App-Level Token with `connections:write`

### 4. Get API Keys
**Slack Tokens** (from your app page):
- Bot User OAuth Token (`xoxb-...`)
- Signing Secret (Basic Information page)
- App Token (`xapp-...`) from Socket Mode

**Claude API Key**:
- Go to https://console.anthropic.com
- Create account → API Keys → Create Key

### 5. Configure Environment
```bash
cp .env.template .env
# Edit .env with your actual tokens
```

### 6. Start Bot
```bash
npm start
# or for development with auto-restart:
npm run dev
```

## Usage Examples

### In Slack:
```
q SPX                    # Get SPX quote
spx 0                    # Scan for 0DTE deep premium
spx 1                    # Scan for 1DTE deep premium

# Claude conversations:
What's causing the market drop today?
Should I close my put positions?
Analyze the VIX spike
```

## Bot Commands

| Command | Description | Example |
|---------|-------------|---------|
| `q SYMBOL` | Get quote | `q TSLA` |
| `spx 0` | Deep premium 0DTE | `spx 0` |
| `spx 1` | Deep premium 1DTE | `spx 1` |
| `@bot question` | Ask Claude | `@bot What's the market outlook?` |

## Alerts Schedule

- **9:40 AM EST**: SPX 0DTE scan (same day opportunities)
- **3:50 PM EST**: SPX 1DTE scan (next day setup)

## Configuration

### Environment Variables
```bash
SLACK_BOT_TOKEN=xoxb-...        # Bot OAuth token
SLACK_SIGNING_SECRET=...        # App signing secret  
SLACK_APP_TOKEN=xapp-...        # Socket mode token
SLACK_ALERT_CHANNEL=#trading    # Channel for alerts
CLAUDE_API_KEY=sk-ant-...       # Claude API key
NODE_ENV=production             # Environment
```

### Channel Setup
The bot will post alerts to the channel specified in `SLACK_ALERT_CHANNEL`. Make sure to:
1. Invite the bot to your channel: `/invite @trading-bot`
2. Set proper channel permissions

## Troubleshooting

### Bot Not Responding
- Check bot is online: Look for "⚡️ Slack bot is running!" in console
- Verify tokens in `.env` file
- Ensure bot is invited to channel
- Check Socket Mode is enabled

### Command Not Working
- Try mentioning the bot: `@trading-bot q SPX`
- Check console for error messages
- Verify trading scripts are in correct directory

### Alerts Not Sending
- Check timezone settings (defaults to America/New_York)
- Verify `SLACK_ALERT_CHANNEL` exists and bot has access
- Look for scheduler messages in console

### API Errors
- **Claude 401**: Check `CLAUDE_API_KEY` in `.env`
- **Slack 401**: Check `SLACK_BOT_TOKEN` in `.env`
- **Rate Limits**: Built-in error handling will notify you

## Development

### Test Commands
```bash
# Test trading commands
node run.js q SPX
node spx-deeppremium.js 0

# Test in development mode (enables extra logging)
NODE_ENV=development npm start
```

### Add New Commands
Edit `slack-bot.js` → `TRADING_COMMANDS` object to add new patterns.

### Customize Alerts
Edit `scheduler.js` to modify alert timing or add new scheduled tasks.

## Security

- Never commit `.env` file (already in `.gitignore`)
- Rotate API keys regularly
- Use least-privilege permissions for bot
- Monitor API usage/costs

## Support

For issues or questions:
1. Check console logs for errors
2. Verify all tokens are correctly set
3. Test individual trading scripts first
4. Check Slack app configuration