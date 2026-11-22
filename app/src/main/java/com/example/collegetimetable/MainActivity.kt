@file:OptIn(ExperimentalMaterial3Api::class)

package com.example.collegetimetable

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.SnackbarResult
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.rememberAsyncImagePainter
import com.example.collegetimetable.components.FullMonthCalendarDialog
import com.example.collegetimetable.components.ThreeDInteractiveBackground
import com.example.collegetimetable.components.GlassAuthDialog
import com.example.collegetimetable.components.GlassBottomBar
import com.example.collegetimetable.components.GlassClassDialog
import com.example.collegetimetable.components.NavigationDestination
import com.example.collegetimetable.screens.AttendanceScreen
import com.example.collegetimetable.screens.ExamsScreen
import com.example.collegetimetable.screens.SettingsScreen
import com.example.collegetimetable.screens.TodayScreen
import com.example.collegetimetable.screens.WeekGridScreen
import dev.chrisbanes.haze.HazeState
import dev.chrisbanes.haze.haze
import kotlinx.coroutines.launch

class MainActivity : FragmentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        ClassReminderReceiver.createNotificationChannel(this)
        WidgetUpdateWorker.enqueuePeriodicWork(this)

        val shortcutAction = intent?.action

        setContent {
            TimetableTheme {
                TimetableApp(shortcutAction = shortcutAction)
            }
        }
    }
}

