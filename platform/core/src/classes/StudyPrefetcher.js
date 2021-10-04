import cornerstone from 'cornerstone-core';

import getImageId from '../utils/getImageId.js';

const noop = () => {};

export class StudyPrefetcher {
  options = {
    order: 'closest',
    displaySetCount: 1,
    onImageCached: noop,
    requestType: 'prefetch',
    preventCache: false,
    prefetchDisplaySetsTimeout: 300,
    includeActiveDisplaySet: false,
  };

  constructor(studies, options) {
    this.studies = studies || [];

    if (options) {
      this.options = { ...this.options, ...options };
      this.options.requestType = 'prefetch';
    }

    cornerstone.events.addEventListener(
      cornerstone.EVENTS.IMAGE_CACHE_FULL + '.StudyPrefetcher',
      this.cacheFullHandler
    );
  }

  /**
   * Remove previously set event listeners and stop prefetching.
   */
  destroy() {
    this.stopPrefetching();
    cornerstone.events.removeEventListener(
      cornerstone.EVENTS.IMAGE_CACHE_FULL + '.StudyPrefetcher',
      this.cacheFullHandler
    );
  }

  /**
   * Get StudyPrefetcher singleton instance.
   *
   * @param {array} studies
   * @param {object} options
   * @returns
   */
  static getInstance(studies = [], options) {
    if (!StudyPrefetcher.instance) {
      StudyPrefetcher.instance = new StudyPrefetcher(studies, options);
    }

    if (options) {
      this.options = { ...this.options, ...options };
      this.options.requestType = 'prefetch';
    }

    return StudyPrefetcher.instance;
  }

  /**
   * OHIF study metadata instances.
   *
   * @param {array} studies
   */
  setStudies(studies) {
    this.stopPrefetching();
    this.studies = studies;
  }

  getStudyFromDisplaySetInstanceUID(displaySetInstanceUID) {
    return this.studies.find(study => {
      if (!study.displaySets) {
        return;
      }

      return study.displaySets.find(
        ds => ds.displaySetInstanceUID === displaySetInstanceUID
      );
    });
  }

  /**
   * Prefetch related display sets based on cornerstone viewport element
   * with previously set options.
   *
   * @param {*} element
   * @param {string} displaySetInstanceUID the display set instance uid
   * @returns
   */
  prefetch(displaySetInstanceUID) {
    if (!this.studies || !this.studies.length) {
      return;
    }

    this.stopPrefetching();
    this.prefetchDisplaySets(displaySetInstanceUID);
  }

  /**
   * Stop prefetching images.
   */
  stopPrefetching() {
    cornerstone.imageLoadPoolManager.clearRequestStack(
      this.options.requestType
    );
    cornerstone.imageRetrievalPoolManager.clearRequestStack(
      this.options.requestType
    );
  }

  /**
   * Prefetch display sets async.
   *
   * @param {HTMLElement} element cornerstone viewport element
   * @param {number} timeout
   */
  prefetchDisplaySetsAsync(element, timeout) {
    timeout = timeout || this.options.prefetchDisplaySetsTimeout;
    clearTimeout(this.prefetchDisplaySetsHandler);
    this.prefetchDisplaySetsHandler = setTimeout(() => {
      this.prefetchDisplaySets();
    }, timeout);
  }

  /**
   * Extract all image ids from all display sets to be fetched and
   * call method to add images to request pool manager.
   *
   * @param {string} displaySetInstanceUID the display set instance uid
   */
  prefetchDisplaySets(displaySetInstanceUID) {
    const displaySetsToPrefetch = this.getDisplaySetsToPrefetch(
      displaySetInstanceUID
    );

    if (!displaySetsToPrefetch) {
      return;
    }

    console.debug('printing now');
    displaySetsToPrefetch.forEach(ds => {
      console.debug('displaySetsToPrefetch', ds.SeriesDescription);
    });
    const imageIds = this.getImageIdsFromDisplaySets(displaySetsToPrefetch);
    this.prefetchImageIds(imageIds);
  }

