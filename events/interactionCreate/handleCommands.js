const { devs, testServer } = require('../../config.json');
const getLocalCommands = require('../../utils/getLocalCommands');

require('dotenv').config();

module.exports = async (client, interaction) => {
  if (interaction.isChatInputCommand()) {
    const localCommands = getLocalCommands();

    try {
      const commandObject = localCommands.find((cmd) => cmd.name === interaction.commandName)

      if (!commandObject) return;

      if (commandObject.devOnly) {
        if (!devs.includes(interaction.member.id)) {
          interaction.reply({
            content: 'Only developers are allowed to run this command!',
            ephemeral: true,
          });
          return;
        }
      }

      if (commandObject.testOnly) {
        if (interaction.guild.id === testServer) {
          console.log("Worked")
        } else return interaction.reply({
          content: 'This command is not accessible to this server yet!',
          ephemeral: true
        })
      }

      if (commandObject?.channelOnly) {
        if (interaction.channel.id.toString() !== commandObject.channelOnly) {
          return interaction.reply({
            content: `Use this command in Commands channel! This is the <#${interaction.channel.id}> channel.`
          })
        }
      }

      if (commandObject.permissionRequired?.length) {
        for (const permission of commandObject.permissionRequired) {
          if (!interaction.member.permsissions.has(permission)) {
            interaction.reply({
              content: 'Not enough permissions.',
              ephemeral: true,
            });
            break;
          }
        }
      }

      if (commandObject.botPermissions?.length) {
        for (const permission of commandObject.botPermissions) {
          const bot = interaction.guild.members.me;

          if (!bot.perissions.has(permission)) {
            interaction.reply({
              content: 'I don\'t have enough permissions.',
              ephemeral: true,
            });
            break;
          }
        }
      }

      await commandObject.callback(client, interaction)
    } catch (err) {
      console.log(err)
    }
  } else if (interaction.isButton()) {
    try {

    } catch (err) {
      console.log(err)
    }
  } else return;
}