const WebSocket = require('ws')

const wss = new WebSocket.Server({ port: 8080 })
var Message = require('./message.js');
var ForeignObject = require('./foreignObject.js');

var clientUuids = [];
var foreignObjects = {};
var wsGlobal;
var allWs = [];
setInterval(sendUpdatesToPlayers, 1000/240);

wss.on('connection', (ws) => {
  console.log("new connection");
  allWs.push(ws);
  ws.on('message', (message) => {
    console.log(message);
    
    console.log("received message"); 
    if (message === 'fistbump') {
      let newPlayerId = makeUuid();
      ws.send("{\"type\": "+Message.MessageEnum.HANDSHAKE_REPLY+", \"uuid\": \""+newPlayerId+"\"}")
      clientUuids.push(newPlayerId)
      return;
    } 
    let parsedMessage = JSON.parse(message);
    if (parsedMessage.type === Message.MessageEnum.OBJECTS_FROM_CLIENT) {
      let objects = parsedMessage.objects;
      for (let i = 0; i < objects.length; i++) {
        let curObject = objects[i];
        let curId = curObject.id;
        if (! (foreignObjects.hasOwnProperty(curId))) {
          foreignObjects[curId] = new ForeignObject.ForeignObject(curObject.clientId, curId);
          foreignObjects[curId].pos = {x: curObject.pos.x, y: curObject.pos.y};
          foreignObjects[curId].type = curObject.type;
        } else {
          foreignObjects[curId].pos = {x: curObject.pos.x, y: curObject.pos.y};
          foreignObjects[curId].rotation = curObject.rotation;
        }
      }
    }
  })
  
})


function makeUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function sendUpdatesToPlayers() {
  for(let w = 0; w < allWs.length; w++) {
      for (let key in foreignObjects) {
        if (clientUuids[w] !== foreignObjects[key].clientId) {
          let sendableMessage = Message.Message.createJsonFromForeignObject(foreignObjects[key]);
          allWs[w].send(sendableMessage); 
        }
      }
    }
  }








