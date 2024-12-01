const { ApplicationCommandOptionType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js')
const { QuickDB } = require("quick.db");
const db = new QuickDB({
  filePath: '/usr/src/app/data/json.sqlite'
});

module.exports = {
  name: 'reward',
  description: 'Rewards a user with an amount of tickets!',
  devOnly: true,
  // channelOnly: "987434592493522957",
  options: [
    {
      name: 'user',
      description: 'Enter your code that is displayed on the Official Raffle page.',
      required: true,
      type: 6
    },
    {
      name: 'ticket-amount',
      description: 'The amount of ticket\'s to reward a user.',
      required: true,
      type: ApplicationCommandOptionType.Number
    },
    {
      name: 'reason',
      description: 'Reason for the reward.',
      required: true,
      type: ApplicationCommandOptionType.String
    }
  ],

  callback: async (client, interaction) => {
    await interaction.deferReply()

    const user = interaction.options.getUser("user");
    const ticketAmount = interaction.options.getNumber("ticket-amount");
    const reasonSupplied = interaction.options.getString("reason");

    if (ticketAmount == null) return interaction.editReply("Please input an amount to reward.");

    const userTickets = await db.get(user.id)

    if (userTickets !== null) {
      const ticketsIncrease = userTickets.value;
      const increaseTotal = ticketsIncrease + ticketAmount;

      await db.set(user.id, { value: increaseTotal });
      console.log(await db.get(user.id));
    } else {
      await db.set(user.id, { value: ticketAmount });
      console.log(await db.get(user.id));
    }

    console.log(">>>",interaction.user.username, "has rewarded", user.username, "with", ticketAmount, "tickets for", reasonSupplied);

    const winningEmbed = new EmbedBuilder()
      .setDescription(`Congratulations <@${user.id}> you won ${ticketAmount} ticket(s)!! 🎉🎉 \n\nUse /transfer to link your Discord account to our DSKDAO raffle site in <#987434592493522957> to spend your tickets!`)
      .setColor(14633803)
      .setAuthor({
        name: "DSKDAO Ticket Airdrop",
        iconURL: "https://i.imgur.com/rvP2ZmU.png"
      })
      .setFooter({
        text: "Official DSKDAO Raffles"
      })
      .setThumbnail("https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMmE4OGIzZjNkNzg2MjQyOTFkODZlMDBiMDA4M2JiYzBlMzJkMDYxNSZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/igRAd9jC9Rj0ngBs7g/giphy-downsized-large.gif")

    interaction.editReply({
      content: `Congrats <@${user.id}>! `,
      embeds: [winningEmbed]
    })

    const ticketTracker = await client.channels.fetch("1111712814051115058");

    const ticketTrackEmbed = new EmbedBuilder()
      .setDescription(`Administrator: <@${interaction.user.id}>\n
        Winner: ${user}\n
        Amount: ${ticketAmount}\n
        Channel: <#${interaction.channel.id}>`)
      .setColor(14633803)
      .setAuthor({
        name: "Ticket Receipt",
        iconURL: "https://i.imgur.com/rvP2ZmU.png"
      })
      .setFooter({
        text: "Official DSKDAO Raffles"
      })
      .addFields({
        name: "Reason",
        value: reasonSupplied
      })
      .setThumbnail("https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMmE4OGIzZjNkNzg2MjQyOTFkODZlMDBiMDA4M2JiYzBlMzJkMDYxNSZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/igRAd9jC9Rj0ngBs7g/giphy-downsized-large.gif")

    await ticketTracker.send({
      embeds: [ticketTrackEmbed]
    });
  }
}