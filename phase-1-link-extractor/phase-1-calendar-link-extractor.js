// use on https://web.archive.org/web/20160801000000*/https://www.mixer.cz/
// and https://web.archive.org/web/20160415000000*/https://www.mixer.cz/[2-8]

(async () => {
  const year = parseInt(location.pathname.split('/')[2].substring(0, 4))
  const playlistId = parseInt(location.pathname.split('/')[6]) || 1
  const months = Array.from(document.querySelectorAll('.month'))
  const days = months.map(monthContainer =>
    Array.from(monthContainer.querySelectorAll('.month-day a')).map(
      dayLink => ({
        linkElement: dayLink,
        day: parseInt(dayLink.innerText),
      })
    )
  )

  const result = []
  for (let monthIndex = 0; monthIndex < days.length; monthIndex++) {
    const month = days[monthIndex]
    for (const day of month) {
      const parent = day.linkElement.parentNode
      parent.dispatchEvent(new CustomEvent("mouseover", {bubbles: true}))
      while (!parent.nextElementSibling) {
        await delay()
      }
      const snapshots = {}
      const snapshotContainer = parent.nextElementSibling
      const snapshotLinkElements = snapshotContainer.querySelectorAll('a')
      for (const snapshotLink of Array.from(snapshotLinkElements)) {
        if (snapshotLink.className.trim() !== 'snapshot-link') {
          continue
        }

        result.push({
          playlistId,
          year,
          month: monthIndex + 1,
          day: day.day,
          time: snapshotLink.innerText,
          snapshotUrl: snapshotLink.href,
        })
      }
    }
  }

  return result

  function delay(ms) {
    return new Promise(resolve => requestIdleCallback(resolve, ms))
  }
})().then(result => console.log(JSON.stringify(result, null, 2)))
