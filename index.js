require('dotenv').config();
const { Client, IntentsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const eventHandler = require('./handlers/eventHandler');
const admin = require('firebase-admin');
const { rando, randoSequence } = require('@nastyox/rando.js');
const { getFirestore, Timestamp, FieldValue, initializeFirestore, doc, updateDoc } = require('firebase-admin/firestore');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

// Feature flags for safer deployment
const ENABLE_RAFFLES = process.env.ENABLE_RAFFLES === 'true' || false;
console.log(`🎫 Raffle system: ${ENABLE_RAFFLES ? 'ENABLED' : 'DISABLED'}`);

const autoJoinCosts = 3;
const roundTime = 60000 * 30;
const warningTime = 25;
const warningTime2 = 29;
const channelId = "1110328416340815972";
const farmerFeedId = "1201587003280588800";
const ticketEarned = 2;
const participants = 5;
const farmerRole = "1190087733369127032";
const raffleTicketsBurnedChannelId = "1110037295551230053"

async function startServer() {
  // Initialize Firebase Admin with better error handling  
  console.log('🔥 Initializing Firebase...');
  
  const secretClient = new SecretManagerServiceClient();
      
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'dskdao-discord';
  const openaiSecretPath = `projects/${projectId}/secrets/openai-api-key`;
  const [openaiVersion] = await secretClient.accessSecretVersion({
    name: `${openaiSecretPath}/versions/latest`,
  });

  process.env.OPENAI_API_KEY = openaiVersion.payload.data.toString().trim();
  console.log('✅ OpenAI API key loaded from Secret Manager');
  const secretPath = `projects/${projectId}/secrets/firebase-private-key`;
  
  
      const [version] = await secretClient.accessSecretVersion({
        name: `${secretPath}/versions/latest`,
      });
      
      const secretValue = version.payload.data.toString();
      const serviceAccount = JSON.parse(secretValue);
  try {

    const firebaseServer = await admin.initializeApp({credential: admin.credential.cert(serviceAccount)});
    console.log("🚀 Firebase server started successfully:", firebaseServer.options.credential.projectId);
    
  } catch (error) {
    console.error("❌ Failed to initialize Firebase:", error.message);
    console.error("Full error:", error);
    
    // Provide specific guidance based on error type
    if (error.message.includes('DECODER routines')) {
      console.error("🔧 DECODER ERROR GUIDANCE:");
      console.error("- This usually means the private key format is incorrect");
      console.error("- Check that your FIREBASE_PRIVATE_KEY has proper \\n characters");
      console.error("- Verify the key starts with -----BEGIN PRIVATE KEY----- and ends with -----END PRIVATE KEY-----");
      console.error("- Make sure there are no extra spaces or characters");
    }
    
    process.exit(1);
  }
}



const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.GuildMessageTyping,
    IntentsBitField.Flags.MessageContent  ],
});

startServer().then(() => {
  eventHandler(client);
  client.login(process.env.TOKEN);
});

client.on("ready", (c) => {
  console.log(`${c.user.username} is online!`)

  setTimeout(() => {
    initiateGame()
      // Start automatic raffle checking (only if enabled)
  if (ENABLE_RAFFLES) {
    setInterval(() => {
      checkExpiredRaffles()
    }, 300000) // Check every 5 minutes
    console.log('🎫 Automatic raffle expiration checking enabled');
  }
  }, 10000)




});

const actions = [
  " was rugged pulled!",
  " clicked a bad link and had all their crypto compromised!",
  " invested in a coin and the price plummeted.",
  " just joined a witness protection program and vanished.",
  " your wallet got caught in a web3 phishing net.",
  " crypto market crash – your portfolio just did a freefall.",
  " oops! Sent crypto to the wrong address – a one-way ticket to the void.",
  " crypto exchange got hacked – looks like your assets took a hit.",
  " smart contract gone wrong – your crypto vanished in a code glitch.",
  " fell for a Ponzi scheme – your crypto dreams shattered.",
];

let emojiList = [
  "📉",
  "😓",
  "〽️",
  "💰",
  "🪙"
];

let lastMessageId;

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

