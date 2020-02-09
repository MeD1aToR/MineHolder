const parseChat = require('./parseChat')

const handler = function(client, chats, states, callback){
  client.on('kick_disconnect', function (packet) {
    callback('info', 'Kicked for ' + packet.reason, 'red')
    process.exit(1)
  })

  client.on('end', function () {
    callback('log', 'Connection lost')
    process.exit()
  })

  client.on('error', function (err) {
    callback('log', 'Error occured')
    callback('log', err)
    process.exit(1)
  })

  client.on('state', function (newState) {
    if (newState === states.PLAY) {
      chats.forEach(function (chat) {
        client.write('chat', { message: chat })
      })
    }
  })

  client.on('chat', function (packet) {
    const j = JSON.parse(packet.message)
    const chat = parseChat(j, {})
    callback('info', chat)
  })
}

module.exports=handler