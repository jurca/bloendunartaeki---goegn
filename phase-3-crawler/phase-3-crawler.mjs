import extractContent from './content-extractor.mjs'
import {snapshotUrl, timestamp} from './encoder.mjs'

/**
 * @typedef {{crawlTimestamp: string, playlistId: number, interpreters: Array<string>, interpretersText: string, title: string, songSnapshotLink: string}} Clip
 */

 /**
  * @type {Object<string, HTMLElement>}
  */
const elements = {}
/**
 * @type {Array<Clip>}
 */
const clips = []
/**
 * @type {Map<Clip, number>}
 */
const clipIndexes = new Map()
/**
 * @type {Object<string, Clip>}
 */
const clipHashTable = {}
/**
 * @type {Array<{url: string, done: boolean, error: ?Error, clip: Clip}>}
 */
const links = []
/**
 * Map of JSON-ified song interpreters text and title to array playlist indexes. Used just to keep track of the number
 * of known songs, this will be probably smaller than clips.
 * 
 * @type {Object<string, Array<number>>}
 */
const songs = {}

let nextLinkTimeout = null

function init() {
    for (const element of Array.from(document.querySelectorAll('[id]'))) {
        elements[element.id] = element
    }

    elements.input.oninput = event => {
        loadInput(event.target.value)
        event.target.value = ''
    }

    elements.inputFile.onchange = event => {
        const file = event.target.files.item(0)
        if (!file) {
            return
        }

        if (file.type !== 'application/json') {
            throw new Error(`Only JSON files are supported, but a file with mime type '${file.type}' was provided`)
        }

        elements.input.disabled = true
        elements.inputFile.disabled = true

        const reader = new FileReader()
        reader.onloadend = () => {
            loadInput(reader.result)
        }
        const contents = reader.readAsText(file)
    }

    elements.debug.onclick = () => {
        debugger
    }

    elements.run.onclick = () => {
        nextLinkTimeout = setTimeout(processNextLink, parseInt(elements.delay.value))
        updateUI()
    }

    elements.pause.onclick = () => {
        clearTimeout(nextLinkTimeout)
        nextLinkTimeout = null
        updateUI()
    }

    elements.downloadResult.onclick = event => {
        const stateDump = dumpState()
        const downloadBody = new Blob([stateDump], {type: 'application/json'})

        browser.downloads.download({
            filename: 'phase-3-state.json',
            url: URL.createObjectURL(downloadBody),
        })
    }
}

function loadInput(input) {
    const data = JSON.parse(input)
    elements.inputRow.classList.add('d-none')

    if (data instanceof Array) { // import stage 2 result
        clips.push(...data)
        
        for (let i = 0; i < clips.length; i++) {
            const {year, month, date, hour, minute, second, ...clip} = clips[i]
            clip.crawlTimestamp = timestamp.encodeFromParts(year, month, date, hour, minute, second)

            clipIndexes.set(clip, i)
            clipHashTable[hashObject(clip)] = clip

            if (clip.songSnapshotLink && !links.find(link => link.url === clip.songSnapshotLink)) {
                links.push(clipToLink(clip))
            }
            
            addClipToSongs(clip)
        }
    } else { // resume a partialy-completed crawling
        for (let i = 0; i < data.clips.length; i += 1000) {
            clips.push(...data.clips.slice(i, i + 1000))
        }
        for (let i = 0; i < data.links.length; i += 1000) {
            links.push(...data.links.slice(i, i + 1000).map(link => ({
                url: snapshotUrl.decode(link[0]),
                done: !!link[1],
                error: link[2] ? new Error(link[2]) : null,
                clip: clips[link[3]],
            })))
        }
        for (let i = 0; i < clips.length; i++) {
            const clip = clips[i]
            clipIndexes.set(clip, i)
            clipHashTable[hashObject(clip)] = clip
            addClipToSongs(clip)
        }
    }

    updateUI()
    elements.downloadResult.disabled = false
}

function dumpState() {
    return JSON.stringify({
        clips,
        links: links.map(link => [
            snapshotUrl.encode(link.url),
            link.done ? 1 : 0,
            link.error ? link.error.message : 0,
            clipIndexes.get(link.clip),
        ]),
    })
}

async function processNextLink() {
    const linkToProcess = links.find(link => !link.done && !link.error)
    if (!linkToProcess) {
        nextLinkTimeout = null
        updateUI()
        return
    }

    elements.currentLink.value = linkToProcess.url
    elements.currentSong.value = `${linkToProcess.clip.interpretersText} - ${linkToProcess.clip.title}`

    try {
        const fetchedClips = await extractContent(linkToProcess.url)
        
        for (const clip of fetchedClips) {
            const clipHash = hashObject(clip)
            if (clipHashTable[clipHash]) {
                continue
            }

            clipIndexes.set(clip, clips.length)
            clips.push(clip)

            if (clip.songSnapshotLink) {
                if (!links.some(link => clip.songSnapshotLink === link.url)) {
                    links.push(clipToLink(clip))
                }
            }

            clipHashTable[hashObject(clip)] = clip
            addClipToSongs(clip)
        }
        linkToProcess.done = true
    } catch (processingError) {
        console.error(processingError)
        linkToProcess.error = processingError
    }
    updateUI()

    if (nextLinkTimeout) { // we weren't paused
        nextLinkTimeout = setTimeout(processNextLink, parseInt(elements.delay.value))
    }
}

function hashObject(object) {
    // Let's just assume that we never modify the objects passed to this function - which we don't, this is used just
    // for the clips.
    const hash = hashObject.hashCache.get(object)
    if (!hash) {
        const newHash = JSON.stringify(Object.keys(object).sort().map(key => [key, object[key]]))
        hashObject.hashCache.set(object, newHash)
        return newHash
    }
    return hash
}
hashObject.hashCache = new WeakMap()

function clipToLink(clip) {
    return {
        url: clip.songSnapshotLink,
        done: false,
        error: null,
        clip,
    }
}

function addClipToSongs(clip) {
    const songKey = clipToSongKey(clip)
    if (songs[songKey]) {
        if (!songs[songKey].includes(clip.playlistId)) {
            songs[songKey].push(clip.playlistId)
        }
    } else {
        songs[songKey] = [clip.playlistId]
    }
}

function clipToSongKey(clip) {
    return JSON.stringify([clip.interpretersText, clip.title])
}

function updateUI() {
    elements.processedLinksCount.value = links.filter(link => link.done).length
    elements.linkCount.value = links.length
    elements.songs.value = Object.keys(songs).length

    elements.run.disabled = !!nextLinkTimeout
    elements.pause.disabled = !nextLinkTimeout
}

addEventListener('DOMContentLoaded', init)
