package com.pocketbuddy.connector.retry

import android.app.job.JobInfo
import android.app.job.JobScheduler
import android.content.ComponentName
import android.content.Context

object RetryScheduler {
    private const val JOB_ID = 6243

    fun schedule(context: Context) {
        val appContext = context.applicationContext
        val jobScheduler = appContext.getSystemService(JobScheduler::class.java)
        val jobInfo = JobInfo.Builder(
            JOB_ID,
            ComponentName(appContext, WebhookRetryJobService::class.java),
        )
            .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
            .setMinimumLatency(1_000L)
            .setOverrideDeadline(15_000L)
            .setBackoffCriteria(30_000L, JobInfo.BACKOFF_POLICY_EXPONENTIAL)
            .build()

        jobScheduler.schedule(jobInfo)
    }
}
