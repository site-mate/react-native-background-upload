package com.sitemate.extensions

import android.content.Context
import com.sitemate.work.TaskCompletionNotifier
import com.sitemate.work.UploadManager
import net.gotev.uploadservice.UploadTask
import net.gotev.uploadservice.data.UploadNotificationConfig
import net.gotev.uploadservice.data.UploadTaskParameters
import net.gotev.uploadservice.logger.UploadServiceLogger
import net.gotev.uploadservice.observer.task.BroadcastEmitter

data class UploadTaskCreationParameters(
    val params: UploadTaskParameters,
    val notificationConfig: UploadNotificationConfig
)

/**
 * Creates a new task instance based on the requested task class in the intent.
 * @param creationParameters task creation params
 * @return task instance or null if the task class is not supported or invalid
 */
@Suppress("UNCHECKED_CAST")
fun Context.getUploadTask(
    creationParameters: UploadTaskCreationParameters,
    notificationId: Int
): UploadTask? {
    return try {
        val observers = arrayOf(
            BroadcastEmitter(this),
            TaskCompletionNotifier()
        )

        val taskClass = Class.forName(creationParameters.params.taskClass) as Class<out UploadTask>
        val uploadTask = taskClass.newInstance().apply {
            init(
                context = this@getUploadTask,
                taskParams = creationParameters.params,
                notificationConfig = creationParameters.notificationConfig,
                notificationId = notificationId,
                taskObservers = observers
            )
        }

        UploadServiceLogger.debug(
            component = UploadManager.TAG,
            uploadId = creationParameters.params.id,
            message = {
                "Successfully created new task with class: ${taskClass.name}"
            }
        )
        uploadTask
    } catch (exc: Throwable) {
        UploadServiceLogger.error(
            component = UploadManager.TAG,
            uploadId = "",
            exception = exc,
            message = {
                "Error while instantiating new task"
            }
        )
        null
    }
}