@Composable
fun TimetableApp(
    shortcutAction: String? = null,
    vm: TimetableViewModel = viewModel()
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()

    val attendanceRepo = remember { AttendanceRepository(context) }
    val examRepo = remember { ExamRepository(context) }

    var attendanceRecords by remember { mutableStateOf(attendanceRepo.loadAll()) }
    var exams by remember { mutableStateOf(examRepo.loadAll()) }

    val prefs = remember { context.getSharedPreferences("app_settings_prefs", Context.MODE_PRIVATE) }

    // Realtime Cloud Sync
    LaunchedEffect(Unit) {
        FirestoreSyncManager.startRealtimeSync(
            context = context,
            onEntriesUpdated = { list ->
                list.forEach { vm.upsert(it) }
            },
            onAttendanceUpdated = { map ->
                attendanceRecords = map
                attendanceRepo.saveAll(map)
            },
            onExamsUpdated = { list ->
                exams = list
                examRepo.saveAll(list)
            }
        )
    }

    // Persistent Settings
    var selectedWallpaper by remember {
        mutableStateOf(prefs.getString("selected_wallpaper", "builtin:0") ?: "builtin:0")
    }
    var is24Hour by remember {
        mutableStateOf(prefs.getBoolean("is_24_hour", false))
    }
    var weekStartsMonday by remember {
        mutableStateOf(prefs.getBoolean("week_starts_monday", true))
    }
    var remindersEnabled by remember {
        mutableStateOf(prefs.getBoolean("reminders_enabled", true))
    }
    var reminderLeadMinutes by remember {
        mutableIntStateOf(prefs.getInt("reminder_lead_minutes", 10))
    }

    var dynamicColors by remember { mutableStateOf(DynamicWallpaperColors()) }

    // Notification Permission Launcher for Android 13+
    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { _ -> }

    LaunchedEffect(remindersEnabled) {
        prefs.edit().putBoolean("reminders_enabled", remindersEnabled).apply()
        if (remindersEnabled && Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                permissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
    }

    LaunchedEffect(reminderLeadMinutes) {
        prefs.edit().putInt("reminder_lead_minutes", reminderLeadMinutes).apply()
    }

    LaunchedEffect(selectedWallpaper) {
        prefs.edit().putString("selected_wallpaper", selectedWallpaper).apply()
        dynamicColors = extractWallpaperColors(context, selectedWallpaper)
    }

    LaunchedEffect(is24Hour) {
        prefs.edit().putBoolean("is_24_hour", is24Hour).apply()
    }

    LaunchedEffect(weekStartsMonday) {
        prefs.edit().putBoolean("week_starts_monday", weekStartsMonday).apply()
    }

    val animatedAccent by animateColorAsState(targetValue = dynamicColors.accent, label = "accent")

    // State & Real-Time Time Ticker
    val hazeState = remember { HazeState() }
    val entries by vm.entries.collectAsStateWithLifecycle()
    val currentDateTime by rememberCurrentDateTime()
    val todayVal = remember(currentDateTime) { currentDateTime.dayOfWeek.value }

    // Schedule Alarms whenever entries or reminder settings update
    LaunchedEffect(entries, remindersEnabled, reminderLeadMinutes, is24Hour) {
        if (remindersEnabled) {
            AlarmScheduler.rescheduleAll(context, entries, reminderLeadMinutes, is24Hour)
        }
        TimetableWidget.refreshAll(context)
    }

    var selectedDayVal by rememberSaveable { mutableIntStateOf(todayVal) }
    var currentDestination by rememberSaveable { mutableStateOf(NavigationDestination.TODAY) }
    var dialogEntry by remember { mutableStateOf<ClassEntry?>(null) }
    var showFullCalendarDialog by remember { mutableStateOf(false) }
    var showAuthDialog by remember { mutableStateOf(false) }
    val snackbarHostState = remember { SnackbarHostState() }

    // Handle App Shortcut intents
    LaunchedEffect(shortcutAction) {
        when (shortcutAction) {
            "com.example.collegetimetable.ADD_CLASS" -> {
                currentDestination = NavigationDestination.TODAY
                dialogEntry = ClassEntry(
                    subject = "", room = "", teacher = "",
                    day = selectedDayVal, startMin = 9 * 60, endMin = 10 * 60, colorIndex = 0
                )
            }
            "com.example.collegetimetable.OPEN_ATTENDANCE" -> {
                currentDestination = NavigationDestination.ATTENDANCE
            }
            "com.example.collegetimetable.OPEN_EXAMS" -> {
                currentDestination = NavigationDestination.EXAMS
            }
        }
    }

    val weekInfo = remember(currentDateTime, entries, weekStartsMonday) {
        getWeekInfo(currentDateTime.toLocalDate(), entries, weekStartsMonday)
    }

    val photoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia()
    ) { uri: Uri? ->
        uri?.let {
            try {
                context.contentResolver.takePersistableUriPermission(
                    it,
                    Intent.FLAG_GRANT_READ_URI_PERMISSION
                )
            } catch (_: Exception) {}
            selectedWallpaper = it.toString()
        }
    }

    val statusBarPadding = WindowInsets.statusBars.asPaddingValues().calculateTopPadding()
    val navBarPadding = WindowInsets.navigationBars.asPaddingValues().calculateBottomPadding()

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        containerColor = Color.Transparent
    ) { paddingValues ->
        Box(modifier = Modifier.fillMaxSize().padding(paddingValues)) {
            // Full Screen Wallpaper & Animated Light Orbs Scrim
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .haze(hazeState)
            ) {
                WallpaperImage(selectedWallpaper = selectedWallpaper)
                AmbientAuraBackground(accentColor = animatedAccent)
                ThreeDInteractiveBackground(accentColor = animatedAccent)

                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(
                                    Color.Black.copy(alpha = 0.40f),
                                    Color.Black.copy(alpha = 0.60f),
                                    Color.Black.copy(alpha = 0.78f)
                                )
                            )
                        )
                )
            }

            // Main Content Area
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(top = statusBarPadding)
            ) {
                // Top Header Bar
                GlassPanel(
                    hazeState = hazeState,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 6.dp),
                    shape = RoundedCornerShape(24.dp),
                    shadowElevation = 8.dp
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 20.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(CircleShape)
                                .background(animatedAccent.copy(alpha = 0.3f))
                                .border(1.dp, animatedAccent, CircleShape)
                                .clickable { showFullCalendarDialog = true },
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.CalendarMonth,
                                contentDescription = "Full Month Calendar",
                                tint = animatedAccent,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column(
                            modifier = Modifier
                                .weight(1f)
                                .clickable { showFullCalendarDialog = true }
                        ) {
                            Text(
                                text = "College Timetable Pro",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "Smart Schedule & Full Calendar 📅",
                                style = MaterialTheme.typography.bodySmall
                            )
                        }

                        // Calendar Export Share Button
                        Box(
                            modifier = Modifier
                                .clip(CircleShape)
                                .background(Color.White.copy(alpha = 0.15f))
                                .border(1.dp, Color.White.copy(alpha = 0.3f), CircleShape)
                                .clickable { TimetableExporter.exportToIcs(context, entries) }
                                .padding(8.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Share,
                                contentDescription = "Export Calendar",
                                tint = Color.White,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                }

                // Screen Navigation Switcher
                AnimatedContent(
                    targetState = currentDestination,
                    transitionSpec = { fadeIn() togetherWith fadeOut() },
                    modifier = Modifier.weight(1f),
                    label = "screen_transition"
                ) { destination ->
                    when (destination) {
                        NavigationDestination.TODAY -> {
                            TodayScreen(
                                entries = entries,
                                weekInfo = weekInfo,
                                selectedDayVal = selectedDayVal,
                                currentDateTime = currentDateTime,
                                accentColor = animatedAccent,
                                hazeState = hazeState,
                                is24Hour = is24Hour,
                                onDaySelected = { selectedDayVal = it },
                                onAddClassClicked = {
                                    dialogEntry = ClassEntry(
                                        subject = "", room = "", teacher = "",
                                        day = selectedDayVal, startMin = 9 * 60, endMin = 10 * 60, colorIndex = 0
                                    )
                                },
                                onClassClicked = { dialogEntry = it },
                                onClassDeleteClicked = { entry ->
                                    vm.delete(entry.id)
                                    FirestoreSyncManager.deleteEntryFromCloud(entry.id)
                                    AlarmScheduler.cancelReminder(context, entry.id)
                                    coroutineScope.launch {
                                        TimetableWidget.refreshAll(context)
                                        val result = snackbarHostState.showSnackbar(
                                            message = "Deleted ${entry.subject}",
                                            actionLabel = "UNDO",
                                            duration = SnackbarDuration.Short
                                        )
                                        if (result == SnackbarResult.ActionPerformed) {
                                            vm.upsert(entry)
                                            FirestoreSyncManager.syncEntriesToCloud(context, entry)
                                            if (remindersEnabled) {
                                                AlarmScheduler.scheduleReminder(context, entry, reminderLeadMinutes, is24Hour)
                                            }
                                            TimetableWidget.refreshAll(context)
                                        }
                                    }
                                },
                                onOpenFullCalendar = { showFullCalendarDialog = true }
                            )
                        }

                        NavigationDestination.WEEK -> {
                            WeekGridScreen(
                                entries = entries,
                                accentColor = animatedAccent,
                                hazeState = hazeState,
                                is24Hour = is24Hour,
                                onClassClicked = { dialogEntry = it }
                            )
                        }

                        NavigationDestination.ATTENDANCE -> {
                            AttendanceScreen(
                                entries = entries,
                                attendanceRecords = attendanceRecords,
                                accentColor = animatedAccent,
                                hazeState = hazeState,
                                onAttendanceUpdated = { subject, updated ->
                                    val newMap = attendanceRecords.toMutableMap()
                                    newMap[subject] = updated
                                    attendanceRecords = newMap
                                    attendanceRepo.saveAll(newMap)
                                    FirestoreSyncManager.syncAttendanceToCloud(updated)
                                    coroutineScope.launch {
                                        TimetableWidget.refreshAll(context)
                                    }
                                }
                            )
                        }

                        NavigationDestination.EXAMS -> {
                            ExamsScreen(
                                exams = exams,
                                entries = entries,
                                accentColor = animatedAccent,
                                hazeState = hazeState,
                                onSaveExam = { savedExam ->
                                    val list = exams.toMutableList()
                                    val idx = list.indexOfFirst { it.id == savedExam.id }
                                    if (idx >= 0) list[idx] = savedExam else list.add(savedExam)
                                    exams = list
                                    examRepo.saveAll(list)
                                    FirestoreSyncManager.syncExamToCloud(savedExam)
                                },
                                onDeleteExam = { id ->
                                    val list = exams.filterNot { it.id == id }
                                    exams = list
                                    examRepo.saveAll(list)
                                    FirestoreSyncManager.deleteExamFromCloud(id)
                                }
                            )
                        }

                        NavigationDestination.SETTINGS -> {
                            SettingsScreen(
                                currentWallpaper = selectedWallpaper,
                                is24Hour = is24Hour,
                                weekStartsMonday = weekStartsMonday,
                                remindersEnabled = remindersEnabled,
                                reminderLeadMinutes = reminderLeadMinutes,
                                accentColor = animatedAccent,
                                hazeState = hazeState,
                                onWallpaperSelected = { selectedWallpaper = it },
                                onPickGalleryWallpaperClicked = {
                                    photoPickerLauncher.launch(
                                        PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                                    )
                                },
                                on24HourToggled = { is24Hour = it },
                                onWeekStartsMondayToggled = { weekStartsMonday = it },
                                onRemindersToggled = { remindersEnabled = it },
                                onReminderLeadMinutesSelected = { reminderLeadMinutes = it },
                                onOpenAuthClicked = { showAuthDialog = true },
                                onResetAllDataClicked = {
                                    AlarmScheduler.cancelAll(context, entries)
                                    entries.forEach { FirestoreSyncManager.deleteEntryFromCloud(it.id) }
                                    exams.forEach { FirestoreSyncManager.deleteExamFromCloud(it.id) }

                                    vm.clearAll()
                                    attendanceRepo.clearAll()
                                    examRepo.clearAll()
                                    prefs.edit().clear().apply()

                                    attendanceRecords = emptyMap()
                                    exams = emptyList()
                                    selectedWallpaper = "builtin:0"
                                    is24Hour = false
                                    weekStartsMonday = true
                                    remindersEnabled = true
                                    reminderLeadMinutes = 10

                                    coroutineScope.launch {
                                        TimetableWidget.refreshAll(context)
                                        snackbarHostState.showSnackbar("App reset to factory clean state ✨")
                                    }
                                }
                            )
                        }
                    }
                }
            }

            // Bottom Floating Glass Navigation Bar (Aligned with Phone Nav Inset)
            Box(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = navBarPadding)
            ) {
                GlassBottomBar(
                    currentDestination = currentDestination,
                    hazeState = hazeState,
                    accentColor = animatedAccent,
                    onDestinationSelected = { currentDestination = it }
                )
            }

            // Floating Action Button (FAB) (Aligned above Bottom Bar & Phone Nav Inset)
            if (currentDestination == NavigationDestination.TODAY) {
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(bottom = navBarPadding + 88.dp, end = 20.dp)
                ) {
                    GlassPanel(
                        hazeState = hazeState,
                        shape = CircleShape,
                        shadowElevation = 16.dp,
                        glassColor = animatedAccent,
                        glassAlphaTop = 0.45f,
                        glassAlphaBottom = 0.25f,
                        onClick = {
                            dialogEntry = ClassEntry(
                                subject = "", room = "", teacher = "",
                                day = selectedDayVal, startMin = 9 * 60, endMin = 10 * 60, colorIndex = 0
                            )
                        }
                    ) {
                        Box(
                            modifier = Modifier
                                .size(58.dp)
                                .background(
                                    Brush.radialGradient(
                                        colors = listOf(
                                            animatedAccent.copy(alpha = 0.6f),
                                            animatedAccent.copy(alpha = 0.2f)
                                        )
                                    )
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Add,
                                contentDescription = "Add class",
                                tint = Color.White,
                                modifier = Modifier.size(28.dp)
                            )
                        }
                    }
                }
            }
        }
    }

    // Auth Sign-In / Cloud Sync Glass Dialog
    if (showAuthDialog) {
        GlassAuthDialog(
            accentColor = animatedAccent,
            hazeState = hazeState,
            onSuccessLogin = {
                FirestoreSyncManager.startRealtimeSync(
                    context = context,
                    onEntriesUpdated = { list -> list.forEach { vm.upsert(it) } },
                    onAttendanceUpdated = { map -> attendanceRecords = map; attendanceRepo.saveAll(map) },
                    onExamsUpdated = { list -> exams = list; examRepo.saveAll(list) }
                )
                coroutineScope.launch {
                    snackbarHostState.showSnackbar("Signed in & Cloud Sync Active ⚡")
                }
            },
            onSignOut = {
                coroutineScope.launch {
                    snackbarHostState.showSnackbar("Signed out of Cloud Sync")
                }
            },
            onDismiss = { showAuthDialog = false }
        )
    }

    // Full Month Interactive Calendar Dialog
    if (showFullCalendarDialog) {
        FullMonthCalendarDialog(
            initialDate = currentDateTime.toLocalDate(),
            entries = entries,
            exams = exams,
            accentColor = animatedAccent,
            hazeState = hazeState,
            is24Hour = is24Hour,
            onDateSelected = { date ->
                selectedDayVal = date.dayOfWeek.value
            },
            onDismiss = { showFullCalendarDialog = false }
        )
    }

    // Add / Edit Glass Dialog
    dialogEntry?.let { entry ->
        GlassClassDialog(
            entry = entry,
            isNew = entries.none { it.id == entry.id },
            findConflict = vm::findConflict,
            accentColor = animatedAccent,
            hazeState = hazeState,
            is24Hour = is24Hour,
            onSaveEntries = { savedList ->
                savedList.forEach { saved ->
                    vm.upsert(saved)
                    FirestoreSyncManager.syncEntriesToCloud(context, saved)
                    if (remindersEnabled) {
                        AlarmScheduler.scheduleReminder(context, saved, reminderLeadMinutes, is24Hour)
                    }
                }
                coroutineScope.launch {
                    TimetableWidget.refreshAll(context)
                }
                dialogEntry = null
            },
            onDelete = {
                vm.delete(entry.id)
                FirestoreSyncManager.deleteEntryFromCloud(entry.id)
                AlarmScheduler.cancelReminder(context, entry.id)
                dialogEntry = null
                coroutineScope.launch {
                    TimetableWidget.refreshAll(context)
                    val result = snackbarHostState.showSnackbar(
                        message = "Deleted ${entry.subject}",
                        actionLabel = "UNDO",
                        duration = SnackbarDuration.Short
                    )
                    if (result == SnackbarResult.ActionPerformed) {
                        vm.upsert(entry)
                        FirestoreSyncManager.syncEntriesToCloud(context, entry)
                        if (remindersEnabled) {
                            AlarmScheduler.scheduleReminder(context, entry, reminderLeadMinutes, is24Hour)
                        }
                        TimetableWidget.refreshAll(context)
                    }
                }
            },
            onDismiss = { dialogEntry = null }
        )
    }
}

/** Background wallpaper renderer */
@Composable
fun WallpaperImage(selectedWallpaper: String) {
    if (selectedWallpaper.startsWith("builtin:")) {
        val index = selectedWallpaper.removePrefix("builtin:").toIntOrNull() ?: 0
        val resId = builtinWallpapers.getOrNull(index)?.first ?: builtinWallpapers[0].first
        Image(
            painter = painterResource(id = resId),
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxSize()
        )
    } else {
        val painter: Painter = rememberAsyncImagePainter(model = Uri.parse(selectedWallpaper))
        Image(
            painter = painter,
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxSize()
        )
    }
}
