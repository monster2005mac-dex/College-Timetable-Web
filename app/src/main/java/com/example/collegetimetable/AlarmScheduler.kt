package com.example.collegetimetable

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.temporal.TemporalAdjusters

object AlarmScheduler {

    fun scheduleReminder(context: Context, entry: ClassEntry, leadMinutes: Int = 10, is24Hour: Boolean = false) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

        if (entry.isCancelled) {
            cancelReminder(context, entry.id)
            return
        }

        val now = LocalDateTime.now()
        val startHour = entry.startMin / 60
        val startMinute = entry.startMin % 60
        val triggerDateTime = if (entry.dateIso != null) {
            val date = runCatching { LocalDate.parse(entry.dateIso) }.getOrNull() ?: return
            date.atTime(startHour, startMinute).minusMinutes(leadMinutes.toLong())
                .takeIf { !it.isBefore(now) } ?: return
        } else {
            val targetDayOfWeek = DayOfWeek.of(entry.day) // 1=Mon ... 7=Sun
            var nextTrigger = now.with(TemporalAdjusters.nextOrSame(targetDayOfWeek))
                .withHour(startHour)
                .withMinute(startMinute)
                .withSecond(0)
                .minusMinutes(leadMinutes.toLong())
            if (nextTrigger.isBefore(now)) nextTrigger = nextTrigger.plusWeeks(1)
            nextTrigger
        }

        val triggerMillis = triggerDateTime.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()

        val notificationId = entry.id.hashCode()
        val intent = Intent(context, ClassReminderReceiver::class.java).apply {
            putExtra(ClassReminderReceiver.EXTRA_SUBJECT, entry.subject)
            putExtra(ClassReminderReceiver.EXTRA_ROOM, entry.room)
            putExtra(ClassReminderReceiver.EXTRA_TEACHER, entry.teacher)
            putExtra(ClassReminderReceiver.EXTRA_START_TIME, formatTime(entry.startMin, is24Hour))
            putExtra(ClassReminderReceiver.EXTRA_NOTIFICATION_ID, notificationId)
        }

        val pendingIntent = PendingIntent.getBroadcast(
            context,
            notificationId,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (alarmManager.canScheduleExactAlarms()) {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerMillis, pendingIntent)
                } else {
                    alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerMillis, pendingIntent)
                }
            } else {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerMillis, pendingIntent)
            }
        } catch (_: Exception) {
            // Alarm permissions / system restrictions
        }
    }

    fun cancelReminder(context: Context, entryId: String) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val notificationId = entryId.hashCode()
        val intent = Intent(context, ClassReminderReceiver::class.java)
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            notificationId,
            intent,
            PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
        )
        if (pendingIntent != null) {
            alarmManager.cancel(pendingIntent)
            pendingIntent.cancel()
        }
    }

    fun cancelAll(context: Context, entries: List<ClassEntry>) {
        entries.forEach { cancelReminder(context, it.id) }
    }

    fun rescheduleAll(context: Context, entries: List<ClassEntry>, leadMinutes: Int = 10, is24Hour: Boolean = false) {
        entries.forEach { entry ->
            scheduleReminder(context, entry, leadMinutes, is24Hour)
        }
    }
}
