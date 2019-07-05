

export const ForeignObjectTypes = {
		FOREIGN_PLAYER: 'dude'
	};
export class ForeignObject {
	
	constructor(clientId, id) {
		this.clientId = clientId;
		this.id = id;
		this.position = {x: 0, y: 0};
		this.rotation = 0;
		this.type = null;
	}

	setPosition(x, y) {
		this.position.x = x;
		this.position.y = y;
	}

	setPosition(position) {
		this.position = position;
	}

	setType(type) {
		this.type = type;
	}

	setRotation(roto) {
		this.rotation = roto;
	}
}