package com.pocketbuddy.connector.retry

import android.app.job.JobParameters
import android.app.job.JobService

class WebhookRetryJobService : JobService() {
    override fun onStartJob(params: JobParameters): Boolean {
        WebhookRetryDispatcher(applicationContext).flush { shouldReschedule ->
            jobFinished(params, shouldReschedule)
        }
        return true
    }

    override fun onStopJob(params: JobParameters): Boolean = true
}
