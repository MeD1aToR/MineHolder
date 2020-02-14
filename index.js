const cluster = require('cluster')
const fs = require('fs')
const path = require('path')
const MCClient = require('clusters/bot')
const WEBServer = require('clusters/web')

global.__base = path.resolve(process.cwd(), process.env.NODE_PATH);
JSON.minify = JSON.minify || require('node-json-minify')

var config = JSON.parse(JSON.minify(fs.readFileSync(path.resolve(__base, 'config.json'), {encoding: 'utf8'})))

if(cluster.isWorker){
  switch(process.env.workerType){
    case 'MCClient':
      new MCClient()
      break        
    case 'WEBServer':
      new WEBServer()
      break
    default:
      break
  }
}

function handleMessage(message) {
  let isClusterExists = false
    Object.keys(cluster.workers).forEach(function(id) {
        if(cluster.workers[id].type === message.type.split('.')[0]){
          isClusterExists = true
            cluster.workers[id].send({type: message.type.split('.')[1], data: message.data})
        }
    });
    if(!isClusterExists){
        console.error(
            new Date().toUTCString(), 
            '[MAIN]', 
            'handleMessage', 
            'Unknown cluster: '+message.type.split('.')[0]
        )
    }
}

function spawnMCClient(){
  startMCClient()
}

function startMCClient(){
    let worker = cluster.fork({
        workerType: 'MCClient',
        config: JSON.stringify(config)
    })
    worker.type = 'MCClient'
    worker.on('message', function(msg) {
        handleMessage(msg)
    }).on('exit', function(code, signal){
        console.error(
            new Date().toUTCString(), 
            '[MAIN]', 
            'MCClient', 
            'Process process died, spawning replacement...'
        )
        setTimeout(function(){
            startMCClient()
        }, 30000)
    })
}

function spawnWEBServer(){
    startWEBServer()
}

function startWEBServer(){
    let worker = cluster.fork({
        workerType: 'WEBServer',
        config: JSON.stringify(config)
    })
    worker.type = 'WEBServer'
    worker.on('message', function(msg) {
        handleMessage(msg)
    }).on('exit', function(code, signal){
        console.error(
            new Date().toUTCString(), 
            '[MAIN]', 
            'WEBServer', 
            'Process process died, spawning replacement...'
        )
        setTimeout(function(){
            startWEBServer(num)
        }, 2000)
    })
}

if(cluster.isMaster){
  spawnMCClient()
  spawnWEBServer()
}
