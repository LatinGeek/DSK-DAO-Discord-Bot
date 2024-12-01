const { QuickDB } = require("quick.db");
const db = new QuickDB({
  filePath: '/usr/src/app/data/json.sqlite'
});
const { EmbedBuilder } = require('discord.js');
const { getFirestore } = require('firebase-admin/firestore');

module.exports = {
  name: "ticket-balance",
  description: "Check how many tickets are available to redeem.",
  channelOnly: "987434592493522957",

  callback: async (client, interaction) => {
    await interaction.deferReply();
    let userInfo = [];

    const database = await getFirestore();
    const userProfile = await database.collection('users');
    const userDetails = await userProfile.where('discordUserId', '==', interaction.user.id).get();

    if (userDetails.empty === false) {
      userDetails.forEach((user) => {
        console.log(user)
        if (user.data().balance > 0) {
          console.log(user.data())
          userInfo.push(user.data())
        }
      })
    }

    console.log(userInfo)

    const redeemAmount = await db.get(interaction.user.id);
    console.log(redeemAmount)

    if (redeemAmount?.value > 0) {
      const embed = new EmbedBuilder()
        .setAuthor({
          name: "Ticket's Airdropped 🎫",
          iconURL: client.user.displayAvatarURL({ size: 1024, dynamic: true }),
          url: "https://www.dskdao.com/raffles"
        })
        .setColor(14633803)
        .addFields({
          name: `Airdropped Balance`,
          value: `${redeemAmount?.value ? redeemAmount.value : 0}`,
          inline: true
        })
        .addFields({
          name: `Site Balance`,
          value: `${userInfo.length > 0 ? userInfo[0].balance : 0}`,
          inline: true
        })
        .setDescription("You can use /transfer to use these tickets on the raffle site.")
        .setThumbnail("https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMmE4OGIzZjNkNzg2MjQyOTFkODZlMDBiMDA4M2JiYzBlMzJkMDYxNSZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/igRAd9jC9Rj0ngBs7g/giphy-downsized-large.gif")
        .setImage("https://www.animatedimages.org/data/media/562/animated-line-image-0184.gif")
        .setTimestamp()
        .setFooter({
          text: "Official DSKDAO Raffles"
        })
      interaction.editReply({
        embeds: [embed]
      })
    } else {
      const embed = new EmbedBuilder()
        .setAuthor({
          name: "Ticket's Airdropped 🎫",
          iconURL: client.user.displayAvatarURL({ size: 1024, dynamic: true }),
          url: "https://www.dskdao.com/raffles"
        })
        .setDescription("You can use /transfer to use these tickets on the raffle site.")
        .addFields({
          name: `Airdropped Balance`,
          value: `${redeemAmount?.value ? redeemAmount.value : 0}`,
          inline: true
        })
        .addFields({
          name: `Site Balance`,
          value: `${userInfo.length > 0 ? userInfo[0].balance : 0}`,
          inline: true
        })
        .setThumbnail("https://i.imgur.com/F41XFhr.png")
        .setImage("https://www.animatedimages.org/data/media/562/animated-line-image-0015.gif")
        .setTimestamp()
        .setColor(14633803)
        .setFooter({
          text: "Official DSKDAO Raffles"
        })

      interaction.editReply({
        embeds: [embed]
      })
    }

  }
}