
export const MessageEnum = {
		HANDSHAKE_HELLO: 1,
		HANDSHAKE_REPLY: 2,
		OBJECTS_FROM_CLIENT: 3,
		OBJECT_FROM_SERVER: 4
	};

export class Message {

	constructor(message) {
		

	}

	static createJsonFromForeignObject(foreignObject) {
		let id = foreignObject.id;
		let position = foreignObject.pos;
		let typ = foreignObject.type;
		let cliId = foreignObject.clientId;
		let rot = foreignObject.rotation;
		let m = {type: MessageEnum.OBJECT_FROM_SERVER, clientId: cliId, id: id, pos: position, foreignObjectType: typ, rotation: rot};
		return JSON.stringify(m);
	}

	static createJsonFromSendables(sendables, cliId) {
		let j = {type: MessageEnum.OBJECTS_FROM_CLIENT, objects: []}

		for (let i = 0; i < sendables.length; i ++) {
			j.objects.push({clientId: cliId, id: sendables[i].id, pos: sendables[i].pos, rotation: sendables[i].rotation, type: sendables[i].foreignObjectType});
		}
		return JSON.stringify(j);
	}

}