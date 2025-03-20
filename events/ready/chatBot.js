const { EmbedBuilder } = require("discord.js");
const { QuickDB } = require("quick.db");
const fs = require("fs");
const path = require("path");

const dbPath = "/usr/src/app/data/json.sqlite";

// Add diagnostic logging
console.log("QuickDB Initialization Check:");
console.log("1. Directory exists:", fs.existsSync("/usr/src/app/data"));
if (fs.existsSync("/usr/src/app/data")) {
  console.log("2. Directory contents:", fs.readdirSync("/usr/src/app/data"));
}
console.log("3. DB file exists:", fs.existsSync(dbPath));
if (fs.existsSync(dbPath)) {
  const stats = fs.statSync(dbPath);
  console.log("4. DB file stats:", {
    size: stats.size,
    created: stats.birthtime,
    modified: stats.mtime,
  });
}

const db = new QuickDB({
  filePath: "/usr/src/app/data/json.sqlite",
});

require("dotenv").config();

const usersXp = new Set();

// Define allowed channel IDs
const allowedChannels = [
  "987406229171208274",
  "1342338957060477069",
  // Add more channel IDs as needed
];

module.exports = async (client, interaction) => {
  client.on("messageCreate", async (message) => {
    if (message.author.bot) return; // Checking author for bot (if bot, return)

    // Check if the message is in an allowed channel
    if (!allowedChannels.includes(message.channel.id)) return;

    usersXp.add({ user: message.author.id, value: 1 }); // Adding the user XP
    let usersExperience = 0;

    for (let users of usersXp.keys()) {
      if (users.user === message.author.id) {
        usersExperience += users.value;
      }
    }

    const winningNumber = Math.floor(Math.random() * 50) + 1;

    if (usersExperience === winningNumber) {
      announceWinner(message);
      return;
    } else if (usersExperience > 42) {
      for (let users of usersXp.keys()) {
        if (users.user === message.author.id) {
          usersXp.delete(users);
        }
      }
      return;
      // announceWinner(message);
      // return;
    }
  });

  async function announceWinner(message) {
    try {
      const winningEmbed = new EmbedBuilder()
        .setDescription(
          `Congratulations <@${message.author.id}> you won a ticket!! 🎉🎉`
        )
        .setColor(14633803)
        .setAuthor({
          name: "DSKDAO Ticket Airdrop",
          iconURL: "https://i.imgur.com/rvP2ZmU.png",
        })
        .setTimestamp()
        .setFooter({
          text: "Official DSKDAO Raffles",
        })
        .setThumbnail(
          "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMmE4OGIzZjNkNzg2MjQyOTFkODZlMDBiMDA4M2JiYzBlMzJkMDYxNSZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/igRAd9jC9Rj0ngBs7g/giphy-downsized-large.gif"
        )
        .addFields({
          name: `Instructions`,
          value: `├▶️ Visit <#987434592493522957>\n  ├▶️ Use **/transfer**`,
          inline: true,
        })
        .addFields({
          name: `Links`,
          value: `├▶️ [EDEN Docs](https://eden.dskdao.com)\n  ├▶️ [DSKDAO Raffles](https://www.dskdao.com/raffles)`,
          inline: true,
        });

      for (let users of usersXp.keys()) {
        if (users.user === message.author.id) {
          usersXp.delete(users);
        }
      }

      const userTickets = await db.get(message.author.id);

      if (userTickets !== null) {
        const ticketsIncrease = userTickets.value;
        const increaseTotal = ticketsIncrease + 1;

        await db.set(message.author.id, { value: increaseTotal });
        console.log(await db.get(message.author.id));
      } else {
        await db.set(message.author.id, { value: 1 });
        console.log(await db.get(message.author.id));
      }

      // Add ticket tracking
      const ticketTracker = await client.channels.fetch("1111712814051115058");
      await ticketTracker.send({
        content: `<@${message.author.id}> has earned a ticket from chat activity 🎟️`,
      });

      return message
        .reply({
          embeds: [winningEmbed],
        })
        .then(async (messageEmbed) => {});
    } catch (error) {
      console.log(error);
    }
  }
};
