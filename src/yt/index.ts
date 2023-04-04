const { spawn } = require('child_process');
const GetYtJson = (videoUrl: string, path: string): Promise<any> => {
    return new Promise((resolve, reject) => {
        console.log("test")
        const args = ['--print-json', '-o', path, videoUrl]; // yt-dlp的命令行参数

        const ytDlpProcess = spawn('yt-dlp', args);

        let videoInfoJson = ''; // 用于保存视频信息的JSON字符串

        ytDlpProcess.stdout.on('data', (data: any) => {
            videoInfoJson += data.toString(); // 将每个数据块累加到变量中
        });

        ytDlpProcess.stderr.on('data', (data: any) => {
            console.error(`stderr: ${data}`);
        });

        ytDlpProcess.on('close', (code: any) => {
            console.log(`子进程退出，退出码 ${code}`);

            // 将JSON字符串解析为JavaScript对象
            const videoInfo = JSON.parse(videoInfoJson);
            resolve(videoInfo);

        });
    })
}

export { GetYtJson }