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