async function runWeb3Rumble(id, bot, players) {
  let activePlayers = [];
  let eliminatedPlayers = [];
  let attackerUsers = [];

  const botV1 = client.channels.cache.get(channelId);

  players.map((user) => {
    if (user.bot) return;
    activePlayers.push({
      user: user.id,
      username: user.username,
      image: "https://cdn.discordapp.com/avatars/" + user.id + "/" + user.avatar + ".jpeg",
      autojoined: false
    })
  })

  const database = getFirestore();
  const userProfile = database.collection('users');
  const autoJoinUsers = await userProfile.where('autoJoinCredits', '>', 0).get();

  if (!autoJoinUsers.empty) {
    autoJoinUsers.docs.forEach(async (user) => {
      // Check if user is already in active players
      let activeUser = activePlayers.filter(player => player.user === user.data().discordUserId);
      if (activeUser.length > 0) return;

      // Add user to active players
      activePlayers.push({
        user: user.data().discordUserId,
        username: user.data().username,
        image: user.data().image,
        autojoined: true
      });

      // Decrement their autoJoinCredits by 1
      await user.ref.update({
        autoJoinCredits: FieldValue.increment(-1)
      });
    });
  }

  if (activePlayers.length < participants) {
    botV1.send({ content: `We need **${participants - activePlayers.length}** more players!\nYou can join here: https://discord.com/channels/987406227875196928/${botV1.id}/${id}` })
    console.log("30 second delay on Rumble, waiting for players!")

    activePlayers = [];

    setTimeout(() => {
      startRound(id, bot)
    }, 60000 * 15)
    return;
  }

  showPlayers(activePlayers, botV1)

  let round = 0;
  let remainingUsers = activePlayers.length;
  for (let i = remainingUsers; i > 0; i--) {
    await sleep(10000)
    try {
      let botV1 = client.channels.cache.get(channelId);

      let winChance = rando();
      let winResult = winChance < 0.95;

      if (round == remainingUsers) {
        sendSummary2(activePlayers, eliminatedPlayers, botV1, round)
      }

      let knockedOut = await rando(0, activePlayers.length - 1);
      let knockedUser = activePlayers[knockedOut];

      remainingUsers -= 1;
      round += 1;

      sendRemovePlayer(knockedUser, remainingUsers, botV1, round);
      eliminatedPlayers.push(activePlayers[knockedOut])

      activePlayers = activePlayers.filter((user) => {
        return user.user !== knockedUser['user']
      })

      if (remainingUsers === 1) {
        await sleep(10000)
        sendWinnerMessage(activePlayers[0], botV1, winResult, activePlayers[0]['image'])
        await sleep(10000)
        sendSummary(activePlayers, eliminatedPlayers, botV1, round, attackerUsers, activePlayers[0]['username'])
        await initiateGame()
        return;
      }
    } catch (err) {
      console.log(err)
    }
  }
}

async function showPlayers(players, bot) {
  const winnerMessage = new EmbedBuilder()
    .setTitle(`Ticket arena is starting...`)
    .setDescription(`Round is starting...
  A total of ${players.length} web3 degens will try to survive in Web3, including:
  ${players.map((users, i) => { return `${i + 1}. **<@${users.user}>** ${users.autojoined ? "(auto-joined)" : ""}` }).join("\n")}`)
    .setColor("Blue")
  bot.send({
    embeds: [winnerMessage]
  })
}

async function sendSummary2(players, eliminatedPlayers, bot, round) {
  try {
    const gameSummary = new EmbedBuilder()
      .setTitle(`${players.length} players left...`)
      .setDescription(`Current Game Stats \`${round} rounds\`\nParticipants: \`${players.length + eliminatedPlayers.length} players\``)
      .addFields(
        { name: "Active Participants", value: `${players.map((user, i) => { return `💰 <@${user.user}>` }).join("\n")}`, inline: true },
        { name: "Rugged Participants", value: `${eliminatedPlayers.map((user, i) => { return `❌ <@${user.user}>` }).join("\n")}`, inline: true },
      )
      .setColor("Blue")
    bot.send({
      embeds: [gameSummary]
    })
  } catch (err) {
    console.log(err)
  }
}

