import { AutomataOptions } from '../Interfaces/ManagerInterfaces';
import { NodeOptions } from './Utils';

/**
 * Validates the options provided to the Node class.
 * @param options The node options.
 * @param secondaryOptions The manager's options.
 */
export function validateOptions(options: NodeOptions, secondaryOptions: AutomataOptions) {
	if (!options) throw new TypeError('Automata Error · NodeOptions must not be empty.');

	if (
		typeof options.host !== 'string' ||
      !/.+/.test(options.host)
	)
		throw new TypeError('Automata Error · Node option "host" must be present and be a non-empty string.');

	if (typeof options.port !== 'number')
		throw new TypeError('Automata Error · Node option "port" must be a number.');

	if ((typeof options.password !== 'string' ||
      !/.+/.test(options.password))
	)
		throw new TypeError('Automata Error · Node option "password" must be a non-empty string.');

	if (typeof options.secure !== 'boolean')
		throw new TypeError('Automata Error · Node option "secure" must be a boolean.');

	if (typeof options.name !== 'string')
		throw new TypeError('Automata Error · Node option "name" must be a non-empty string.');

	if (typeof secondaryOptions.resumeStatus !== 'boolean')
		throw new TypeError('Automata Error · Manager option "resumeStatus" must be a boolean.');

	if (typeof secondaryOptions.resumeTimeout !== 'number')
		throw new TypeError('Automata Error · Manager option "resumeTimeout" must be a number.');

	if (typeof secondaryOptions.reconnectTimeout !== 'number')
		throw new TypeError('Automata Error · Manager option "reconnectTimeout" must be a number.');

	if (typeof secondaryOptions.reconnectTries !== 'number')
		throw new TypeError('Automata Error · Manager option "reconnectTries" must be a number.');
}