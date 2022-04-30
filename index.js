const mineflayer = require('mineflayer')
const fs = require("fs");
const toolPlugin = require('mineflayer-tool').plugin
const autoeat = require('mineflayer-auto-eat')
 
if (process.argv.length < 4 || process.argv.length > 6) {
  console.log('Usage : node index.js <host> <port> [<name>] [<password>]')
  process.exit(1)
}

// #создание бота
const bot = mineflayer.createBot({
  host: process.argv[2],
  port: parseInt(process.argv[3]),
  username: process.argv[4] ? process.argv[4] : 'C',
  password: process.argv[5]
})

// объявление переменных, загрузка плагинов
const { pathfinder, Movements, goals: { GoalNear } } = require('mineflayer-pathfinder')
const vec3 = require('vec3')
const RANGE_GOAL = 1

let fileContent = fs.readFileSync("bot-data.txt", "utf8").split('\n')
let linesDigged = Number(fileContent[0])
let linesEnd = Number(fileContent[1])
let HomeX = Number(fileContent[2])
let HomeY = Number(fileContent[3])
let HomeZ = Number(fileContent[4])

let sway = Number(fileContent[5])
let shift = Number(fileContent[6])

let restorePoint = 0
let restore = []

var chesting = 0
var digging = 0
var offset = 0

bot.loadPlugin(pathfinder)
bot.loadPlugin(toolPlugin)
bot.loadPlugin(autoeat)

bot.on('login', () => {
  bot.autoEat.options = {
    priority: 'foodPoints',
    startAt: 14,
    bannedFood: []
  }
  const mcData = require('minecraft-data')(bot.version)
  const defaultMove = new Movements(bot, mcData)
  bot.pathfinder.setMovements(defaultMove)
  defaultMove.scafoldingBlocks = []
  defaultMove.allowParkour = false
})

bot.on('health', () => {
  console.log(`food ${bot.food}`)
  if (bot.food !== 20) {
    bot.autoEat.disable()
    bot.autoEat.enable()
  }
})

// парсинг чата 
bot.on('chat', async (username, message) => {
  if (username === bot.username) return
  command = message.split(' ')
  switch (command[0]) {
    case 'list':
      let items = bot.inventory.items()
      items = bot.inventory.items()
      function itemToString (item) {
        if (item) {
          return `${item.name} x ${item.count}`
        } else {
          return '(nothing)'
        }
      }

      const output = items.map(itemToString).join(', ')
      if (output) {
        bot.chat(output)
      } else {
        bot.chat('empty')
      }
      break
    case 'sway':
      if (command[1] == '-') { sway = 1 } else if (command[1] == '+') { sway = -1}
      save()
      break
    case 'shift':
      if (command[1] == '-') { shift = 1 } else if (command[1] == '+') { shift = -1}
      save()
      break
    case 'prepare':
      digging = 1
      digPrepare()
      break
    case 'lava':
      lavaExec()
      break
    case 'cleardigged':
      linesDigged = 0
      bot.chat('clear digged lines')
      save()
      break
    case 'dig':
      digging = 1
      offset = 0
      dig()
      linesDigged += 1
      break
    case 'stop':
      digging = 0
      bot.stopDigging()
      break
    case 'come':
      const target = bot.players[username]?.entity
      if (!target) {
        bot.chat("I don't see you !")
        break
      }
      const { x: playerX, y: playerY, z: playerZ } = target.position
      bot.pathfinder.setGoal(new GoalNear(playerX, playerY, playerZ, RANGE_GOAL))
      break
    case 'home':
      digging = 0
      bot.stopDigging()
      bot.pathfinder.goto(new GoalNear(HomeX, HomeY, HomeZ, 0))
      break
    case 'chest':
      watchChest(['chest'], 1, 1)
      break
    case 'sethome':
      HomeX = bot.entity.position.x.toFixed(1)
      HomeY = bot.entity.position.y.toFixed(1)
      HomeZ = bot.entity.position.z.toFixed(1)
      bot.chat(`set home to ${HomeX} ${HomeY} ${HomeZ}`)
      save()
      break
    case 'setlimit':
      linesEnd = Number(command[1])
      bot.chat(`end digging on ${linesEnd} lines`)
      save()
      break    
    case 'state':
      let out = ''
      out = ''
      if (restorePoint) { out += 'found restore points, do not turn off the bot, ' }
      out += `lines digged: ${linesDigged}/${linesEnd}, `
      if (sway == 1) { out += 'sway: -, ' } else { out += 'sway: +, ' }
      if (shift == 1) { out += 'shift: -, ' } else { out += 'shift: +, ' }
      if (digging) { out +=  'digging '} 
      if (bot.pathfinder.isMoving()) {out += 'now moving'} else { out += 'staying ' }
      if (chesting) { out += 'chesting '}
      bot.chat(out)
      break
    case 'save':
      save()
      break
    case 'exit': 
      save()
      digging = 0
      bot.stopDigging()
      bot.quit()
      process.exit(1)
    case 'm': 
      checkMobs()
      break
  }
})

