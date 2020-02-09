var express = require('express');
var app = express();
var fs = require('fs');
var path = require('path');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 8080;

const readline = require('readline')
const color = require('ansi-color').set
const mc = require('minecraft-protocol')
const states = mc.states
const mcClient = require('./lib/minecraftClient')

JSON.minify = JSON.minify || require('node-json-minify')
const config = JSON.parse(JSON.minify(fs.readFileSync(path.resolve('./config.json'), {encoding: 'utf8'})))

console.log(color('Connecting to ' + config.host + ':' + config.port, 'green'))
console.log(color('Username: ' + config.username, 'green'))

const client = mc.createClient({
  host: config.host,
  port: config.port,
  username: config.username,
  password: config.password === ""?undefined:config.password
})
const chats = []

client.on('connect', function () {
    console.info(color('Successfully connected to ' + config.host + ':' + config.port, 'green'))
})

client.on('disconnect', function (packet) {
  console.info(color('Disconnected: ' + packet.reason))
})

mcClient(client, chats, states, function(type, msg, style){
  style = style || 'white'
  switch(type){
    case 'log':
      console.log(color(msg, style))
    break;
    case 'info':
      console.info(color(msg, style))
    break;
    default:
      console.log(color(msg, style))
    break;
  }
  io.sockets.emit('mc_message', msg);
})

server.listen(port, () => {
  console.log(color('Server listening at port '+ port, 'green'));
});

// Routing
app.use(express.static(path.join(__dirname, 'public')));

// Chatroom

var numUsers = 0;

io.on('connection', (socket) => {
  var addedUser = false;

  // when the client emits 'new message', this listens and executes
  socket.on('new message', (line) => {
    if (line === '') {
      return
    // } else if (line === '/quit') {
    //   console.info('Disconnected from ' + config.host + ':' + config.port)
    //   client.end()
    //   return
    // } else if (line === '/end') {
    //   console.info('Forcibly ended client')
    //   process.exit(0)
    }
    if(socket.authorized){
      if (!client.write('chat', { message: line })) {
        chats.push(line)
      }
    } else return
  });

  // when the client emits 'add user', this listens and executes
  socket.on('login', (password) => {
    if(password !== config.webPass){
      socket.disconnect(true)
    } else {
      socket.authorized = true
      socket.emit('login', { username: config.username })
    }
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', () => {
    if (addedUser) {
      --numUsers;

      // echo globally that this client has left
      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });
});
