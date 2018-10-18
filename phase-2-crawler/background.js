chrome.browserAction.onClicked.addListener(() => {
    chrome.tabs.create({
        url: chrome.runtime.getURL('phase-2-crawler.html')
    })
})
