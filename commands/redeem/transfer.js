const { QuickDB } = require("quick.db");
const db = new QuickDB({
  filePath: '/usr/src/app/data/json.sqlite'
});

const { ApplicationCommandOptionType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js')
const { getFirestore, Timestamp, FieldValue, initializeFirestore, doc, updateDoc } = require('firebase-admin/firestore');

const database = getFirestore();

module.exports = {
  name: "transfer",
  description: 'Transfer your tickets to use on the Official DSKDAO raffle page!',
  channelOnly: "987434592493522957",

  callback: async (client, interaction) => {
    await interaction.deferReply()
    var redeemed;
    const userProfile = database.collection('users')
    const userDetails = await userProfile.where('discordUserId', '==', interaction.user.id).get();

    console.log(userDetails)

    if (userDetails.empty) {
      interaction.editReply({ content: 'User not verified, please sign into [DSKDAO Raffle Site](https://www.dskdao.com) to link your Discord account.' })
      return;
    }

    console.log("Here is how many tickets you can redeem:")
    console.log(await db.get(interaction.user.id))

    const redeemAmount = await db.get(interaction.user.id)
    redeemed = redeemAmount;

    if (redeemAmount?.value > 0) {
      try {
        userDetails.forEach(async (user) => {
          const res = await user.ref.update({
            balance: FieldValue.increment(redeemAmount.value)
          });
          console.log(res)
        })

        await db.set(interaction.user.id, { value: 0 })

        const embed = new EmbedBuilder()
          .setAuthor({
            name: "Tickets succesfully transferred!",
            iconURL: client.user.displayAvatarURL({ size: 1024, dynamic: true }),
            url: "https://www.dskdao.com/raffles"
          })
          .setDescription(`<@${interaction.user.id}> your tickets are now active on the website!`)
          .setThumbnail("https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMmE4OGIzZjNkNzg2MjQyOTFkODZlMDBiMDA4M2JiYzBlMzJkMDYxNSZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/igRAd9jC9Rj0ngBs7g/giphy-downsized-large.gif")
          .setImage("https://www.animatedimages.org/data/media/562/animated-line-image-0184.gif")
          .setTimestamp()
          .setColor(14633803)
          .setFooter({
            text: "Official DSKDAO Raffles"
          })
          .addFields({
            name: `Tickets transferred`,
            value: `${redeemed.value}`
          })

        interaction.editReply({
          embeds: [embed]
        })
      } catch (err) {
        console.log(err)
      }
    } else {
      interaction.editReply({
        content: 'You have not been air-dropped any tickets! You can get tickets by simply being active in chat.'
      })
    }
  }
}