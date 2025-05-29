const { EmbedBuilder } = require('discord.js');
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

module.exports = {
  name: 'viewraffles',
  description: 'View all active raffles',
  devOnly: true,

  callback: async (client, interaction) => {
    await interaction.deferReply();

    try {
      const database = getFirestore();
      const rafflesCollection = database.collection('raffles');

      // Get all active raffles
      const activeRaffles = await rafflesCollection
        .where('active', '==', true)
        .orderBy('createdAt', 'desc')
        .get();

      if (activeRaffles.empty) {
        return interaction.editReply({
          content: '📋 No active raffles found.'
        });
      }

      const embed = new EmbedBuilder()
        .setTitle('📋 Active Raffles')
        .setDescription(`Found ${activeRaffles.size} active raffle(s)`)
        .setColor('Blue')
        .setTimestamp();

      let raffleInfo = '';
      
      activeRaffles.docs.forEach((doc, index) => {
        const raffle = doc.data();
        const endTime = raffle.endingDateTime.toDate();
        const now = new Date();
        const isExpired = now >= endTime;
        
        raffleInfo += `**${index + 1}. ${raffle.title}**\n`;
        raffleInfo += `├ ID: \`${doc.id}\`\n`;
        raffleInfo += `├ Prize: ${raffle.prizeTitle}\n`;
        raffleInfo += `├ Entries: ${raffle.ticketsSold}/${raffle.maxParticipants}\n`;
        raffleInfo += `├ Price: ${raffle.ticketPrice} tickets\n`;
        raffleInfo += `├ Status: ${isExpired ? '⏰ Expired' : '✅ Active'}\n`;
        raffleInfo += `└ Ends: <t:${Math.floor(endTime.getTime() / 1000)}:R>\n\n`;
      });

      // Split into multiple embeds if too long
      if (raffleInfo.length > 4000) {
        const chunks = raffleInfo.match(/[\s\S]{1,4000}/g) || [];
        for (let i = 0; i < chunks.length; i++) {
          const chunkEmbed = new EmbedBuilder()
            .setTitle(i === 0 ? '📋 Active Raffles' : `📋 Active Raffles (${i + 1})`)
            .setDescription(chunks[i])
            .setColor('Blue');
          
          if (i === 0) {
            await interaction.editReply({ embeds: [chunkEmbed] });
          } else {
            await interaction.followUp({ embeds: [chunkEmbed] });
          }
        }
      } else {
        embed.setDescription(raffleInfo);
        await interaction.editReply({ embeds: [embed] });
      }

      // Add instructions
      await interaction.followUp({
        content: '💡 **Commands:**\n• `/endraffle <raffle-id>` - End a raffle manually\n• Expired raffles should be ended to pick winners',
        ephemeral: true
      });

    } catch (error) {
      console.error('Error viewing raffles:', error);
      await interaction.editReply({
        content: 'An error occurred while fetching raffles. Please try again.'
      });
    }
  }
}; 