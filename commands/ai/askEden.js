const { ApplicationCommandOptionType, EmbedBuilder } = require('discord.js');
const OpenAI = require('openai');
const ServerContextManager = require('../../utils/serverContext');
const AIPromptGenerator = require('../../utils/aiPromptGenerator');

// Initialize OpenAI (you'll need to add this to your secrets)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Add this to Secret Manager
});

module.exports = {
  name: 'askeden',
  description: 'Ask EDEN about the server, features, or community',
  options: [
    {
      name: 'question',
      description: 'What would you like to know?',
      required: true,
      type: ApplicationCommandOptionType.String
    },
    {
      name: 'include-recent-chat',
      description: 'Include recent chat context for more relevant answers',
      required: false,
      type: ApplicationCommandOptionType.Boolean
    }
  ],
  // Add cooldown to prevent spam
  cooldown: 30, // 30 seconds

  callback: async (client, interaction) => {
    await interaction.deferReply();

    try {
      const question = interaction.options.getString('question');
      const includeChat = interaction.options.getBoolean('include-recent-chat') ?? true;
      
      // Initialize context manager
      const contextManager = new ServerContextManager(client);
      
      // Gather server context
      const serverContext = await contextManager.gatherServerContext(
        interaction.guild.id,
        {
          includeRecentMessages: includeChat,
          messageLimit: includeChat ? 30 : 0,
          channelLimit: 8,
          targetChannelIds: [
            '996604023765487719',
            '1007818567489691749',
            '987406229171208274',
            '1110328416340815972',
            '1339445794092220587'
            // Add more channel IDs as needed
          ]
        }
      );

      // Generate AI prompt
      const userInfo = {
        username: interaction.user.username,
        id: interaction.user.id,
        roles: interaction.member.roles.cache.map(role => role.name)
      };

      let prompt = AIPromptGenerator.generateServerAssistantPrompt(
        serverContext, 
        question, 
        userInfo
      );

      // Truncate if too long
      prompt = AIPromptGenerator.truncateForTokenLimit(prompt, 7000);

      console.log("Prompt: ", prompt);
      // Call OpenAI API
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Best price/performance for Discord
        messages: [
          {
            role: "system",
            content: "You are EDEN, a helpful Discord server assistant with deep knowledge of this specific community. Keep responses concise and under 2800 characters. Be informative but brief. Use bullet points or short paragraphs when appropriate. Use recent messages provided if user asks what they've been missed"
          },
          {
            role: "user", 
            content: prompt
          }
        ],
        max_tokens: 700, // Increased slightly but should keep under 3000 chars (~1 token = 4 chars)
        temperature: 0.7,
      });

      const response = completion.choices[0].message.content;

      // Check if response exceeds 2900 characters (safety buffer)
      if (response.length > 2900) {
        console.warn(`Response too long: ${response.length} characters, truncating...`);
      }

      // Split long responses (adjusted threshold for 3000 char limit)
      if (response.length > 2900) {
        const chunks = response.match(/.{1,2800}/g);
        
        // First embed with question at top
        const embed = new EmbedBuilder()
          .setTitle('🤖 EDEN Assistant')
          .setDescription(`**❓ Question:** ${question.length > 200 ? question.slice(0, 197) + '...' : question}\n\n**🤖 EDEN:**\n${chunks[0]}...`)
          .setColor('Blue')
          .setAuthor({
            name: `Asked by ${interaction.user.username}`,
            iconURL: interaction.user.displayAvatarURL()
          })
          .setFooter({ 
            text: `Context: ${includeChat ? 'Recent chat included' : 'Server info only'} | Part 1/${chunks.length}`
          })
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        
        // Send remaining chunks (without repeating the question)
        for (let i = 1; i < chunks.length; i++) {
          const followUpEmbed = new EmbedBuilder()
            .setTitle('🤖 EDEN Assistant (continued)')
            .setDescription(chunks[i])
            .setColor('Blue')
            .setFooter({ 
              text: `Part ${i + 1}/${chunks.length}`
            });
          await interaction.followUp({ embeds: [followUpEmbed] });
        }
      } else {
        // Single embed with question at top
        const embed = new EmbedBuilder()
          .setTitle('🤖 EDEN Assistant')
          .setDescription(`**❓ Question:** ${question}\n\n**🤖 Answer:**\n${response}`)
          .setColor('Blue')
          .setAuthor({
            name: `Asked by ${interaction.user.username}`,
            iconURL: interaction.user.displayAvatarURL()
          })
          .setFooter({ 
            text: `Context: ${includeChat ? 'Recent chat included' : 'Server info only'}`
          })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      }

      console.log(`AI question from ${interaction.user.username}: "${question}"`);

    } catch (error) {
      console.error('AI command error:', error);

      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ AI Assistant Error')
        .setDescription('Sorry, I encountered an error while processing your question. Please try again later.')
        .setColor('Red');

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  }
}; 