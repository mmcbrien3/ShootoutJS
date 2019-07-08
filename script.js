import * as Message from './message.js';
import * as ForeignObject from './foreignObject.js';

const url = 'ws://localhost:8080'
const connection = new WebSocket(url)

var myClientId;

var foreignObjects = {};
var foreignObjectGroup;

var config = {
    type: Phaser.AUTO,
    width: 800,
    height: 400,
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

var player;
var playerLight;
var playerIdForForeigners = makeUuid();
var bullets;
var platforms;
var cursors;
var spacebar;
var score = 0;
var gameOver = false;
var scoreText;

var game = new Phaser.Game(config);

connection.onopen = () => {
  connection.send('fistbump') 
}

connection.onerror = (error) => {
  console.log(`WebSocket error: ${error}`)
}

connection.onmessage = (e) => {
  	handleMessage(e);
}

function handleReceivedForeignObject(parsedMessage) {
	let curObject = parsedMessage;
	let curId = curObject.id;
	if (typeof foreignObjectGroup === 'undefined') {
		return;
	}
	if (! (foreignObjects.hasOwnProperty(curId))) {
		foreignObjects[curId] = foreignObjectGroup.create(curObject.pos.x, curObject.pos.y, curObject.foreignObjectType);
        if (curObject.foreignObjectType === ForeignObject.ForeignObjectTypes.FOREIGN_PLAYER) {
            foreignObjects[curId].setPipeline('Light2D');
        }
	} else {
		foreignObjects[curId].x = curObject.pos.x
		foreignObjects[curId].y = curObject.pos.y;
		foreignObjects[curId].setRotation(curObject.rotation)
	}
}

function handleMessage(message) {
	let parsedMessage = JSON.parse(message.data);
	let messageType = parsedMessage.type;
	if (messageType === Message.MessageEnum.HANDSHAKE_REPLY) {
		handleHandshakeReply(parsedMessage);
	} else if (messageType ===  Message.MessageEnum.OBJECT_FROM_SERVER) {
		handleReceivedForeignObject(parsedMessage);
	} else {
		console.log("WTF");
	}
}

function handleHandshakeReply(parsedMessage) {
	myClientId = parsedMessage.uuid;
	console.log("My uuid is " + myClientId);
}

function preload ()
{
    this.load.image('sky', ['assets/sky.png', 'assets/sky-n.png']);
    this.load.image('ground', 'assets/platform.png');
    this.load.image('star', 'assets/star.png');
    this.load.image('dude', ['assets/test_player.png', 'assets/test_player-n.png'], { frameWidth: 32, frameHeight: 48 });

}

function create ()
{
    this.add.image(400, 200, 'sky').setPipeline('Light2D');;


    foreignObjectGroup = this.physics.add.group();

    // The player and its settings
    player = this.physics.add
        .sprite(100, 450, 'dude')
        .setPipeline('Light2D');

    playerLight = this.lights.addLight(200, 200, 200).setIntensity(0.5);
    this.lights.enable().setAmbientColor(0x111111);

    //  Player physics properties. Give the little guy a slight bounce.
    player.setMass(100);
    player.setDrag(800, 800);
    player.setCollideWorldBounds(true);

    //  Input Events
    let spaceKey = [Phaser.SPACEBAR]
    cursors = this.input.keyboard.createCursorKeys();
    spacebar = this.input.keyboard.addKeys(spaceKey)

    scoreText = this.add.text(16, 16, 'score: 0', { fontSize: '32px', fill: '#000' });

    // Create the group using the group factory
    bullets = this.physics.add.group();

    bullets.createMultiple(10, 'star');
 
    bullets.call('events.onOutOfBounds.add', 'events.onOutOfBounds', resetBullet);
    // Same as above, set the anchor of every sprite to 0.5, 1.0
    bullets.call('anchor.setTo', 'anchor', 0.5, 1.0);
 
    // This will set 'checkWorldBounds' to true on all sprites in the group
    bullets.set('checkWorldBounds', true);

}

function update ()
{

    if (gameOver)
    {
        return;
    }

    if (cursors.left.isDown)
    {
        console.log(player.x);
    console.log(player.y);
        player.setVelocityX(-330);


    }
    else if (cursors.right.isDown)
    {
        console.log(player.x);
    console.log(player.y);
        player.setVelocityX(330);


    }

    if (cursors.up.isDown)
    {
        player.setVelocityY(-330);
    }
    else if (cursors.down.isDown) {
        player.setVelocityY(330);
    }

    for (var index in phaserKeys) {
        var key = phaserKeys[index];
        if (key.justDown) {
            fireBullet();
        }
    }
    updatePlayerLight()
    rotatePlayer();
    sendStateUpdate();
}

function resetBullet(bullet) {
    // Destroy the laser
    bullet.kill();
}

function fireBullet() {
    var bullet = lasers.getFirstExists(false);
    if (bullet) {
        let bulletVelocity = 500;
        // If we have a laser, set it to the starting position
        bullet.reset(player.x, player.y);
        // Give it a velocity of -500 so it starts shooting

        let bulletXVelocity = Math.cos(player.angle * Math.PI * 2 / 360) * bulletVelocity
        let bulletYVelocity = Math.sin(player.angle * Math.PI * 2 / 360) * bulletVelocity
        bullet.body.velocity.y = bulletYVelocity;
        bullet.body.velocity.x = bulletXVelocity;
    }
}

function updatePlayerLight(){
    playerLight.x = player.x;
    playerLight.y = player.y;

    let curIntensity = playerLight.intensity
    let maxIntensity = 1;
    let minIntensity = 0;
    let change = Math.random() * .2 - .1;
    let newIntensity = curIntensity + change;
    newIntensity = newIntensity > maxIntensity ? maxIntensity : newIntensity;
    newIntensity = newIntensity < minIntensity ? minIntensity : newIntensity;
    playerLight.setIntensity(newIntensity)
}

function sendStateUpdate() {
	let sendableObjects = getSendableObjects();
	let sendableMesssage = Message.Message.createJsonFromSendables(sendableObjects, myClientId);
	connection.send(sendableMesssage, myClientId);
}

function getSendableObjects() {
	return [{rotation: player.rotation, id: playerIdForForeigners, pos: {x: player.x, y: player.y}, foreignObjectType: ForeignObject.ForeignObjectTypes.FOREIGN_PLAYER}];
}

function makeUuid() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
		return v.toString(16);
	});
}

function rotatePlayer() {
	let mousePos = {x: game.input.mousePointer.x, y: game.input.mousePointer.y};
	let playerPos = {x: player.x, y: player.y};
	let angle = getAngleBetweenPositionsRadians(mousePos, playerPos);

	player.setRotation(angle);
}

function getAngleBetweenPositionsRadians(positionOne, positionTwo) {
	let epsilon = 0.000001;
	let opposite = positionOne.y - positionTwo.y;
	let adjacent = positionOne.x - positionTwo.x;
	opposite = opposite === 0 ? epsilon : opposite;
	adjacent = adjacent === 0 ? epsilon : adjacent;
	let sign = adjacent < 0 ? Math.PI : 0;
	return sign + Math.atan(opposite/adjacent);
}
