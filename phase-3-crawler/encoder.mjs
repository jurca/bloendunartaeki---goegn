export const snapshotUrl = {
    /**
     * @param {string} url Snapshot link to encode.
     * @returns {string}
     */
    encode(url) {
        const compressorCheck = /^https:\/\/web\.archive\.org\/web\/\d{14}\/https?:\/\/www\.mixer\.cz(?::80)?\/.+/
        if (!compressorCheck.test(url)) {
            throw new Error(`Invalid link: ${url}`)
        }

        const isHttps = url.substring(43).startsWith('https:')
        const hasPort = url.substring(62 + (isHttps ? 1 : 0)).startsWith(':80')
        return `${url.substring(28, 42)}${isHttps ? 's' : ''}/${url.substring(63 + (isHttps ? 1 : 0) + (hasPort ? 3 : 0))}`
    },

    /**
     * @param {string} data Encoded snapshot link.
     * @returns {string}
     */
    decode(data) {
        const [prefix, pathname] = [
            data.substring(0, data.indexOf('/')),
            data.substring(data.indexOf('/') + 1),
        ]
        const isHttps = prefix.endsWith('s')
        let timestamp = isHttps ? prefix.slice(0, -1) : prefix
        return `https://web.archive.org/web/${timestamp}/http${isHttps ? 's' : ''}://www.mixer.cz/${pathname}`
    },
}

export const clip = {
    encode(clip) {
        return [
            clip.playlistId,
            clip.crawlTimestamp,
            clip.interpreters,
            clip.interpretersText,
            clip.title,
            clip.songSnapshotLink ? snapshotUrl.encode(clip.songSnapshotLink) : 0,
        ]
    },

    decode(data) {
        return {
            playlistId: data[0],
            crawlTimestamp: data[1],
            title: data[4],
            interpreters: data[2],
            interpretersText: data[3],
            songSnapshotLink: data[5] ? snapshotUrl.decode(data[5]) : null,
        }
    },
}

export const timestamp = {
    encode(stringTimestamp) {
        const [year, month, date, hour, minute, second] = stringTimestamp
            .match(/(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)/)
            .slice(1)
            .map(fragment => parseInt(fragment, 10))
        return this.encodeFromParts(year, month, date, hour, minute, second)
    },

    encodeFromParts(year, month, date, hour, minute, second) {
        const timestamp = new Date()
        timestamp.setUTCFullYear(year)
        timestamp.setUTCMonth(month)
        timestamp.setUTCDate(date)
        timestamp.setUTCHours(hour)
        timestamp.setUTCMinutes(minute)
        timestamp.setUTCSeconds(second)
        // too bad radix 72 (upper-case letters) is unavailable
        return Math.floor(timestamp.getTime() / 1000).toString(36)
    },

    decode(timestamp) {
        return new Date(parseInt(timestamp, 36) * 1000)
    },
}
