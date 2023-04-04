<template>
    <div class="wrapper">
        <div class="container">
            <router-link class="back" :style="{ color: 'black' }" :to="{ name: 'Home' }">{{ "<" }}</router-link>
                    <video v-if="path" ref="videoRef" :src="path" class="video" controls
                        :style="{ width: '600px', height: '340px' }">
                    </video>
                    <div class="subs">
                        <div class="sub" ref="subRef" v-for="(item, index) in subtitles" :key="index">
                            <div :class="{ currentSub: index === currentindex }">
                                <span :class="{ Marked: item.mark == true }">{{ index + "." + item.enSub }}</span>
                                <div>{{ item.zhSub }}</div>
                            </div>
                        </div>
                    </div>
        </div>
    </div>
</template>

<style scoped>
.currentSub {
    color: red;
}

.wrapper {
    height: 100vh;
    /* 设置父元素高度为可视区域高度 */
}

.container {
    height: 100%;
}

.video {
    position: fixed;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    z-index: 100;
}

.subs {
    position: relative;
    top: 340px;
}

.sub {
    margin-bottom: 1px;
}

.back {
    position: fixed;
    top: 0;
    left: 0;
    margin: 20px;
    font-size: 16px;
    text-decoration: none;
}

.Marked {
    background-color: yellow;
}
</style>

<script setup lang="ts">
import { onMounted, ref, reactive, onUnmounted, watchEffect } from "vue";
import { useRoute } from "vue-router";
import { message } from 'ant-design-vue';
import 'ant-design-vue/es/message/style/css';
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs')
const route = useRoute();
// query参数
let id = ref<any>()
const path = ref<any>('');
let title = ref<any>('')
const subRef = ref<any>([])


// 创建数据库链接
let db = new sqlite3.Database('My.sqlite3', (err: Error | null) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the  mydatabase.db');
});

type Subtitle = {
    id: number,
    enSub: string,
    zhSub: string,
    start: number,
    duration: number,
    mark: boolean
}
let subtitles = reactive<Subtitle[]>([])
// 记录当前播放的那一条字幕
const videoRef = ref<any>(null)
let currentindex = ref(0)

onMounted(async () => {
    id.value = route.query.id
    path.value = route.query.path
    title.value = route.query.title
    console.log("视频id", id.value)
    // 查询文件是否存在
    fs.exists(path.value, (exists: boolean) => {
        if (exists) {
            playAudio()
            console.log("文件存在")
        } else {
            message.error("文件不存在")
        }
    })
    // 将 db.all 包装为返回 Promise 的函数, 以便使用 await
    const getSubtitles = () => {
        return new Promise<void>((resolve, reject) => {
            db.all(`SELECT * FROM subtitles WHERE video_id = ${id.value} ORDER BY id ASC`, (err: Error | null, rows: any) => {
                if (err) {
                    reject(err);
                }
                rows.forEach((row: any) => {
                    subtitles.push({
                        id: row.id,
                        enSub: row.enSub,
                        zhSub: row.zhSub,
                        start: row.start,
                        duration: row.duration,
                        mark: row.mark
                    })
                });
                resolve();
            });
        });
    };

    // 等待数据库操作完成
    await getSubtitles();
    // 按照字幕的start时间，升序排序
    subtitles.sort((a: any, b: any) => {
        return a.start - b.start
    })
    // 快捷键设置
    window.addEventListener('keydown', Quick)
})

// 令当前播放的字幕始终出现在页面中
watchEffect(() => {
    if (subRef.value[currentindex.value]) {
        const target = subRef.value[currentindex.value]
        const rect = target.getBoundingClientRect()
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop
        const targetTop = rect.top + scrollTop
        const windowHeight = window.innerHeight
        const distanceFromBottom = windowHeight - targetTop - rect.height // 目标元素距离窗口底部的距离
        const targetDistanceFromBottom = distanceFromBottom + windowHeight * 0.8 // 距离窗口底部10%的距离
        window.scrollTo({ top: windowHeight - targetDistanceFromBottom, behavior: "smooth" })
    }
})
const updateTimeIndex = () => {
    // Update the 'currentindex' based on the video's currentTime
    // 根据视频的 currentTime 更新 'currentindex'
    const currentTime = videoRef.value.currentTime
    currentindex.value = subtitles.findIndex((subtitle) => {
        return currentTime >= subtitle.start && currentTime <= subtitle.start + subtitle.duration
    })
}
// 监听视频播放时间，更新当前播放的字幕
watchEffect(() => {
    if (videoRef.value) {
        videoRef.value.addEventListener('timeupdate', updateTimeIndex)
    }
})

// 更改播放状态
const playAudio = () => {
    console.log("playAudio")
    //@ts-ignore
    if (videoRef.value?.paused) {
        videoRef.value?.play()
    } else {
        //  @ts-ignore
        videoRef.value?.pause()
    }
}
// 快捷键监听
const Quick = (e: any) => {
    // 如果用户按下的是空格键
    if (e.code === "Space") {
        playAudio()
        e.preventDefault(); // 阻止默认行为
    } else if (e.code === "ArrowLeft") {
        //@ts-ignore
        if (videoRef.value.currentTime > 5) {
            //@ts-ignore
            videoRef.value.currentTime -= 5
        } else {
            //@ts-ignore
            videoRef.value.currentTime = 0
        }
        e.preventDefault(); // 阻止默认行为
    } else if (e.code === "ArrowRight") {
        //@ts-ignore
        if (videoRef.value.currentTime + 5 < videoRef.value.duration) {
            //@ts-ignore
            videoRef.value.currentTime += 5
        } else {
            //@ts-ignore
            videoRef.value.currentTime = videoRef.value.duration
        }
        e.preventDefault(); // 阻止默认行为
    } else if (e.code === "Enter") {
        e.preventDefault(); // 阻止默认行为
        // 根据当前播放的字幕id，对mark取反
        db.run(`UPDATE subtitles SET mark = NOT mark WHERE id = ${subtitles[currentindex.value].id}`, (err: Error | null) => {
            if (err) {
                throw err;
            }
            subtitles[currentindex.value].mark = !subtitles[currentindex.value].mark
        });
    }

}
onUnmounted(() => {
    window.removeEventListener('keydown', Quick)
    if (videoRef.value) {
        videoRef.value.removeEventListener('timeupdate', updateTimeIndex)
    }
})
</script>