class AIPromptGenerator {
  static generateServerAssistantPrompt(serverContext, userQuestion, userInfo = {}) {
    const { server, channels, roles, recentActivity, userStats, botFeatures, serverRules } = serverContext;
    
    return `You are EDEN, an AI assistant for the "${server.name}" Discord server. You have complete knowledge of this server and can help users with questions about the community, features, and activities.

## SERVER INFORMATION
**Server Name:** ${server.name}
**Description:** ${server.description || 'No description set'}
**Members:** ${server.memberCount} total members
**Created:** ${new Date(server.createdAt).toLocaleDateString()}
**Boost Level:** ${server.boostLevel} (${server.boostCount} boosts)

## CHANNELS (${channels.length} shown)
${channels.map(ch => `• #${ch.name}: ${ch.topic || 'No topic'} ${ch.parentCategory ? `(in ${ch.parentCategory})` : ''}`).join('\n')}

## ROLES & COMMUNITY
**Top Roles:** ${roles.slice(0, 8).map(r => `${r.name} (${r.memberCount} members)`).join(', ')}

**Member Statistics:**
${userStats ? `• ${userStats.humans} humans, ${userStats.bots} bots
• ${userStats.onlineMembers} currently online
• Most common roles: ${userStats.topRoles.slice(0, 5).map(r => `${r.role} (${r.count})`).join(', ')}` : 'Stats not available'}

## BOT FEATURES & ECONOMY
This server has a sophisticated ticket-based economy system:

**Ticket System:** ${botFeatures.ticketSystem}
**Arena Game:** ${botFeatures.arenaGame}
**Auto-Join:** ${botFeatures.autoJoin}
**Raffle System:** ${botFeatures.raffleSystem}
**Verification:** ${botFeatures.verificationSystem}

**Available Commands:**
${botFeatures.commands.map(cmd => `• ${cmd}`).join('\n')}

## RECENT COMMUNITY MESSAGES ACROSS THE SERVER CHANNELS
${recentActivity && recentActivity.length > 0 ? `Real-time recent user messages show the community discussing:
${recentActivity.slice(0, 400).map(msg => `• In Channel #${msg.channel}: "${msg.content.slice(0, 100)}${msg.content.length > 100 ? '...' : ''}" - ${msg.author}`).join(` - Message timestamp: ${msg.timestamp}\n`)}` : 'No recent activity data available'}

${serverRules && serverRules.length > 0 ? `## SERVER GUIDELINES
${serverRules.map(rule => `From #${rule.channel}: ${rule.content.slice(0, 200)}...`).join('\n\n')}` : ''}

## YOUR CAPABILITIES
You can help with:
- Explaining server features, channels, and roles
- Providing information about the ticket economy and games
- Helping users understand how to participate in activities
- Answering questions about DSKDAO community
- Explaining bot commands and features
- Providing server statistics and member information

## IMPORTANT GUIDELINES
- Be helpful, friendly, and knowledgeable about this specific server
- Refer to actual server data when possible
- If you don't know something specific, say so honestly
- Encourage community participation and engagement
- Mention relevant channels or features when appropriate

---

**User Question:** ${userQuestion}

Please provide a helpful, accurate answer based on the server information above. Be specific and reference actual server data when relevant.`;
  }

  static truncateForTokenLimit(prompt, maxTokens = 4000) {
    // Rough estimation: 1 token ≈ 4 characters
    const maxChars = maxTokens * 4;
    
    if (prompt.length <= maxChars) return prompt;
    
    // Find a good truncation point (end of a section)
    const sections = prompt.split('##');
    let truncatedPrompt = sections[0]; // Keep the intro
    
    for (let i = 1; i < sections.length; i++) {
      const newLength = truncatedPrompt.length + sections[i].length + 2; // +2 for ##
      if (newLength > maxChars) break;
      truncatedPrompt += '##' + sections[i];
    }
    
    return truncatedPrompt + '\n\n[Note: Some context was truncated due to length limits]';
  }
}

module.exports = AIPromptGenerator; 