# mineflyaer-digger-bot  
  
| 🇺🇸 [English](./README.md) | 🇷🇺 [Russian](./README_RU.md)|
|-------------------------|----------------------------|  
  
## Preparing  
To work, install `node.js` from the official [website](https://nodejs.org/en/), then, `in the bot folder`, write the following commands in the console  
  
`npm init`  
`npm install mineflayer`  
`npm install mineflayer-pathfinder`  
`npm install mineflayer-auto-eat`  
`npm install mineflayer-tool`  
    
To start the bot  
node \<file name> \<host> \<port> \[bot name] \[password]  
Example: `node index.js localhost 23523 Catalyst`  
  
If you do everything correctly, the bot will appear on the server  

### Base Arrangement  
To get started, you will need to create a bot base, placing there the chests according to the plan  
  
```
. . b . . |   > Z- > | s h i f t  
# . . . # | ^        | w  
# c . c # | X-       | a  
# c . c # | ^        | y  
  ^   ^  
  ^   - chest  
  ^ - - trap chest  
```  
  
In the chest trap put diamond picks, shovels, torches and steaks, then set the base of the bot by `sethome`, the house point will be set where the bot itself stands. After set the number of lines to dig command `setlimit <limit>` and to run the bot give the command `prepare`.  
  
Guide (ru) (https://youtu.be/qK-4PuNM7mI)

## Chat commands:
  
### Inventory  
list --> display the contents of the inventory in the console    
  
### Digging  
cleardigged --> resets the number of lines dug  
dig --> start bot digging  
stop --> call pause for digging  
  
### Positioning  
come --> call the bot to you  
sethome --> set bot's base / warehouse coordinates  
setlimit <limit> --> sets parallel tunnel limit  

### Dig settings  
sway <-/+> --> X axis, change of digging direction  
shift <-/+> --> Z axis, change tunnel shift direction  

### Date  
state --> show bot's state  
save --> save parameters  
exit --> exit with save   
  
### Debugging  
prepare --> preparation for digging, the bot will come to the place of the line it should dig [debug]  
lava --> force check on nearby lava / water / air [debug]  
home --> send bot home [debug]  
chest --> put extra stuff in chest, get new stuff [debug]  
  
bot-data.txt save view:  
```
35 // lines dug  
40 // maximum number of lines  
-737.5 // home X  
8 //home Y  
-68.5 //home Z  
1 // sway  
1 // shift  
```