async function sendSummary(players, eliminatedPlayers, bot, round, attackers, winner) {
  if (eliminatedPlayers?.length === 0) return;
  try {
    const gameSummary = new EmbedBuilder()
      .setTitle(`Game summary`)
      .setDescription(`Game ended with \`${round} rounds\`\nParticipants: \`${players?.length + eliminatedPlayers?.length} players\`\nRound winner: \`${winner}\``)
      .addFields(
        { name: "Runners-up", value: `${eliminatedPlayers.reverse().map((user, i) => { return `${i + 2}. <@${user.user}>` }).join("\n")}`, inline: true },
        { name: "Hackers", value: `${attackers?.length > 0 ? attackers.sort((a, b) => { return b.attackTimes - a.attackTimes }).map((user, i) => { return `${i + 1}. <@${user.user}>: \`${user.attackTimes}\`` }).join("\n") : "0 hackers this round."}`, inline: true },
      )
      .setColor("Blue")
    bot.send({
      embeds: [gameSummary]
    })
  } catch (err) {
    console.log(err)
  }
}


async function sendRemovePlayer(knocked, players, bot, round) {
  const actionSaying = actions[Math.floor(Math.random() * actions.length)];
  const actionEmoji = emojiList[Math.floor(Math.random() * emojiList.length)];
  const winnerMessage = new EmbedBuilder()
    .setTitle(`Round ${round}`)
    .setDescription(`${actionEmoji} | **${knocked.username}** ${actionSaying}`)
    .setColor("Yellow")
    .setFooter({ text: `${players} players left` })
  bot.send({
    embeds: [winnerMessage]
  })
}

async function sendWinnerMessage(winner, bot, winResult, winnerImage) {
  const database = getFirestore();
  const userProfile = database.collection('users');
  const userDetails = await userProfile.where('discordUserId', '==', winner.user).get();

  if (userDetails.empty === false) {
    const winnerMessage = new EmbedBuilder()
      .setTitle("Ticket arena finished")
      .setDescription(`Congratulations <@${winner.user}>, you're the last web3 degen standing!`)
      .addFields({ name: "Reward", value: winResult ? ":ticket: 2 Tickets" : ":ticket: 5 Tickets", inline: true }, { name: "Automated", value: "Enabled", inline: true })
      .addFields({ name: "Reward Chance", value: winResult ? ":game_die: 95% chance to get" : ":game_die: 5% chance to get" })
      .setThumbnail(winnerImage)
      .setColor("Blue")
    bot.send({
      embeds: [winnerMessage],
      content: `<@${winner.user}>`
    })

    let farmerFeed = client.channels.cache.get(farmerFeedId);
    const farmerWinner = new EmbedBuilder()
      .setTitle("Farmer Winner")
      .setDescription(`Winner: <@${winner.user}>\nUsername: **${winner.username}**`)
      .addFields({ name: "Reward", value: winResult ? ":ticket: 2 Tickets" : ":ticket: 5 Tickets", inline: true }, { name: "Automated", value: "Enabled", inline: true })
      .setThumbnail(winnerImage)
      .setColor("Yellow")
    farmerFeed.send({ embeds: [farmerWinner] })

    userDetails.docs.forEach(async (user) => {
      const res = await user.ref.update({
        balance: FieldValue.increment(winResult ? ticketEarned : 5)
      });
      console.log(res)
    })
  } else {
    const winnerMessage = new EmbedBuilder()
      .setTitle("Ticket arena finished")
      .setDescription(`Congratulations <@${winner.user}>, you're the last web3 degen standing!`)
      .addFields({ name: "Reward", value: winResult ? ":ticket: 2 Tickets" : ":ticket: 5 Tickets", inline: true }, { name: "Automated", value: "Enabled", inline: true })
      .addFields({ name: "Reward Chance", value: winResult ? ":game_die: 95% chance to get" : ":game_die: 95% chance to get" })
      .setThumbnail(winnerImage)
      .setColor("Blue")
    bot.send({
      embeds: [winnerMessage],
      content: `<@${winner.user}> you're not verified yet. Use /verify in the commands channel. Screenshot this message and open a ticket to get your rewards.`
    })
  }
}

