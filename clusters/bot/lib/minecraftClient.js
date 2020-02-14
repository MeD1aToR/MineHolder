const Entity = require('prismarine-entity')
const parseChat = require('./parseChat')
const welcome = require('./welcome')
const bye = require('./bye')

const ticksPerHour = 1000;
const ticksPerMinute = (1000 / 60);
const ticksPerSecond = (1000 / 360);

var players = {}
var uuidToUsername = {}
var entities = {}
var initial = true
var sayNight = false
var time = {
  day: null,
  age: null
}

const handler = (client, chats, states, callback) => {
  const botEntity = {
    username: config.MCClient.username,
    type: 'player'
  }
  var botPlayer = {}  

  client.on('kick_disconnect', (packet) => {
    callback('status', 'Kicked for ' + packet.reason, 'red')
  })

  client.on('end', () => {
    callback('status', 'Connection lost')
    process.exit()
  })

  client.on('error', (err) => {
    callback('status', 'Error occured')
    callback('status', err)
  })

  client.on('state', (newState) => {
    if (newState === states.PLAY && chats.length !== 0) {
      chats.forEach((chat) => {
        client.write('chat', { message: chat })
      })
      chats = []
    }
  })

  client.once('login', (packet) => {
    entity = fetchEntity(packet.entityId)
    entity.username = config.MCClient.username
    entity.type = 'player'
  })

  client.on('chat', (packet) => {
    const j = JSON.parse(packet.message)
    const chat = parseChat(j, {})
    if(chat.length) callback('message', chat)
  })

  client.on('named_entity_spawn', (packet) => {
    // in case player_info packet was not sent before named_entity_spawn : ignore named_entity_spawn (see #213)
    if (packet.playerUUID in uuidToUsername) {
      // spawn named entity
      const entity = fetchEntity(packet.entityId)
      entity.type = 'player'
      entity.username = uuidToUsername[packet.playerUUID]
      entity.uuid = packet.playerUUID
      entity.position.set(packet.x, packet.y, packet.z)
      if (!players[entity.username].entity) {
        players[entity.username].entity = entity
      }
    }
  })

  client.on('update_time', (packet) => {
    // for day we ignore the big number since it is always 0
    time.day = Math.abs(packet.time[1]) % 24000
    time.age = longToNumber(packet.age)
    if(time.day > 12999 && time.day < 13500 && !sayNight){
      sayNight = true
      onNight(formatTime24(time.day))
    }
    if(time.day > 13500 || time.day < 12999) sayNight = false
  })

  client.on('entity_metadata', (packet) => {
    const entity = fetchEntity(packet.entityId)
    if(packet.metadata instanceof Array){
      packet.metadata.forEach((elem) => {
        if(elem.type === 18 && elem.value === 2){ // Slepping
          client.write('chat', { message: `Спокойной ночи, ${entity.username}!` })
        }
      })
    }
  })

  client.on('player_info', (packet) => {
    packet.data.forEach((item) => {
      const playerEntity = findPlayers(item.name)
      let player = uuidToUsername[item.UUID] ? players[uuidToUsername[item.UUID]] : null
      if (packet.action === 0) {
        let newPlayer = false

        // New Player
        if (!player) {
          player = players[item.name] = {
            username: item.name,
            ping: item.ping,
            uuid: item.UUID,
            displayName: ""//new ChatMessage({ text: '', extra: [{ text: item.name }] })
          }

          uuidToUsername[item.UUID] = item.name
          if(!initial) onPlayerJoin(player)
          newPlayer = true
        } else {
          // Just an Update
          player.gamemode = item.gamemode
          player.ping = item.ping
        }

        player.entity = playerEntity
        if (playerEntity!== null && playerEntity.username === botEntity.username) { // Dirty fix
          if(Object.keys(botPlayer).length) {
            onWelcome(Object.keys(players))
            initial = false
          }
          botPlayer = player
        }

        if (!newPlayer) {
          // emit('playerUpdated', player)
        }

      } else if (player) {
        if (packet.action === 1) {
          player.gamemode = item.gamemode
        } else if (packet.action === 2) {
          player.ping = item.ping
        } else if (packet.action === 3 && !item.displayName) {
          // player.displayName = new ChatMessage({ text: '', extra: [{ text: player.username }] })
        } else if (packet.action === 3 && item.displayName) {
          // player.displayName = new ChatMessage(JSON.parse(item.displayName))
        } else if (packet.action === 4) {
          player.entity = null
          delete players[player.username]
          delete uuidToUsername[item.UUID]
          if(!initial) onPlayerLeft(player)
          return
        } else {
          return
        }

        // emit('playerUpdated', player)
      }
    })
  })

  function onNight(time){
    client.write('chat', { message: `Ребзя, время ${time}! Спать пора!` })
  }

  function onWelcome(players){
    client.write('chat', { message: `Ребзя, [ ${players.filter(name => name !== config.MCClient.username).join(', ')} ], приветствую! Я снова с вами ^_^` })
  }

  function onPlayerJoin({ username }){
    if (username === config.MCClient.username) return
    client.write('chat', { message: `${welcome[randomInteger(0, welcome.length-1)]}, ${username}! С возвращением!` })
  }

  function onPlayerLeft({ username }){
    if (username === config.MCClient.username) return
    client.write('chat', { message: `${bye[randomInteger(0, welcome.length-1)]}, ${username}!` })
  }

}

const findPlayers = (filter) => {
  const filterFn = (entity) => {
    if (entity.type !== 'player') return false
    if (filter === null) return true
    if (typeof filter === 'object' && filter instanceof RegExp) {
      return entity.username.search(filter) !== -1
    } else if (typeof filter === 'function') {
      return filter(entity)
    } else if (typeof filter === 'string') {
      return entity.username.toLowerCase() === filter.toLowerCase()
    }
    return false
  }
  const resultSet = Object.keys(entities)
    .map(key => entities[key])
    .filter(filterFn)

  if (typeof filter === 'string') {
    switch (resultSet.length) {
      case 0:
        return null
      case 1:
        return resultSet[0]
      default:
        return resultSet
    }
  }
  return resultSet
}

const fetchEntity = (id) => entities[id] || (entities[id] = new Entity(id))
const longToNumber = (arr) => arr[1] + 4294967296 * arr[0]
const randomInteger = (min, max) => Math.round(min - 0.5 + Math.random() * (max - min + 1))
const formatTime24 = (ticks) => {
  let hours = Math.floor(ticks / ticksPerHour)
  let minutes = Math.floor((ticks - hours * ticksPerHour) / ticksPerMinute)
  let seconds = Math.floor((ticks - (hours * ticksPerHour + minutes * ticksPerMinute)) / ticksPerSecond)
  if(hours < 10) hours = `0${hours}`
  if(minutes < 10) minutes = `0${minutes}`
  if(seconds < 10) seconds = `0${seconds}`
  return `${hours+6}:${minutes}:${seconds}`
}
module.exports=handler