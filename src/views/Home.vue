<template>
    <div class="container">
        <h1>LE-YT</h1>
        <!-- <div>https://youtu.be/j_AtQ6N4jQc</div>
        <div>https://youtu.be/FU9fxE1jN5k</div> -->
        <input v-model="videourl" type="text" placeholder="youtube链接">
        <button @click="Download">下载</button>
        <!-- 当前视频进度条 -->
        <div>{{ video.title }}</div>
        <!-- 显示视频列表 -->
        <div class="videoListWrapper">
            <div class="videoList" v-for="(item, index) in videoList" :key="index">
                <div class="videoItem">
                    <div class="videoTitle" @click="gotoVideoPage(item)">{{ item.title.slice(0, 30) + "--" +
                        item.channel }}</div>
                </div>
            </div>
        </div>
    </div>
</template>



<style scoped>
.home {
    display: flex;
    justify-content: center;
    align-items: center;
}

/* 设置视频列表容器为flex布局，并折行显示子项 */
.videoListWrapper {
    display: grid;
    grid-template-columns: auto auto;
}

/* 设置视频列表子项为50%的宽度，并设置边距 */
.videoList {
    margin: 10px;
}

/* 设置视频项的基本样式，如边框和内边距 */
.videoItem {
    border: 1px solid #ccc;
    padding: 10px;
    position: relative;
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    flex: 1;
}

/* 设置标题容器为相对定位，并为其添加边框 */


.videoItem:hover {
    border-color: #2ecc71;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
    border-radius: 5px;
}

/* 鼠标点击时，标题边框颜色变为深色主题色 */
.videoItem:active {
    border-color: #27ae60;
    box-shadow: 0 0 15px rgba(0, 0, 0, 0.5);
}

/* 取消标题的默认下划线样式 */
.videoTitle {
    text-decoration: none;
}

/* 设置标题文字颜色 */
.videoTitle a {
    color: #333;
}
</style>

<script setup lang="ts">
import { onMounted, ref, reactive, onUnmounted } from "vue";
import { message } from 'ant-design-vue';
import 'ant-design-vue/es/message/style/css';
import { useRouter } from 'vue-router';
import { store } from '../store'
const sqlite3 = require('sqlite3').verbose();
const youtubedl = require('youtube-dl-exec')
let videourl = ref('');
// 声明一个类型，类型包括字幕的标题，字幕的内容，字幕的开始时间，字幕的持续时间，字幕的标记,start的类型为number，duration的类型为number，mark的类型为boolean
type Subtitle = {
    enSub: string,
    zhSub: string,
    start: number,
    duration: number,
    mark: boolean
}
let subtitles = reactive<Subtitle[]>([])
type Video = {
    id: number,
    title: string,
    duration: number,
    size: number,
    path: string,
    channel: string
}
let videoList = reactive<Video[]>([])
let video = reactive<Video>({
    id: 0,
    title: '',
    duration: 0,
    size: 0,
    path: '',
    channel: ''
})
// 快捷键监听

window.addEventListener('keydown', e => {
    // 如果用户按下的是空格键
    if (e.code === "Enter") {
        e.preventDefault(); // 阻止默认行为
        Download();
    }
})


// 创建数据库链接
const db = new sqlite3.Database('My.sqlite3');
onMounted(() => {
    console.log("Home mounted");
    // 建立视频表
    db.run(`CREATE TABLE IF NOT EXISTS videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  channel TEXT,
  duration INTEGER,
  size INTEGER,
  path TEXT
)`);
    // 建立字幕表
    db.run(`CREATE TABLE IF NOT EXISTS subtitles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  video_id INTEGER,
  enSub TEXT,
  zhSub TEXT,
  start INTEGER,
  duration INTEGER,
  mark BOOLEAN,
  FOREIGN KEY(video_id) REFERENCES videos(id)
)`);
    // 查询视频表
    db.all(`SELECT id, path, title, duration, size, channel FROM videos`, (err: Error | null, rows: any) => {
        if (err) {
            console.error(err.message);
        } else {
            rows.forEach((row: any) => {
                videoList.push({
                    id: row.id,
                    title: row.title,
                    duration: row.duration,
                    size: row.size,
                    path: row.path,
                    channel: row.channel
                })
            });
        }
    });
    console.log("videoList", videoList)
    // // 关闭数据库链接
    // db.close();
});

const router = useRouter();
const gotoVideoPage = (item: Video) => {
    console.log("goto")
    router.push({
        path: `/video`,
        query: {
            title: item.title,
            id: item.id,
            path: item.path
        }
    })
}