async function initiateGame() {
  const botV1 = client.channels.cache.get(channelId);

  let messageReturn = await sendRoundMessage(botV1);

  lastMessageId = messageReturn;
  
  sendWarning(botV1, messageReturn)
  startRound(messageReturn, botV1)
}

function sendWarning(botV1, messageId) {
  setTimeout(async () => {
    const date = new Date().getTime();

    const embed = new EmbedBuilder()
      .setTitle(`Ticket arena is starting soon`)
      .setDescription(`Ticket arena will start **in 5 Minutes**.\nYou can join here https://discord.com/channels/987406227875196928/${botV1.id}/${messageId}`)
      .setColor("Yellow")
      .addFields({ name: `Round Countdown`, value: `**<t:${Math.floor((date / 1000) + 60000 * 5 / 1000).toFixed(0)}:R>**` })
    botV1.send({ embeds: [embed], content: `<@&${farmerRole}>` })
  }, 60000 * warningTime)

  setTimeout(async () => {
    const date = new Date().getTime();

    const embed = new EmbedBuilder()
      .setTitle(`Ticket arena is starting soon`)
      .setDescription(`Ticket arena will start **in 1 Minute**.\nYou can join here https://discord.com/channels/987406227875196928/${botV1.id}/${messageId}`)
      .setColor("Yellow")
      .addFields({ name: `Round Countdown`, value: `**<t:${Math.floor((date / 1000) + 60000 * 1 / 1000).toFixed(0)}:R>**` })

    botV1.send({ embeds: [embed] })
  }, 60000 * warningTime2)
}

function startRound(messageId, botV1) {
  setTimeout(async () => {
    const messageReacted = await botV1.messages.fetch(messageId)

    messageReacted.reactions.cache.forEach(async (reaction) => {
      const emojiName = reaction._emoji.name;
      const emojiCount = reaction.count;

      console.log(reaction)
      if (emojiName === "🛡️") {
        const reactionUsers = await reaction.users.fetch();
        runWeb3Rumble(messageId, botV1, reactionUsers)
      }
    });
  }, roundTime)
}

async function sendRoundMessage(botV1) {
  const date = new Date().getTime()
  const newDate = roundTime

  console.log("Date")
  console.log(date)

  const confirm = new ButtonBuilder()
    .setCustomId('pool')
    .setLabel('Reward Pool')
    .setStyle(ButtonStyle.Primary)
    .setEmoji("💰");

  const confirm2 = new ButtonBuilder()
    .setCustomId('howto')
    .setLabel('How To Play')
    .setStyle(ButtonStyle.Primary)
    .setEmoji("🎮");

  const database = getFirestore();
  const userProfile = database.collection('users');
  const autoJoinUsers = await userProfile.where('autoJoinCredits', '>', 0).get();
  const autoJoinCount = autoJoinUsers.size;

  const confirm3 = new ButtonBuilder()
    .setCustomId('auto-join')
    .setLabel(`Auto Join (${autoJoinCount})`) 
    .setStyle(ButtonStyle.Secondary)
    .setEmoji("🪙");

  const row = new ActionRowBuilder()
    .addComponents(confirm, confirm2, confirm3);

  const embed = new EmbedBuilder()
    .setTitle(`Ticket arena started by ${client.user.username}`)
    .setDescription(`Click the shield emoji below to join!`)
    .setColor("Purple")
    .addFields({ name: "Starts", value: `<t:${Math.floor((date / 1000) + newDate / 1000).toFixed(0)}:R>`, inline: true }, { name: "Required Users", value: `${participants} Participants`, inline: true })
    .addFields({ name: "Auto-Join Costs", value: `🎟️ ${autoJoinCosts} Tickets` })
    .setThumbnail("https://pbs.twimg.com/media/F4yoZq-bAAEkOxC?format=jpg&name=large")

  const message = await botV1.send({ embeds: [embed], components: [row], content: `<@&${farmerRole}>` }).then((message) => {
    message.react("🛡️")
    return message.id
  })


  return message;
}

