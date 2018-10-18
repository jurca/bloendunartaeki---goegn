import extractContent from './content-extractor.mjs'

/**
 * @typedef {{year: number, month: number, date: number, hour: number, minute: number, second: number, playlistId: number, interpreters: Array<string>, interpretersText: string, title: string, songSnapshotLink: string}} Clip
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

    elements.showResult.onclick = () => {
        elements.result.value = dumpState()
        elements.resultRow.classList.remove('d-none')
    }

    elements.downloadResult.onclick = event => {
        const downloadBody = new Blob([dumpState()], {type: 'application/json'})
        browser.downloads.download({
            body: dumpState(),
            filename: 'phase-3-state.json',
            url: URL.createObjectURL(downloadBody),
        })
    }
}

function loadInput(input) {
    const data = JSON.parse(input)
    elements.inputRow.classList.add('d-none')

    if (data instanceof Array) {
        clips.push(...data)
        
        for (const clip of clips) {
            clipHashTable[hashObject(clip)] = clip

            if (clip.songSnapshotLink && !links.find(link => link.url === clip.songSnapshotLink)) {
                links.push(clipToLink(clip))
            }
            
            addClipToSongs(clip)
        }
    } else { // resume a partialy-completed crawling
        clips.push(...data.clips)
        links.push(...data.links.map(link => ({
            url: link.url,
            done: link.done,
            error: link.error && new Error(link.error.message),
            clip: clips[link.clipIndex],
        })))
        for (const clip of clips) {
            clipHashTable[hashObject(clip)] = clip
            addClipToSongs(clip)
        }
    }

    updateUI()
    elements.showResult.disabled = false
    elements.downloadResult.disabled = false
}

function dumpState() {
    return JSON.stringify({
        clips,
        links: links.map(link => ({
            url: link.url,
            done: link.done,
            error: link.error && {message: link.error.message},
            clipIndex: clips.findIndex(clip => clip === link.clip),
        }))
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

            clips.push(clip)

            if (!links.some(link => clip.songSnapshotLink === link.url)) {
                links.push(clipToLink(clip))
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
