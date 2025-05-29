const { ApplicationCommandOptionType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const admin = require('firebase-admin');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

// Hardcoded channel ID for raffle announcements (you can change this to your desired channel)
const RAFFLE_CHANNEL_ID = "1111796749078626357";

module.exports = {
  name: 'createraffle',
  description: 'Create a new raffle with specified parameters',
  devOnly: true,
  options: [
    {
      name: 'title',
      description: 'The title of the raffle',
      required: true,
      type: ApplicationCommandOptionType.String
    },
    {
      name: 'duration-hours',
      description: 'How many hours until the raffle ends (e.g., 24 for 1 day)',
      required: true,
      type: ApplicationCommandOptionType.Integer
    },
    {
      name: 'prize-image-url',
      description: 'URL of the prize image',
      required: true,
      type: ApplicationCommandOptionType.String
    },
    {
      name: 'prize-title',
      description: 'Title/name of the prize',
      required: true,
      type: ApplicationCommandOptionType.String
    },
    {
      name: 'max-participants',
      description: 'Maximum number of participants allowed',
      required: true,
      type: ApplicationCommandOptionType.Integer
    },
    {
      name: 'ticket-price',
      description: 'Price per ticket in tickets',
      required: true,
      type: ApplicationCommandOptionType.Integer
    }
  ],

  callback: async (client, interaction) => {
    await interaction.deferReply();

    try {
      const title = interaction.options.getString('title');
      const durationHours = interaction.options.getInteger('duration-hours');
      const prizeImageUrl = interaction.options.getString('prize-image-url');
      const prizeTitle = interaction.options.getString('prize-title');
      const maxParticipants = interaction.options.getInteger('max-participants');
      const ticketPrice = interaction.options.getInteger('ticket-price');

      // Validate duration hours
      if (durationHours < 1) {
        return interaction.editReply({
          content: 'Duration must be at least 1 hour.'
        });
      }

      if (durationHours > 168) { // 7 days = 168 hours
        return interaction.editReply({
          content: 'Duration cannot exceed 168 hours (7 days).'
        });
      }

      // Calculate end time
      const endingDateTime = new Date(Date.now() + durationHours * 3600 * 1000);

      // Get Firestore database
      const database = getFirestore();
      const rafflesCollection = database.collection('raffles');

      // Create raffle document
      const raffleData = {
        title: title,
        endingDateTime: Timestamp.fromDate(endingDateTime),
        prizeImageUrl: prizeImageUrl,
        prizeTitle: prizeTitle,
        maxParticipants: maxParticipants,
        ticketPrice: ticketPrice,
        winnerUserID: null,
        maxTickets: maxParticipants, // Assuming max tickets = max participants for now
        ticketsSold: 0,
        createdAt: Timestamp.now(),
        createdBy: interaction.user.id,
        active: true,
        participants: []
      };

      // Add the raffle to Firestore
      const raffleDoc = await rafflesCollection.add(raffleData);
      console.log(`Raffle created with ID: ${raffleDoc.id}`);

      // Create the raffle announcement embed
      const raffleEmbed = new EmbedBuilder()
        .setTitle('🎫 New Raffle Item')
        .setDescription(`**${title}**`)
        .setColor('Purple')
        .addFields(
          { 
            name: '🎨 Prize', 
            value: prizeTitle, 
            inline: true 
          },
          { 
            name: '🎫 Ticket Price', 
            value: `${ticketPrice} tickets`, 
            inline: true 
          },
          { 
            name: '👥 Max Participants', 
            value: `${maxParticipants} entries`, 
            inline: true 
          },
          { 
            name: '📅 Ends', 
            value: `<t:${Math.floor(endingDateTime.getTime() / 1000)}:F>`, 
            inline: true 
          },
          { 
            name: '🎟️ Entries Sold', 
            value: `0 / ${maxParticipants}`, 
            inline: true 
          },
          { 
            name: 'ℹ️ How to Enter', 
            value: 'Click the "Join Raffle" button below!', 
            inline: false 
          }
        )
        .setImage(prizeImageUrl)
        .setFooter({ 
          text: `Raffle ID: ${raffleDoc.id} | Official DSKDAO Raffles` 
        })
        .setTimestamp();

      // Create button for joining the raffle
      const joinButton = new ButtonBuilder()
        .setCustomId(`join-raffle-${raffleDoc.id}`)
        .setLabel('Join Raffle')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🎫');

      const row = new ActionRowBuilder()
        .addComponents(joinButton);

      // Send the raffle announcement to the specified channel
      const raffleChannel = client.channels.cache.get(RAFFLE_CHANNEL_ID);
      if (!raffleChannel) {
        return interaction.editReply({
          content: `Error: Could not find the raffle announcement channel.`
        });
      }

      const raffleMessage = await raffleChannel.send({ 
        embeds: [raffleEmbed],
        components: [row],
        content: '🎫 **NEW RAFFLE AVAILABLE** 🎫' 
      });

      // Store the message ID in the raffle document (no need for reaction anymore)
      await raffleDoc.update({
        messageId: raffleMessage.id,
        channelId: RAFFLE_CHANNEL_ID
      });

      // Send confirmation to the admin
      const confirmEmbed = new EmbedBuilder()
        .setTitle('✅ Raffle Created Successfully')
        .setDescription(`Your raffle "${title}" has been created and posted!`)
        .setColor('Green')
        .addFields(
          { name: 'Raffle ID', value: raffleDoc.id, inline: true },
          { name: 'Channel', value: `<#${RAFFLE_CHANNEL_ID}>`, inline: true },
          { name: 'Message ID', value: raffleMessage.id, inline: true },
          { name: 'Duration', value: `${durationHours} hour(s)`, inline: true },
          { name: 'Ends At', value: `<t:${Math.floor(endingDateTime.getTime() / 1000)}:F>`, inline: true },
          { name: 'Ends In', value: `<t:${Math.floor(endingDateTime.getTime() / 1000)}:R>`, inline: true }
        )
        .setTimestamp();

      await interaction.editReply({
        embeds: [confirmEmbed]
      });

    } catch (error) {
      console.error('Error creating raffle:', error);
      await interaction.editReply({
        content: 'An error occurred while creating the raffle. Please try again.'
      });
    }
  }
}; 