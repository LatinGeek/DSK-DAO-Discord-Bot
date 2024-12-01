const { DSKDAO } = require('../../config.json');
const getAppliactionCommands = require('../../utils/getAppliactionCommands');
const getLocalCommands = require('../../utils/getLocalCommands');
const areCommandsDifferent = require('../../utils/areCommandsDifferent');

module.exports = async (client) => {
  try {
    const localCommands = getLocalCommands();
    const applicationCommands = await getAppliactionCommands(client, DSKDAO);

    for (const localCommand of localCommands) {
      const { name, description, options } = localCommand;

      const existingCommand = await applicationCommands.cache.find(
        (cmd) => cmd.name === name
      );

      if (existingCommand) {
        if (localCommand.deleted) {
          await applicationCommands.delete(existingCommand.id);
          console.log(`Deleted command "${name}"`);
          continue;
        }

        if (areCommandsDifferent(existingCommand, localCommand)) {
          await applicationCommands.edit(existingCommand.id, {
            description,
            options,
          });

          console.log(`Edited command ${name}`);
        }
      } else {
        if (localCommand.deleted) {
          console.log(`Skipping registering command "${name}" as it's set to delete.`);
          continue;
        }

        await applicationCommands.create({
          name,
          description,
          options
        });

        console.log(`Command ${name} was registered.`);
      }
    }
  } catch (err) {
    console.log(err)
  }
}