  /**
   * Add image ids to request pool manager.
   *
   * @param {array} imageIds
   */
  prefetchImageIds(imageIds) {
    const nonCachedImageIds = this.filterCachedImageIds(imageIds);

    const { requestType } = this.options;
    const priority = 0;
    const addToBeginning = false;

    // ImageRetrievalPool manager needs these options to set the retrieve
    // request (usually xhrRequest) with correct settings
    const options = {
      priority: 10,
      addToBeginning,
      requestType: 'prefetch',
    };
    let requestFn;
    if (this.options.preventCache) {
      requestFn = id => cornerstone.loadImage(id, options);
    } else {
      requestFn = id => cornerstone.loadAndCacheImage(id, options);
    }

    console.debug('imageIds', nonCachedImageIds.length);
    setTimeout(() => {
      nonCachedImageIds.forEach(imageId => {
        cornerstone.imageLoadPoolManager.addRequest(
          requestFn.bind(this, imageId),
          requestType,
          {
            imageId,
          },
          priority,
          addToBeginning
        );
      });
    }, 0);
  }

  /**
   * Returns the display set with given uid.
   *
   * @param {string} displaySetInstanceUID the display set instance uid
   * @returns {object} displaySet
   */
  getDisplaySetByUID(displaySetInstanceUID) {
    let displaySet;
    this.studies.forEach(study => {
      const ds = study.displaySets.find(
        ds => ds.displaySetInstanceUID === displaySetInstanceUID
      );
      if (ds) {
        displaySet = ds;
      }
    });
    return displaySet;
  }

  /**
   * Prefetch display sets based on cornerstone viewport element image.
   *
   * @param {string} displaySetInstanceUID the display set instance uid
   * @returns {array} displaySets
   */
  getDisplaySetsToPrefetch(displaySetInstanceUID) {
    const study = this.getStudyFromDisplaySetInstanceUID(displaySetInstanceUID);
    if (!study) {
      return;
    }

    const displaySets = study.displaySets;
    const activeDisplaySet = this.getDisplaySetByUID(displaySetInstanceUID);

    const prefetchMethodMap = {
      topdown: 'getFirstDisplaySets',
      downward: 'getNextDisplaySets',
      upward: 'getPreviousDisplaySets',
      closest: 'getClosestDisplaySets',
      all: 'getAllDisplaySets',
    };

    const prefetchOrder = this.options.order;
    const methodName = prefetchMethodMap[prefetchOrder];
    const getDisplaySets = this[methodName];

    if (!getDisplaySets) {
      if (prefetchOrder) {
        log.warn(`Invalid prefetch order configuration (${prefetchOrder})`);
      }

      return [];
    }

    // Re-order the displaysets to put the active displayset in the beginning
    const index = displaySets.indexOf(activeDisplaySet);
    displaySets.splice(index, 1);
    displaySets.unshift(activeDisplaySet);

    return getDisplaySets.call(
      this,
      displaySets,
      activeDisplaySet,
      this.options.displaySetCount,
      this.options.includeActiveDisplaySet
    );
  }

  /**
   * Get all display sets.
   *
   * @param {array} displaySets
   * @param {object} activeDisplaySet
   * @param {number} displaySetCount
   * @param {boolean} includeActiveDisplaySet
   * @returns
   */
  getAllDisplaySets(
    displaySets,
    activeDisplaySet,
    displaySetCount,
    includeActiveDisplaySet
  ) {
    // Reorder displaysets and put active one first

    return displaySets;
  }

  /**
   * Get all display sets in order after the active display set.
   *
   * @param {array} displaySets
   * @param {object} activeDisplaySet
   * @param {number} displaySetCount
   * @param {boolean} includeActiveDisplaySet
   * @returns
   */
  getFirstDisplaySets(
    displaySets,
    activeDisplaySet,
    displaySetCount,
    includeActiveDisplaySet
  ) {
    const length = displaySets.length;
    const selectedDisplaySets = [];

    for (let i = 0; i < length && displaySetCount; i++) {
      const displaySet = displaySets[i];

      if (includeActiveDisplaySet || displaySet !== activeDisplaySet) {
        selectedDisplaySets.push(displaySet);
        displaySetCount--;
      }
    }

    return selectedDisplaySets;
  }

