const express = require('express');
const app = express();
const fs = require('fs');
const path = require('path');
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const port = process.env.PORT || 8080;

const customLogger = require('utils/logger')
const loadSocketIO = require('./lib/socketio')

function serverStart(){
  app.use(express.static(path.join(__base, 'public')));
  loadSocketIO(io)
  server.listen(port, () => { 
    logger.info(logSystem, 'serverStart', `Server listening at port ${port}`)
  });
  
  process.on('message', function(message) {
    const { type, data } = message;
    switch(type){
      case 'messageSended':
        io.sockets.emit('mc_message', JSON.stringify(data));
      break
      case 'updatePlayers':
        const { players } = data;
        io.sockets.emit('updatePlayers', JSON.stringify(players));
      break
      case 'autoRebootUpdate':
        io.sockets.emit('updateAutoRebootState', JSON.stringify(data));
      break
      case 'controlRes':
        io.sockets.emit('controlRes', JSON.stringify(data));
      break
      case 'statusUpdate':
        io.sockets.emit('status', JSON.stringify(data));
      break
      default:
      break
    }
  })
}

module.exports = function(){
  global.logSystem = 'WEB'
  global.config = JSON.parse(process.env.config)
  global.logger = new customLogger(config.logger)

  serverStart()
}

