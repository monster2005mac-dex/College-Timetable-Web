package com.example.collegetimetable

import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.State
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.graphics.Color
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import kotlinx.coroutines.delay
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.time.temporal.WeekFields

/** Data representing a single day in the current week strip */
data class WeekDayInfo(
    val date: LocalDate,
    val dayOfWeekValue: Int, // 1 = Mon ... 7 = Sun
    val dayLetter: String, // "Mon", "Tue"
    val dateNumber: Int, // 16, 17
    val isToday: Boolean,
    val isPast: Boolean,
    val classColors: List<Color>
)

/** Full week header summary */
data class WeekInfo(
    val days: List<WeekDayInfo>,
    val monthYearLabel: String,
    val weekNumberLabel: String
)

/** Progress & countdown status for a single class slot with precision seconds */
sealed class ClassProgressStatus {
    data class Ongoing(
        val progressFraction: Float,
        val secondsRemaining: Long,
        val formattedRemaining: String
    ) : ClassProgressStatus()

    data class Finished(val finishedTime: String) : ClassProgressStatus()

    data class Upcoming(
        val secondsUntilStart: Long,
        val formattedUntilStart: String
    ) : ClassProgressStatus()

    object OtherDay : ClassProgressStatus()
}

/** Status summary for the Today Hero Card */
sealed class HeroStatus {
    data class OngoingClass(
        val entry: ClassEntry,
        val progressFraction: Float,
        val secondsRemaining: Long,
        val formattedRemaining: String
    ) : HeroStatus()

    data class NextClass(
        val entry: ClassEntry,
        val secondsUntilStart: Long,
        val formattedUntilStart: String
    ) : HeroStatus()

    object AllDoneToday : HeroStatus()
    object NoClassesScheduled : HeroStatus()
}

/** Formats minutes from midnight to string respecting 12-hour / 24-hour preference */
fun formatTime(minutes: Int, is24Hour: Boolean = false): String {
    val h = (minutes / 60) % 24
    val m = minutes % 60
    return if (is24Hour) {
        "%02d:%02d".format(h, m)
    } else {
        val suffix = if (h >= 12) "PM" else "AM"
        val h12 = if (h % 12 == 0) 12 else h % 12
        "%d:%02d %s".format(h12, m, suffix)
    }
}

/** Formats a minute duration cleanly e.g. "1h 15m" or "32m" */
fun formatDuration(minutes: Int): String {
    val hours = minutes / 60
    val mins = minutes % 60
    return when {
        hours > 0 && mins > 0 -> "${hours}h ${mins}m"
        hours > 0 -> "${hours}h"
        else -> "${mins}m"
    }
}

/** Formats live seconds ticker e.g. "14m 32s" or "1h 05m 12s" */
fun formatLiveSeconds(totalSeconds: Long): String {
    if (totalSeconds <= 0) return "0s"
    val hours = totalSeconds / 3600
    val mins = (totalSeconds % 3600) / 60
    val secs = totalSeconds % 60
    return when {
        hours > 0 -> "%dh %02dm %02ds".format(hours, mins, secs)
        mins > 0 -> "%dm %02ds".format(mins, secs)
        else -> "%ds".format(secs)
    }
}

/** Calculates current week days, ISO week number, and class indicator dots */
fun getWeekInfo(
    currentDate: LocalDate,
    entries: List<ClassEntry>,
    weekStartsMonday: Boolean = true
): WeekInfo {
    val firstDayOfWeek = if (weekStartsMonday) DayOfWeek.MONDAY else DayOfWeek.SUNDAY
    val weekFields = WeekFields.of(firstDayOfWeek, 1)

    val startOfWeek = currentDate.with(weekFields.dayOfWeek(), 1L)

    val days = (0 until 7).map { offset ->
        val date = startOfWeek.plusDays(offset.toLong())
        val dayEntries = entriesForDate(entries, date)
        val colors = dayEntries.take(3).map { classColors[it.colorIndex % classColors.size] }

        WeekDayInfo(
            date = date,
            dayOfWeekValue = dayVal,
            dayLetter = date.dayOfWeek.name.take(3).lowercase().replaceFirstChar { it.uppercase() },
            dateNumber = date.dayOfMonth,
            isToday = date.isEqual(currentDate),
            isPast = date.isBefore(currentDate),
            classColors = colors
        )
    }

    val monthYearStr = currentDate.format(DateTimeFormatter.ofPattern("MMMM yyyy"))
    val weekNum = currentDate.get(weekFields.weekOfWeekBasedYear())
    val weekLabel = "Week $weekNum"

    return WeekInfo(
        days = days,
        monthYearLabel = monthYearStr,
        weekNumberLabel = weekLabel
    )
}