  /**
   * Get all display sets before the active display set.
   *
   * @param {array} displaySets
   * @param {object} activeDisplaySet
   * @param {number} displaySetCount
   * @param {boolean} includeActiveDisplaySet
   * @returns
   */
  getPreviousDisplaySets(
    displaySets,
    activeDisplaySet,
    displaySetCount,
    includeActiveDisplaySet
  ) {
    const activeDisplaySetIndex = displaySets.indexOf(activeDisplaySet);
    const end = includeActiveDisplaySet
      ? activeDisplaySetIndex + 1
      : activeDisplaySetIndex;
    const previousDisplaySets = displaySets.slice(0, end);
    return previousDisplaySets.reverse().slice(0, displaySetCount);
  }

  /**
   * Get all display sets after the active display set.
   *
   * @param {array} displaySets
   * @param {object} activeDisplaySet
   * @param {number} displaySetCount
   * @param {boolean} includeActiveDisplaySet
   * @returns
   */
  getNextDisplaySets(
    displaySets,
    activeDisplaySet,
    displaySetCount,
    includeActiveDisplaySet
  ) {
    const activeDisplaySetIndex = displaySets.indexOf(activeDisplaySet);
    const begin = includeActiveDisplaySet
      ? activeDisplaySetIndex
      : activeDisplaySetIndex + 1;
    const end = Math.min(begin + displaySetCount, displaySets.length);
    return displaySets.slice(begin, end);
  }

  /**
   * Get all display set closest to the active display set.
   *
   * @param {array} displaySets
   * @param {object} activeDisplaySet
   * @param {number} displaySetCount
   * @param {boolean} includeActiveDisplaySet
   * @returns
   */
  getClosestDisplaySets(
    displaySets,
    activeDisplaySet,
    displaySetCount,
    includeActiveDisplaySet
  ) {
    const activeDisplaySetIndex = displaySets.indexOf(activeDisplaySet);
    const length = displaySets.length;
    const selectedDisplaySets = [];
    let left = activeDisplaySetIndex - 1;
    let right = activeDisplaySetIndex + 1;

    if (includeActiveDisplaySet) {
      selectedDisplaySets.push(displaySets[activeDisplaySetIndex]);
      displaySetCount--;
    }

    while ((left >= 0 || right < length) && displaySetCount) {
      if (left >= 0) {
        selectedDisplaySets.push(displaySets[left]);
        displaySetCount--;
        left--;
      }

      if (right < length && displaySetCount) {
        selectedDisplaySets.push(displaySets[right]);
        displaySetCount--;
        right++;
      }
    }

    return selectedDisplaySets;
  }

  /**
   * Get all image ids from display sets.
   *
   * @param {array} displaySets
   * @returns {array} image ids
   */
  getImageIdsFromDisplaySets(displaySets) {
    let imageIds = [];

    displaySets.forEach(displaySet => {
      imageIds = imageIds.concat(this.getImageIdsFromDisplaySet(displaySet));
    });

    return imageIds;
  }

  /**
   * Get all image ids from a given display set.
   *
   * @param {array} displaySet
   * @returns
   */
  getImageIdsFromDisplaySet(displaySet) {
    const imageIds = [];

    if (!displaySet.images || displaySet.images.length < 1) {
      return [];
    }

    // TODO: This duplicates work done by the stack manager
    displaySet.images.forEach(image => {
      const numFrames = image.numFrames;
      if (numFrames > 1) {
        for (let i = 0; i < numFrames; i++) {
          let imageId = getImageId(image, i);
          imageIds.push(imageId);
        }
      } else {
        let imageId = getImageId(image);
        imageIds.push(imageId);
      }
    });

    return imageIds;
  }

  /**
   * Filter cached image ids from a set of image ids.
   *
   * @param {array} imageIds
   * @returns {array} images not cached
   */
  filterCachedImageIds(imageIds) {
    return imageIds.filter(imageId => !this.isImageCached(imageId));
  }

  /**
   * Check if image id is cached in cornerstone.
   *
   * @param {string} imageId
   * @returns
   */
  isImageCached(imageId) {
    const image = cornerstone.imageCache.imageCache[imageId];
    return image && image.sizeInBytes;
  }

  /**
   * Warns that cache is full and stops prefetching.
   */
  cacheFullHandler = () => {
    log.warn('Cache full');
    this.stopPrefetching();
  };
}