client.on('interactionCreate', async interaction => {
  try {
    // Handle raffle join buttons (only if feature enabled)
    if (ENABLE_RAFFLES && interaction.customId && interaction.customId.startsWith('join-raffle-')) {
      await interaction.deferReply({ ephemeral: true });

      const raffleId = interaction.customId.replace('join-raffle-', '');
      const database = getFirestore();
      const rafflesCollection = database.collection('raffles');
      const usersCollection = database.collection('users');
      const serverStatsCollection = database.collection('server-stats');

      // Get the raffle document
      const raffleDoc = await rafflesCollection.doc(raffleId).get();
      
      if (!raffleDoc.exists) {
        return interaction.editReply({
          content: '❌ This raffle no longer exists.'
        });
      }

      const raffleData = raffleDoc.data();

      // Check if raffle is active
      if (!raffleData.active) {
        return interaction.editReply({
          content: '❌ This raffle is no longer active.'
        });
      }

      // Check if raffle has ended
      const now = new Date();
      const endTime = raffleData.endingDateTime.toDate();
      if (now >= endTime) {
        return interaction.editReply({
          content: '❌ This raffle has already ended.'
        });
      }

      // Check if raffle is full
      if (raffleData.ticketsSold >= raffleData.maxParticipants) {
        return interaction.editReply({
          content: '❌ This raffle is already full.'
        });
      }

      // Check if user is already participating
      if (raffleData.participants && raffleData.participants.includes(interaction.user.id)) {
        return interaction.editReply({
          content: '❌ You are already participating in this raffle.'
        });
      }

      // Find user in database
      const userQuery = await usersCollection
        .where('discordUserId', '==', interaction.user.id)
        .get();

      if (userQuery.empty) {
        return interaction.editReply({
          content: '❌ You are not registered in our system. Please use the /verify command first.'
        });
      }

      const userDoc = userQuery.docs[0];
      const userData = userDoc.data();

      // Check if user has enough balance
      if (userData.balance < raffleData.ticketPrice) {
        return interaction.editReply({
          content: `❌ Insufficient balance. You need ${raffleData.ticketPrice} tickets but only have ${userData.balance} tickets.`
        });
      }

      // Deduct ticket price from user's balance
      await userDoc.ref.update({
        balance: FieldValue.increment(-raffleData.ticketPrice)
      });

      // Add user to raffle participants and increment tickets sold
      const currentParticipants = raffleData.participants || [];
      await raffleDoc.ref.update({
        participants: [...currentParticipants, interaction.user.id],
        ticketsSold: FieldValue.increment(1)
      });

      //Update server stats
      let ticketsBurnedUntilNow = 0;
      try{
        const serverStatsDoc = await serverStatsCollection.doc('tickets').get();
          if (serverStatsDoc.exists) {
            // Get current value before updating
            const currentData = serverStatsDoc.data();
            ticketsBurnedUntilNow = (currentData.ticketsBurned || 0) + raffleData.ticketPrice;
            
            await serverStatsDoc.ref.update({
              ticketsBurned: FieldValue.increment(raffleData.ticketPrice)
            });
          }
      } catch (error) {
        console.error('Failed to update server stats:', error);
      }

      // Send a message to the raffle tickets burned channel
      const raffleTicketsBurnedChannel = client.channels.cache.get(raffleTicketsBurnedChannelId);
      if (raffleTicketsBurnedChannel) {
        raffleTicketsBurnedChannel.send(`<@${interaction.user.id}> has entered the raffle: **${raffleData.title}** (#${raffleId}) for ${raffleData.ticketPrice} tickets. ${ticketsBurnedUntilNow} tickets burned until now.`);
      }



      // Update the raffle message with new participant count
      try {
        const raffleChannel = client.channels.cache.get(raffleData.channelId);
        if (raffleChannel) {
          const raffleMessage = await raffleChannel.messages.fetch(raffleData.messageId);
          if (raffleMessage && raffleMessage.embeds[0]) {
            const embed = EmbedBuilder.from(raffleMessage.embeds[0]);
            
            // Update the "Entries Sold" field
            const fields = embed.data.fields;
            const entriesSoldFieldIndex = fields.findIndex(field => field.name === '🎟️ Entries Sold');
            if (entriesSoldFieldIndex !== -1) {
              fields[entriesSoldFieldIndex].value = `${raffleData.ticketsSold + 1} / ${raffleData.maxParticipants}`;
            }

            await raffleMessage.edit({ embeds: [embed], components: raffleMessage.components });
          }
        }
      } catch (error) {
        console.error('Failed to update raffle message:', error);
      }

      // Send ephemeral success message (like arena game)
      const successEmbed = new EmbedBuilder()
        .setTitle('🎫 Raffle Entry Successful!')
        .setDescription(`You have successfully entered the raffle: **${raffleData.title}**`)
        .setColor('Green')
        .addFields(
          { name: '🎫 Cost', value: `${raffleData.ticketPrice} tickets`, inline: true },
          { name: '💰 Remaining Balance', value: `${userData.balance - raffleData.ticketPrice} tickets`, inline: true },
          { name: '🎯 Prize', value: raffleData.prizeTitle, inline: false }
        )
        .setFooter({ text: 'Good luck!' })
        .setTimestamp();

      await interaction.editReply({ embeds: [successEmbed] });

      console.log(`User ${interaction.user.username} (${interaction.user.id}) entered raffle ${raffleId} for ${raffleData.ticketPrice} tickets`);
      return;
    }

    // Existing arena game interaction handlers...
    if (interaction.customId === "pool") {
      await interaction.deferReply({ ephemeral: true })

      const embed = new EmbedBuilder()
        .setTitle("Reward Pool")
        .setDescription(`
        Be the last web3 crypto chad standing for a chance to win tickets
  
        :moneybag: 2 Tickets
        :white_check_mark: Automated Deposit
        :game_die: 95%
  
        :moneybag: 5 Tickets
        :white_check_mark: Automated Deposit
        :game_die: 5%
        `)
        .setColor("Blue")

      await interaction.editReply({ embeds: [embed], ephemeral: true })
    } else if (interaction.customId === "howto") {
      await interaction.deferReply({ ephemeral: true })

      const embed = new EmbedBuilder()
        .setTitle("How to play ticket arena")
        .setDescription(`
        **Game Instructions**
        Click the :shield: to play each round.

        Each round is 15 minutes long, be the last web3 crypto chad standing for a chance to win tickets.
  
        You can earn rewards each round! Rewards get automatically funded to your account on the site.

        **Auto-Join Rounds**
        Click "Auto-Join", confirm your purchase and you will automatically be entered in. If you choose to enter manually during your Auto-Join period, you will not effect the amount of times you auto joined.
        **Cost**
        ${autoJoinCosts} Tickets

        **Reward Pools**
        :moneybag: 2 Tickets
        :white_check_mark: Automated Deposit
        :game_die: 95%
  
        :moneybag: 5 Tickets
        :white_check_mark: Automated Deposit
        :game_die: 5%
        `)
        .setColor("Blue")

      await interaction.editReply({ embeds: [embed], ephemeral: true })
    } else if (interaction.customId === "auto-join") {
      await interaction.deferReply({ ephemeral: true })

      const database = getFirestore();
      const userProfile = database.collection('users');
      const userDoc = await userProfile.where('discordUserId', '==', interaction.user.id).get();
      let joined = [];
      if (!userDoc.empty) {
        const userData = userDoc.docs[0].data();
        if (userData.autoJoinCredits > 0) {
          joined = [{user: interaction.user.id, rounds: userData.autoJoinCredits}];
        }
      }
      const embed = new EmbedBuilder()
      const row = new ActionRowBuilder()

      if (joined.length === 1) {
        embed.setTitle("Auto-Join Status")
        embed.setDescription(`
        ✅ You are currently Auto-Joining rounds.
        `)
        embed.addFields({ name: "Status", value: `Enabled Auto-Join` })
        embed.addFields({ name: "Rounds", value: `${joined[0].rounds} auto-joins remaining` })
        embed.setColor("Blue")
        return await interaction.editReply({ embeds: [embed], ephemeral: true })
      } else {
        const confirm3 = new ButtonBuilder()
          .setCustomId('confirm-autojoin')
          .setLabel(`Confirm`)
          .setStyle(ButtonStyle.Success)

        row.addComponents(confirm3);

        embed.setTitle("Auto-Join Arenas")
        embed.setDescription(`
          Auto-Join will allow you to join **10 rounds** automatically.

          If you enter manually it will not effect the amount of times that you will automatically enter.

          Example: If you Auto-Join you will have 10 rounds that you will automatically join. If you enter manually once, you will still have 10 Auto-Joins enabled.
        `)
        embed.addFields({ name: "Cost", value: `🎟️ ${autoJoinCosts} Tickets` })
        embed.addFields({ name: "Rounds", value: `✅ 10 Rounds Auto-Join` })
        embed.setColor("Blue")
      }

      await interaction.editReply({ embeds: [embed], ephemeral: true, components: [row] })
    } else if (interaction.customId === "confirm-autojoin") {
      await interaction.deferReply({ ephemeral: true })
      const database = getFirestore();
      const userProfile = database.collection('users');
      const userDetails = await userProfile.where('discordUserId', '==', interaction.user.id).get();
      const embed = new EmbedBuilder()

      if (userDetails.docs.length > 0) {

        if (userDetails.docs[0].data().autoJoinCredits > 0) {
          embed.setTitle("Auto-Join Status")
          embed.setDescription(`
            You are currently Auto-Joining rounds. You have ${userDetails.docs[0].data().autoJoinCredits} rounds remaining.
          `)
          embed.setColor("Blue")
          return await interaction.editReply({ embeds: [embed], ephemeral: true })
        } else {
          let user = userDetails.docs[0].data();
            if (user.balance >= autoJoinCosts) {

              await userDetails.docs[0].ref.update({
                balance: FieldValue.increment(-Number(autoJoinCosts)),
                autoJoinCredits: 10,
                username: interaction.user.username,
                image: "https://cdn.discordapp.com/avatars/" + interaction.user.id + "/" + interaction.user.avatar + ".jpeg",
              });
              
        // Get updated auto-join count
        const autoJoinUsers = await userProfile.where('autoJoinCredits', '>', 0).get();
        const autoJoinCount = autoJoinUsers.size;

    // Update the button in the original message using lastMessageId
    try {
      const botV1 = client.channels.cache.get(channelId);
      if (!botV1) throw new Error('Channel not found');

      const originalMessage = await botV1.messages.fetch(lastMessageId);
      if (!originalMessage?.components?.[0]) {
        throw new Error('Original message or components not found');
      }

      const actionRow = ActionRowBuilder.from(originalMessage.components[0]);
      const components = actionRow.components;

      const updatedComponents = components.map(component => {
        if (component.data.custom_id === 'auto-join') {
          return ButtonBuilder.from(component)
            .setLabel(`Auto Join (${autoJoinCount})`);
        }
        return ButtonBuilder.from(component);
      });

      await originalMessage.edit({
        components: [new ActionRowBuilder().addComponents(updatedComponents)]
      });

    } catch (error) {
      console.error('Failed to update auto-join button:', error);
      // Continue with the response even if button update fails
    }

          embed.setTitle("Confirmed Auto-Joined")
              embed.setDescription(`
                  You have successfully auto-joined the Arena!
                `)
              embed.addFields({
                name: "Purchase costs",
                value: "🎟️ " + autoJoinCosts + " tickets"
              })
              embed.setColor("Blue")
              return await interaction.editReply({ embeds: [embed], ephemeral: true })
            } else {
              embed.setTitle("Balance Insufficient")
              embed.setDescription(`
                  You do not have any Tickets to spend. Either use /transfer or chat some more to gain more Tickets.
                `)
              embed.setColor("Blue")
              return await interaction.editReply({ embeds: [embed], ephemeral: true })
            }
          
        }
      }
    }
  } catch (err) {
    console.log(err)
  }
});

