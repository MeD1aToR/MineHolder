const color = require('ansi-color').set
const mc = require('minecraft-protocol')
const states = mc.states

const customLogger = require('utils/logger')
const mcClient = require('./lib/minecraftClient')

function mcClientStart(){
  const logComponent = 'MCClient'
  logger.debug(logSystem, logComponent, `Connecting to ${config.MCClient.host}:${config.MCClient.port}`)
  logger.debug(logSystem, logComponent, `Username: ${config.MCClient.username}`)
  const client = mc.createClient({
    host: config.MCClient.host,
    port: config.MCClient.port,
    username: config.MCClient.username,
    password: config.MCClient.password === ""?undefined:config.MCClient.password
  })
  const chats = []

  client.on('connect', function () {
    logger.debug(logSystem, logComponent, `Successfully connected to ${config.MCClient.host}:${config.MCClient.port}`)
  })

  client.on('disconnect', function (packet) {
    logger.warning(logSystem, logComponent, `Disconnected: ${packet.reason}`)
  })

  if (!client.wait_connect) next()
  else client.once('connect_allowed', next)

  function next(){
    mcClient(client, chats, states, function(type, msg, style){
      style = style || 'white'
      switch(type){
        case 'log':
          logger.debug(logSystem, logComponent, `[ Log ]: ${msg}`)
        break;
        case 'status':
          logger.debug(logSystem, logComponent, `[ Status ]: ${msg}`)
        break;
        case 'message':
          logger.debug(logSystem, logComponent, `[ Chat ]: ${msg}`)
          process.send({type: 'WEBServer.messageSended', data: { line: msg }})
        break;
        default:
          logger.debug(logSystem, logComponent, `<Undefined>: ${msg}`)
        break;
      }
    })
  }

  process.on('message', function(message) {
    const { type, data } = message;
    switch(type){
      case 'messageSend':
        const { line } = data;
        if (!client.write('chat', { message: line })) {
          chats.push(line)
        }
        break
      default:
        break
    }
  })

}

module.exports = function(){
  global.logSystem = 'MCClient'
  global.config = JSON.parse(process.env.config)
  global.logger = new customLogger(config.logger)

  mcClientStart()
}