const Download = async () => {
    videourl.value = ""
    console.log("xiazai", videourl.value)
    // 获取视频基本信息
    console.log("----------------------------1.获取视频基本信息")
    await youtubedl(videourl.value, {
        dumpSingleJson: true,
    }).then(async (data: any) => {
        console.log("data", data)
        video.title = data.title
        video.duration = data.duration
        video.path = 'D:/lyric/' + data.id + ".mp4"
        video.channel = data.channel
        console.log("-----------------------------1.0存储视频信息")
        const ifExist = await storeVideo(video)

        if (!ifExist) {
            videoList.push(video)
            // 获取英文字幕
            console.log("----------------------------1.1获取英文字幕")
            let enSubUrl = data.automatic_captions["en"].find((obj: any | null) => obj.ext === 'srv1')["url"]
            await getEnSub(enSubUrl)
            // 获取中文字幕
            console.log("----------------------------1.2获取中文字幕")
            let zhSubUrl = data.automatic_captions["zh-Hans"].find((obj: any | null) => obj.ext === 'srv1')["url"]
            await getZhSub(zhSubUrl)
            //  存储字幕 
            console.log("----------------------------1.3存储字幕")
            await storeSub()
        }
    }).catch((err: Error | null) => {
        console.log("err", err)
    })


    // 下载视频到指定路径
    console.log("----------------------------2. 下载文件")
    const promise = youtubedl.exec(videourl.value, {
        noCheckCertificates: true,
        noWarnings: true,
        preferFreeFormats: true,
        newline: true,
        addHeader: [
            'referer:youtube.com',
            'user-agent:googlebot'
        ],
        output: 'D:/lyric/%(id)s.%(ext)s',
        noPart: true,
        downloadArchive: "D:/lyric/downloaded.txt", // 记录下载过的部分
        continue: true,// 如果没下载完就继续下载，下载过的就不在下载
    })
        .then((data: any) => {
            console.log("data:", data)
        }).catch((err: any) => {
            console.log("err", err)
        })

    console.log("promise", promise)
    // 显示下载进度
    // const logger = require('progress-estimator')()
    // const result = await logger(promise, `Obtaining ${videourl.value}`)
    // console.log("result", result)

}

const getEnSub = async (enSubUrl: string) => {
    await fetch(enSubUrl, {
        method: "Get",
    }).then(res => {
        return res.text()
    }).then(data => {
        console.log("英语字幕获取完毕")
        // 将XML file文件的内容存放到subtitles数组中
        let parser = new DOMParser();
        let xmlDoc = parser.parseFromString(data, "text/xml");
        let text = xmlDoc.getElementsByTagName("text")
        for (let i = 0; i < text.length; i++) {
            let start = text[i].attributes.getNamedItem('start')?.value
            let duration = text[i].attributes.getNamedItem('dur')?.value
            let enSub = text[i].innerHTML.replace(/&amp;#39;/g, "'");
            subtitles.push({
                enSub: enSub,
                zhSub: "",
                start: Number(start),
                duration: Number(duration),
                mark: false
            })
        }
    }).catch(err => {
        console.log("err", err)
    })
}

const getZhSub = async (zhSubUrl: string) => {
    await fetch(zhSubUrl, {
        method: "Get",
    }).then(res => {
        return res.text()
    }).then(data => {
        console.log("中文字幕获取完毕")
        let parser = new DOMParser();
        let xmlDoc = parser.parseFromString(data, "text/xml");
        let text = xmlDoc.getElementsByTagName("text")
        for (let i = 0; i < text.length; i++) {
            // replace(/&amp;#39;/g, "'")是将XML file文件中的&amp;#39;替换成'
            subtitles[i].zhSub = text[i].innerHTML.replace(/&amp;#39;/g, "'");
        }
    }).catch(err => {
        console.log("err", err)
    })
}

const storeSub = async () => {
    // 将subtitles数组中的内容存放到数据库中
    // 1.创建数据库链接
    console.log("创建数据库连接")
    let db = new sqlite3.Database('My.sqlite3', (err: Error | null) => {
        if (err) {
            console.error(err.message);
        }
        console.log('连接到  mydatabase.db');
    });
    // 3.将subtitles数组中的内容存放到数据库中
    console.log("开始将字幕插入到字幕表中")
    console.log("subtitles", subtitles)
    for (let i = 0; i < subtitles.length; i++) {
        db.run(`INSERT INTO subtitles (enSub, zhSub, start, duration, mark, video_id) VALUES (?, ?, ?, ?, ?, ?)`, [subtitles[i].enSub, subtitles[i].zhSub, subtitles[i].start, subtitles[i].duration, subtitles[i].mark, video.id], (err: Error | null) => {
            if (err) {
                console.log("err", err)
                console.error(err.message);
            }
            if (i === subtitles.length - 1) {
                message.success('存储字幕成功');
            }
        });
    }
}

const storeVideo = async (info: Video) => {

    let ifExist = false;
    // 查看视频表中是否已经存在该视频
    try {
        const row = await new Promise((resolve, reject) => {
            db.get(`SELECT * FROM videos WHERE title = ?`, [info.title], (err: Error | null, row: any) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
        if (row) {
            console.log('video already exists');
            ifExist = true;
            message.error('视频已存在');
        } else {
            // 视频不存在，插入数据到视频表
            console.log('视频不存在，插入数据到视频表');
            db.run(`INSERT INTO videos (title, duration, path, channel) VALUES (?, ?, ?, ?)`, [info.title, info.duration, info.path, info.channel], (err: Error | null) => {
                if (err) {
                    console.error(err.message);
                    return;
                }
                console.log('video insert finished');
            });
            // last_insert_rowid()获取最后插入的id
            db.get(`SELECT last_insert_rowid() as id`, (err: Error | null, row: any) => {
                if (err) {
                    console.error(err.message);
                    return;
                }
                video.id = row.id;
                console.log("--------------------返回插入视频的id", video.id)
                console.log('video insert finished');
            });
        }
    } catch (err) {
        console.error(err);
    } finally {
        db.close();
    }

    return ifExist;
}
</script>