// дополнение
function itemByName (items, name) {
  let item
  let i
  for (i = 0; i < items.length; ++i) {
    item = items[i]
    if (item && item.name === name) return item
  }
  return null
}

// дополнения к копанию
function lavaExec () {
  for (let nameing = 0; nameing<=1; nameing+=1) {
    for (let z = -1; z<=1; z+=1) {
      for (let x = -4; x<=0; x+=1) {
        for (let y = -1; y<=6; y+=1) {
          if ((y == -1 && bot.blockAt(bot.entity.position.offset(x*sway, y, z)).name === 'air') ||
          (bot.blockAt(bot.entity.position.offset(x*sway, y, z)).name === ['lava', 'water'][nameing])) {
            // console.log(`founded at XYZ: ${bot.entity.position.offset(x*sway, y, z)} ${z} name: ${['lava', 'water'][nameing]} `)
            bot.chat(`found water or lava`) 
            digging = 0
            home()
            return 'done'
          }
        }
      }
    }
  }
}

function isAir() {
  if (bot.blockAt(bot.entity.position.offset(-1*sway, 0, 0)).name === 'air' && 
      bot.blockAt(bot.entity.position.offset(-2*sway, 0, 0)).name === 'air' &&
      bot.blockAt(bot.entity.position.offset(-3*sway, 0, 0)).name === 'air' &&
      bot.blockAt(bot.entity.position.offset(-1*sway, 1, 0)).name === 'air' &&
      bot.blockAt(bot.entity.position.offset(-2*sway, 1, 0)).name === 'air' &&
      bot.blockAt(bot.entity.position.offset(-3*sway, 1, 0)).name === 'air' )
      { return 1 } else { if (offset === 3) {offset = 0 } }
}

function placeTorch() {
  let torch = bot.inventory.items().find((item) => (item.name === 'torch'))
  if (torch === undefined) {
    bot.chat('no torches')
    digging = 0

    restorePoint = 1
    restore = [bot.entity.position.x, bot.entity.position.y, bot.entity.position.z]
    
    home()
  }
  bot.equip(torch, 'hand', function () { bot.placeBlock(bot.blockAt(bot.entity.position.offset(0, 1, -1*sway)), new vec3(0, 0, 1*sway)) })
}

function digPrepare () {
  console.log(`preparing for digging line ${linesDigged+1}/${linesEnd} at Z: ${HomeZ - (3*linesDigged*shift)}`)
  digging = 1
  offset = 0
  if (linesDigged < linesEnd) {
    if (restorePoint === 0) {
      bot.pathfinder.goto(new GoalNear(HomeX, HomeY, HomeZ - (3*linesDigged*shift), 0), dig)
      if (bot.food !== 20) {
        bot.autoEat.disable()
        bot.autoEat.enable()
      }
      linesDigged += 1
    } else {
      console.log(`restore point founded at ${restore[0]} ${restore[1]} ${restore[2]}`)
      bot.pathfinder.goto(new GoalNear(restore[0], restore[1], restore[2], 0), dig)
      if (bot.food !== 20) {
        bot.autoEat.disable()
        bot.autoEat.enable()
      }
      restore = []
      restorePoint = 0
    }
  } else { bot.chat('all lines digged!'); save()}
}

