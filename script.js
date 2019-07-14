import * as Message from './message.js';
import * as ForeignObject from './foreignObject.js';

const url = 'ws://localhost:8080'
const connection = new WebSocket(url)

var myClientId;

var foreignObjects = {};
var foreignObjectGroup;

var totalWidth = 1024
var totalHeight = 1024
var cameraSize = {width: 512, height: 512}
var config = {
    type: Phaser.AUTO,
    width: cameraSize.width,
    height: cameraSize.height,
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
var lastFired = 0;
var player;
var camera
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
    this.add.image(512, 512, 'sky').setPipeline('Light2D');;
    this.physics.world.setBounds(0, 0, totalWidth, totalHeight)

    foreignObjectGroup = this.physics.add.group();

    // The player and its settings
    player = this.physics.add
        .sprite(0, 0, 'dude')
        .setPipeline('Light2D')
        .setAlpha(1);
    this.cameras.main.setViewport(player.x, player.y, cameraSize.width, cameraSize.height)
    this.cameras.main.startFollow(player)


    this.lights.enable().setAmbientColor(0x000000);
    playerLight = this.lights.addLight(0, 0, 200).setIntensity(1);
    let randomLight = this.lights.addLight(500, 500, 200).setIntensity(1)


    //  Player physics properties. Give the little guy a slight bounce.
    player.setMass(100);
    player.setDrag(800, 800);
    player.setCollideWorldBounds(true);

   

    //  Input Events
   cursors = this.input.keyboard.addKeys(
    	{up:Phaser.Input.Keyboard.KeyCodes.W,
		down:Phaser.Input.Keyboard.KeyCodes.S,
		left:Phaser.Input.Keyboard.KeyCodes.A,
		right:Phaser.Input.Keyboard.KeyCodes.D});

    scoreText = this.add.text(16, 16, 'score: 0', { fontSize: '32px', fill: '#000' });

    // Create the group using the group factory
    this.bullets = this.physics.add.group({
            defaultKey: 'star',
            maxSize: 10
        });
    //bullets.Call('events.onOutOfBounds.add', 'events.onOutOfBounds', resetBullet);
    // Same as above, set the anchor of every sprite to 0.5, 1.0
    //bullets.Call('anchor.setTo', 'anchor', 0.5, 1.0);
 
    // This will set 'checkWorldBounds' to true on all sprites in the group
    //bullets.Set('checkWorldBounds', true);

}

function update (time, delta)
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

    for (var index in spacebar) {
        var key = spacebar[index];
        if (Phaser.Input.Keyboard.JustDown(key)) {
            
        }
    }
    if (this.input.activePointer.isDown)
    {
        fireBullet(this.bullets, this.input.activePointer.x, this.input.activePointer.y, this.physics, time);
    }
    this.bullets.children.each(function(b) {
            if (b.active) {
                if (b.y < -50 || b.y > totalHeight + 50 || b.x < -50 || b.x > totalWidth + 50) {
                    b.setActive(false);
                }
            }
        }.bind(this));

    updatePlayerLight()
    //updateCamera()
    rotatePlayer();
    sendStateUpdate();
}

function resetBullet(bullet) {
    // Destroy the laser
    bullet.kill();
}

function updateCamera() {
	camera.setPosition(player.x, player.y)
}

function fireBullet(bullets, pointerX, pointerY, physics, time) {
	var bullet = bullets.get(player.x, player.y);
        if (bullet && time > lastFired + 50) {
        	let bulletVelocity = 300;
        	physics.moveTo(bullet, pointerX, pointerY, 300);
        	lastFired = time
        }
}

function updatePlayerLight(){
    playerLight.setPosition(player.x, player.y);

    let maxRadius = 400;
    let minRadius = 150;
    let curRadius = playerLight.radius;
    let change = 0;
    let multiplier = 100;
    if (player.body.speed != 0) {
    	change = -player.body.speed / multiplier;
    } else {
    	change = 1;
    }

    let newRadius = curRadius + change;
    newRadius = newRadius > maxRadius ? maxRadius : newRadius;
    newRadius = newRadius < minRadius ? minRadius : newRadius;
    playerLight.setRadius(newRadius)

    /*let curIntensity = playerLight.intensity
    let maxIntensity = 1;
    let minIntensity = .5;
    let change = Math.random() * .2 - .1;
    let newIntensity = curIntensity + change;
    newIntensity = newIntensity > maxIntensity ? maxIntensity : newIntensity;
    newIntensity = newIntensity < minIntensity ? minIntensity : newIntensity;
    playerLight.setIntensity(newIntensity)*/
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
