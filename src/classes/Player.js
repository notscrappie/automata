const { EventEmitter } = require('events');
const Queue = require('./Queue');
const Connection = require('./Voice');

class Player extends EventEmitter {
	constructor(automata, node, options) {
		super();
		this.automata = automata;
		this.queue = new Queue();
		this.node = node;
		this.connection = new Connection(this);
		this.guildId = options.guildId;
		this.voiceChannel = options.voiceChannel;
		this.textChannel = options.textChannel ?? null;
		this.selfDeafen = options.selfDeafen ?? true;
		this.selfMute = options.selfMute ?? false;
		this.volume = 100;
		this.isConnected = false;
		this.isPlaying = false;
		this.isPaused = false;
		this.loop = 'NONE';
		this.position = 0;
		this.ping = 0;
		this.currentTrack = null;
		this.previousTrack = null;

		this.on('event', (data) => this.lavalinkEvent(data).bind(this)());
		this.on('playerUpdate', ({ state: { connected, position, ping } }) => {
			this.isConnected = connected;
			this.position = position;
			this.ping = ping;
		});
		this.setVolume(this.volume);

		this.automata.emit('playerCreate', this);
	}

	/**
   * Sends a request to the server and plays the requested song.
   * @param {Object} options - The options object.
   */
	play(options = {}) {
		if (!this.queue.length) return;
		this.currentTrack = this.queue.shift();

		try {
			const { track } = this.currentTrack ?? {};
			if (!track) throw new TypeError('Invalid track.');
			this.isPlaying = true;
			this.position = 0;

			this.node.send({
				op: 'play',
				guildId: this.guildId,
				track,
				noReplace: options.noReplace ?? true,
			});

			return this;
		}
		catch (_e) {
			this.automata.emit('trackError', this, this.currentTrack, null);
		}
	}

	/**
   * Stops the player from playing.
   */
	stop() {
		this.node.send({
			op: 'stop',
			guildId: this.guildId,
		});
	}

	/**
   * Pauses the player.
   * @param {boolean} pause
   */
	pause(pause = true) {
		if (typeof pause !== 'boolean') throw new RangeError('pause must be a boolean.');

		this.node.send({
			op: 'pause',
			guildId: this.guildId,
			pause,
		});

		this.isPlaying = !pause;
		this.isPaused = pause;

		return this;
	}

	/**
   * Seeks the track.
   * @param {Number} position - The new position.
   */
	seekTo(position) {
		if (Number.isNaN(position)) throw new RangeError('\'position\' is not defined or not a number.');

		this.node.send({
			op: 'seek',
			guildId: this.guildId,
			position,
		});

		return this;
	}

	/**
   * Sets the volume of the player.
   * @param {Number} volume - The new volume of the player.
   */
	setVolume(volume) {
		volume = Number(volume);

		if (Number.isNaN(volume)) throw new RangeError('The provided volume number is not a number.');
		if (volume < 0 && volume > 100) throw new RangeError('Volume must be between 1-100.');

		this.volume = Math.max(Math.min(volume, 500), 0);
		const newVolume = this.volume;

		this.node.send({
			op: 'volume',
			guildId: this.guildId,
			volume: newVolume,
		});

		return this;
	}

	/**
   * Sets the current loop.
   * @param {String} mode
   */
	setLoop(mode) {
		const validModes = new Set(['NONE', 'TRACK', 'QUEUE']);
		if (!validModes.has(mode)) throw new TypeError('setLoop only accepts NONE, TRACK and QUEUE as arguments.');

		this.loop = mode;
		return this;
	}

	/**
   * Sets the text channel where event messages (trackStart, trackEnd etc.) will be sent.
   * @param {String} channel
   */
	setTextChannel(channel) {
		if (typeof channel !== 'string') throw new TypeError('\'channel\' is not a string or is undefined.');
		this.textChannel = channel;
		return this;
	}

