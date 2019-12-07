require("dotenv").config()
import { Client, VoiceChannel } from "discord.js"
import { promises as fs } from "fs"
import * as path from "path"

if (process.env.DISCORD_TOKEN == null) {
    console.log("DISCORD_TOKEN envがありません")
    process.exit(1)
}

if (process.env.REACTIONS_DIR == null) {
    console.log("REACTIONS_DIR envがありません")
    process.exit(1)
}

const client = new Client()

client.login(process.env.DISCORD_TOKEN)

var currentChannel: VoiceChannel | undefined

var queue: [VoiceChannel, string][] = []

function queueRunner() {
    const que = queue[0]
    if (que == null) return
    const [channel, path] = que
    channel.join().then(c => {
        setTimeout(() => {
            const dispatcher = c.playFile(path)
            dispatcher.setVolume(0.1)
            c.dispatcher.on("end", () => {
                channel.leave()
            })
            c.on("disconnect", () => {
                queue.shift()
                queueRunner()
            })
        }, 500)
    }).catch(e => {
        console.error(e)
    })
}

function addToQueue(que: typeof queue[0]) {
    console.log("Add to queue", ...que)
    queue.push(que)
    console.log(queue)
    if (queue.length === 1) queueRunner()
}

client.on("message", async message => {
    if (!message.content.startsWith("psr")) return
    const channel = message.member.voiceChannel
    if (channel == null) {
        message.reply("ボイスチャンネルに入ってから言え")
        return
    }
    const r = /psr ([a-z0-9-_]+)/.exec(message.content)
    if (r == null) {
        message.reply("そこには英数字とハイフン/アンダーバーしか使えませんが…")
        return
    }
    const t = r[1]
    if (t === "list") {
        const files = await fs.readdir(process.env.REACTIONS_DIR!).then(r => r.filter(s => /^[a-z0-9-_]+$/.test(s)))
        message.reply("使えるやつ: " + files.map(f => "`" + f + "`").join(", "))
        return
    }
    const reactionDir = path.join(process.env.REACTIONS_DIR!, t)
    const files = await fs.readdir(reactionDir).catch(e => {
        if (e.code === "ENOENT") {
            return []
        } else {
            throw e
        }
    })
    if (files.length === 0) {
        message.reply("そんなものはありませんが…")
        return
    }
    const selected = files[Math.floor(Math.random() * files.length)]
    console.log("selected", selected)
    addToQueue([channel, path.join(reactionDir, selected)])
})