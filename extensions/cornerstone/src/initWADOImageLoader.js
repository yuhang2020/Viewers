import cornerstone from 'cornerstone-core';
import cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import dicomParser from 'dicom-parser';
import { errorHandler } from '@ohif/core'

let initialized = false;

function initWebWorkers() {
  const config = {
    maxWebWorkers: Math.max(navigator.hardwareConcurrency - 1, 1),
    startWebWorkersOnDemand: true,
    taskConfiguration: {
      decodeTask: {
        initializeCodecsOnStartup: false,
        usePDFJS: false,
        strict: false,
      },
    },
  };

  if (!initialized) {
    cornerstoneWADOImageLoader.webWorkerManager.initialize(config);
    initialized = true;
  }
}

export default function initWADOImageLoader(UserAuthenticationService) {
  cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
  cornerstoneWADOImageLoader.external.dicomParser = dicomParser;

  cornerstoneWADOImageLoader.configure({
    beforeSend: function(xhr) {
      const headers = UserAuthenticationService.getAuthorizationHeader();

      // Request loss-less compressed from server (if there is)
      const xhrRequestHeaders = {
        'accept': 'multipart/related; type="image/x-jls"'
      }

      if (headers && headers.Authorization) {
        xhrRequestHeaders.Authorization = headers.Authorization
      }

      return xhrRequestHeaders
    },
    errorInterceptor: error => {
      errorHandler.getHTTPErrorHandler(error)
    },
  });

  initWebWorkers();
}
