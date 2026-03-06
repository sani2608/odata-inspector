/**
 * DevTools Services
 *
 * Services for interacting with Chrome DevTools APIs.
 */

export type {
    CapturedRequest,
    DetectedRequestType,
    NetworkCaptureCallbacks
} from './networkCapture';
export {
    cleanupNetworkCapture,
    detectODataRequestType,
    getCapturedMetadata,
    initNetworkCapture,
    initStandaloneCapture
} from './networkCapture';
