import * as Message from './message.js';
import * as ForeignObject from './foreignObject.js';

const url = 'wss://localhost:8080'
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
var playerIdForForeigners = makeUuid();
var stars;
var platforms;
var cursors;
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
    this.load.image('sky', 'assets/sky.png');
    this.load.image('ground', 'assets/platform.png');
    this.load.image('star', 'assets/star.png');
    this.load.spritesheet('dude', 'assets/test_player.png', { frameWidth: 32, frameHeight: 48 });
}

function create ()
{
    //  A simple background for our game
    this.add.image(400, 200, 'sky');

    //  The platforms group contains the ground and the 2 ledges we can jump on
    platforms = this.physics.add.staticGroup();
    foreignObjectGroup = this.physics.add.group();
    //  Here we create the ground.
    //  Scale it to fit the width of the game (the original sprite is 400x32 in size)
    /*platforms.create(400, 568, 'ground').setScale(2).refreshBody();

    //  Now let's create some ledges
    platforms.create(600, 400, 'ground');
    platforms.create(50, 250, 'ground');
    platforms.create(750, 220, 'ground');*/

    // The player and its settings
    player = this.physics.add.sprite(100, 450, 'dude');

    //  Player physics properties. Give the little guy a slight bounce.
    player.setMass(100);
    player.setDrag(800, 800);
    player.setCollideWorldBounds(true);

    //  Our player animations, turning, walking left and walking right.
    /*this.anims.create({
        key: 'left',
        frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }),
        frameRate: 10,
        repeat: -1
    });

    this.anims.create({
        key: 'turn',
        frames: [ { key: 'dude', frame: 4 } ],
        frameRate: 20
    });

    this.anims.create({
        key: 'right',
        frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }),
        frameRate: 10,
        repeat: -1
    });*/

    //  Input Events
    cursors = this.input.keyboard.createCursorKeys();

    //  Some stars to collect, 12 in total, evenly spaced 70 pixels apart along the x axis
    stars = this.physics.add.group({
        key: 'star',
        repeat: 11,
        setXY: { x: 12, y: 0, stepX: 70 }
    });

    stars.children.iterate(function (child) {

        //  Give each star a slightly different bounce
        child.setBounceY(Phaser.Math.FloatBetween(0.4, 0.8));

    });


    //  The score
    scoreText = this.add.text(16, 16, 'score: 0', { fontSize: '32px', fill: '#000' });

    //  Collide the player and the stars with the platforms
    this.physics.add.collider(player, platforms);
    this.physics.add.collider(stars, platforms);

    //  Checks to see if the player overlaps with any of the stars, if he does call the collectStar function
    this.physics.add.overlap(player, stars, collectStar, null, this);

}

function update ()
{
    if (gameOver)
    {
        return;
    }

    if (cursors.left.isDown)
    {
        player.setVelocityX(-330);

        //player.anims.play('left', true);

    }
    else if (cursors.right.isDown)
    {
        player.setVelocityX(330);

        //player.anims.play('right', true);

    }
    else
    {
        //player.setVelocityX(0);

        //player.anims.play('turn');
    }

    if (cursors.up.isDown)
    {
        player.setVelocityY(-330);
    }
    else if (cursors.down.isDown) {
        player.setVelocityY(330);
    }
    rotatePlayer();
    sendStateUpdate();
    setForeignObjectPositions();
}

function setForeignObjectPositions() {

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

function collectStar (player, star)
{
    star.disableBody(true, true);

    //  Add and update the score
    score += 10;
    scoreText.setText('Score: ' + score);

    if (stars.countActive(true) === 0)
    {
        //  A new batch of stars to collect
        stars.children.iterate(function (child) {

            child.enableBody(true, child.x, 0, true, true);

        });

        var x = (player.x < 400) ? Phaser.Math.Between(400, 800) : Phaser.Math.Between(0, 400);

    }
}
