
const { ApplicationCommandOptionType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js')
const admin = require('firebase-admin');
const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue, initializeFirestore, doc, updateDoc } = require('firebase-admin/firestore');

const database = getFirestore()

module.exports = {
  name: "verify",
  description: 'Verify your profile to transfer your Raffle Tickets.',
  options: [
    {
      name: 'code',
      description: 'Enter verification code.',
      required: true,
      type: ApplicationCommandOptionType.String
    }
  ],
  channelOnly: "987434592493522957",
  // deleted: Boolean,
  // channelOnly: String
  // devOnly: Boolean,
  // testOnly: Boolean,

  callback: async (client, interaction) => {
    try {
      await interaction.deferReply()

      const discordCode = interaction.options.getString("code");

      if(!discordCode) return interaction.editReply({
        content: 'Provide a code.'
      })
  
      const userProfile = database.collection('users')
      const userDetails = await userProfile.where('discordCode', '==', discordCode).get();
      const checkWallet = await userProfile.where("discordUserId", '==', interaction.user.id).get();
  
      if (userDetails.empty) {
        interaction.editReply({ content: 'Code not found. Please sign-in to DSKDAO dashboard to get a verified code.'})
        return;
      }
  
      if(checkWallet.empty) {
        let docArray = [];
  
        userDetails.forEach(async data => {
          if(data.data().discordLinked === true) {
            interaction.editReply({
              content: 'That account is already connected to a wallet. Only one account allowed per wallet.'
            })
            return;
          } else {
            // console.log(data.id, '=>', data.data());
            docArray.push(data.data());
      
            const wallet = await data.data().address;
            const userLinked = database.collection('users').doc(wallet);
            
            await userLinked.update({
              discordUserId: interaction.user.id,
              discordLinked: true
            });
    
            await interaction.member.roles.add("1109469028868702208")
    
            const embed = new EmbedBuilder()
              .setAuthor({ name: 'Verify Successful! ✅', iconURL: client.user.displayAvatarURL({ forceStatic: false }) })
              .setDescription(`You verified your account!\n\nPlease use /transfer to transfer your air-dropped tickets.`)
              .setColor(14633803)
              .setThumbnail("https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMmE4OGIzZjNkNzg2MjQyOTFkODZlMDBiMDA4M2JiYzBlMzJkMDYxNSZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/igRAd9jC9Rj0ngBs7g/giphy-downsized-large.gif")
              .setImage("https://www.animatedimages.org/data/media/562/animated-line-image-0184.gif")
              .setTimestamp()
              .setFooter({
                text: 'Official DSKDAO Raffles'
              })
            interaction.editReply({ embeds: [embed] })

            const verifyChannel = await client.channels.fetch("1113440140086476890");
            const verifyEmbed = new EmbedBuilder()
              .setDescription(`<@${interaction.user.id}> | Status: Linked ✅`)
              .setColor(14633803)
              .setTimestamp()
            verifyChannel.send({
              embeds: [verifyEmbed]
            })
          }
        });
      } else {
        interaction.editReply({
          content: "Discord account previously found on another account. Action is not allowed."
        })
        return;
      }
    } catch(err) {
      console.log(err)
    }
  }
}