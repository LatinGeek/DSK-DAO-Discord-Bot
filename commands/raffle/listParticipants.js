const { ApplicationCommandOptionType, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

module.exports = {
  name: 'listparticipants',
  description: 'List all participants in a specific raffle',
  devOnly: true,
  options: [
    {
      name: 'raffleid',
      description: 'The ID of the raffle to view participants for',
      required: true,
      type: ApplicationCommandOptionType.String
    }
  ],

  callback: async (client, interaction) => {
    await interaction.deferReply({ ephemeral: true });

    try {
      const raffleId = interaction.options.getString('raffleid');

      // Get Firestore database
      const database = getFirestore();
      const rafflesCollection = database.collection('raffles');

      // Get the raffle document
      const raffleDoc = await rafflesCollection.doc(raffleId).get();

      if (!raffleDoc.exists) {
        return interaction.editReply({
          content: `❌ No raffle found with ID: \`${raffleId}\``
        });
      }

      const raffleData = raffleDoc.data();
      const participants = raffleData.participants || [];

      // Create the participants list embed
      const participantsEmbed = new EmbedBuilder()
        .setTitle('🎫 Raffle Participants')
        .setDescription(`**${raffleData.title}**`)
        .setColor('Blue')
        .addFields(
          { 
            name: '🆔 Raffle ID', 
            value: raffleId, 
            inline: true 
          },
          { 
            name: '🎯 Prize', 
            value: raffleData.prizeTitle, 
            inline: true 
          },
          { 
            name: '💰 Ticket Price', 
            value: `${raffleData.ticketPrice} tickets`, 
            inline: true 
          },
          { 
            name: '👥 Total Participants', 
            value: `${participants.length} / ${raffleData.maxParticipants}`, 
            inline: true 
          },
          { 
            name: '📅 Status', 
            value: raffleData.active ? '🟢 Active' : '🔴 Ended', 
            inline: true 
          },
          { 
            name: '📅 Ends', 
            value: `<t:${Math.floor(raffleData.endingDateTime.toDate().getTime() / 1000)}:F>`, 
            inline: true 
          }
        )
        .setFooter({ 
          text: `Raffle ID: ${raffleId} | ${new Date().toLocaleString()}` 
        })
        .setTimestamp();

      // Add participants list
      if (participants.length === 0) {
        participantsEmbed.addFields({
          name: '👤 Participants',
          value: 'No participants yet',
          inline: false
        });
      } else {
        // Split participants into chunks if there are too many (Discord embed field limit is 1024 characters)
        const maxPerField = 20; // Adjust this based on typical username lengths
        const participantChunks = [];
        
        for (let i = 0; i < participants.length; i += maxPerField) {
          const chunk = participants.slice(i, i + maxPerField);
          const participantList = chunk.map((userId, index) => {
            const overallIndex = i + index + 1;
            return `${overallIndex}. <@${userId}>`;
          }).join('\n');
          
          participantChunks.push(participantList);
        }

        // Add participant fields
        participantChunks.forEach((chunk, index) => {
          const fieldName = index === 0 ? '👤 Participants' : `👤 Participants (continued ${index + 1})`;
          participantsEmbed.addFields({
            name: fieldName,
            value: chunk,
            inline: false
          });
        });
      }

      // Add winner information if raffle has ended
      if (!raffleData.active && raffleData.winnerUserID) {
        participantsEmbed.addFields({
          name: '🏆 Winner',
          value: `<@${raffleData.winnerUserID}>`,
          inline: false
        });
      }

      await interaction.editReply({
        embeds: [participantsEmbed]
      });

    } catch (error) {
      console.error('Error listing raffle participants:', error);
      await interaction.editReply({
        content: 'An error occurred while retrieving the raffle participants. Please check the raffle ID and try again.'
      });
    }
  }
}; 