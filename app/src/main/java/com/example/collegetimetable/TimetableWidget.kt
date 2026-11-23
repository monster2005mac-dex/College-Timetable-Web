package com.example.collegetimetable

import android.content.Context
import android.content.Intent
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.LocalSize
import androidx.glance.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.lazy.LazyColumn
import androidx.glance.appwidget.lazy.items
import androidx.glance.appwidget.provideContent
import androidx.glance.appwidget.updateAll
import androidx.glance.background
import androidx.glance.color.ColorProvider
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxHeight
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.width
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import java.time.LocalDate
import java.time.LocalTime

class TimetableWidget : GlanceAppWidget() {

    companion object {
        private val SMALL = DpSize(100.dp, 80.dp)
        private val MEDIUM = DpSize(250.dp, 100.dp)
        private val LARGE = DpSize(250.dp, 200.dp)

        suspend fun refreshAll(context: Context) {
            try {
                TimetableWidget().updateAll(context)
            } catch (_: Exception) {}
        }
    }

    override val sizeMode: SizeMode = SizeMode.Responsive(setOf(SMALL, MEDIUM, LARGE))

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val repo = TimetableRepository(context)
        val attendanceRepo = AttendanceRepository(context)

        val entries = repo.loadAllSafe(context)
        val attendance = attendanceRepo.loadAll()

        val today = LocalDate.now()
        val nowMin = LocalTime.now().let { it.hour * 60 + it.minute }

        val todayEntries = entriesForDate(entries, today)
        val ongoing = todayEntries.firstOrNull { nowMin in it.startMin until it.endMin }
        val next = todayEntries.firstOrNull { nowMin < it.startMin }

        val totalAttended = attendance.values.sumOf { it.attended }
        val totalConducted = attendance.values.sumOf { it.totalConducted }
        val overallPct = if (totalConducted == 0) 100f else (totalAttended.toFloat() / totalConducted.toFloat()) * 100f

