
const { ApplicationCommandOptionType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js')
const admin = require('firebase-admin');

module.exports = {
  name: "rain",
  description: 'Command under construction.',
  // options: [
  //   {
  //     name: 'code',
  //     description: 'Enter verification code.',
  //     required: true,
  //     type: ApplicationCommandOptionType.String
  //   }
  // ],
  channelOnly: "987434592493522957",
  // deleted: Boolean,
  // channelOnly: String
  devOnly: true,
  // testOnly: Boolean,

  callback: async (client, interaction) => {
    try {
      await interaction.deferReply()

      const discordCode = await interaction.options.get


    } catch (err) {
      console.log(err)
    }
  }
}