function checkMobs () {
  const mobFilter = e => e.type === 'mob' && e.kind === 'Hostile mobs' && e.name !== 'enderman'
  const mob = bot.nearestEntity(mobFilter)

  if (!mob) return
  let distance
  distance = (Math.abs(Math.sqrt(Math.pow(mob.position.x - bot.entity.position.x, 2) + Math.pow(mob.position.y - bot.entity.position.y, 2) + Math.pow(mob.position.z - bot.entity.position.z, 2))))
  // console.log(`to nearest enemy ${distance}`)

 if (distance < 8) {
   bot.chat(`${mob.mobType} nearby`)
   console.log(`found ${mob.mobType} on ${mob.position}`)
   home()
 }
}

// основная функция копания
function dig () {
  lavaExec()
  checkMobs()
  
  let items = bot.inventory.items()
  items = bot.inventory.items()
  offset += 1

  for (i in items) {
    if (items[i]['name'] === 'diamond_pickaxe') {
      if (items[i]['nbt']['value']['Damage']['value'] >= 1540) {
        console.log('almost breaks a pickaxe')
        bot.stopDigging()
        digging = 0

        restorePoint = 1
        restore = [bot.entity.position.x, bot.entity.position.y, bot.entity.position.z]

        home()
        return 'done'
      }
    }
  }

  function digDone () {
    if (!digging) return
    if (offset === 3) {
      bot.pathfinder.goto(new GoalNear(bot.entity.position.x-(offset*sway), bot.entity.position.y , bot.entity.position.z, 0), placeTorch)
      offset = 0
      isAir()
      setTimeout(dig, 2000)
    } else {
      dig()
    }
  }

  // главный цикл копания
  bot.tool.equipForBlock(bot.blockAt(bot.entity.position.offset(-offset*sway, 4, 0)), {}, () => {
    if (digging) { bot.dig(bot.blockAt(bot.entity.position.offset(-offset*sway, 4, 0)), function () {
      bot.tool.equipForBlock(bot.blockAt(bot.entity.position.offset(-offset*sway, 3, 0)), {}, () => {
        if (digging) { bot.dig(bot.blockAt(bot.entity.position.offset(-offset*sway, 3, 0)), function () {
          bot.tool.equipForBlock(bot.blockAt(bot.entity.position.offset(-offset*sway, 2, 0)), {}, () => {
            if (digging) { bot.dig(bot.blockAt(bot.entity.position.offset(-offset*sway, 2, 0)), function () {
              bot.tool.equipForBlock(bot.blockAt(bot.entity.position.offset(-offset*sway, 1, 0)), {}, () => {
                if (digging) { bot.dig(bot.blockAt(bot.entity.position.offset(-offset*sway, 1, 0)), function () {
                  bot.tool.equipForBlock(bot.blockAt(bot.entity.position.offset(-offset*sway, 0, 0)), {}, () => {
                    if (digging) { bot.dig(bot.blockAt(bot.entity.position.offset(-offset*sway, 0, 0)), function () {
                      if (offset === 3 && digging) {
                        setTimeout(digDone, 1000)
                      } else { digDone() }
                    }) }
                  })
                }) }
              })
            }) }
          })
        }) }
      })
    }) }
  })
}