        provideContent {
            val size = LocalSize.current
            when {
                size.height >= LARGE.height -> {
                    LargeWidgetContent(
                        ongoing = ongoing,
                        next = next,
                        todayEntries = todayEntries,
                        overallPct = overallPct
                    )
                }
                size.width >= MEDIUM.width -> {
                    MediumWidgetContent(
                        ongoing = ongoing,
                        next = next,
                        totalToday = todayEntries.size
                    )
                }
                else -> {
                    SmallWidgetContent(
                        ongoing = ongoing,
                        next = next
                    )
                }
            }
        }
    }

    private fun TimetableRepository.loadAllSafe(context: Context): List<ClassEntry> {
        return try { load() } catch (_: Exception) { emptyList() }
    }

    // --- Small Size Layout (2x1, 2x2) ---
    @Composable
    private fun SmallWidgetContent(ongoing: ClassEntry?, next: ClassEntry?) {
        Column(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(Color(0xFF161324))
                .padding(12.dp)
                .clickable(actionStartActivity<MainActivity>()),
            verticalAlignment = Alignment.CenterVertically
        ) {
            when {
                ongoing != null -> {
                    Text(
                        text = "IN SESSION ⚡",
                        style = TextStyle(
                            color = ColorProvider(Color(0xFFFF80AB), Color(0xFFFF80AB)),
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold
                        )
                    )
                    Spacer(modifier = GlanceModifier.height(2.dp))
                    Text(
                        text = ongoing.subject,
                        style = TextStyle(
                            color = ColorProvider(Color.White, Color.White),
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold
                        )
                    )
                    Text(
                        text = "Room ${ongoing.room}",
                        style = TextStyle(
                            color = ColorProvider(Color(0xFFD1C4E9), Color(0xFFD1C4E9)),
                            fontSize = 10.sp
                        )
                    )
                }

                next != null -> {
                    Text(
                        text = "UP NEXT 🔥",
                        style = TextStyle(
                            color = ColorProvider(Color(0xFF80D8FF), Color(0xFF80D8FF)),
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold
                        )
                    )
                    Spacer(modifier = GlanceModifier.height(2.dp))
                    Text(
                        text = next.subject,
                        style = TextStyle(
                            color = ColorProvider(Color.White, Color.White),
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold
                        )
                    )
                    Text(
                        text = "Starts ${formatTime(next.startMin)}",
                        style = TextStyle(
                            color = ColorProvider(Color(0xFFB0BEC5), Color(0xFFB0BEC5)),
                            fontSize = 10.sp
                        )
                    )
                }

                else -> {
                    Text(
                        text = "Free Time 🎉",
                        style = TextStyle(
                            color = ColorProvider(Color.White, Color.White),
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold
                        )
                    )
                    Text(
                        text = "No classes scheduled",
                        style = TextStyle(
                            color = ColorProvider(Color(0xFFB0BEC5), Color(0xFFB0BEC5)),
                            fontSize = 10.sp
                        )
                    )
                }
            }
        }
    }

    // --- Medium Size Layout (4x2) ---
    @Composable
    private fun MediumWidgetContent(ongoing: ClassEntry?, next: ClassEntry?, totalToday: Int) {
        Column(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(Color(0xFF161324))
                .padding(14.dp)
                .clickable(actionStartActivity<MainActivity>())
        ) {
            Row(
                modifier = GlanceModifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "College Timetable Pro",
                    style = TextStyle(
                        color = ColorProvider(Color.White, Color.White),
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold
                    )
                )
                Spacer(modifier = GlanceModifier.defaultWeight())
                Text(
                    text = "$totalToday Classes Today",
                    style = TextStyle(
                        color = ColorProvider(Color(0xFFE0B0FF), Color(0xFFE0B0FF)),
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold
                    )
                )
            }

            Spacer(modifier = GlanceModifier.height(8.dp))

            when {
                ongoing != null -> {
                    Column(
                        modifier = GlanceModifier
                            .fillMaxWidth()
                            .background(Color(0xFF231E38))
                            .padding(10.dp)
                    ) {
                        Text(
                            text = "LOCKED IN 🔒 • IN SESSION ⚡",
                            style = TextStyle(
                                color = ColorProvider(Color(0xFFFF80AB), Color(0xFFFF80AB)),
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold
                            )
                        )
                        Text(
                            text = ongoing.subject,
                            style = TextStyle(
                                color = ColorProvider(Color.White, Color.White),
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold
                            )
                        )
                        Text(
                            text = "${formatTime(ongoing.startMin)} – ${formatTime(ongoing.endMin)} • Room ${ongoing.room}",
                            style = TextStyle(
                                color = ColorProvider(Color(0xFFD1C4E9), Color(0xFFD1C4E9)),
                                fontSize = 11.sp
                            )
                        )
                    }
                }

                next != null -> {
                    Column(
                        modifier = GlanceModifier
                            .fillMaxWidth()
                            .background(Color(0xFF1F1C30))
                            .padding(10.dp)
                    ) {
                        Text(
                            text = "UP NEXT 🔥",
                            style = TextStyle(
                                color = ColorProvider(Color(0xFF80D8FF), Color(0xFF80D8FF)),
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold
                            )
                        )
                        Text(
                            text = next.subject,
                            style = TextStyle(
                                color = ColorProvider(Color.White, Color.White),
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold
                            )
                        )
                        Text(
                            text = "Starts at ${formatTime(next.startMin)} • Room ${next.room}",
                            style = TextStyle(
                                color = ColorProvider(Color(0xFFB0BEC5), Color(0xFFB0BEC5)),
                                fontSize = 11.sp
                            )
                        )
                    }
                }

                else -> {
                    Text(
                        text = "All Clear for Today! 🎉",
                        style = TextStyle(
                            color = ColorProvider(Color(0xFF81C784), Color(0xFF81C784)),
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold
                        )
                    )
                }
            }
        }
    }

    // --- Large Size Layout with Interactive LazyColumn (4x4) ---
    @Composable
    private fun LargeWidgetContent(
        ongoing: ClassEntry?,
        next: ClassEntry?,
        todayEntries: List<ClassEntry>,
        overallPct: Float
    ) {
        Column(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(Color(0xFF161324))
                .padding(14.dp)
        ) {
            // Header Row
            Row(
                modifier = GlanceModifier
                    .fillMaxWidth()
                    .clickable(actionStartActivity<MainActivity>()),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "College Timetable Pro",
                    style = TextStyle(
                        color = ColorProvider(Color.White, Color.White),
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold
                    )
                )
                Spacer(modifier = GlanceModifier.defaultWeight())
                Text(
                    text = "Bunk Stats: %.1f%%".format(overallPct),
                    style = TextStyle(
                        color = ColorProvider(Color(0xFF81C784), Color(0xFF81C784)),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                )
            }

            Spacer(modifier = GlanceModifier.height(8.dp))

            // LazyColumn Schedule Collection
            if (todayEntries.isEmpty()) {
                Box(
                    modifier = GlanceModifier
                        .fillMaxSize()
                        .clickable(actionStartActivity<MainActivity>()),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "No classes scheduled for today! 🎉",
                        style = TextStyle(
                            color = ColorProvider(Color(0xFFB0BEC5), Color(0xFFB0BEC5)),
                            fontSize = 12.sp
                        )
                    )
                }
            } else {
                LazyColumn(modifier = GlanceModifier.fillMaxSize()) {
                    items(todayEntries, itemId = { it.id.hashCode().toLong() }) { entry ->
                        val isOngoing = ongoing?.id == entry.id
                        val isNext = next?.id == entry.id

                        Column(
                            modifier = GlanceModifier
                                .fillMaxWidth()
                                .padding(vertical = 3.dp)
                                .background(
                                    when {
                                        isOngoing -> Color(0xFF2C2442)
                                        isNext -> Color(0xFF221F36)
                                        else -> Color(0xFF1B182B)
                                    }
                                )
                                .padding(8.dp)
                                .clickable(actionStartActivity<MainActivity>())
                        ) {
                            Row(
                                modifier = GlanceModifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = entry.subject,
                                    style = TextStyle(
                                        color = ColorProvider(Color.White, Color.White),
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                )
                                Spacer(modifier = GlanceModifier.defaultWeight())
                                if (isOngoing) {
                                    Text(
                                        text = "ONGOING ⚡",
                                        style = TextStyle(
                                            color = ColorProvider(Color(0xFFFF80AB), Color(0xFFFF80AB)),
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                    )
                                } else if (isNext) {
                                    Text(
                                        text = "NEXT 🔥",
                                        style = TextStyle(
                                            color = ColorProvider(Color(0xFF80D8FF), Color(0xFF80D8FF)),
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                    )
                                }
                            }

                            Text(
                                text = "${formatTime(entry.startMin)} – ${formatTime(entry.endMin)} • Room ${entry.room}",
                                style = TextStyle(
                                    color = ColorProvider(Color(0xFFB0BEC5), Color(0xFFB0BEC5)),
                                    fontSize = 10.sp
                                )
                            )
                        }
                    }
                }
            }
        }
    }
}

class TimetableWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = TimetableWidget()
}
