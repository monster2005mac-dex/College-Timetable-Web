package com.example.collegetimetable.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.collegetimetable.ClassEntry
import com.example.collegetimetable.GlassPanel
import com.example.collegetimetable.classColors
import com.example.collegetimetable.dayShort
import com.example.collegetimetable.entriesForDate
import com.example.collegetimetable.formatTime
import dev.chrisbanes.haze.HazeState
import java.time.LocalDate

@Composable
fun WeekGridScreen(
    entries: List<ClassEntry>,
    accentColor: Color,
    hazeState: HazeState,
    is24Hour: Boolean = false,
    onClassClicked: (ClassEntry) -> Unit
) {
    val startHour = 8 // 8 AM
    val endHour = 20  // 8 PM
    val hourHeight = 56.dp
    val today = LocalDate.now()
    val monday = today.minusDays((today.dayOfWeek.value - 1).toLong())

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 90.dp)
    ) {
        // Section Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Full Week Matrix Overview",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = "${entries.size} Total Classes",
                style = MaterialTheme.typography.bodySmall,
                color = accentColor,
                fontWeight = FontWeight.Bold
            )
        }

        GlassPanel(
            hazeState = hazeState,
            modifier = Modifier.fillMaxSize(),
            shape = RoundedCornerShape(24.dp),
            shadowElevation = 10.dp
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                // Header Row: Days Mon-Sun
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color.White.copy(alpha = 0.1f))
                        .padding(vertical = 10.dp)
                ) {
                    Box(modifier = Modifier.width(50.dp)) // Time column spacer
                    dayShort.forEach { dayLabel ->
                        Box(
                            modifier = Modifier.weight(1f),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = dayLabel,
                                style = MaterialTheme.typography.bodySmall,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        }
                    }
                }

                // Grid Body with Scroll
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState())
                ) {
                    Row(modifier = Modifier.fillMaxWidth()) {
                        // Time Scale Column
                        Column(modifier = Modifier.width(50.dp)) {
                            (startHour..endHour).forEach { hour ->
                                Box(
                                    modifier = Modifier
                                        .height(hourHeight)
                                        .fillMaxWidth(),
                                    contentAlignment = Alignment.TopCenter
                                ) {
                                    Text(
                                        text = formatTime(hour * 60, is24Hour),
                                        style = MaterialTheme.typography.bodySmall,
                                        fontSize = 9.sp,
                                        color = Color.White.copy(alpha = 0.6f),
                                        modifier = Modifier.padding(top = 2.dp)
                                    )
                                }
                            }
                        }

                        // 7 Day Columns
                        Row(modifier = Modifier.weight(1f)) {
                            (1..7).forEach { dayNum ->
                                val dayEntries = entriesForDate(entries, monday.plusDays((dayNum - 1).toLong()))

                                Box(
                                    modifier = Modifier
                                        .weight(1f)
                                        .height(hourHeight * (endHour - startHour + 1))
                                        .border(0.5.dp, Color.White.copy(alpha = 0.08f))
                                ) {
                                    // Class blocks positioned vertically
                                    dayEntries.forEach { entry ->
                                        val startMinutesFrom8AM = (entry.startMin - (startHour * 60)).coerceAtLeast(0)
                                        val durationMinutes = (entry.endMin - entry.startMin).coerceAtLeast(30)

                                        val topOffset = (startMinutesFrom8AM.toFloat() / 60f) * hourHeight.value
                                        val blockHeight = (durationMinutes.toFloat() / 60f) * hourHeight.value

                                        val color = classColors[entry.colorIndex % classColors.size]

                                        Box(
                                            modifier = Modifier
                                                .padding(top = topOffset.dp, start = 2.dp, end = 2.dp)
                                                .height(blockHeight.dp)
                                                .fillMaxWidth()
                                                .clip(RoundedCornerShape(8.dp))
                                                .background(color.copy(alpha = 0.45f))
                                                .border(1.dp, color, RoundedCornerShape(8.dp))
                                                .clickable { onClassClicked(entry) }
                                                .padding(4.dp)
                                        ) {
                                            Column {
                                                Text(
                                                    text = entry.subject,
                                                    style = MaterialTheme.typography.bodySmall,
                                                    fontSize = 10.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = Color.White,
                                                    maxLines = 2,
                                                    overflow = TextOverflow.Ellipsis
                                                )
                                                if (entry.room.isNotEmpty() && blockHeight > 40) {
                                                    Text(
                                                        text = entry.room,
                                                        style = MaterialTheme.typography.bodySmall,
                                                        fontSize = 8.sp,
                                                        color = Color.White.copy(alpha = 0.8f)
                                                    )
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