/** Evaluates precision real-time class progress & countdown status relative to current LocalDateTime */
fun getClassProgressStatus(
    entry: ClassEntry,
    selectedDayVal: Int,
    todayVal: Int,
    currentDateTime: LocalDateTime
): ClassProgressStatus {
    if (selectedDayVal != todayVal) return ClassProgressStatus.OtherDay

    val nowMin = currentDateTime.hour * 60 + currentDateTime.minute
    val currentSecInMin = currentDateTime.second

    // Total seconds elapsed today since midnight
    val currentSecToday = (nowMin * 60) + currentSecInMin
    val startSec = entry.startMin * 60L
    val endSec = entry.endMin * 60L

    return when {
        currentSecToday in startSec until endSec -> {
            val totalSec = (endSec - startSec).coerceAtLeast(1)
            val elapsedSec = currentSecToday - startSec
            val fraction = (elapsedSec.toFloat() / totalSec.toFloat()).coerceIn(0f, 1f)
            val remainingSec = endSec - currentSecToday
            ClassProgressStatus.Ongoing(fraction, remainingSec, formatLiveSeconds(remainingSec))
        }
        currentSecToday >= endSec -> {
            ClassProgressStatus.Finished(formatTime(entry.endMin))
        }
        else -> {
            val secondsUntil = startSec - currentSecToday
            ClassProgressStatus.Upcoming(secondsUntil, formatLiveSeconds(secondsUntil))
        }
    }
}

/** Evaluates overall hero card status for Today with live seconds ticker */
fun getHeroStatus(todayEntries: List<ClassEntry>, currentDateTime: LocalDateTime): HeroStatus {
    if (todayEntries.isEmpty()) return HeroStatus.NoClassesScheduled

    val sorted = todayEntries.sortedBy { it.startMin }
    val currentSecToday = (currentDateTime.hour * 3600) + (currentDateTime.minute * 60) + currentDateTime.second

    // 1. Ongoing class check
    val ongoing = sorted.firstOrNull {
        val startSec = it.startMin * 60L
        val endSec = it.endMin * 60L
        currentSecToday in startSec until endSec
    }
    if (ongoing != null) {
        val startSec = ongoing.startMin * 60L
        val endSec = ongoing.endMin * 60L
        val totalSec = (endSec - startSec).coerceAtLeast(1)
        val elapsedSec = currentSecToday - startSec
        val fraction = (elapsedSec.toFloat() / totalSec.toFloat()).coerceIn(0f, 1f)
        val remainingSec = endSec - currentSecToday
        return HeroStatus.OngoingClass(ongoing, fraction, remainingSec, formatLiveSeconds(remainingSec))
    }

    // 2. Next upcoming class check
    val next = sorted.firstOrNull { (it.startMin * 60L) > currentSecToday }
    if (next != null) {
        val secondsUntil = (next.startMin * 60L) - currentSecToday
        return HeroStatus.NextClass(next, secondsUntil, formatLiveSeconds(secondsUntil))
    }

    // 3. All classes completed
    return HeroStatus.AllDoneToday
}

/** Lifecycle-aware real-time date/time ticker state updating every second */
@Composable
fun rememberCurrentDateTime(): State<LocalDateTime> {
    val dateTimeState = remember { mutableStateOf(LocalDateTime.now()) }
    val lifecycleOwner = LocalLifecycleOwner.current

    val isResumed = remember { mutableStateOf(true) }

    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_RESUME -> {
                    isResumed.value = true
                    dateTimeState.value = LocalDateTime.now()
                }
                Lifecycle.Event.ON_PAUSE, Lifecycle.Event.ON_STOP -> {
                    isResumed.value = false
                }
                else -> {}
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }

    LaunchedEffect(isResumed.value) {
        while (isResumed.value) {
            dateTimeState.value = LocalDateTime.now()
            delay(1000L) // Precision 1-second live ticker
        }
    }

    return dateTimeState
}
