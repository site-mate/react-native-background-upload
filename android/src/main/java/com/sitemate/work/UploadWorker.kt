package com.sitemate.uploader

import android.content.Context
import androidx.work.Worker
import androidx.work.WorkerParameters
import com.sitemate.uploader.extensions.PARAM_KEY_NOTIF_CONFIG
import com.sitemate.uploader.extensions.PARAM_KEY_TASK_PARAMS
import com.sitemate.uploader.extensions.toUploadNotificationConfig
import com.sitemate.uploader.extensions.toUploadTaskParameters

class UploadWorker(val context: Context, params: WorkerParameters): Worker(context, params) {

  override fun doWork(): Result {
    val taskParamsStr = inputData.getString(PARAM_KEY_TASK_PARAMS) ?: return Result.failure()
    val notifConfigStr = inputData.getString(PARAM_KEY_NOTIF_CONFIG) ?: return Result.failure()

    UploadManager.startUpload(context, taskParamsStr.toUploadTaskParameters(), notifConfigStr.toUploadNotificationConfig())
    return Result.success()
  }
}