async function getStore() {
  try {
    const database = getFirestore();
    const storeRef = database.collection('items');
    const storeSnapshot = await storeRef.where('active', '==', true).get();
    
    if (storeSnapshot.empty) {
      console.log('No active items found in store');
      return [];
    }

    const items = [];
    storeSnapshot.forEach(doc => {
      const item = doc.data();
      items.push({
        id: doc.id,
        name: item.name,
        amount: item.amount,      // ticket cost
        supply: item.supply,      // total supply
        purchased: item.purchased || 0,  // default to 0 if not set
        description: item.description,
        image: item.image
      });
    });

    return items;
  } catch (error) {
    console.error('Error fetching store items:', error);
    return [];
  }
}

module.exports = {
  getStore,
};

// Function to check and end expired raffles
async function checkExpiredRaffles() {
  if (!ENABLE_RAFFLES) return; // Skip if feature disabled
  
  try {
    console.log('Checking for expired raffles...');
    const database = getFirestore();
    const rafflesCollection = database.collection('raffles');

    // Get all active raffles
    const activeRaffles = await rafflesCollection
      .where('active', '==', true)
      .get();

    if (activeRaffles.empty) {
      console.log('No active raffles to check.');
      return;
    }

    const now = new Date();

    for (const raffleDoc of activeRaffles.docs) {
      const raffleData = raffleDoc.data();
      const endTime = raffleData.endingDateTime.toDate();

      // Check if raffle has expired
      if (now >= endTime) {
        console.log(`Raffle ${raffleDoc.id} has expired. Ending...`);
        await endExpiredRaffle(raffleDoc.id, raffleData);
      }
    }
  } catch (error) {
    console.error('Error checking expired raffles:', error);
  }
}