// все с сундуками
async function watchChest (blocks = [], special = 0, justStore=0) {
  const mcData = require('minecraft-data')(bot.version)
  chesting = 1
  let chestToOpen
  chestToOpen = bot.findBlock({
    matching: blocks.map(name => mcData.blocksByName[name].id),
    maxDistance: 8
  })
  if (!chestToOpen) {
    bot.chat('no chest found')
    return
  }
  const chest = await bot.openChest(chestToOpen)

  function closeChest () {
    chest.close()
  }

  async function withdrawItem (name, amount) {
    const item = itemByName(chest.containerItems(), name)
    if (item) {
      try {
        await chest.withdraw(item.type, null, amount)
        console.log(`withdrew ${amount} ${item.name}`)
        return 1
      } catch (err) {
        // console.log(`unable to withdraw ${amount} ${item.name}`)
        return 0
      }
    }
  }

  async function depositItem (name, amount) {
    const item = itemByName(chest.items(), name)
    if (item) {
      try {
        await chest.deposit(item.type, null, amount)
        console.log(`deposited ${amount} ${item.name}`)
      } catch (err) {
        // console.log(`unable to deposit ${amount} ${item.name}`)
      }
    } else {
      // console.log(`unknown item ${name}`)
      chest.close()
    }
  }
  
  let items = bot.inventory.items()
  items = bot.inventory.items()

  if (special === 1) {
    function freeItems () {
      let out = 0
      for (i in items) {
        if (items[i]['name'] === 'diamond_pickaxe') {
          if (items[i]['nbt']['value']['Damage']['value'] >= 1540) {
            out -= 1
          }
        }
        
        // тут менять для полного листа исключений
        if (items[i]['name'] === 'torch' || items[i]['name'] === 'diamond_pickaxe' || items[i]['name'] === 'diamond_shovel' || 
        items[i]['name'] === 'cooked_beef') {
          out += 1
        }
      }
      return out
    }

    if (freeItems() === items.length) { closeChest(); watchChest(['trapped_chest'], 2, justStore)
    } else { chestStore() }
  }
  if (special === 2) {
    chestGet()
  }
  // складываем лишние вещи
  function chestStore() {
    for (i in items) {
      if (items[i]['name'] === 'diamond_pickaxe') {
        if (items[i]['nbt']['value']['Damage']['value'] >= 1540) {
          console.log(items[i]['nbt']['value']['Damage']['value'] >= 1540)
          depositItem(items[i]['name'], items[i]['count'])
          break
        }
      }

      // тут менять для полного листа исключений
      if (items[i]['name'] !== 'torch' && items[i]['name'] !== 'diamond_pickaxe' && items[i]['name'] !== 'diamond_shovel' && 
      items[i]['name'] !== 'cooked_beef') {
        depositItem(items[i]['name'], items[i]['count'])
        break
      }
    }

    watchChest(['chest'], 1, justStore)
  }

  // забираем нужные вещи
  async function chestGet() {
    function countItem(item) {
      let out = 0
      let items = bot.inventory.items()
      for (i in items) {
        if (items[i]['name'] === item) {
          out += items[i]['count']
        }
      }
      return out
    }

    let t = 1
    let p = 1
    let s = 1
    if (countItem('torch') < 128) {
      t = await withdrawItem('torch', 64)
    }
    if (countItem('diamond_pickaxe') < 1) {
      p = await withdrawItem('diamond_pickaxe', 1)
    }
    if (countItem('diamond_shovel') < 1) {
      s = await withdrawItem('diamond_shovel', 1)
    }
    if (countItem('cooked_beef') < 8) {
      await withdrawItem('cooked_beef', 32)
    }

    // я знаю, что код = спагетти, tps тут это экзек для наличия вещей в сундуке, отстаньте от меня
    if (!t || !p || !s) {
      bot.chat('no restore items, ending work')
      save()
      closeChest()
      chesting = 0
      return 'done'
    }

    closeChest()
    if (!justStore) { digPrepare() }
    chesting = 0
    return 'done'
  }
}

// home
function home () {
  bot.stopDigging()
  digging = 0
  if (bot.food !== 20) {
    bot.autoEat.disable()
    bot.autoEat.enable()
  }
  bot.pathfinder.goto(new GoalNear(HomeX, HomeY, HomeZ, 0), function () { setTimeout(watchChest, 1000, ['chest'], 1) })
}

// save
function save () {
  if (bot.food === 20) bot.autoEat.disable()
  else bot.autoEat.enable()
  fs.writeFileSync("bot-data.txt", linesDigged + '\n' + linesEnd + '\n' + HomeX + '\n' + HomeY + '\n' + HomeZ + '\n' + sway + '\n' + shift )
  bot.chat('data saved')
}

bot.on('error', (err) => {
  console.log(`err: ${err}`)
})
