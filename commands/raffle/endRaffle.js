const { ApplicationCommandOptionType, EmbedBuilder } = require('discord.js');
const admin = require('firebase-admin');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const { rando } = require('@nastyox/rando.js');

module.exports = {
  name: 'endraffle',
  description: 'Manually end a raffle and pick a winner',
  devOnly: true,
  options: [
    {
      name: 'raffle-id',
      description: 'The ID of the raffle to end',
      required: true,
      type: ApplicationCommandOptionType.String
    }
  ],

  callback: async (client, interaction) => {
    await interaction.deferReply();

    try {
      const raffleId = interaction.options.getString('raffle-id');
      const database = getFirestore();
      const rafflesCollection = database.collection('raffles');

      // Get the raffle document
      const raffleDoc = await rafflesCollection.doc(raffleId).get();
      
      if (!raffleDoc.exists) {
        return interaction.editReply({
          content: '❌ Raffle not found with that ID.'
        });
      }

      const raffleData = raffleDoc.data();

      // Check if raffle is already ended
      if (!raffleData.active) {
        return interaction.editReply({
          content: '❌ This raffle has already been ended.'
        });
      }

      // Check if there are participants
      if (!raffleData.participants || raffleData.participants.length === 0) {
        // End raffle without winner
        await raffleDoc.ref.update({
          active: false,
          endedAt: Timestamp.now(),
          endedBy: interaction.user.id
        });

        return interaction.editReply({
          content: `✅ Raffle "${raffleData.title}" ended with no participants.`
        });
      }

      // Pick random winner
      const winnerIndex = rando(0, raffleData.participants.length - 1);
      const winnerId = raffleData.participants[winnerIndex];

      // Update raffle with winner
      await raffleDoc.ref.update({
        active: false,
        winnerUserID: winnerId,
        endedAt: Timestamp.now(),
        endedBy: interaction.user.id
      });

      // Update the raffle message to show winner
      try {
        const raffleChannel = client.channels.cache.get(raffleData.channelId);
        if (raffleChannel) {
          const raffleMessage = await raffleChannel.messages.fetch(raffleData.messageId);
          if (raffleMessage) {
            const winnerEmbed = new EmbedBuilder()
              .setTitle('🎉 Raffle Ended!')
              .setDescription(`**${raffleData.title}**`)
              .setColor('Gold')
              .addFields(
                { name: '🏆 Winner', value: `<@${winnerId}>`, inline: true },
                { name: '🎯 Prize', value: raffleData.prizeTitle, inline: true },
                { name: '👥 Total Entries', value: `${raffleData.ticketsSold}`, inline: true }
              )
              .setImage(raffleData.prizeImageUrl)
              .setFooter({ text: `Raffle ID: ${raffleId} | Congratulations!` })
              .setTimestamp();

            await raffleMessage.edit({ 
              embeds: [winnerEmbed], 
              components: [] // Remove button
            });

            // Send winner announcement
            await raffleChannel.send({
              content: `🎉 **RAFFLE WINNER** 🎉\n<@${winnerId}> has won **${raffleData.prizeTitle}**!\n\nCongratulations! 🎊`
            });
          }
        }
      } catch (error) {
        console.error('Failed to update raffle message:', error);
      }

      // Send confirmation to admin
      const confirmEmbed = new EmbedBuilder()
        .setTitle('✅ Raffle Ended Successfully')
        .setDescription(`Raffle "${raffleData.title}" has been ended!`)
        .setColor('Green')
        .addFields(
          { name: '🏆 Winner', value: `<@${winnerId}>`, inline: true },
          { name: '👥 Total Participants', value: `${raffleData.ticketsSold}`, inline: true },
          { name: '🎯 Prize', value: raffleData.prizeTitle, inline: false }
        )
        .setTimestamp();

      await interaction.editReply({
        embeds: [confirmEmbed]
      });

      console.log(`Raffle ${raffleId} ended by ${interaction.user.username}. Winner: ${winnerId}`);

    } catch (error) {
      console.error('Error ending raffle:', error);
      await interaction.editReply({
        content: 'An error occurred while ending the raffle. Please try again.'
      });
    }
  }
}; 