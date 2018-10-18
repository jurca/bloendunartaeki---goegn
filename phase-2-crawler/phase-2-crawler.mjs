import extractContent from './content-extractor.mjs'

const elements = {}
let inputSnapshots = []
const result = []
let nextLinkTimeoutId = null

function startUI() {
    elements.run.addEventListener('click', run)
    elements.pause.addEventListener('click', pause)
    elements.input.addEventListener('input', loadInput)
}

function run() {
    elements.run.disabled = true
    elements.pause.disabled = false

    requestIdleCallback(processNextLink)
}

function pause() {
    elements.run.disabled = false
    elements.pause.disabled = true

    clearTimeout(nextLinkTimeoutId)
}

async function processNextLink() {
    const nextSnapshotLinkIndex = inputSnapshots.findIndex(
        snapshot => !snapshot.done && !snapshot.error && !snapshot.unresolved,
    )
    const nextSnapshotLink = inputSnapshots[nextSnapshotLinkIndex]
    if (!nextSnapshotLink) {
        done()
        return
    }

    elements.currentLinkIndex.value = nextSnapshotLinkIndex + 1
    elements.currentLink.value = nextSnapshotLink.snapshotUrl
    try {
        const clips = await extractContent(nextSnapshotLink.snapshotUrl)
        if (clips.length) {
            result.push(...clips)
            nextSnapshotLink.done = true
        } else {
            console.warn(`Failed to resolve clips from ${nextSnapshotLink.snapshotUrl}`)
            nextSnapshotLink.unresolved = true
        }
    } catch (error) {
        nextSnapshotLink.error = `${error.name}: ${error.message}\n${error.stack}`
        console.error(error, nextSnapshotLink, clips)
    }
    elements.input.value = JSON.stringify(inputSnapshots)
    elements.result.value = JSON.stringify(result)

    if (elements.run.disabled) {
        const delay = parseInt(elements.delayBetweenRequests.value) || 0
        nextLinkTimeoutId = setTimeout(processNextLink, delay)
    }
}

function done() {
    elements.pause.disabled = true
}

function loadInput() {
    const data = JSON.parse(elements.input.value)
    if (!Array.isArray(data)) {
        return
    }

    inputSnapshots = data
    elements.input.disabled = true
    elements.run.disabled = false
    elements.linkCount.value = inputSnapshots.length
}

addEventListener('DOMContentLoaded', () => {
    const importantElementsList = Array.from(document.querySelectorAll('[id]'))
    for (const element of importantElementsList) {
        elements[element.id] = element
    }

    startUI()
})
