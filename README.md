<p align="center">
  <img src="https://i.imgur.com/GTPBh5x.png" />
</p>

<div align="center"> 
  <img src="https://deepsource.io/gh/shadowrunners/Automata.svg/?label=active+issues&show_trend=true&token=lWLKFmoDqIp0GpfoY2sCAJS2"/>
</div>

## What's this and how is it different from Poru?

Automata is a fork of the Poru lavalink client developed and maintained by [parasop](https://github.com/parasop). This fork contains tweaks to certain functions and modified functionality such as the de-coupling from YouTube entirely with this fork only being able to play audio from platforms such as Deezer, SoundCloud, Spotify etc and some performance related optimizations.

The old v1 branch is based on Poru 3.7.2. This branch is based on Poru v4 with full support for Lavalink's new REST API.

## Installation

```
npm install @shadowrunners/automata
```

## Example
Below is a snippet of how to use the library. If you want a full bot example, check out Evelyn's music folder.

```javascript
const { Client, GatewayIntentBits } = require("discord.js");
const { Manager } = require("@shadowrunners/automata");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.manager = new Manager(
  client,
  {
    name: "main_node",
    host: "localhost",
    port: 8080,
    password: "iloveyou3000",
  },
  {
    reconnectTime: 2000,
    resumeStatus: true,
    resumeTimeout: 60,
    defaultPlatform: "dzsearch",
  }
);

client.manager.on("trackStart", (player, track) => {
  const channel = client.channels.cache.get(player.textChannel);
  return channel.send(`Now playing \`${track.title}\``);
});

client.on("ready", () => {
  console.log("Ready!");
  client.manager.init(client);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { options, member, guild, channelId } = interaction;

  await interaction.deferReply();

  if (!member.voice.channel) return interaction.editReply({ embeds: [embed.setDescription('🔹 | You need to be in a voice channel to use this command.')] });

  const query = options.getString("query");
  const res = await client.manager.resolve({ query, requester: member });

  const player = client.manager.create({
    guildId: guild.id,
    voiceChannel: member.voice.channelId,
    textChannel: channelId,
    deaf: true,
  });

  switch (res.loadType) {
    case 'error': return interaction.editReply({ content: "Failed to load track." });
    case 'empty': return interaction.editReply({ content: "No results found." });
    case 'playlist': {
      for (const track of res.tracks) player.queue.add(track);

      interaction.editReply({ content: `${res.playlist.name} has been loaded with ${res.playlsit.tracks.length}` });
    case 'search':
    case 'track':
      player.queue.add(res.tracks[0]);
      if (!player.isPlaying && player.isConnected) player.play();
      interacton.editReply(`Enqueued track: \n \`${track.title}\``);
    default:
      break;
  }
});

client.login('wee woo discord token goes here');
```

## Documentation
You can check out the documentation for this fork [here](https://automata.js.org).

## Credits

Full credit goes to [parasop](https://github.com/parasop) for creating Poru.
