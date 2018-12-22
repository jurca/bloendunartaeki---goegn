import {timestamp} from './encoder.mjs'

export default async function extractContent(snapshotUrl) {
    const response = await fetch(snapshotUrl)
    if (!response.ok) {
        throw new Error(`Failed to download ${snapshotUrl}: ${response.status} ${response.statusText}`)
    }
    const rawSnapshot = await response.text()

    const snapshot = (() => {
        const template = document.createElement('template')
        template.innerHTML = rawSnapshot
        return template.content.getElementById('container')
    })()

    const clips = Array.from(snapshot.querySelectorAll('.clip h2'))

    const parsedUrl = new URL(snapshotUrl)
    const urlPathParts = parsedUrl.pathname.substring(1).split('/')
    const playlistId = parseInt(urlPathParts[5], 10) || 1
    const crawlTimestamp = timestamp.encode(urlPathParts[1])
    const metadata = {
        playlistId,
        crawlTimestamp,
    }

    return clips.map(clipContainer => {
        const title = clipContainer.querySelector('a')
        if (!title) {
            // 2012 format
            return {
                ...metadata,
                title: clipContainer.querySelector('.song').innerText.trim(),
                interpreters: Array.from(clipContainer.querySelectorAll('.interpreter')).map(
                    interpreter => interpreter.innerText.trim(),
                ),
                interpretersText: clipContainer.querySelector('.interpreters').innerText.trim().replace(/\s+/g, ' '),
                songSnapshotLink: null,
            }
        }

        for (const clipCount of Array.from(clipContainer.querySelectorAll('.clipCount'))) {
            clipCount.parentNode.removeChild(clipCount)
        }

        return {
            ...metadata,
            title: title.innerText.trim(),
            interpreters: Array.from(clipContainer.querySelectorAll('.interpreter')).map(
                interpreter => interpreter.innerText.trim(),
            ),
            interpretersText: clipContainer.querySelector('.interpreters').innerText.trim().replace(/\s+/g, ' '),
            songSnapshotLink: `https://web.archive.org${title.getAttribute('href')}`,
        }
    })
}
