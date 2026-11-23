package com.example.collegetimetable

import androidx.compose.ui.graphics.Color
import java.time.LocalDate
import java.util.UUID

/** One class slot. day: 1 = Monday ... 7 = Sunday. Times are minutes since midnight. */
data class ClassEntry(
    val id: String = UUID.randomUUID().toString(),
    val subject: String,
    val room: String,
    val teacher: String,
    val day: Int,
    val startMin: Int,
    val endMin: Int,
    val colorIndex: Int,
    val dateIso: String? = null,
    val overrideOfId: String? = null,
    val isCancelled: Boolean = false
)

fun entriesForDate(entries: List<ClassEntry>, date: LocalDate): List<ClassEntry> {
    val dateIso = date.toString()
    val datedEntries = entries.filter { it.dateIso == dateIso }
    val overriddenIds = datedEntries.mapNotNull { it.overrideOfId }.toSet()

    return entries.filter { entry ->
        if (entry.dateIso != null) {
            entry.dateIso == dateIso && !entry.isCancelled
        } else {
            entry.day == date.dayOfWeek.value && entry.id !in overriddenIds && !entry.isCancelled
        }
    }.sortedBy { it.startMin }
}

val dayNames = listOf("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")
val dayShort = listOf("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")

val classColors = listOf(
    Color(0xFF3F51B5), Color(0xFFE91E63), Color(0xFF009688), Color(0xFFFF9800),
    Color(0xFF9C27B0), Color(0xFF4CAF50), Color(0xFF795548), Color(0xFF00BCD4)
)

fun formatTime(minutes: Int): String {
    val h = minutes / 60
    val m = minutes % 60
    val suffix = if (h >= 12) "PM" else "AM"
    val h12 = if (h % 12 == 0) 12 else h % 12
    return "%d:%02d %s".format(h12, m, suffix)
}