// Function to end an expired raffle
async function endExpiredRaffle(raffleId, raffleData) {
  try {
    const database = getFirestore();
    const raffleDoc = database.collection('raffles').doc(raffleId);

    // Check if there are participants
    if (!raffleData.participants || raffleData.participants.length === 0) {
      // End raffle without winner
      await raffleDoc.update({
        active: false,
        endedAt: Timestamp.now(),
        endedBy: 'system',
        endReason: 'expired_no_participants'
      });

      console.log(`Raffle ${raffleId} ended with no participants.`);
      return;
    }

    // Pick random winner
    const winnerIndex = rando(0, raffleData.participants.length - 1);
    const winnerId = raffleData.participants[winnerIndex];

    // Update raffle with winner
    await raffleDoc.update({
      active: false,
      winnerUserID: winnerId,
      endedAt: Timestamp.now(),
      endedBy: 'system',
      endReason: 'expired_auto'
    });

    // Update the raffle message to show winner
    try {
      const raffleChannel = client.channels.cache.get(raffleData.channelId);
      if (raffleChannel) {
        const raffleMessage = await raffleChannel.messages.fetch(raffleData.messageId);
        if (raffleMessage) {
          const winnerEmbed = new EmbedBuilder()
            .setTitle('🎉 Raffle Ended!')
            .setDescription(`**${raffleData.title}**\n⏰`)
            .setColor('Gold')
            .addFields(
              { name: '🏆 Winner', value: `<@${winnerId}>`, inline: true },
              { name: '🎯 Prize', value: raffleData.prizeTitle, inline: true },
              { name: '👥 Total Entries', value: `${raffleData.ticketsSold}`, inline: true }
            )
            .setImage(raffleData.prizeImageUrl)
            .setFooter({ text: `Raffle ID: ${raffleId} | Congratulations!` })
            .setTimestamp();

          await raffleMessage.edit({ 
            embeds: [winnerEmbed], 
            components: [] // Remove button
          });

          // Send winner announcement
          await raffleChannel.send({
            content: `🎉 **RAFFLE WINNER** 🎉\n<@${winnerId}> has won **${raffleData.prizeTitle}**!\n\nCongratulations! 🎊`
          });
        }
      }
    } catch (error) {
      console.error('Failed to update raffle message:', error);
    }

    console.log(`Raffle ${raffleId} automatically ended. Winner: ${winnerId}`);

  } catch (error) {
    console.error(`Error ending expired raffle ${raffleId}:`, error);
  }
}

