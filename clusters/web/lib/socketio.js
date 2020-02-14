function handleMessage(line){
  if (line === '') {
    return
  if (line[0] === '/')
    return
  // } else if (line === '/quit') {
  //   console.info('Disconnected from ' + config.host + ':' + config.port)
  //   client.end()
  //   return
  // } else if (line === '/end') {
  //   console.info('Forcibly ended client')
  //   process.exit(0)
  }
  process.send({type: 'MCClient.messageSend', data: { line: line }})
}

function loadSocketIO(io){
  const passwd = process.env.PASSWD || config.WebServer.accessPassword
  io.on('connection', (socket) => {
    const address = socket.request.connection.remoteAddress
    logger.debug(logSystem, 'Socket.IO', `User connected IP: ${address}`)
    socket.on('new message', (line) => {
      if(socket.authorized){
        handleMessage(line)
      } else return
    });

    socket.on('login', (password) => {
      if(password !== passwd){
        logger.warning(logSystem, 'Socket.IO', `User IP: ${address} Wrong password! Denied!`)
        socket.disconnect(true)
      } else {
        socket.authorized = true
        logger.debug(logSystem, 'Socket.IO', `User IP: ${address} Success authenticate!`)
        socket.emit('login', { username: config.MCClient.username })
        process.send({type: 'Aternos.getPlayers', data: {} })
        
      }
    });

    // when the user disconnects.. perform this
    socket.on('disconnect', () => {
      logger.debug(logSystem, 'Socket.IO', `User connected IP: ${address}`)
    });
  });
}

module.exports = loadSocketIO
