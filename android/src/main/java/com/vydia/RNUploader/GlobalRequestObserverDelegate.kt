package com.vydia.RNUploader

import android.content.Context
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter
import net.gotev.uploadservice.data.UploadInfo
import net.gotev.uploadservice.exceptions.UploadError
import net.gotev.uploadservice.exceptions.UserCancelledUploadException
import net.gotev.uploadservice.network.ServerResponse
import net.gotev.uploadservice.observer.request.RequestObserverDelegate

class GlobalRequestObserverDelegate(reactContext: ReactApplicationContext) : RequestObserverDelegate {
  private val TAG = "UploadReceiver"

  private var reactContext: ReactApplicationContext = reactContext

  override fun onCompleted(context: Context, uploadInfo: UploadInfo) {
  }

  override fun onCompletedWhileNotObserving() {
  }

  override fun onError(context: Context, uploadInfo: UploadInfo, exception: Throwable) {
    var errorMessage = exception.message
    val params = Arguments.createMap()
    params.putString("id", uploadInfo.uploadId)

    when (exception) {
      is UserCancelledUploadException -> {
        errorMessage = "User cancelled upload"
      }
      is UploadError -> {
        errorMessage = "responseCode=${exception.serverResponse.code} responseBody=${exception.serverResponse.bodyString}"
        Log.e(TAG, "Error, upload error: ${exception.serverResponse.code} ${exception.serverResponse.bodyString}")
      }
    }

    params.putString("error", errorMessage)
    sendEvent("error", params)
  }

  override fun onProgress(context: Context, uploadInfo: UploadInfo) {
    val params = Arguments.createMap()
    params.putString("id", uploadInfo.uploadId)
    params.putInt("progress", uploadInfo.progressPercent) //0-100

    sendEvent("progress", params)
  }

  override fun onSuccess(context: Context, uploadInfo: UploadInfo, serverResponse: ServerResponse) {
    val headers = Arguments.createMap()
    for ((key, value) in serverResponse.headers) {
      headers.putString(key, value)
    }
    val params = Arguments.createMap()
    params.putString("id", uploadInfo.uploadId)
    params.putInt("responseCode", serverResponse.code)
    params.putString("responseBody", serverResponse.bodyString)
    params.putMap("responseHeaders", headers)
    sendEvent("completed", params)
  }

  /**
   * Sends an event to the JS module.
   */
  private fun sendEvent(eventName: String, params: WritableMap?) {
    reactContext?.getJSModule(RCTDeviceEventEmitter::class.java)?.emit("RNFileUploader-$eventName", params)
            ?: Log.e(TAG, "sendEvent() failed due reactContext == null!")
  }
}