	/**
   * Sets the text channel where event messages (trackStart, trackEnd etc.) will be sent.
   * @param {String} channel
   */
	setVoiceChannel(channel) {
		if (typeof channel !== 'string') throw new TypeError('\'channel\' is not a string or is undefined.');
		if (!this.isConnected) return;
		this.voiceChannel = channel;
		this.automata.sendData({
			op: 4,
			d: {
				guild_id: this.guildId,
				channel_id: this.voiceChannel,
				self_deaf: this.selfDeafen,
				self_mute: this.selfMute,
			},
		});
	}

	/**
	 * Connects the bot to the specified voice channel in the given guild.
	 */
	connect() {
		this.send({
			guild_id: this.guildId,
			channel_id: this.voiceChannel,
			self_deaf: this.selfDeafen,
			self_mute: this.selfMute,
		});

		this.isConnected = true;
	}

	/**
  * Reconnects to the current voice channel.
  */
	reconnect() {
		if (!this.voiceChannel) return this;

		this.send({
			guild_id: this.guildId,
			channel_id: this.voiceChannel,
			self_mute: this.selfMute,
			self_deaf: this.selfDeafen,
		});

		return this;
	}

	/**
  *  Disconnects from the current voice channel.
  */
	disconnect() {
		if (this.voiceChannel === null) return null;

		this.pause(true);
		this.isConnected = false;

		this.send({
			guild_id: this.guildId,
			channel_id: null,
			self_mute: this.selfMute,
			self_deaf: this.selfDeafen,
		});

		this.voiceChannel = null;
		return this;
	}

	/**
   * Destroys the player.
   */
	destroy() {
		this.disconnect();
		this.node.send({
			op: 'destroy',
			guildId: this.guildId,
		});

		this.automata.emit('playerDestroy', this);
		this.automata.players.delete(this.guildId);
	}

	/**
   * Restarts the current track.
   */
	restart() {
		if (!this.currentTrack) return;
		this.isPlaying = true;

		this.node.send({
			op: 'play',
			startTime: this.position,
			noReplace: true,
			guildId: this.guildId,
			track: this.currentTrack.track,
			pause: this.isPaused,
		});
	}

	/**
   * Sends the data to the Lavalink node.
   * @param {object} data - The data object that is being sent.
   */
	send(data) {
		this.automata.sendData({ op: 4, d: data });
	}

	lavalinkEvent(data) {
		const events = {
			TrackStartEvent: () => {
				this.isPlaying = true;
				this.isPaused = false;
				this.automata.emit('trackStart', this, this.currentTrack, data);
			},

			TrackEndEvent: () => {
				this.previousTrack = this.currentTrack;
				const playNext = true;
				let emitEvent = true;

				switch (this.loop) {
				case 'TRACK':
					this.queue.unshift(this.previousTrack);
					break;
				case 'QUEUE':
					this.queue.push(this.previousTrack);
					break;
				default:
					if (this.queue.length === 0) {
						this.isPlaying = false;
						this.automata.emit('queueEnd', this, this.track, data);
						emitEvent = false;
					}
					break;
				}

				if (emitEvent) this.automata.emit('trackEnd', this, this.currentTrack, data);
				if (playNext && this.queue.length > 0) return this.play();

				this.isPlaying = false;
			},

			TrackStuckEvent: () => {
				this.automata.emit('trackError', this, this.currentTrack, data);
				this.stop();
			},

			TrackExceptionEvent: () => {
				this.automata.emit('trackError', this, this.track, data);
				this.stop();
			},

			WebSocketClosedEvent: () => {
				if ([4015, 4009].includes(data.code)) {
					this.send({
						guild_id: data.guildId,
						channel_id: this.voiceChannel,
						self_mute: this.options.selfMute || false,
						self_deaf: this.options.selfDeaf || false,
					});
				}
				this.automata.emit('socketClosed', this, data);
			},

			default: () => {
				throw new Error(`An unknown event: ${data}`);
			},
		};

		return events[data.type] || events.default;
	}
}

module.exports = Player;