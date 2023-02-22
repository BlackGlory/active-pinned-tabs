import { each } from 'extra-promise'
import { retryUntil, anyOf, delay, maxRetries } from 'extra-retry'
import { isntUndefined } from '@blackglory/prelude'
import browser from 'webextension-polyfill'

browser.windows.onFocusChanged.addListener(() => {
  // Tabs cannot be edited when user dragging a tab, so retry it.
  // If you drag and drop tabs quickly, Chrome will crash, so add delay.
  retryUntil(
    anyOf(
      maxRetries(10)
    , delay(100)
    )
  , moveTabsToCurrentWindow
  )
})

async function moveTabsToCurrentWindow(): Promise<void> {
  const window = await browser.windows.getLastFocused()

  // tabs can only be moved to and from normal
  if (window.type === 'normal') {
    const tabs = await getPinnedTabs()

    const tabIds = tabs
      .map(x => x.id)
      .filter(isntUndefined)

    await browser.tabs.move(tabIds, {
      windowId: window.id
    , index: 0
    })

    // Since the tab will be unpinned after moving, pin them again.
    await each(tabIds, pinTab)

    // In Firefox, the order of the tabs will change (https://github.com/BlackGlory/active-pinned-tab/issues/2).
    await each(tabs, async tab => {
      if (tab.id) {
        await setTabIndex(tab.id, tab.index)
      }
    })
  }
}

async function getPinnedTabs(): Promise<browser.Tabs.Tab[]> {
  return await browser.tabs.query({
    pinned: true

    // tabs can only be moved to and from normal
  , windowType: 'normal'
  })
}

async function pinTab(id: number): Promise<void> {
  await browser.tabs.update(id, { pinned: true })
}

async function setTabIndex(id: number, index: number): Promise<void> {
  await browser.tabs.move(id, { index: index })
}
