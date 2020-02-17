const request = require('request')
const cheerio = require('cheerio')

const asec = require('./asec')
const requests = require('./requests')

const statusCodes = ["Offline", "Online", "Queueing", "Loading", "Starting", "Countdown", "Stopping", "Saving"];
var status = 0
var autoReboot = true
// 0 - Offline, 1 - Online, 2 - Queueing, 3 - Loading, 4 - Starting, 5 - Countdown, 6 - Stopping, 6 - Saving
var players = []

function handleMessage({ type, message }){
  const msgData = JSON.parse(message)
  switch(type){
    case 'status':
      switch(msgData.status){
        case "1":
          if(msgData.class === "online"){
            onStatusUpdate(1)
            if(msgData.playerlist !== players) {
              players = msgData.playerlist
              process.send({type: 'WEBServer.updatePlayers', data: { players: players }})
            }
            if(msgData.players === "0" || msgData.countdown !== false){
              onStatusUpdate(5)
            }
          }
        break
        case "10":
          if(msgData.class === "queueing"){
            onStatusUpdate(2)
            if(msgData.pending === "ready"){
              requests.sendConfirm()
            }
          }
        break
        case "3":
          if(msgData.class === "loading"){
            onStatusUpdate(6)
          }
        break
        case "5":
          if(msgData.class === "loading"){
            onStatusUpdate(7)
          }
        break
        case "6":
          if(msgData.class === "loading"){
            onStatusUpdate(3)
          }
        break
        case "2":
          if(msgData.class === "loading starting"){
            onStatusUpdate(4)
          }
        break
        case "0":
          if (msgData.class === "offline"){
            onStatusUpdate(0)
            if (autoReboot) {
              requests.sendStart()
            }
          }
        break
        default:
          logger.warning(logSystem, 'Status', `DEBUG: ${JSON.stringify(msgData)}`)
        break
      }
    break
    case 'queue_reduced':
    break
    default:
    break
  }
}

function onStatusUpdate(newStatus){
  if(status !== newStatus) {
    logger.info(logSystem, 'Status', `Updating: ${getStatusString(status)} => ${getStatusString(newStatus)}`)
    status = newStatus
    process.send({type: 'MCClient.statusUpdate', data: { status: status }})
    process.send({type: 'WEBServer.statusUpdate', data: { status: status }})
  }
}

const getStatusString = (code) => statusCodes[code % statusCodes.length]
const setAutoReboot = (state) => {
  autoReboot = state
  process.send({type: 'WEBServer.autoRebootUpdate', data: { state: autoReboot }})
}

function getStatusGrabber(){
  const SEC = asec()
  request(`https://${config.MCClient.host}`, (err, res, body) => {
    if (err) return logger.error(logSystem, 'Grabber', `Status grabber error: ${JSON.stringify(err)}`)
    if (body) {
      const $ = cheerio.load(body)
      const statusString = $('.status-label').html()
      logger.debug(logSystem, 'Grabber', `Grabbed status: ${statusString}!`)
      switch(statusString){
        case 'Offline':
          onStatusUpdate(0)
        break
        case 'Online':
          onStatusUpdate(1)
        break
        default:
        break
      }
    }
  })
}

function loadWebSocket(connection) {
  logger.info(logSystem, 'loadWebSocket', `Aternos WebSocket Connected`)
  getStatusGrabber()
  connection.on('error', (error) => logger.error(logSystem, 'loadWebSocket', `Connection Error: ${error.toString()}`))
  connection.on('close', (error) => logger.error(logSystem, 'loadWebSocket', `Connection Closed: ${error.toString()}`))
  connection.on('message', function(message) {
    if (message.type === 'utf8') handleMessage(JSON.parse(message.utf8Data))
  })

  process.on('message', function(message) {
    const { type, data } = message;
    switch(type){
      case 'getPlayers':
        process.send({type: 'WEBServer.updatePlayers', data: { players: players }})
      break
      case 'mcStatusRequest':
        process.send({type: 'MCClient.statusResponse', data: { status: status }})
      break
      case 'webStatusRequest':
        process.send({type: 'WEBServer.statusUpdate', data: { status: status }})
      break
      case 'sendStart':
        requests.sendStart((status) => process.send({type: 'WEBServer.controlRes', data: { type: 'start', status: status }}))
      break
      case 'sendStop':
        requests.sendStop((status) => process.send({type: 'WEBServer.controlRes', data: { type: 'stop', status: status }}))
      break
      case 'sendRestart':
        requests.sendRestart((status) => process.send({type: 'WEBServer.controlRes', data: { type: 'restart', status: status }}))
      break
      case 'setAutoReboot':
        setAutoReboot(JSON.parse(data).state)
      break
      case 'getAutoReboot':
        process.send({type: 'WEBServer.autoRebootUpdate', data: { state: autoReboot }})
      break
      default:
      break
    }
  })
}

module.exports = loadWebSocket


