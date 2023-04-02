import { lstat } from 'node:fs/promises'
import { cwd } from 'node:process'
import { ipcRenderer } from 'electron'

// 渲染进程监听主进程的消息
  // args表示的是主进程传递过来的参数
  // ...args中...表示展开运算符，可以将数组中的元素展开
  // _event表示第一个参数，但是不需要使用，所以用_表示
ipcRenderer.on('main-process-message', (_event, ...args) => {
  console.log('[Receive Main-process message]:', ...args)
})

lstat(cwd()).then(stats => {
  console.log('[fs.lstat]', stats)
}).catch(err => {
  console.error(err)
})
