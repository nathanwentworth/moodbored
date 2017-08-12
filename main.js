const electron = require('electron')
// Module to control application life.
const app = electron.app
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow

const path = require('path')
const url = require('url')
const teenyconf = require('./js/main/config.js');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow () {
  // Create the browser window.
  let windowWidth = (teenyconf.get('width') != null) ? teenyconf.get('width') : 1024;
  let windowHeight = (teenyconf.get('height') != null) ? teenyconf.get('height') : 768;
  let windowX = teenyconf.get('posX');
  let windowY = teenyconf.get('posY');
  teenyconf.saveSync();

  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    backgroundColor: '#fbfbfb',
    icon: path.join(__dirname, '/icon/icon.png'),
    minWidth: 600,
    minHeight: 460
  })

  if (windowX != null && windowY != null) {
    mainWindow.setPosition(windowX, windowY);
  }

  // and load the index.html of the app.
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, '/index.html'),
    protocol: 'file:',
    slashes: true
  }))

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  mainWindow.on('close', function () {
    let width = mainWindow.getSize()[0];
    let height = mainWindow.getSize()[1];

    let x = mainWindow.getPosition()[0];
    let y = mainWindow.getPosition()[1];

    teenyconf.set('width', width);
    teenyconf.set('height', height);
    teenyconf.set('posX', x);
    teenyconf.set('posY', y);
    teenyconf.saveSync();
  })


  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })

  Menu.setApplicationMenu(menu);
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
})

const { Menu } = require('electron')

const template = [
  {
    label: 'File',
    submenu: [
      {
        label: 'New Window',
        accelerator: 'CommandOrControl+N',
        click() {
          if (mainWindow === null) {
            createWindow();
          }
        }
      }
    ]
  },
  {
    label: 'Edit',
    submenu: [
      {role: 'undo'},
      {role: 'redo'},
      {type: 'separator'},
      {role: 'cut'},
      {role: 'copy'},
      {role: 'paste'},
      {role: 'pasteandmatchstyle'},
      {role: 'delete'},
      {role: 'selectall'}
    ]
  },
  {
    label: 'View',
    submenu: [
      {role: 'reload'},
      {role: 'forcereload'},
      {role: 'toggledevtools'},
      {type: 'separator'},
      {role: 'resetzoom'},
      {role: 'zoomin'},
      {role: 'zoomout'},
      {type: 'separator'},
      {role: 'togglefullscreen'}
    ]
  },
  {
    role: 'window',
    submenu: [
      {role: 'minimize'},
      {role: 'close'}
    ]
  },
  {
    role: 'help',
    submenu: [
      {
        label: 'Learn More',
        click () { electron.shell.openExternal('https://github.com/nathanwentworth/moodbored') }
      },
      {
        label: 'Submit an Issue',
        click () { electron.shell.openExternal('https://github.com/nathanwentworth/moodbored/issues') }
      },
      {
        label: 'Get Support',
        click () { electron.shell.openExternal('https://twitter.com/nathanwentworth/') }
      }
    ]
  }
]

if (process.platform === 'darwin') {
  template.unshift({
    label: app.getName(),
    submenu: [
      {role: 'about'},
      {type: 'separator'},
      {role: 'services', submenu: []},
      {type: 'separator'},
      {role: 'hide'},
      {role: 'hideothers'},
      {role: 'unhide'},
      {type: 'separator'},
      {role: 'quit'}
    ]
  })

  // Edit menu
  template[1].submenu.push(
    {type: 'separator'},
    {
      label: 'Speech',
      submenu: [
        {role: 'startspeaking'},
        {role: 'stopspeaking'}
      ]
    }
  )

  // Window menu
  template[3].submenu = [
    {role: 'close'},
    {role: 'minimize'},
    {role: 'zoom'},
    {type: 'separator'},
    {role: 'front'}
  ]
}

const menu = Menu.buildFromTemplate(template)
