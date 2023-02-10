import 'webextension-polyfill/dist/browser-polyfill.min'
import { each } from 'extra-promise'
import { retryUntil, delay } from 'extra-retry'

browser.windows.onFocusChanged.addListener(() => {
  // Tabs cannot be edited when user dragging a tab, so retry it.
  // If you drag and drop tabs quickly, Chrome will crash, so add delay.
  retryUntil(delay(100), async () => {
    const tabs = await getPinnedTabs()
    const tabIds = tabs.map(x => x.id!)

    await moveTabsToCurrentWindow(tabIds)

    // Since the tab will be unpinned after moving, pin them again.
    await each(tabIds, pinTab)

    // In Firefox, the order of the tabs will change (https://github.com/BlackGlory/active-pinned-tab/issues/2).
    await each(tabs, tab => setTabIndex(tab.id!, tab.index))
  })
})

async function moveTabsToCurrentWindow(tabIds: number[]): Promise<void> {
  await browser.tabs.move(tabIds, {
    windowId: await getCurrentWindowId()
  , index: 0
  })
}

async function getPinnedTabs(): Promise<browser.tabs.Tab[]> {
  return await browser.tabs.query({ pinned: true })
}

async function getCurrentWindowId(): Promise<number> {
  const window = await browser.windows.getLastFocused()
  return window.id!
}

async function pinTab(id: number): Promise<void> {
  await browser.tabs.update(id, { pinned: true })
}

async function setTabIndex(id: number, index: number): Promise<void> {
  await browser.tabs.move(id, { index: index })
}
