import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { release } from 'node:os'
import { join } from 'node:path'



// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.js    > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.DIST_ELECTRON = join(__dirname, '..')
process.env.DIST = join(process.env.DIST_ELECTRON, '../dist')
process.env.PUBLIC = process.env.VITE_DEV_SERVER_URL
  ? join(process.env.DIST_ELECTRON, '../public')
  : process.env.DIST

// Disable GPU Acceleration for Windows 7
if (release().startsWith('6.1')) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

// Remove electron security warnings
// This warning only shows in development mode
// Read more on https://www.electronjs.org/docs/latest/tutorial/security
// process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

let win: BrowserWindow | null = null
// Here, you can also use other preload
const preload = join(__dirname, '../preload/index.js')
const url = process.env.VITE_DEV_SERVER_URL
const indexHtml = join(process.env.DIST, 'index.html')

async function createWindow() {
  win = new BrowserWindow({
    title: 'Main window',
    icon: join(process.env.PUBLIC, 'favicon.ico'),
    webPreferences: {
      preload,
      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      // Consider using contextBridge.exposeInMainWorld
      // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) { // electron-vite-vue#298
    win.loadURL(url)
    // Open devTool if the app is not packaged
    // win.webContents.openDevTools()
  } else {
    win.loadFile(indexHtml)
  }

  

  // 向渲染进程发送消息， did-finish-load 事件在页面加载完成后触发
  win.webContents.on('did-finish-load', () => {
    // win?中的？表示win可能为null，如果为null则不执行后面的语句
    // webContents是一个WebContents对象，可以用来控制网页的显示、导航、执行JavaScript代码等
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  // setWindowOpenHandler的意思是设置窗口打开处理程序
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })
  // win.webContents.on('will-navigate', (event, url) => { }) #344
}

// whenready()方法返回一个promise，当Electron完成初始化并且准备创建浏览器窗口时，该promise将被解析
app.whenReady().then(createWindow)

// window-all-closed 事件在所有窗口都被关闭时触发
app.on('window-all-closed', () => {
  win = null
  if (process.platform !== 'darwin') app.quit()
})

// second-instance 事件在另一个实例启动时触发
app.on('second-instance', () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

// activate 事件在应用程序被激活时触发
app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    createWindow()
  }
})

const fetchFile = async (url: string) => {
  try {
    const response = await fetch(url);
    return response
  } catch (error) {
    console.error("err:", error);
    return error
  }
}

// 监听渲染进程发送的事件
ipcMain.on('fetch-file', async(event, url) => {
  console.log(url); // 打印渲染进程发送的事件数据
  // const res = fetchFile(url)
  // console.log("file res: ", res)
  try {
    const response = await fetch(url);
    event.sender.send('response-from-main', "66666", response)
  } catch (error) {
    console.error("err:", error);
    event.sender.send('response-from-main', "md")
  }
});



// ipcMain.handle()方法用于处理异步的ipc通信
ipcMain.handle('open-win', (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${url}#${arg}`)
  } else {
    childWindow.loadFile(indexHtml, { hash: arg })
  }
})
