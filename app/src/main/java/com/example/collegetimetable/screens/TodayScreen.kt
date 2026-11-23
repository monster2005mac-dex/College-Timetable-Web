package com.example.collegetimetable.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.EventNote
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.collegetimetable.ClassEntry
import com.example.collegetimetable.GlassPanel
import com.example.collegetimetable.HeroStatus
import com.example.collegetimetable.WeekInfo
import com.example.collegetimetable.components.CurrentWeekStrip
import com.example.collegetimetable.components.HeroNowCard
import com.example.collegetimetable.components.TimelineClassCard
import com.example.collegetimetable.dayNames
import com.example.collegetimetable.entriesForDate
import com.example.collegetimetable.getClassProgressStatus
import com.example.collegetimetable.getHeroStatus
import dev.chrisbanes.haze.HazeState
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import java.time.LocalDateTime

@Composable
fun TodayScreen(
    entries: List<ClassEntry>,
    weekInfo: WeekInfo,
    selectedDayVal: Int,
    currentDateTime: LocalDateTime,
    accentColor: Color,
    hazeState: HazeState,
    is24Hour: Boolean = false,
    onDaySelected: (Int) -> Unit,
    onAddClassClicked: () -> Unit,
    onClassClicked: (ClassEntry) -> Unit,
    onClassDeleteClicked: (ClassEntry) -> Unit,
    onOpenFullCalendar: () -> Unit = {}
) {
    val coroutineScope = rememberCoroutineScope()
    val todayVal = remember(currentDateTime) { currentDateTime.dayOfWeek.value }
    val nowMin = remember(currentDateTime) { currentDateTime.hour * 60 + currentDateTime.minute }

    val pagerState = rememberPagerState(
        initialPage = (selectedDayVal - 1).coerceIn(0, 6),
        pageCount = { 7 }
    )

    // Sync Pager Settled State to Selected Day without jitter during gesture
    LaunchedEffect(pagerState) {
        snapshotFlow { pagerState.settledPage }.collectLatest { page ->
            val newDay = page + 1
            if (newDay != selectedDayVal) {
                onDaySelected(newDay)
            }
        }
    }

    // Sync Selected Day changes from Strip/Calendar to Pager
    LaunchedEffect(selectedDayVal) {
        val targetPage = selectedDayVal - 1
        if (pagerState.settledPage != targetPage && !pagerState.isScrollInProgress) {
            pagerState.animateScrollToPage(targetPage)
        }
    }

    val todayEntries = entriesForDate(entries, currentDateTime.toLocalDate())
    val todayCompletedCount = todayEntries.count { nowMin >= it.endMin }

    Column(modifier = Modifier.fillMaxSize()) {
        CurrentWeekStrip(
            weekInfo = weekInfo,
            selectedDayVal = selectedDayVal,
            accentColor = accentColor,
            hazeState = hazeState,
            todayCompletedCount = todayCompletedCount,
            todayTotalCount = todayEntries.size,
            onDaySelected = { day ->
                coroutineScope.launch {
                    pagerState.animateScrollToPage(day - 1)
                }
            },
            onJumpToToday = {
                coroutineScope.launch {
                    pagerState.animateScrollToPage(todayVal - 1)
                }
            },
            onOpenFullCalendar = onOpenFullCalendar
        )

        HorizontalPager(
            state = pagerState,
            modifier = Modifier.weight(1f)
        ) { pageIndex ->
            val dayVal = pageIndex + 1
            val monday = currentDateTime.toLocalDate().minusDays((currentDateTime.dayOfWeek.value - 1).toLong())
            val pageDate = monday.plusDays((dayVal - 1).toLong())
            val dayEntries = entriesForDate(entries, pageDate)
            val isSelectedToday = dayVal == todayVal

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 100.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                if (isSelectedToday) {
                    item(key = "genz_3d_badge") {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 2.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Box(
                                modifier = Modifier
                                    .clip(CircleShape)
                                    .background(accentColor.copy(alpha = 0.20f))
                                    .border(1.dp, accentColor, CircleShape)
                                    .padding(horizontal = 14.dp, vertical = 4.dp)
                            ) {
                                Text(
                                    text = "GEN Z 3D STRUCTURAL TIMETABLE ⚡ • CLOUD SYNC ACTIVE",
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = accentColor,
                                    fontSize = 10.sp
                                )
                            }
                        }
                    }
                }

                if (isSelectedToday && dayEntries.isNotEmpty()) {
                    item(key = "hero_now_card") {
                        val heroStatus = getHeroStatus(todayEntries, currentDateTime)
                        HeroNowCard(
                            status = heroStatus,
                            hazeState = hazeState,
                            accentColor = accentColor,
                            is24Hour = is24Hour,
                            onClick = {
                                if (heroStatus is HeroStatus.OngoingClass) {
                                    onClassClicked(heroStatus.entry)
                                } else if (heroStatus is HeroStatus.NextClass) {
                                    onClassClicked(heroStatus.entry)
                                }
                            }
                        )
                    }
                }

                if (dayEntries.isEmpty()) {
                    item(key = "empty_state") {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 40.dp, start = 16.dp, end = 16.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            GlassPanel(
                                hazeState = hazeState,
                                modifier = Modifier.fillMaxWidth(0.9f),
                                shape = RoundedCornerShape(28.dp),
                                shadowElevation = 10.dp
                            ) {
                                Column(
                                    modifier = Modifier.padding(32.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(64.dp)
                                            .clip(CircleShape)
                                            .background(accentColor.copy(alpha = 0.25f))
                                            .border(1.dp, accentColor, CircleShape),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.EventNote,
                                            contentDescription = null,
                                            tint = accentColor,
                                            modifier = Modifier.size(32.dp)
                                        )
                                    }

                                    Spacer(modifier = Modifier.height(16.dp))

                                    Text(
                                        text = "No classes on ${dayNames[dayVal - 1]}",
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.Bold,
                                        textAlign = TextAlign.Center
                                    )

                                    Spacer(modifier = Modifier.height(6.dp))

                                    Text(
                                        text = "Your schedule is clear! Tap below to add a lecture or lab slot.",
                                        style = MaterialTheme.typography.bodySmall,
                                        textAlign = TextAlign.Center,
                                        color = Color.White.copy(alpha = 0.75f)
                                    )

                                    Spacer(modifier = Modifier.height(20.dp))

                                    Box(
                                        modifier = Modifier
                                            .clip(CircleShape)
                                            .background(accentColor)
                                            .clickable(onClick = onAddClassClicked)
                                            .padding(horizontal = 20.dp, vertical = 10.dp)
                                    ) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Icon(
                                                imageVector = Icons.Default.Add,
                                                contentDescription = null,
                                                tint = Color.White,
                                                modifier = Modifier.size(18.dp)
                                            )
                                            Spacer(modifier = Modifier.width(6.dp))
                                            Text(
                                                text = "Add Class",
                                                style = MaterialTheme.typography.bodyMedium,
                                                fontWeight = FontWeight.Bold,
                                                color = Color.White
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                } else {
                    itemsIndexed(dayEntries, key = { _, item -> item.id }) { index, entry ->
                        val progressStatus = getClassProgressStatus(
                            entry = entry,
                            selectedDayVal = dayVal,
                            todayVal = todayVal,
                            currentDateTime = currentDateTime
                        )

                        AnimatedVisibility(
                            visible = true,
                            enter = fadeIn() + slideInVertically(initialOffsetY = { 30 * (index + 1) })
                        ) {
                            TimelineClassCard(
                                entry = entry,
                                progressStatus = progressStatus,
                                hazeState = hazeState,
                                is24Hour = is24Hour,
                                onClick = { onClassClicked(entry) },
                                onDelete = { onClassDeleteClicked(entry) }
                            )
                        }
                    }
                }
            }
        }
    }
}
