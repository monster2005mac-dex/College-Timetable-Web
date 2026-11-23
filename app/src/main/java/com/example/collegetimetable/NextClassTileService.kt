package com.example.collegetimetable

import android.app.PendingIntent
import android.content.Intent
import android.os.Build
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService
import java.time.LocalDate
import java.time.LocalTime

class NextClassTileService : TileService() {

    override fun onStartListening() {
        super.onStartListening()
        updateTile()
    }

    override fun onClick() {
        super.onClick()
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent, PendingIntent.FLAG_IMMUTABLE
        )

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startActivityAndCollapse(pendingIntent)
        } else {
            launchActivityDeprecated(intent)
        }
    }

    @Suppress("DEPRECATION")
    private fun launchActivityDeprecated(intent: Intent) {
        startActivityAndCollapse(intent)
    }

    private fun updateTile() {
        val tile = qsTile ?: return
        val repo = TimetableRepository(this)
        val entries = repo.load()

        val today = LocalDate.now()
        val nowMin = LocalTime.now().let { it.hour * 60 + it.minute }

        val todayEntries = entriesForDate(entries, today)
        val ongoing = todayEntries.firstOrNull { nowMin in it.startMin until it.endMin }
        val next = todayEntries.firstOrNull { nowMin < it.startMin }

        when {
            ongoing != null -> {
                tile.state = Tile.STATE_ACTIVE
                tile.label = ongoing.subject
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    tile.subtitle = "Ongoing • Room ${ongoing.room}"
                }
            }
            next != null -> {
                tile.state = Tile.STATE_ACTIVE
                tile.label = "Next: ${next.subject}"
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    tile.subtitle = "Starts at ${formatTime(next.startMin)}"
                }
            }
            else -> {
                tile.state = Tile.STATE_INACTIVE
                tile.label = "College Timetable"
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    tile.subtitle = "No upcoming classes"
                }
            }
        }
        tile.updateTile()
    }
}
