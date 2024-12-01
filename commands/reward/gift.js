const { ApplicationCommandOptionType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js')
const { QuickDB } = require("quick.db");
const db = new QuickDB({
  filePath: '/usr/src/app/data/json.sqlite'
});

const gifted = new Set()

module.exports = {
  name: "gift",
  description: "Gift a user a ticket!",
  options: [
    {
      name: 'user',
      description: 'Select the user that deserves a ticket.',
      required: true,
      type: ApplicationCommandOptionType.User
    }
  ],
  channelOnly: "987434592493522957",

  callback: async (client, interaction) => {
    await interaction.deferReply();

    const user = interaction.options.getUser("user");
    const giverTickets = await db.get(interaction.user.id);

    if (gifted.has(`${interaction.user.id} gifted ticket to ${user}`)) {
      return interaction.editReply({
        content: `<@${interaction.user.id}>, you will have to wait to gift a ticket to that user again.`
      });
    } else {
      gifted.add(`${interaction.user.id} gifted ticket to ${user}`)
    }

    if (giverTickets !== null || giverTickets !== 0) {
      if (giverTickets.value >= 1) {
        const ticketsIncrease = giverTickets.value;
        const increaseTotal = ticketsIncrease + 1;
        const decreaseTotal = ticketsIncrease - 1;

        await db.set(interaction.user.id, { value: decreaseTotal });
        await db.set(user.id, { value: increaseTotal });
      } else return interaction.editReply({
        content: `<@${interaction.user.id}> you do not have any tickets to gift.`
      })
    } else {
      interaction.editReply({
        content: `<@${interaction.user.id}> you do not have any tickets to gift.`
      });
      return;
    }

    const winningEmbed = new EmbedBuilder()
      .setColor(14633803)
      .setAuthor({
        name: "DSKDAO Ticket Gift",
        iconURL: "https://i.imgur.com/rvP2ZmU.png"
      })
      .addFields({
        name: "Gift from",
        value: `<@${interaction.user.id}>`,
        inline: true
      })
      .addFields({
        name: "Gifted to",
        value: `<@${user.id}>`,
        inline: true
      })
      .addFields({
        name: "Ticket amount",
        value: `1 Ticket`,
        inline: true
      })
      .setFooter({
        text: "Official DSKDAO Raffles"
      })
      .setThumbnail("https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMmE4OGIzZjNkNzg2MjQyOTFkODZlMDBiMDA4M2JiYzBlMzJkMDYxNSZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/igRAd9jC9Rj0ngBs7g/giphy-downsized-large.gif")
      .setImage("https://www.animatedimages.org/data/media/562/animated-line-image-0184.gif")

    interaction.editReply({
      embeds: [winningEmbed]
    });

    const ticketTracker = await client.channels.fetch("1111712814051115058");
    await ticketTracker.send({
      content: `<@${interaction.user.id}> has gifted a ticket to ${user} 🎟️`
    });

    setTimeout(() => {
      gifted.delete(`${interaction.user.id} gifted ticket to ${user}`)
    }, 60000 * 60)
  }
}