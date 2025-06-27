const { ChannelType } = require('discord.js');

class ServerContextManager {
  constructor(client) {
    this.client = client;
    this.contextCache = new Map();
    this.cacheExpiry = 30 * 60 * 1000; // 30 minutes
  }

  async gatherServerContext(guildId, options = {}) {
    const {
      includeRecentMessages = true,
      messageLimit = 50,
      channelLimit = 10,
      includeUserActivity = true,
      includeServerStats = true,
      targetChannelIds = null
    } = options;

    // Check cache first
    const cacheKey = `${guildId}-${JSON.stringify(options)}`;
    const cached = this.contextCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) throw new Error('Guild not found');

    const context = {
      server: await this.getServerInfo(guild),
      channels: await this.getChannelsInfo(guild, channelLimit),
      roles: await this.getRolesInfo(guild),
      recentActivity: await this.getRecentMessages(guild, messageLimit, targetChannelIds),
      userStats: includeUserActivity ? await this.getUserStats(guild) : null,
      botFeatures: this.getBotFeatures(),
      serverRules: await this.getServerRules(guild),
      timestamp: new Date().toISOString()
    };

    // Cache the result
    this.contextCache.set(cacheKey, {
      data: context,
      timestamp: Date.now()
    });

    return context;
  }

  async getServerInfo(guild) {
    return {
      name: guild.name,
      description: guild.description,
      memberCount: guild.memberCount,
      createdAt: guild.createdAt.toISOString(),
      features: guild.features,
      verificationLevel: guild.verificationLevel,
      boostLevel: guild.premiumTier,
      boostCount: guild.premiumSubscriptionCount
    };
  }

  async getChannelsInfo(guild, limit = 10) {
    const channels = guild.channels.cache
      .filter(channel => channel.type === ChannelType.GuildText)
      .sort((a, b) => b.messages?.cache?.size || 0 - a.messages?.cache?.size || 0)
      .first(limit);

    return channels.map(channel => ({
      name: channel.name,
      id: channel.id,
      topic: channel.topic,
      type: channel.type,
      nsfw: channel.nsfw,
      parentCategory: channel.parent?.name,
      messageCount: channel.messages?.cache?.size || 0,
      lastActivity: channel.lastMessageId ? this.snowflakeToDate(channel.lastMessageId).toISOString() : null
    }));
  }

  snowflakeToDate(snowflake) {
    try {
      const DISCORD_EPOCH = 1420070400000; // January 1, 2015
      const timestamp = (BigInt(snowflake) >> 22n) + BigInt(DISCORD_EPOCH);
      return new Date(Number(timestamp));
    } catch (error) {
      console.warn(`Invalid snowflake: ${snowflake}`);
      return null;
    }
  }

  async getRolesInfo(guild) {
    return guild.roles.cache
      .filter(role => !role.managed && role.name !== '@everyone')
      .sort((a, b) => b.position - a.position)
      .first(15)
      .map(role => ({
        name: role.name,
        color: role.hexColor,
        memberCount: role.members.size,
        permissions: role.permissions.toArray().slice(0, 10), // Top 10 permissions
        mentionable: role.mentionable,
        position: role.position
      }));
  }

  async getRecentMessages(guild, limit = 50, targetChannelIds = null) {
    const messages = [];
    
    let channels;
    
    if (targetChannelIds && targetChannelIds.length > 0) {
      // Filter by specific channel IDs
      channels = guild.channels.cache
        .filter(channel => 
          targetChannelIds.includes(channel.id) &&
          channel.type === ChannelType.GuildText && 
          channel.permissionsFor(guild.members.me)?.has('ViewChannel')
        );
    } else {
      // Default behavior - get top 5 most active channels
      channels = guild.channels.cache
        .filter(channel => 
          channel.type === ChannelType.GuildText && 
          channel.permissionsFor(guild.members.me)?.has('ViewChannel')
        )
        .first(5);
    }

    for (const channel of channels) {
      try {
        const channelMessages = await channel.messages.fetch({ 
          limit: Math.floor(channel.id == '987406229171208274' ? 100 : (limit / channels.length)) 
        });
        
        channelMessages.forEach(msg => {
          if (!msg.author.bot && msg.content.length > 10) {
            messages.push({
              channel: channel.name,
              channelId: channel.id, // Added for reference
              author: msg.author.username,
              content: msg.content.slice(0, 200), // Truncate long messages
              timestamp: msg.createdAt.toISOString(),
              reactions: msg.reactions.cache.size,
              attachments: msg.attachments.size
            });
          }
        });
      } catch (error) {
        console.log(`Couldn't fetch messages from ${channel.name}:`, error.message);
      }
    }

    return messages
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  async getUserStats(guild) {
    const members = guild.members.cache;
    const onlineCount = members.filter(member => member.presence?.status !== 'offline').size;
    const botCount = members.filter(member => member.user.bot).size;
    const roleDistribution = {};

    members.forEach(member => {
      member.roles.cache.forEach(role => {
        if (role.name !== '@everyone') {
          roleDistribution[role.name] = (roleDistribution[role.name] || 0) + 1;
        }
      });
    });

    return {
      totalMembers: members.size,
      onlineMembers: onlineCount,
      bots: botCount,
      humans: members.size - botCount,
      topRoles: Object.entries(roleDistribution)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([role, count]) => ({ role, count }))
    };
  }

  getBotFeatures() {
    return {
      ticketSystem: "Users earn tickets by chatting and can redeem them",
      arenaGame: "30-minute survival game with Web3 theme, rewards 2-5 tickets",
      autoJoin: "Users can purchase auto-entry credits for arena games",
      raffleSystem: "Admins can create timed raffles, users spend tickets to enter",
      verificationSystem: "Links Discord accounts to DSKDAO website",
      balanceTracking: "Tracks user ticket balances across Discord and website",
      commands: [
        "/verify - Link Discord to DSKDAO account",
        "/ticket-balance - Check available tickets",
        "/transfer - Move tickets to website",
        "/createraffle - Create new raffle (admin)",
        "/endraffle - End raffle manually (admin)",
        "/viewraffles - See active raffles (admin)"
      ]
    };
  }

  async getServerRules(guild) {
    // Look for rules in common channels
    const rulesChannels = guild.channels.cache.filter(channel => 
      channel.name.includes('rules') || 
      channel.name.includes('guidelines') ||
      channel.name.includes('info')
    );

    const rules = [];
    for (const channel of rulesChannels.values()) {
      try {
        const messages = await channel.messages.fetch({ limit: 10 });
        messages.forEach(msg => {
          if (msg.content.length > 50) {
            rules.push({
              channel: channel.name,
              content: msg.content.slice(0, 500),
              author: msg.author.username
            });
          }
        });
      } catch (error) {
        // Channel not accessible
      }
    }

    return rules;
  }
}

module.exports = ServerContextManager; 