const { QuickDB } = require("quick.db");
const { EmbedBuilder } = require('discord.js');
const { getStore } = require("../../index");

module.exports = {
  name: "store",
  description: "Check the details of the Item Shop",
  channelOnly: "987434592493522957",

  callback: async (client, interaction) => {
    const store = await getStore()

    await interaction.deferReply();

    const storeEmbed = new EmbedBuilder()
      .setAuthor({
        name: "Official DSKDAO Raffle Shop",
        iconURL: "https://i.imgur.com/rvP2ZmU.png"
      })
      .setTimestamp()
      .setDescription("**Welcome to the Official DSKDAO Raffle Shop!** \n \n _You can see the available items in the shop below._ \n \n Buy items in the [DSKDAO Raffle Shop](https://dskdao.com)")
    store.map((items, i) => {
      storeEmbed.addFields({ name: "`" + `#${i + 1} ${items.name.toUpperCase()}` + "`", value: `${"`" + "🪙 " + `${items.amount} tickets` + "`" + "\n" + "`" + `🎫 ${items.supply - items.purchased}/${items.supply}` + "`"}`, inline: true })
    })
    storeEmbed.setColor(14633803)
    storeEmbed.setImage("https://pbs.twimg.com/profile_banners/1541489064808853504/1685392100/600x200")
    storeEmbed.setFooter({
      text: "✅ Official Store Items"
    })

    const comingSoon = new EmbedBuilder()
      .setColor(14633803)
      .setFooter({
        text: "⚠️ Items will be available for purchase through Discord soon!"
      })
    interaction.editReply({
      embeds: [storeEmbed, comingSoon]
    })
  }
}